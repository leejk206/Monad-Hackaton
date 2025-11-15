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
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            handleAutoConnect(provider);
          }
        })
        .catch((error: any) => {
          console.error("Error checking accounts:", error);
        });

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          handleAutoConnect(provider);
        } else {
          disconnectWallet();
        }
      };

      // Listen for chain changes - 상태만 업데이트 (새로고침 없이)
      const handleChainChanged = async (chainId: string) => {
        console.log("Chain changed to:", chainId);
        // 새로고침 대신 provider 재생성
        try {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);
          if (address) {
            const newSigner = await newProvider.getSigner();
            setSigner(newSigner);
          }
        } catch (error) {
          console.error("Error updating provider on chain change:", error);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  const handleAutoConnect = async (provider: ethers.BrowserProvider) => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setConnected(true);
    } catch (error: any) {
      console.error("Error auto-connecting:", error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask가 설치되어 있지 않습니다.\n\nMetaMask를 설치해주세요:\nhttps://metamask.io/download/");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send("eth_requestAccounts", []);
      
      // Check network - 네트워크 체크를 선택적으로 처리 (로컬 테스트를 위해)
      try {
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        const targetChainId = MONAD_NETWORK.chainId;

        if (currentChainId !== targetChainId) {
          try {
            // Try to switch network
            await window.ethereum!.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: `0x${targetChainId.toString(16)}` }],
            });
            // 네트워크 전환 후 provider 재생성 (새로고침 없이)
            const updatedProvider = new ethers.BrowserProvider(window.ethereum);
            const updatedSigner = await updatedProvider.getSigner();
            setProvider(updatedProvider);
            setSigner(updatedSigner);
          } catch (switchError: any) {
            // Chain doesn't exist, add it
            if (switchError.code === 4902 || switchError.code === -32603) {
              try {
                await window.ethereum!.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: `0x${targetChainId.toString(16)}`,
                      chainName: MONAD_NETWORK.name,
                      rpcUrls: [MONAD_NETWORK.rpcUrl],
                      nativeCurrency: MONAD_NETWORK.nativeCurrency,
                      blockExplorerUrls: MONAD_NETWORK.blockExplorerUrls || [],
                    },
                  ],
                });
                // 네트워크 추가 후 provider 재생성
                const updatedProvider = new ethers.BrowserProvider(window.ethereum);
                const updatedSigner = await updatedProvider.getSigner();
                setProvider(updatedProvider);
                setSigner(updatedSigner);
              } catch (addError: any) {
                // 네트워크 추가 실패해도 계속 진행
                console.warn("Network add failed, continuing anyway:", addError);
              }
            } else {
              // 네트워크 전환 실패해도 계속 진행 (로컬 테스트를 위해)
              console.warn("Network switch failed, continuing anyway:", switchError);
            }
          }
        }
      } catch (networkError: any) {
        // 네트워크 체크 실패해도 계속 진행
        console.warn("Network check failed, continuing anyway:", networkError);
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setConnected(true);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      
      // 더 자세한 에러 메시지
      let errorMessage = "지갑 연결에 실패했습니다.";
      if (error.code === 4001) {
        errorMessage = "사용자가 연결 요청을 거부했습니다.";
      } else if (error.code === -32002) {
        errorMessage = "이미 연결 요청이 진행 중입니다. MetaMask를 확인해주세요.";
      } else if (error.message) {
        errorMessage = `지갑 연결 실패: ${error.message}`;
      }
      
      alert(errorMessage);
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

