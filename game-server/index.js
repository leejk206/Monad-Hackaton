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
// 컨트랙트 주소 확인 (42자여야 함)
let contractAddress = process.env.CONTRACT_ADDRESS || '0xE60028f572D45912C655f03A260f81Ee0848c387';
if (contractAddress.length !== 42) {
  console.error(`❌ 컨트랙트 주소가 잘못되었습니다! (길이: ${contractAddress.length}, 정상: 42)`);
  console.error(`   현재 주소: ${contractAddress}`);
  // 올바른 주소로 수정
  contractAddress = '0xE60028f572D45912C655f03A260f81Ee0848c387';
  console.log(`   수정된 주소: ${contractAddress}`);
}
const CONTRACT_ADDRESS = contractAddress;
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY; // 서버 지갑의 개인키 (가스비 충전 필요)

// 게임 상수
const ROUND_DURATION = 90; // seconds
const BETTING_PHASE_END = 35; // seconds
const RACING_PHASE_START = 40; // seconds
const RACING_PHASE_END = 80; // seconds

// 체크 간격
const CHECK_INTERVAL = 2000; // 2초마다 체크 (RPC 제한 방지)
const UPDATE_POSITIONS_INTERVAL = 2000; // 2초마다 updatePositions 호출 (RPC 제한 방지)

// Provider 및 Signer 설정
if (!SERVER_PRIVATE_KEY) {
  console.error('❌ SERVER_PRIVATE_KEY가 설정되지 않았습니다!');
  console.error('   .env 파일에 SERVER_PRIVATE_KEY를 설정해주세요.');
  process.exit(1);
}

// Provider 설정 (Monad 네트워크 정보 명시하여 ENS 오류 방지)
const provider = new ethers.JsonRpcProvider(RPC_URL, {
  name: "monad",
  chainId: 10143,
  ensAddress: null, // ENS 주소를 null로 설정하여 ENS 체크 비활성화
});

// ENS 체크를 완전히 비활성화하기 위해 네트워크 조회 함수 오버라이드
const originalGetNetwork = provider.getNetwork.bind(provider);
provider.getNetwork = async function() {
  try {
    return await originalGetNetwork();
  } catch (error) {
    // ENS 오류가 발생하면 네트워크 정보를 직접 반환
    if (error.code === 'UNSUPPORTED_OPERATION' || error.message?.includes('ENS')) {
      return {
        name: "monad",
        chainId: 10143n,
        ensAddress: null,
      };
    }
    throw error;
  }
};

const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, signer);

console.log('🚀 Monad Blitz 게임 서버 시작');
console.log('📍 컨트랙트 주소:', CONTRACT_ADDRESS);
console.log('   주소 길이:', CONTRACT_ADDRESS.length, '(정상: 42)');
console.log('👤 서버 지갑 주소:', signer.address);
console.log('🌐 RPC URL:', RPC_URL);

// 컨트랙트 연결 테스트
(async () => {
  try {
    console.log('\n🔍 컨트랙트 연결 테스트 중...');
    const testRound = await contract.getCurrentRound();
    console.log('   ✅ 컨트랙트 연결 성공!');
    console.log('   라운드 ID:', testRound[0].toString());
    console.log('   시작 시간:', new Date(Number(testRound[1]) * 1000).toLocaleString());
  } catch (error) {
    console.error('   ❌ 컨트랙트 연결 실패!');
    console.error('   오류:', error.message || error);
    console.error('   코드:', error.code);
    if (error.info) {
      console.error('   정보:', JSON.stringify(error.info, null, 2));
    }
  }
})();

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
    if (!roundInfo || roundInfo.length === 0) {
      console.error('   ⚠️  라운드 정보가 비어있습니다.');
      return null;
    }
    return {
      roundId: roundInfo[0],
      startTime: Number(roundInfo[1]),
      phase: Number(roundInfo[2]),
      winner: Number(roundInfo[3]),
      settled: roundInfo[4],
    };
  } catch (error) {
    // 실제 오류 메시지 출력
    const errorMsg = error.message || error.reason || String(error);
    const errorCode = error.code || '';
    const errorInfo = error.error || error.info || {};
    
    // RPC 요청 제한 오류는 조용히 처리 (너무 많은 로그 방지)
    if (errorMsg.includes('request limit reached') || 
        errorMsg.includes('rate limit') ||
        (errorInfo.code === -32007)) {
      // RPC 제한 오류는 조용히 무시 (재시도는 다음 주기에서)
      return null;
    }
    
    // ENS 관련 오류는 무시
    if (errorMsg.includes('ENS') || errorCode === 'UNSUPPORTED_OPERATION') {
      return null;
    }
    
    // 다른 오류는 로그 출력 (중요한 오류만)
    if (!errorMsg.includes('request limit') && !errorMsg.includes('rate limit')) {
      console.error('   ❌ 라운드 정보 조회 실패:');
      console.error('      메시지:', errorMsg);
      console.error('      코드:', errorCode);
    }
    
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
  const now = Date.now();
  
  // UPDATE_POSITIONS_INTERVAL마다만 실행 (밀리초 단위)
  if (now - lastUpdateTime < UPDATE_POSITIONS_INTERVAL) {
    return;
  }
  
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const nowSeconds = Math.floor(Date.now() / 1000);
    const elapsed = nowSeconds - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    const contractPhase = Number(roundInfo[2]); // 컨트랙트의 실제 phase
    
    // 베팅 단계에서는 updatePositions를 실행하지 않음
    // Racing Phase가 시작된 후에만 실행 (elapsed >= RACING_PHASE_START)
    if (elapsed >= RACING_PHASE_START && elapsed < RACING_PHASE_END && !roundInfo.settled) {
      console.log(`[${new Date().toLocaleTimeString()}] 🏃 updatePositions 호출 (elapsed: ${elapsed}s, contractPhase: ${contractPhase})`);
      const tx = await contract.updatePositions();
      console.log(`  ✅ 트랜잭션 전송: ${tx.hash}`);
      
      // 트랜잭션 완료 대기 (선택사항)
      tx.wait().then((receipt) => {
        console.log(`  ✅ 확인됨 (블록: ${receipt.blockNumber})`);
      }).catch((err) => {
        console.error(`  ❌ 실패:`, err.message);
      });
      
      lastUpdateTime = Date.now(); // 밀리초 단위로 저장
    } else {
      // 실행 조건이 맞지 않을 때 디버그 정보 출력
      if (elapsed < RACING_PHASE_START) {
        // console.log(`[${new Date().toLocaleTimeString()}] ⏸️  Racing Phase 시작 전 (elapsed: ${elapsed}s < ${RACING_PHASE_START}s)`);
      } else if (elapsed >= RACING_PHASE_END) {
        // console.log(`[${new Date().toLocaleTimeString()}] ⏸️  Racing Phase 종료 (elapsed: ${elapsed}s >= ${RACING_PHASE_END}s)`);
      } else if (roundInfo.settled) {
        // console.log(`[${new Date().toLocaleTimeString()}] ⏸️  이미 정산됨`);
      }
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
    
    // settleRound는 Racing Phase가 끝났고, 아직 정산되지 않았을 때만 호출
    if (elapsed >= RACING_PHASE_END && !roundInfo.settled && roundInfo.phase === 1) { // phase 1 = Racing
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
    // "Not in racing phase" 오류는 무시 (이미 정산되었거나 조건이 맞지 않음)
    if (!error.message?.includes('Not in racing phase')) {
      console.error('settleRound 실행 실패:', error.message);
    }
  }
}

// startNewRound 실행
async function executeStartNewRound() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    
    // 라운드가 90초 이상 지났으면 정산 여부와 관계없이 새 라운드 시작
    if (elapsed >= ROUND_DURATION) {
      console.log(`[${new Date().toLocaleTimeString()}] 🎮 startNewRound 호출 (elapsed: ${elapsed}s, settled: ${roundInfo.settled})`);
      const tx = await contract.startNewRound();
      console.log(`  ✅ 트랜잭션 전송: ${tx.hash}`);
      
      tx.wait().then((receipt) => {
        console.log(`  ✅ 확인됨 (블록: ${receipt.blockNumber})`);
      }).catch((err) => {
        console.error(`  ❌ 실패:`, err.message);
      });
    }
  } catch (error) {
    // "Current round not finished" 오류는 무시 (아직 90초가 안 지났거나 이미 새 라운드가 시작됨)
    if (!error.message?.includes('Current round not finished')) {
      console.error('startNewRound 실행 실패:', error.message);
    }
  }
}

// 게임 상태 모니터링
async function monitorGameState() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) {
      console.log(`   ⚠️  라운드 정보를 가져올 수 없습니다.`);
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    const phase = calculatePhase(elapsed, roundInfo.settled);
    const timeRemaining = elapsed >= ROUND_DURATION ? 0 : Math.max(0, ROUND_DURATION - elapsed);
    
    // 상세 게임 상태 출력 (30초마다)
    if (elapsed % 30 === 0 && elapsed > 0) {
      console.log(`\n[${new Date().toLocaleTimeString()}] 📋 상세 게임 상태:`);
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
    console.error(`   ❌ 게임 상태 모니터링 실패:`, error.message);
  }
}

// 이벤트 리스너 설정 (Monad RPC가 eth_newFilter를 지원하지 않으므로 비활성화)
function setupEventListeners() {
  console.log('👂 이벤트 리스너: Monad RPC가 eth_newFilter를 지원하지 않아 비활성화됨');
  console.log('   게임 상태는 주기적 폴링으로 모니터링됩니다.');
  
  // 이벤트 리스너는 Monad RPC가 eth_newFilter를 지원하지 않으므로 사용하지 않음
  // 대신 주기적으로 게임 상태를 조회하여 모니터링합니다
}

// 서버 시작 시 새 라운드 확인 및 시작
async function ensureNewRound() {
  try {
    const roundInfo = await getCurrentRound();
    if (!roundInfo) return;
    
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - roundInfo.startTime;
    
    // 라운드가 90초 이상 지났거나, 베팅 단계가 끝났는데도 계속 Betting Phase인 경우 새 라운드 시작
    if (elapsed >= ROUND_DURATION || (elapsed > BETTING_PHASE_END && Number(roundInfo[2]) === 0)) {
      console.log(`\n🔄 서버 시작 시 라운드 상태 확인:`);
      console.log(`   라운드 ID: ${roundInfo[0]}`);
      console.log(`   경과 시간: ${elapsed}초`);
      console.log(`   Phase: ${['Betting', 'Racing', 'Settlement', 'Finished'][Number(roundInfo[2])]}`);
      
      if (elapsed >= ROUND_DURATION) {
        console.log(`   → 라운드가 ${ROUND_DURATION}초를 초과했으므로 새 라운드 시작...`);
      } else {
        console.log(`   → 베팅 단계가 끝났는데도 Betting Phase이므로 새 라운드 시작...`);
      }
      
      const tx = await contract.startNewRound();
      console.log(`   ✅ 트랜잭션 전송: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ 확인됨! 블록: ${receipt.blockNumber}`);
      
      // 새 라운드 정보 확인
      const newRoundInfo = await getCurrentRound();
      console.log(`   새 라운드 ID: ${newRoundInfo[0]}`);
      console.log(`   새 라운드 시작 시간: ${new Date(Number(newRoundInfo[1]) * 1000).toLocaleString()}\n`);
    } else {
      console.log(`\n✅ 현재 라운드 정상 (라운드 ID: ${roundInfo[0]}, 경과: ${elapsed}초)\n`);
    }
  } catch (error) {
    console.warn('⚠️  새 라운드 확인 중 오류 (계속 진행):', error.message);
  }
}

// 메인 루프
async function main() {
  // 초기 잔액 확인
  await checkBalance();
  
  // 서버 시작 시 새 라운드 확인 및 시작
  await ensureNewRound();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 주기적으로 체크 및 실행
  console.log(`⏰ 자동 실행 시작 (${CHECK_INTERVAL / 1000}초마다 체크)`);
  console.log(`   - updatePositions: Racing Phase 중 ${UPDATE_POSITIONS_INTERVAL / 1000}초마다\n`);
  
  let checkCount = 0;
  setInterval(async () => {
    checkCount++;
    const timestamp = new Date().toLocaleTimeString();
    
    // 5초마다 하트비트 로그
    console.log(`\n[${timestamp}] ♥ 하트비트 #${checkCount} - 서버 정상 작동 중...`);
    
    try {
      // 먼저 라운드 정보 확인
      const roundInfo = await getCurrentRound();
      if (!roundInfo) {
        console.log(`   ⚠️  라운드 정보를 가져올 수 없습니다. 컨트랙트 연결을 확인하세요.`);
        return;
      }
      
      // 간단한 상태 요약 (5초마다)
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - roundInfo.startTime;
      const phase = calculatePhase(elapsed, roundInfo.settled);
      console.log(`   📊 상태: 라운드 ${roundInfo.roundId} | ${phase} | 경과 ${elapsed}s`);
      
      // 각 함수 실행
      await executeUpdatePositions();
      await executeSettleRound();
      await executeStartNewRound();
      await monitorGameState();
    } catch (error) {
      console.error(`   ❌ 체크 중 오류:`, error.message || error);
      if (error.stack) {
        console.error(`   스택:`, error.stack);
      }
    }
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

