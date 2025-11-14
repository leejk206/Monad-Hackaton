import React from "react";
import { useWallet } from "../hooks/useWallet";
import { ethers } from "ethers";

export function WalletButton() {
  const { address, connected, loading, connectWallet, disconnectWallet } = useWallet();

  if (connected && address) {
    return (
      <div className="wallet-button">
        <span className="wallet-address">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button onClick={disconnectWallet} className="btn-disconnect">
          연결 해제
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={loading}
      className="btn-connect"
    >
      {loading ? "연결 중..." : "지갑 연결"}
    </button>
  );
}

