const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Oracle Derby 컨트랙트 배포 시작...\n");

  // TODO: Monad 네트워크의 Chainlink Price Feed 주소로 변경
  const BTC_FEED = "0x2Cd9D7E85494F68F5aF08EF96d6FD5e8F71B4d31"; // Placeholder
  const SOL_FEED = "0x1c2f27C736aC97886F017AbdEedEd81C3C8Af7Be"; // Placeholder - Solana
  const DOGE_FEED = "0x7F1c8B16Ba16AA5a8e720dA162f0d9191f2e6EC5"; // Placeholder - Dogecoin
  const PEPE_FEED = "0x5db2F4591d04CABc9E5C4016e9477A80d383D298"; // Placeholder - Pepe

  console.log("📋 Price Feed 주소:");
  console.log("   BTC:", BTC_FEED);
  console.log("   SOL:", SOL_FEED);
  console.log("   DOGE:", DOGE_FEED);
  console.log("   PEPE:", PEPE_FEED);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 배포자 주소:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 잔액:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  console.log("📦 컨트랙트 배포 중...");
  const MonadBlitz = await hre.ethers.getContractFactory("MonadBlitz");
  const oracleDerby = await MonadBlitz.deploy(
    BTC_FEED,
    SOL_FEED,
    DOGE_FEED,
    PEPE_FEED
  );

  await oracleDerby.waitForDeployment();
  const contractAddress = await oracleDerby.getAddress();

  console.log("✅ 배포 완료!");
  console.log("📍 컨트랙트 주소:", contractAddress);
  console.log("");

  // ABI 파일 복사
  try {
    const artifactPath = path.join(
      __dirname,
      "../artifacts/contracts/MonadBlitz.sol/MonadBlitz.json"
    );
    const abiDestPath = path.join(__dirname, "../../src/abis/MonadBlitz.json");

    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // 디렉토리가 없으면 생성
      const abiDir = path.dirname(abiDestPath);
      if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
      }

      // ABI만 추출하여 저장 (기존 형식과 호환)
      fs.writeFileSync(abiDestPath, JSON.stringify(artifact.abi, null, 2));
      console.log("✅ ABI 파일 복사 완료:", abiDestPath);
    } else {
      console.log("⚠️  ABI 파일을 찾을 수 없습니다:", artifactPath);
      console.log("   먼저 'npm run compile'을 실행하여 컨트랙트를 컴파일하세요.");
    }
  } catch (error) {
    console.log("⚠️  ABI 파일 복사 중 오류:", error.message);
  }

  console.log("");
  console.log("📝 다음 단계:");
  console.log("1. src/config.ts 파일에서 CONTRACT_ADDRESS를 다음 주소로 업데이트하세요:");
  console.log(`   export const CONTRACT_ADDRESS = "${contractAddress}";`);
  console.log("");
  console.log("2. game-server/.env 파일에 다음을 추가하세요:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("3. Chainlink Automation 설정 (선택사항):");
  console.log("   contracts/scripts/registerUpkeep.js를 실행하여 자동화를 설정하세요.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

