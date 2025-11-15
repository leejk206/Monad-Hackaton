/**
 * 정산 페이즈 전환 로직 확인 스크립트
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x1e83eC8c7f895936a6f184C9d40e4a8477e1f3F8';

const RACING_PHASE_END = 80;
const ROUND_DURATION = 90;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, provider);

async function checkSettlement() {
  try {
    console.log('📊 정산 페이즈 전환 로직 확인...\n');
    
    const roundInfo = await contract.getCurrentRound();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(roundInfo[1]);
    const phase = Number(roundInfo[2]);
    const phaseNames = ['Betting', 'Racing', 'Settlement', 'Finished'];
    
    console.log('현재 라운드 상태:');
    console.log('  라운드 ID:', roundInfo[0].toString());
    console.log('  경과 시간:', elapsed, '초');
    console.log('  Phase:', phase, '(', phaseNames[phase], ')');
    console.log('  정산 여부:', roundInfo[4]);
    console.log('');
    
    console.log('정산 조건 체크:');
    console.log('  ✅ elapsed >= RACING_PHASE_END (80초):', elapsed >= RACING_PHASE_END, `(현재: ${elapsed}초)`);
    console.log('  ✅ phase === Racing (1):', phase === 1, `(현재: ${phase})`);
    console.log('  ✅ !settled:', !roundInfo[4], `(현재: ${roundInfo[4]})`);
    console.log('');
    
    // 정산 가능 여부
    const canSettle = elapsed >= RACING_PHASE_END && phase === 1 && !roundInfo[4];
    
    if (canSettle) {
      console.log('✅ 정산 가능합니다!');
      console.log('   서버의 executeSettleRound()가 호출되어야 합니다.');
    } else {
      console.log('❌ 정산 불가능합니다!');
      if (elapsed < RACING_PHASE_END) {
        console.log('   이유: Racing Phase가 아직 끝나지 않았습니다');
        console.log('   남은 시간:', RACING_PHASE_END - elapsed, '초');
      }
      if (phase !== 1) {
        console.log('   이유: 현재 Phase가 Racing이 아닙니다');
        console.log('   현재 Phase:', phaseNames[phase]);
      }
      if (roundInfo[4]) {
        console.log('   이유: 이미 정산되었습니다');
      }
    }
    
    console.log('\n정산 로직 요약:');
    console.log('  1. updatePositions() 내부: elapsed >= 80초 && !finished → _settleRound() 호출');
    console.log('  2. settleRound() 외부 함수: phase === Racing && elapsed >= 80초 → _settleRound() 호출');
    console.log('  3. _settleRound() 내부: round.phase = Phase.Settlement 설정');
    console.log('');
    
    console.log('서버 동작:');
    console.log('  - executeSettleRound(): elapsed >= 80초 && phase === 1 && !settled');
    console.log('  - executeUpdatePositions(): elapsed < 80초 && !settled');
    console.log('  - ⚠️  문제: updatePositions()는 80초 이후 호출되지 않으므로, settleRound()를 별도로 호출해야 함');
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkSettlement()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

