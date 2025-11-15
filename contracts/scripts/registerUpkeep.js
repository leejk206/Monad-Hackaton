const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Chainlink Automation Upkeep 등록 스크립트
 * 
 * 사용법:
 * 1. .env 파일에 PRIVATE_KEY 설정
 * 2. REGISTRY_ADDRESS를 Monad 네트워크의 Registry 주소로 변경
 * 3. CONTRACT_ADDRESS를 배포된 컨트랙트 주소로 변경
 * 4. node scripts/registerUpkeep.js 실행
 */
async function main() {
  // TODO: Monad 네트워크의 Chainlink Automation Registry 주소로 변경
  const REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  // 배포된 MonadBlitz 컨트랙트 주소
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xE60028f572D45912C655f03A260f81Ee0848c387";
  
  if (REGISTRY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ REGISTRY_ADDRESS를 설정해주세요!");
    process.exit(1);
  }
  
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ CONTRACT_ADDRESS를 설정해주세요!");
    console.error("   환경 변수 CONTRACT_ADDRESS 또는 스크립트 내부 주소를 설정하세요.");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Upkeep 등록자:", deployer.address);
  console.log("📋 컨트랙트 주소:", CONTRACT_ADDRESS);
  console.log("🔗 Registry 주소:", REGISTRY_ADDRESS);
  
  // Registry ABI
  const registryABI = [
    "function registerUpkeep(address target, uint32 gasLimit, address admin, bytes calldata checkData, uint96 balance, bytes calldata offchainConfig) external returns (uint256)",
    "function getUpkeep(uint256 id) external view returns (address target, uint32 executeGas, bytes memory checkData, uint96 balance, address admin, uint64 maxValidBlocknumber, uint32 lastPerformBlockNumber, uint96 amountSpent, bool paused, bytes memory offchainConfig)"
  ];
  
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, deployer);
  
  // Upkeep 설정
  const gasLimit = 500000; // 가스 한도 (필요에 따라 조정)
  const checkData = "0x"; // 빈 체크 데이터
  const balance = ethers.parseEther("10"); // 초기 잔액: 10 LINK
  const offchainConfig = "0x"; // 오프체인 설정 (비워둠)
  
  console.log("\n⚙️  Upkeep 설정:");
  console.log("   - 가스 한도:", gasLimit);
  console.log("   - 초기 잔액:", ethers.formatEther(balance), "LINK");
  
  try {
    console.log("\n📤 Upkeep 등록 중...");
    const tx = await registry.registerUpkeep(
      CONTRACT_ADDRESS,
      gasLimit,
      deployer.address, // 관리자 주소
      checkData,
      balance,
      offchainConfig
    );
    
    console.log("   트랜잭션 해시:", tx.hash);
    console.log("   확인 대기 중...");
    
    const receipt = await tx.wait();
    console.log("   ✅ 트랜잭션 확인됨!");
    
    // Upkeep ID 추출 (이벤트에서)
    // 참고: 실제 구현에서는 이벤트를 파싱하여 Upkeep ID를 얻어야 합니다
    console.log("\n📋 다음 단계:");
    console.log("   1. Chainlink Automation 대시보드에서 등록된 Upkeep 확인");
    console.log("   2. Upkeep ID 저장 (나중에 관리에 필요)");
    console.log("   3. 잔액 모니터링 및 필요시 충전");
    
  } catch (error) {
    console.error("\n❌ 등록 실패:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error("   💡 LINK 토큰 잔액이 부족합니다. 지갑에 충분한 LINK를 보유하고 있는지 확인하세요.");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

