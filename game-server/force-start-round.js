/**
 * 강제로 새 라운드 시작
 */

require('dotenv').config();
const { ethers } = require('ethers');
const MonadBlitzABI = require('../src/abis/MonadBlitz.json');

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xE60028f572D45912C655f03A260f81Ee0848c387';
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;

if (!SERVER_PRIVATE_KEY) {
  console.error('❌ SERVER_PRIVATE_KEY가 설정되지 않았습니다!');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, signer);

async function forceStartRound() {
  try {
    console.log('🚀 새 라운드 강제 시작...');
    console.log('👤 서버 지갑 주소:', signer.address);
    
    // 잔액 확인
    const balance = await provider.getBalance(signer.address);
    console.log('💰 잔액:', ethers.formatEther(balance), 'MONAD');
    
    // 현재 라운드 정보
    const roundInfo = await contract.getCurrentRound();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(roundInfo[1]);
    
    console.log('\n📊 현재 상태:');
    console.log('  라운드 ID:', roundInfo[0].toString());
    console.log('  경과 시간:', elapsed, '초');
    console.log('  Phase:', ['Betting', 'Racing', 'Settlement', 'Finished'][Number(roundInfo[2])]);
    console.log('  정산 여부:', roundInfo[4]);
    
    // startNewRound 실행
    console.log('\n🎮 startNewRound() 호출 중...');
    const tx = await contract.startNewRound();
    console.log('  ✅ 트랜잭션 전송됨:', tx.hash);
    console.log('  ⏳ 확인 대기 중...');
    
    const receipt = await tx.wait();
    console.log('  ✅ 확인됨!');
    console.log('  블록 번호:', receipt.blockNumber);
    console.log('  가스 사용량:', receipt.gasUsed.toString());
    console.log('  가스 가격:', ethers.formatUnits(receipt.gasPrice || 0n, 'gwei'), 'gwei');
    
    // 새 라운드 정보 확인
    console.log('\n📊 새 라운드 정보:');
    const newRoundInfo = await contract.getCurrentRound();
    console.log('  라운드 ID:', newRoundInfo[0].toString());
    console.log('  시작 시간:', new Date(Number(newRoundInfo[1]) * 1000).toLocaleString());
    console.log('  Phase:', ['Betting', 'Racing', 'Settlement', 'Finished'][Number(newRoundInfo[2])]);
    
    console.log('\n✅ 새 라운드 시작 완료!');
    
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

forceStartRound()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

