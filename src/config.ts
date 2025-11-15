// Monad Blitz Configuration

// 배포된 컨트랙트 주소
export const CONTRACT_ADDRESS = "0xE60028f572D45912C655f03A260f81Ee0848c387";

// Monad 네트워크 설정
export const MONAD_NETWORK = {
  chainId: 0x279F, // 10143 (10진수) - Monad Testnet
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  nativeCurrency: {
    name: "Monad",
    symbol: "MONAD",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
};

// 게임 상수
export const ROUND_DURATION = 90; // seconds
export const BETTING_PHASE_END = 35; // seconds
export const RACING_PHASE_START = 40; // seconds
export const RACING_PHASE_END = 80; // seconds

export const START_POS = 0;
export const FINISH_POS = 300;

export const MIN_BET_AMOUNT = 0.001; // MONAD
export const MAX_BET_AMOUNT = 10; // MONAD

// 말(코인) 정보
export const HORSES = [
  { id: 0, name: "Bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: 1, name: "Solana", symbol: "SOL", color: "#14F195" },
  { id: 2, name: "Dogecoin", symbol: "DOGE", color: "#C2A633" },
  { id: 3, name: "Pepe", symbol: "PEPE", color: "#00D395" },
] as const;

