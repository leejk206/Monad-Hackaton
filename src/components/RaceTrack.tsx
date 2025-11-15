import React from "react";
import { HORSES, START_POS, FINISH_POS } from "../config";

interface RaceTrackProps {
  positions: number[];
  winner?: number;
}

export function RaceTrack({ positions, winner }: RaceTrackProps) {
  const trackWidth = 800;
  const trackHeight = 400;
  const horseWidth = 60; // 말의 너비
  // Finish line is at the end of the track
  const finishLineX = trackWidth;

  const getHorseX = (position: number) => {
    // 위치가 500을 넘어가면 안 보이도록 (경기장 크기는 500)
    if (position > FINISH_POS) {
      return -1000; // 화면 밖으로 이동
    }
    // 위치를 500으로 제한
    const clampedPosition = Math.min(position, FINISH_POS);
    const progress = (clampedPosition - START_POS) / (FINISH_POS - START_POS);
    // 말의 너비를 고려하여 위치 계산 (말이 trackWidth를 넘어가지 않도록)
    const maxX = trackWidth - horseWidth;
    return Math.min(progress * trackWidth, maxX);
  };

  return (
    <div className="race-track-container">
      <div className="race-track" style={{ width: trackWidth, height: trackHeight }}>
        {/* Finish line */}
        <div
          className="finish-line"
          style={{
            left: `${finishLineX}px`,
            height: `${trackHeight}px`,
          }}
        >
          <div className="finish-line-flag">🏁</div>
        </div>

        {/* Horses */}
        {HORSES.map((horse, index) => {
          const position = positions[index] || START_POS;
          const x = getHorseX(position);
          const isWinner = winner !== undefined && winner === horse.id;
          // 위치가 500을 넘어가면 숨김
          const isVisible = position <= FINISH_POS;

          return (
            <div
              key={horse.id}
              className={`horse ${isWinner ? "winner" : ""}`}
              style={{
                left: `${x}px`,
                top: `${60 + index * 80}px`,
                backgroundColor: horse.color,
                display: isVisible ? 'flex' : 'none',
              }}
            >
              <div className="horse-emoji">
                {horse.symbol === "BTC" && "₿"}
                {horse.symbol === "SOL" && "🟣"}
                {horse.symbol === "DOGE" && "🐕"}
                {horse.symbol === "PEPE" && "🐸"}
              </div>
              <div className="horse-name">{horse.symbol}</div>
              {isWinner && <div className="winner-crown">👑</div>}
            </div>
          );
        })}

        {/* Track lanes */}
        {HORSES.map((_, index) => (
          <div
            key={`lane-${index}`}
            className="track-lane"
            style={{
              top: `${60 + index * 80}px`,
              width: `${trackWidth}px`,
            }}
          />
        ))}
      </div>

      {/* Position indicators */}
      <div className="position-indicators">
        {HORSES.map((horse, index) => {
          const position = positions[index] || START_POS;
          // 위치가 500을 넘어가면 표시하지 않음
          if (position > FINISH_POS) {
            return null;
          }
          return (
            <div key={horse.id} className="position-indicator">
              <span style={{ color: horse.color }}>{horse.symbol}</span>
              <span>{Math.floor(position)}m</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

