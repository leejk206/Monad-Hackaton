import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MONAD_NETWORK } from "../config";

export function useWallet() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);

      // Check if already connected
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet();
        }
      });

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          disconnectWallet();
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask가 설치되어 있지 않습니다. MetaMask를 설치해주세요.");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send("eth_requestAccounts", []);
      
      // Check network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== MONAD_NETWORK.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${MONAD_NETWORK.chainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          // Chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${MONAD_NETWORK.chainId.toString(16)}`,
                  chainName: MONAD_NETWORK.name,
                  rpcUrls: [MONAD_NETWORK.rpcUrl],
                  nativeCurrency: MONAD_NETWORK.nativeCurrency,
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setConnected(true);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      alert(`지갑 연결 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setConnected(false);
  };

  return {
    provider,
    signer,
    address,
    connected,
    loading,
    connectWallet,
    disconnectWallet,
  };
}

