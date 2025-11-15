/**
 * Monad Blitz 게임 서버
 * 
 * 이 서버는 다음 기능을 자동으로 처리합니다:
 * 1. Racing Phase 중 updatePositions() 자동 호출
 * 2. Settlement Phase에서 settleRound() 자동 호출
 * 3. Finished Phase에서 startNewRound() 자동 호출
 * 4. 게임 상태 모니터링 및 이벤트 리스닝
 * 
 * 실행 방법:
 * 1. npm install
 * 2. .env 파일 설정 (SERVER_PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS)
 * 3. node index.js
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

// 설정
const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x4e1a649aE9ed9d22D97122eEd54272c361Ed8092';
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY; // 서버 지갑의 개인키 (가스비 충전 필요)

// 게임 상수
const ROUND_DURATION = 90; // seconds
const BETTING_PHASE_END = 35; // seconds
const RACING_PHASE_START = 40; // seconds
const RACING_PHASE_END = 80; // seconds

// 체크 간격
const CHECK_INTERVAL = 5000; // 5초마다 체크
const UPDATE_POSITIONS_INTERVAL = 5000; // 5초마다 updatePositions 호출

// Provider 및 Signer 설정
if (!SERVER_PRIVATE_KEY) {
  console.error('❌ SERVER_PRIVATE_KEY가 설정되지 않았습니다!');
  console.error('   .env 파일에 SERVER_PRIVATE_KEY를 설정해주세요.');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, signer);

console.log('🚀 Monad Blitz 게임 서버 시작');
console.log('📍 컨트랙트 주소:', CONTRACT_ADDRESS);
console.log('👤 서버 지갑 주소:', signer.address);

// 잔액 확인
async function checkBalance() {
  try {
    const balance = await provider.getBalance(signer.address);
    console.log(`💰 서버 지갑 잔액: ${ethers.formatEther(balance)} MONAD`);
    if (balance < ethers.parseEther('0.01')) {
      console.warn('⚠️  잔액이 부족합니다! 가스비를 충전해주세요.');
    }
    return balance;
  } catch (error) {
    console.error('잔액 확인 실패:', error.message);
    return 0n;
  }
}

// 현재 라운드 정보 조회
async function getCurrentRound() {
  try {
    const roundInfo = await contract.getCurrentRound();
    return {
      roundId: roundInfo[0],
      startTime: Number(roundInfo[1]),
      phase: Number(roundInfo[2]),
      winner: Number(roundInfo[3]),
      settled: roundInfo[4],
    };
  } catch (error) {
    console.error('라운드 정보 조회 실패:', error.message);
    return null;
  }
}

// Phase 계산
function calculatePhase(elapsed, settled) {
  if (elapsed <= BETTING_PHASE_END) {
    return 'Betting';
  } else if (elapsed < RACING_PHASE_START) {
    return 'Betting'; // Transition period
  } else if (elapsed < RACING_PHASE_END) {
    return 'Racing';
  } else if (elapsed < ROUND_DURATION) {
    return 'Settlement';
  } else {
    return 'Finished';
  }
}

// updatePositions 실행
let lastUpdateTime = 0;
async function executeUpdatePositions() {
  const now = Math.floor(Date.now() / 1000);
  
  // 5초마다만 실행
  if (now - lastUpdateTime < 5) {
    return;
  }
  
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const elapsed = now - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    
    if (phase === 'Racing' && !roundInfo.settled) {
      console.log(`[${new Date().toLocaleTimeString()}] 🏃 updatePositions 호출 (elapsed: ${elapsed}s)`);
      const tx = await contract.updatePositions();
      console.log(`  ✅ 트랜잭션 전송: ${tx.hash}`);
      
      // 트랜잭션 완료 대기 (선택사항)
      tx.wait().then((receipt) => {
        console.log(`  ✅ 확인됨 (블록: ${receipt.blockNumber})`);
      }).catch((err) => {
        console.error(`  ❌ 실패:`, err.message);
      });
      
      lastUpdateTime = now;
    }
  } catch (error) {
    console.error('updatePositions 실행 실패:', error.message);
  }
}

// settleRound 실행
async function executeSettleRound() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    
    if ((phase === 'Settlement' || phase === 'Finished') && !roundInfo.settled && elapsed >= RACING_PHASE_END) {
      console.log(`[${new Date().toLocaleTimeString()}] 💰 settleRound 호출 (elapsed: ${elapsed}s)`);
      const tx = await contract.settleRound();
      console.log(`  ✅ 트랜잭션 전송: ${tx.hash}`);
      
      tx.wait().then((receipt) => {
        console.log(`  ✅ 확인됨 (블록: ${receipt.blockNumber})`);
      }).catch((err) => {
        console.error(`  ❌ 실패:`, err.message);
      });
    }
  } catch (error) {
    console.error('settleRound 실행 실패:', error.message);
  }
}

// startNewRound 실행
async function executeStartNewRound() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    
    if (phase === 'Finished' && roundInfo.settled && elapsed >= ROUND_DURATION) {
      console.log(`[${new Date().toLocaleTimeString()}] 🎮 startNewRound 호출 (elapsed: ${elapsed}s)`);
      const tx = await contract.startNewRound();
      console.log(`  ✅ 트랜잭션 전송: ${tx.hash}`);
      
      tx.wait().then((receipt) => {
        console.log(`  ✅ 확인됨 (블록: ${receipt.blockNumber})`);
      }).catch((err) => {
        console.error(`  ❌ 실패:`, err.message);
      });
    }
  } catch (error) {
    console.error('startNewRound 실행 실패:', error.message);
  }
}

// 게임 상태 모니터링
async function monitorGameState() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    const timeRemaining = elapsed >= ROUND_DURATION ? 0 : Math.max(0, ROUND_DURATION - elapsed);
    
    // 게임 상태 출력 (선택사항)
    if (elapsed % 10 === 0) { // 10초마다 출력
      console.log(`\n[${new Date().toLocaleTimeString()}] 게임 상태:`);
      console.log(`  라운드 ID: ${roundInfo.roundId}`);
      console.log(`  Phase: ${phase}`);
      console.log(`  경과 시간: ${elapsed}s / ${ROUND_DURATION}s`);
      console.log(`  남은 시간: ${timeRemaining}s`);
      console.log(`  정산 여부: ${roundInfo.settled ? '예' : '아니오'}`);
      if (roundInfo.settled) {
        console.log(`  승자: ${['BTC', 'ETH', 'MONAD', 'DOGE'][roundInfo.winner]}`);
      }
    }
  } catch (error) {
    console.error('게임 상태 모니터링 실패:', error.message);
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  console.log('👂 이벤트 리스너 설정 중...');
  
  contract.on('RoundStarted', (roundId, startTime, event) => {
    console.log(`\n🎮 새 라운드 시작!`);
    console.log(`  라운드 ID: ${roundId}`);
    console.log(`  시작 시간: ${new Date(Number(startTime) * 1000).toLocaleString()}`);
  });
  
  contract.on('PositionUpdated', (roundId, horseId, position, event) => {
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    console.log(`  🏃 ${horseNames[horseId]} 위치 업데이트: ${position}`);
  });
  
  contract.on('RoundSettled', (roundId, winner, event) => {
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    console.log(`\n🏁 라운드 정산 완료!`);
    console.log(`  라운드 ID: ${roundId}`);
    console.log(`  승자: ${horseNames[winner]}`);
  });
  
  contract.on('BetPlaced', (roundId, bettor, horseId, amount, event) => {
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    console.log(`  💰 베팅: ${bettor.slice(0, 10)}... → ${horseNames[horseId]} (${ethers.formatEther(amount)} MONAD)`);
  });
  
  contract.on('WinningsClaimed', (roundId, bettor, amount, event) => {
    console.log(`  💵 수령: ${bettor.slice(0, 10)}... → ${ethers.formatEther(amount)} MONAD`);
  });
  
  console.log('✅ 이벤트 리스너 설정 완료');
}

// 메인 루프
async function main() {
  // 초기 잔액 확인
  await checkBalance();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 주기적으로 체크 및 실행
  console.log(`\n⏰ 자동 실행 시작 (${CHECK_INTERVAL / 1000}초마다 체크)`);
  console.log(`   - updatePositions: Racing Phase 중 ${UPDATE_POSITIONS_INTERVAL / 1000}초마다\n`);
  
  setInterval(async () => {
    await executeUpdatePositions();
    await executeSettleRound();
    await executeStartNewRound();
    await monitorGameState();
  }, CHECK_INTERVAL);
  
  // 주기적으로 잔액 확인 (5분마다)
  setInterval(async () => {
    await checkBalance();
  }, 5 * 60 * 1000);
}

// 에러 핸들링
process.on('unhandledRejection', (error) => {
  console.error('❌ 처리되지 않은 오류:', error);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 서버 종료 중...');
  process.exit(0);
});

main().catch(console.error);

