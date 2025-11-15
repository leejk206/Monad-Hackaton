const hre = require("hardhat");

async function main() {
  // TODO: Monad 네트워크의 Chainlink Price Feed 주소로 변경
  const BTC_FEED = "0x2Cd9D7E85494F68F5aF08EF96d6FD5e8F71B4d31"; // Placeholder
  const SOL_FEED = "0x1c2f27C736aC97886F017AbdEedEd81C3C8Af7Be"; // Placeholder - Solana
  const DOGE_FEED = "0x7F1c8B16Ba16AA5a8e720dA162f0d9191f2e6EC5"; // Placeholder - Dogecoin
  const PEPE_FEED = "0x5db2F4591d04CABc9E5C4016e9477A80d383D298"; // Placeholder - Pepe

  const MonadBlitz = await hre.ethers.getContractFactory("MonadBlitz");
  const monadBlitz = await MonadBlitz.deploy(
    BTC_FEED,
    SOL_FEED,
    DOGE_FEED,
    PEPE_FEED
  );

  await monadBlitz.waitForDeployment();

  console.log("MonadBlitz deployed to:", await monadBlitz.getAddress());
  console.log("Please update the contract address in src/config.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

