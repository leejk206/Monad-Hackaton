export enum Phase {
  Betting = 0,
  Racing = 1,
  Settlement = 2,
  Finished = 3,
}

export interface RoundInfo {
  roundId: bigint;
  startTime: bigint;
  phase: Phase;
  winner: number;
  settled: boolean;
}

export interface Bet {
  bettor: string;
  horseId: number;
  amount: bigint;
  claimed: boolean;
}

export interface HorsePosition {
  horseId: number;
  position: number;
}

export interface GameState {
  roundInfo: RoundInfo | null;
  positions: number[];
  totalBets: bigint[];
  userBets: Bet[];
  userWinnings: bigint;
  timeRemaining: number;
  currentPhase: Phase;
}

