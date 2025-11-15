/**
 * 베팅 가능 여부 확인 스크립트
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x1e83eC8c7f895936a6f184C9d40e4a8477e1f3F8';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, provider);

async function checkBetting() {
  try {
    console.log('📊 베팅 가능 여부 확인...\n');
    
    // 현재 라운드 정보
    const roundInfo = await contract.getCurrentRound();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(roundInfo[1]);
    const phase = Number(roundInfo[2]);
    const phaseNames = ['Betting', 'Racing', 'Settlement', 'Finished'];
    
    console.log('현재 라운드 상태:');
    console.log('  라운드 ID:', roundInfo[0].toString());
    console.log('  시작 시간:', new Date(Number(roundInfo[1]) * 1000).toLocaleString());
    console.log('  경과 시간:', elapsed, '초');
    console.log('  Phase:', phase, '(', phaseNames[phase], ')');
    console.log('  정산 여부:', roundInfo[4]);
    console.log('');
    
    // 베팅 조건 확인
    console.log('베팅 조건 체크:');
    console.log('  ✅ horseId < 4:', true, '(비트코인 = 0)');
    console.log('  ✅ 베팅 금액 범위:', '0.001 ~ 10 MONAD');
    console.log('  ⚠️  elapsed <= 35초:', elapsed <= 35, `(현재: ${elapsed}초)`);
    console.log('  ⚠️  phase === Betting:', phase === 0, `(현재: ${phaseNames[phase]})`);
    console.log('');
    
    // 베팅 가능 여부
    const canBet = elapsed <= 35 && phase === 0;
    
    if (canBet) {
      console.log('✅ 베팅 가능합니다!');
      console.log('   남은 베팅 시간:', Math.max(0, 35 - elapsed), '초');
    } else {
      console.log('❌ 베팅 불가능합니다!');
      if (elapsed > 35) {
        console.log('   이유: 베팅 단계가 종료되었습니다 (35초 초과)');
        console.log('   해결: 새 라운드를 기다리거나 startNewRound()를 호출하세요');
      }
      if (phase !== 0) {
        console.log('   이유: 현재 Phase가 Betting이 아닙니다');
        console.log('   해결: 새 라운드를 기다리거나 startNewRound()를 호출하세요');
      }
    }
    
    // 총 베팅 확인
    console.log('\n현재 총 베팅:');
    const totalBets = await contract.getTotalBets();
    const horseNames = ['BTC', 'ETH', 'MONAD', 'DOGE'];
    totalBets.forEach((bet, i) => {
      console.log(`  ${horseNames[i]}: ${ethers.formatEther(bet)} MONAD`);
    });
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkBetting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

