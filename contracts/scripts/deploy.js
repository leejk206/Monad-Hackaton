const hre = require("hardhat");

async function main() {
  // TODO: Monad 네트워크의 Chainlink Price Feed 주소로 변경
  const BTC_FEED = "0x0000000000000000000000000000000000000000"; // Placeholder
  const ETH_FEED = "0x0000000000000000000000000000000000000000"; // Placeholder
  const MONAD_FEED = "0x0000000000000000000000000000000000000000"; // Placeholder
  const DOGE_FEED = "0x0000000000000000000000000000000000000000"; // Placeholder

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

