const hre = require("hardhat");

async function main() {
  // TODO: Monad 네트워크의 Chainlink Price Feed 주소로 변경
  const BTC_FEED = "0x2Cd9D7E85494F68F5aF08EF96d6FD5e8F71B4d31"; // Placeholder
  const ETH_FEED = "0x0c76859E85727683Eeba0C70Bc2e0F5781337818"; // Placeholder
  const MONAD_FEED = "0x4682035965Cd2B88759193ee2660d8A0766e1391"; // Placeholder
  const DOGE_FEED = "0x7F1c8B16Ba16AA5a8e720dA162f0d9191f2e6EC5"; // Placeholder

  const MonadBlitz = await hre.ethers.getContractFactory("MonadBlitz");
  const monadBlitz = await MonadBlitz.deploy(
    BTC_FEED,
    ETH_FEED,
    MONAD_FEED,
    DOGE_FEED
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

