import React from "react";
import { Phase } from "../types";
import { ROUND_DURATION, BETTING_PHASE_END, RACING_PHASE_START, RACING_PHASE_END } from "../config";

interface GameTimerProps {
  timeRemaining: number;
  phase: Phase;
}

export function GameTimer({ timeRemaining, phase }: GameTimerProps) {
  const getPhaseName = () => {
    switch (phase) {
      case Phase.Betting:
        return "베팅 단계";
      case Phase.Racing:
        return "경주 진행";
      case Phase.Settlement:
        return "정산 단계";
      case Phase.Finished:
        return "종료";
      default:
        return "대기 중";
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case Phase.Betting:
        return "#4CAF50";
      case Phase.Racing:
        return "#FF9800";
      case Phase.Settlement:
        return "#2196F3";
      case Phase.Finished:
        return "#9E9E9E";
      default:
        return "#757575";
    }
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="game-timer">
      <div className="timer-phase" style={{ color: getPhaseColor() }}>
        {getPhaseName()}
      </div>
      <div className="timer-time">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="timer-progress">
        <div
          className="timer-progress-bar"
          style={{
            width: `${(timeRemaining / ROUND_DURATION) * 100}%`,
            backgroundColor: getPhaseColor(),
          }}
        />
      </div>
    </div>
  );
}

