import React from "react";
import { HORSES, START_POS, FINISH_POS } from "../config";

interface RaceTrackProps {
  positions: number[];
  winner?: number;
}

export function RaceTrack({ positions, winner }: RaceTrackProps) {
  const trackWidth = 800;
  const trackHeight = 400;
  // Finish line is at the end of the track
  const finishLineX = trackWidth;

  const getHorseX = (position: number) => {
    const progress = (position - START_POS) / (FINISH_POS - START_POS);
    return Math.min(progress * trackWidth, trackWidth);
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
          const x = getHorseX(positions[index] || START_POS);
          const isWinner = winner !== undefined && winner === horse.id;

          return (
            <div
              key={horse.id}
              className={`horse ${isWinner ? "winner" : ""}`}
              style={{
                left: `${x}px`,
                top: `${60 + index * 80}px`,
                backgroundColor: horse.color,
              }}
            >
              <div className="horse-emoji">
                {horse.symbol === "BTC" && "₿"}
                {horse.symbol === "ETH" && "Ξ"}
                {horse.symbol === "MONAD" && "⚡"}
                {horse.symbol === "DOGE" && "🐕"}
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
        {HORSES.map((horse, index) => (
          <div key={horse.id} className="position-indicator">
            <span style={{ color: horse.color }}>{horse.symbol}</span>
            <span>{Math.floor((positions[index] || START_POS) / 100)}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

