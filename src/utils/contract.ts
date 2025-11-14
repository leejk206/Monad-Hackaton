import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../config";
import MonadBlitzABI from "../abis/MonadBlitz.json";

export function getContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, MonadBlitzABI, provider);
}

export async function getCurrentRound(contract: ethers.Contract) {
  const round = await contract.getCurrentRound();
  return {
    roundId: round[0],
    startTime: round[1],
    phase: Number(round[2]),
    winner: Number(round[3]),
    settled: round[4],
  };
}

export async function getPositions(contract: ethers.Contract) {
  const positions = await contract.getPositions();
  return positions.map((p: bigint) => Number(p));
}

export async function getTotalBets(contract: ethers.Contract) {
  const bets = await contract.getTotalBets();
  return bets;
}

export async function getUserBets(
  contract: ethers.Contract,
  roundId: bigint,
  userAddress: string
) {
  const bets = await contract.getUserBets(roundId, userAddress);
  return bets.map((bet: any) => ({
    bettor: bet.bettor,
    horseId: Number(bet.horseId),
    amount: bet.amount,
    claimed: bet.claimed,
  }));
}

export async function getUserWinnings(
  contract: ethers.Contract,
  roundId: bigint,
  userAddress: string
) {
  return await contract.getUserWinnings(roundId, userAddress);
}

export async function placeBet(
  contract: ethers.Contract,
  horseId: number,
  amount: string
) {
  const tx = await contract.placeBet(horseId, {
    value: ethers.parseEther(amount),
  });
  return await tx.wait();
}

export async function updatePositions(contract: ethers.Contract) {
  const tx = await contract.updatePositions();
  return await tx.wait();
}

export async function settleRound(contract: ethers.Contract) {
  const tx = await contract.settleRound();
  return await tx.wait();
}

export async function claimWinnings(
  contract: ethers.Contract,
  roundId: bigint
) {
  const tx = await contract.claimWinnings(roundId);
  return await tx.wait();
}

