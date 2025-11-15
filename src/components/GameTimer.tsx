import React from "react";
import { Phase } from "../types";
import {
  ROUND_DURATION,
  BETTING_PHASE_END,
  RACING_PHASE_START,
  RACING_PHASE_END,
} from "../config";

interface GameTimerProps {
  timeRemaining: number; // 라운드 전체 기준 남은 시간 (초)
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
        return "라운드 종료";
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

  // 라운드 전체에서 경과한 시간(초)
  const elapsed = Math.max(0, ROUND_DURATION - timeRemaining);

  // 각 단계별 시간 구간
  const PHASE_RANGES = {
    [Phase.Betting]: { start: 0, end: BETTING_PHASE_END },
    [Phase.Racing]: { start: RACING_PHASE_START, end: RACING_PHASE_END },
    [Phase.Settlement]: { start: RACING_PHASE_END, end: ROUND_DURATION },
    [Phase.Finished]: { start: 0, end: 0 },
  } as const;

  const currentRange = PHASE_RANGES[phase] || PHASE_RANGES[Phase.Betting];

  // 이 단계 총 길이(초)
  const phaseTotal = Math.max(1, currentRange.end - currentRange.start);

  // 이 단계 안에서 경과한 시간
  const phaseElapsed = (() => {
    if (phase === Phase.Finished) return phaseTotal;
    if (elapsed <= currentRange.start) return 0;
    if (elapsed >= currentRange.end) return phaseTotal;
    return elapsed - currentRange.start;
  })();

  // 이 단계 기준 남은 시간(초)
  const phaseRemaining = Math.max(0, phaseTotal - phaseElapsed);

  // progress bar는 "남은 비율" 기준으로 줄어들게
  const phaseRemainingPercent = Math.min(
    100,
    Math.max(0, (phaseRemaining / phaseTotal) * 100)
  );

  const minutes = Math.floor(phaseRemaining / 60);
  const seconds = phaseRemaining % 60;

  // 다음 단계 정보 계산
  const getNextPhaseInfo = () => {
    // Finished면 그냥 다음 라운드 대기
    if (phase === Phase.Finished) {
      return {
        label: "다음 라운드 대기 중",
        seconds: null,
      };
    }

    let nextLabel = "";
    let nextAt = 0; // 라운드 시작 기준 시간(초)

    switch (phase) {
      case Phase.Betting:
        nextLabel = "경주 진행";
        // 실제로는 RACING_PHASE_START 시점에 경주 시작
        nextAt = RACING_PHASE_START;
        break;
      case Phase.Racing:
        nextLabel = "정산 단계";
        nextAt = RACING_PHASE_END;
        break;
      case Phase.Settlement:
        nextLabel = "라운드 종료";
        nextAt = ROUND_DURATION;
        break;
      default:
        nextLabel = "다음 단계";
        nextAt = elapsed;
        break;
    }

    const raw = Math.max(0, nextAt - elapsed);
    return {
      label: nextLabel,
      seconds: raw,
    };
  };

  const { label: nextPhaseLabel, seconds: nextPhaseSeconds } =
    getNextPhaseInfo();

  const nextMin =
    nextPhaseSeconds != null ? Math.floor(nextPhaseSeconds / 60) : 0;
  const nextSec = nextPhaseSeconds != null ? nextPhaseSeconds % 60 : 0;

  return (
    <div className="game-timer">
      {/* 현재 단계 이름 */}
      <div className="timer-phase" style={{ color: getPhaseColor() }}>
        {getPhaseName()}
      </div>

      {/* 현재 단계 기준 남은 시간 */}
      <div className="timer-time">
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>

      {/* 남은 비율 기준 progress bar (줄어드는 방향) */}
      <div className="timer-progress">
        <div
          className="timer-progress-bar"
          style={{
            width: `${phaseRemainingPercent}%`,
            backgroundColor: getPhaseColor(),
            transition: "width 0.3s linear",
          }}
        />
      </div>

      {/* 다음 단계 정보 */}
      <div className="timer-subtext">
        {phase === Phase.Finished ? (
          <>다음 단계: {nextPhaseLabel}</>
        ) : (
          <>
            다음 단계: {nextPhaseLabel}
            {String(nextMin).padStart(2, "0")}:
            {String(nextSec).padStart(2, "0")}
          </>
        )}
      </div>
    </div>
  );
}
