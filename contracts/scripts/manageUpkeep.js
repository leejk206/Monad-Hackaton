const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Chainlink Automation Upkeep 관리 스크립트
 * 
 * 사용법:
 * 1. .env 파일에 PRIVATE_KEY 설정
 * 2. REGISTRY_ADDRESS, UPKEEP_ID, LINK_TOKEN_ADDRESS 설정
 * 3. node scripts/manageUpkeep.js [command] [amount]
 * 
 * 명령어:
 *   - check: 잔액 확인
 *   - add: 잔액 충전 (amount 필요, 예: node manageUpkeep.js add 10)
 */
async function main() {
  // TODO: Monad 네트워크의 Chainlink Automation Registry 주소로 변경
  const REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  // TODO: 등록된 Upkeep ID
  const UPKEEP_ID = process.env.UPKEEP_ID || "0";
  
  // TODO: LINK 토큰 주소 (Monad 네트워크)
  const LINK_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  const command = process.argv[2] || "check";
  const amount = process.argv[3] || "0";
  
  if (REGISTRY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ REGISTRY_ADDRESS를 설정해주세요!");
    process.exit(1);
  }
  
  if (UPKEEP_ID === "0") {
    console.error("❌ UPKEEP_ID를 설정해주세요!");
    console.error("   환경 변수 UPKEEP_ID 또는 스크립트 내부 ID를 설정하세요.");
    process.exit(1);
  }
  
  const [signer] = await ethers.getSigners();
  console.log("👤 관리자 주소:", signer.address);
  console.log("🔗 Registry 주소:", REGISTRY_ADDRESS);
  console.log("🆔 Upkeep ID:", UPKEEP_ID);
  
  const registryABI = [
    "function getUpkeep(uint256 id) external view returns (address target, uint32 executeGas, bytes memory checkData, uint96 balance, address admin, uint64 maxValidBlocknumber, uint32 lastPerformBlockNumber, uint96 amountSpent, bool paused, bytes memory offchainConfig)",
    "function cancelUpkeep(uint256 id) external"
  ];
  
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, signer);
  
  if (command === "check") {
    try {
      console.log("\n📊 Upkeep 정보 조회 중...");
      const upkeep = await registry.getUpkeep(UPKEEP_ID);
      
      console.log("\n✅ Upkeep 정보:");
      console.log("   - 타겟 컨트랙트:", upkeep.target);
      console.log("   - 가스 한도:", upkeep.executeGas.toString());
      console.log("   - 현재 잔액:", ethers.formatEther(upkeep.balance), "LINK");
      console.log("   - 관리자:", upkeep.admin);
      console.log("   - 마지막 실행 블록:", upkeep.lastPerformBlockNumber.toString());
      console.log("   - 총 소비량:", ethers.formatEther(upkeep.amountSpent), "LINK");
      console.log("   - 일시정지 여부:", upkeep.paused ? "예" : "아니오");
      
      // 잔액 경고
      const balanceInLink = parseFloat(ethers.formatEther(upkeep.balance));
      if (balanceInLink < 1) {
        console.log("\n⚠️  경고: 잔액이 1 LINK 미만입니다. 곧 자동 실행이 중단될 수 있습니다!");
        console.log("   💡 'add' 명령어로 잔액을 충전하세요.");
      } else if (balanceInLink < 5) {
        console.log("\n💡 알림: 잔액이 5 LINK 미만입니다. 곧 충전을 고려하세요.");
      }
      
    } catch (error) {
      console.error("\n❌ 조회 실패:", error.message);
      process.exit(1);
    }
  } else if (command === "add") {
    if (LINK_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.error("❌ LINK_TOKEN_ADDRESS를 설정해주세요!");
      process.exit(1);
    }
    
    if (amount === "0") {
      console.error("❌ 충전할 LINK 양을 지정해주세요!");
      console.error("   예: node manageUpkeep.js add 10");
      process.exit(1);
    }
    
    try {
      const linkAmount = ethers.parseEther(amount);
      console.log("\n💰 잔액 충전 중...");
      console.log("   충전량:", ethers.formatEther(linkAmount), "LINK");
      
      // LINK 토큰 ABI
      const linkABI = [
        "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];
      
      const linkToken = new ethers.Contract(LINK_TOKEN_ADDRESS, linkABI, signer);
      
      // 잔액 확인
      const balance = await linkToken.balanceOf(signer.address);
      console.log("   현재 LINK 잔액:", ethers.formatEther(balance), "LINK");
      
      if (balance < linkAmount) {
        console.error("❌ LINK 잔액이 부족합니다!");
        process.exit(1);
      }
      
      // Registry에 전송할 데이터 인코딩
      const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [UPKEEP_ID]);
      
      // transferAndCall 실행
      const tx = await linkToken.transferAndCall(REGISTRY_ADDRESS, linkAmount, data);
      console.log("   트랜잭션 해시:", tx.hash);
      console.log("   확인 대기 중...");
      
      await tx.wait();
      console.log("   ✅ 충전 완료!");
      
      // 업데이트된 잔액 확인
      const upkeep = await registry.getUpkeep(UPKEEP_ID);
      console.log("   새로운 잔액:", ethers.formatEther(upkeep.balance), "LINK");
      
    } catch (error) {
      console.error("\n❌ 충전 실패:", error.message);
      if (error.message.includes("insufficient funds")) {
        console.error("   💡 LINK 토큰 잔액이 부족합니다.");
      }
      process.exit(1);
    }
  } else {
    console.error("❌ 알 수 없는 명령어:", command);
    console.error("   사용 가능한 명령어: check, add");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

