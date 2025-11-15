/**
 * 베팅 테스트 스크립트 - 실제 베팅 시도
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x9a607c5c2A4cD964540cee13E01A9217A791A639';
const TEST_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY; // 테스트용 지갑

if (!TEST_PRIVATE_KEY) {
  console.error('❌ SERVER_PRIVATE_KEY가 설정되지 않았습니다!');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, signer);

async function testBet() {
  try {
    console.log('🧪 베팅 테스트 시작...\n');
    
    // 현재 라운드 정보
    const roundInfo = await contract.getCurrentRound();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(roundInfo[1]);
    const phase = Number(roundInfo[2]);
    
    console.log('현재 상태:');
    console.log('  라운드 ID:', roundInfo[0].toString());
    console.log('  경과 시간:', elapsed, '초');
    console.log('  Phase:', phase);
    console.log('');
    
    // 베팅 조건 확인
    const canBet = elapsed <= 35;
    
    if (!canBet) {
      console.log('❌ 베팅 불가능: elapsed > 35초');
      console.log('   새 라운드를 시작합니다...\n');
      
      const startTx = await contract.startNewRound();
      console.log('   ✅ startNewRound 트랜잭션:', startTx.hash);
      await startTx.wait();
      console.log('   ✅ 새 라운드 시작 완료\n');
      
      // 새 라운드 정보 확인
      const newRoundInfo = await contract.getCurrentRound();
      const newElapsed = Math.floor(Date.now() / 1000) - Number(newRoundInfo[1]);
      console.log('   새 라운드 ID:', newRoundInfo[0].toString());
      console.log('   새 라운드 경과 시간:', newElapsed, '초\n');
    }
    
    // 비트코인(horseId=0)에 0.001 MONAD 베팅 시도
    console.log('💰 비트코인(horseId=0)에 0.001 MONAD 베팅 시도...');
    const betAmount = ethers.parseEther('0.001');
    
    const tx = await contract.placeBet(0, { value: betAmount });
    console.log('   ✅ 트랜잭션 전송:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('   ✅ 확인됨! 블록:', receipt.blockNumber);
    console.log('   ✅ 베팅 성공!\n');
    
    // 베팅 후 총 베팅 확인
    const totalBets = await contract.getTotalBets();
    console.log('현재 총 베팅:');
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    totalBets.forEach((bet, i) => {
      console.log(`  ${horseNames[i]}: ${ethers.formatEther(bet)} MONAD`);
    });
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    if (error.reason) {
      console.error('   이유:', error.reason);
    }
    if (error.data) {
      console.error('   데이터:', error.data);
    }
  }
}

testBet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

