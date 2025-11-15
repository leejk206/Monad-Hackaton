/**
 * 테스트 트랜잭션 실행 스크립트
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x1e83eC8c7f895936a6f184C9d40e4a8477e1f3F8';
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;

if (!SERVER_PRIVATE_KEY) {
  console.error('❌ SERVER_PRIVATE_KEY가 설정되지 않았습니다!');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, signer);

async function testTransaction() {
  try {
    console.log('🧪 테스트 트랜잭션 시작...');
    console.log('👤 서버 지갑 주소:', signer.address);
    
    // 1. 잔액 확인
    const balance = await provider.getBalance(signer.address);
    console.log('💰 잔액:', ethers.formatEther(balance), 'MONAD');
    
    if (balance < ethers.parseEther('0.001')) {
      console.error('❌ 잔액이 부족합니다! 최소 0.001 MONAD가 필요합니다.');
      return;
    }
    
    // 2. 현재 라운드 정보 조회 (view 함수 - 가스비 불필요)
    console.log('\n📊 현재 라운드 정보 조회 중...');
    const roundInfo = await contract.getCurrentRound();
    console.log('  라운드 ID:', roundInfo[0].toString());
    console.log('  시작 시간:', new Date(Number(roundInfo[1]) * 1000).toLocaleString());
    console.log('  Phase:', ['Betting', 'Racing', 'Settlement', 'Finished'][Number(roundInfo[2])]);
    console.log('  승자:', ['BTC', 'ETH', 'MONAD', 'DOGE'][Number(roundInfo[3])]);
    console.log('  정산 여부:', roundInfo[4]);
    
    // 3. 위치 정보 조회 (view 함수)
    console.log('\n📊 현재 위치 정보 조회 중...');
    const positions = await contract.getPositions();
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    positions.forEach((pos, i) => {
      console.log(`  ${horseNames[i]}: ${pos.toString()}`);
    });
    
    // 4. 현재 시간과 경과 시간 계산
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(roundInfo[1]);
    console.log('\n⏰ 시간 정보:');
    console.log('  현재 시간:', new Date(now * 1000).toLocaleString());
    console.log('  경과 시간:', elapsed, '초');
    
    // 5. Phase에 따라 적절한 트랜잭션 실행
    const phase = Number(roundInfo[2]);
    const phaseNames = ['Betting', 'Racing', 'Settlement', 'Finished'];
    
    console.log(`\n🚀 트랜잭션 실행 시도 (현재 Phase: ${phaseNames[phase]})...`);
    
    if (phase === 1 && elapsed >= 40 && elapsed < 80) {
      // Racing Phase - updatePositions 실행
      console.log('  → updatePositions() 호출 중...');
      const tx = await contract.updatePositions();
      console.log('  ✅ 트랜잭션 전송됨:', tx.hash);
      console.log('  ⏳ 확인 대기 중...');
      const receipt = await tx.wait();
      console.log('  ✅ 확인됨! 블록:', receipt.blockNumber);
      console.log('  💰 가스 사용량:', receipt.gasUsed.toString());
    } else if (phase === 1 && elapsed >= 80 && !roundInfo[4]) {
      // Racing Phase 종료 - settleRound 실행
      console.log('  → settleRound() 호출 중...');
      const tx = await contract.settleRound();
      console.log('  ✅ 트랜잭션 전송됨:', tx.hash);
      console.log('  ⏳ 확인 대기 중...');
      const receipt = await tx.wait();
      console.log('  ✅ 확인됨! 블록:', receipt.blockNumber);
      console.log('  💰 가스 사용량:', receipt.gasUsed.toString());
    } else if (phase === 3 && elapsed >= 90 && roundInfo[4]) {
      // Finished Phase - startNewRound 실행
      console.log('  → startNewRound() 호출 중...');
      const tx = await contract.startNewRound();
      console.log('  ✅ 트랜잭션 전송됨:', tx.hash);
      console.log('  ⏳ 확인 대기 중...');
      const receipt = await tx.wait();
      console.log('  ✅ 확인됨! 블록:', receipt.blockNumber);
      console.log('  💰 가스 사용량:', receipt.gasUsed.toString());
    } else {
      console.log('  ⚠️  현재 Phase에서는 트랜잭션을 실행할 수 없습니다.');
      console.log('     Racing Phase(40-80초)에서 updatePositions가 자동 실행됩니다.');
    }
    
    console.log('\n✅ 테스트 완료!');
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.reason) {
      console.error('   이유:', error.reason);
    }
    if (error.data) {
      console.error('   데이터:', error.data);
    }
  }
}

testTransaction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

