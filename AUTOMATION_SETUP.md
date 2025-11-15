# Chainlink Automation 설정 가이드

Chainlink Automation을 사용하면 MetaMask 서명 없이 자동으로 `updatePositions()` 함수가 실행됩니다.

## 📋 사전 준비

1. **LINK 토큰**: Automation 가스비 충전용
2. **Chainlink Automation Registry 주소**: Monad 네트워크의 Registry 주소
3. **컨트랙트 배포**: Automation 호환 버전으로 배포

## 🔧 설정 단계

### 1. 컨트랙트 배포 확인

컨트랙트가 `AutomationCompatibleInterface`를 구현했는지 확인:
- `checkUpkeep()` 함수 구현됨
- `performUpkeep()` 함수 구현됨

### 2. Chainlink Automation Registry 주소 확인

Monad 네트워크의 Chainlink Automation Registry 주소를 확인하세요. (테스트넷/메인넷 문서 참조)

일반적인 주소:
- **Ethereum Sepolia**: `0xE16Df59B887e3Caa439E0b29B42bA2e7976FD8b2`
- **Monad**: 네트워크별로 다름 (확인 필요)

### 3. Upkeep 등록 방법

#### 방법 A: Chainlink Automation UI 사용 (권장)

1. **Chainlink Automation 대시보드 접속**
   - https://automation.chain.link/ 접속
   - 지갑 연결 (LINK 토큰 보유 필요)

2. **새 Upkeep 등록**
   - "Register new Upkeep" 클릭
   - 컨트랙트 주소 입력: `YOUR_CONTRACT_ADDRESS`
   - Upkeep 이름: "MonadBlitz Position Updater"
   - 가스 한도: 약 500,000 (필요에 따라 조정)
   - 시작 잔액: 최소 5 LINK (권장: 10-20 LINK)

3. **트리거 설정**
   - **트리거 타입**: "Custom Logic" 선택
   - **체크 데이터**: 비워두기 (빈 bytes: `0x`)
   - **체크 간격**: 5-10초 (Racing Phase 동안 자주 체크)

4. **등록 완료**
   - LINK 토큰 승인 및 등록 비용 지불
   - Upkeep ID 저장 (나중에 관리에 필요)

#### 방법 B: 스크립트로 등록

```javascript
// scripts/registerUpkeep.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Chainlink Automation Registry 주소 (Monad 네트워크)
  const REGISTRY_ADDRESS = "0x..."; // Monad 네트워크의 Registry 주소
  
  // 컨트랙트 주소
  const CONTRACT_ADDRESS = "0x..."; // 배포된 MonadBlitz 컨트랙트 주소
  
  // Upkeep 등록자 (LINK 토큰 보유자)
  const [deployer] = await ethers.getSigners();
  console.log("등록자 주소:", deployer.address);
  
  // Registry ABI (간단 버전)
  const registryABI = [
    "function registerUpkeep(address target, uint32 gasLimit, address admin, bytes calldata checkData, uint96 balance, bytes calldata offchainConfig) external returns (uint256)"
  ];
  
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, deployer);
  
  // Upkeep 설정
  const gasLimit = 500000; // 가스 한도
  const checkData = "0x"; // 빈 체크 데이터
  const balance = ethers.parseEther("10"); // 10 LINK
  const offchainConfig = "0x"; // 오프체인 설정 (비워둠)
  
  console.log("Upkeep 등록 중...");
  const tx = await registry.registerUpkeep(
    CONTRACT_ADDRESS,
    gasLimit,
    deployer.address, // 관리자 주소
    checkData,
    balance,
    offchainConfig
  );
  
  await tx.wait();
  console.log("Upkeep 등록 완료! 트랜잭션:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Upkeep 관리

#### 잔액 확인 및 충전

```javascript
// scripts/manageUpkeep.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const REGISTRY_ADDRESS = "0x...";
  const UPKEEP_ID = "1234567890"; // 등록된 Upkeep ID
  
  const registryABI = [
    "function getUpkeep(uint256 id) external view returns (address target, uint32 executeGas, bytes memory checkData, uint96 balance, address admin, uint64 maxValidBlocknumber, uint32 lastPerformBlockNumber, uint96 amountSpent, bool paused, bytes memory offchainConfig)",
    "function addFunds(uint256 id, uint96 amount) external"
  ];
  
  const [signer] = await ethers.getSigners();
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, signer);
  
  // 잔액 확인
  const upkeep = await registry.getUpkeep(UPKEEP_ID);
  console.log("현재 잔액:", ethers.formatEther(upkeep.balance), "LINK");
  
  // 잔액 충전 (10 LINK 추가)
  const linkTokenAddress = "0x..."; // LINK 토큰 주소
  const linkABI = ["function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)"];
  const linkToken = new ethers.Contract(linkTokenAddress, linkABI, signer);
  
  const amount = ethers.parseEther("10");
  const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [UPKEEP_ID]);
  
  console.log("잔액 충전 중...");
  const tx = await linkToken.transferAndCall(REGISTRY_ADDRESS, amount, data);
  await tx.wait();
  console.log("충전 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## ⚙️ 작동 원리

1. **체크 단계** (`checkUpkeep`)
   - Chainlink Automation이 주기적으로 `checkUpkeep()` 호출
   - Racing Phase인지, 정산이 필요한지 확인
   - `upkeepNeeded = true` 반환 시 실행 단계로 진행

2. **실행 단계** (`performUpkeep`)
   - Chainlink Automation이 `performUpkeep()` 호출
   - 위치 업데이트, 정산, 새 라운드 시작 등 수행
   - 가스비는 Upkeep 잔액에서 자동 차감

## 📊 예상 비용

- **등록 비용**: 약 0.1 LINK (일회성)
- **가스비**: 호출당 약 0.001-0.01 LINK (네트워크 가스 가격에 따라 다름)
- **권장 초기 잔액**: 10-20 LINK (약 1000-2000회 호출 가능)

## 🔍 모니터링

Chainlink Automation 대시보드에서 확인 가능:
- Upkeep 실행 이력
- 잔액 및 소비량
- 성공/실패 통계
- 마지막 실행 시간

## ⚠️ 주의사항

1. **LINK 잔액 부족**: 잔액이 부족하면 자동 실행이 중단됩니다. 정기적으로 확인하세요.
2. **가스 한도**: 가스 한도가 부족하면 실행이 실패할 수 있습니다. 충분히 설정하세요.
3. **네트워크 지원**: Monad 네트워크에 Chainlink Automation이 지원되는지 확인하세요.
4. **테스트**: 메인넷 배포 전 테스트넷에서 충분히 테스트하세요.

## 🚀 대안: Gelato Network

Monad 네트워크에 Chainlink Automation이 지원되지 않는 경우, Gelato Network를 사용할 수 있습니다:

```javascript
// Gelato는 다른 인터페이스를 사용합니다
// 컨트랙트에 Gelato 호환 함수 추가 필요
```

## 📝 체크리스트

- [ ] 컨트랙트 배포 완료
- [ ] Chainlink Automation Registry 주소 확인
- [ ] LINK 토큰 보유 (최소 10 LINK)
- [ ] Upkeep 등록 완료
- [ ] 초기 잔액 충전 완료
- [ ] 테스트 실행 확인
- [ ] 모니터링 설정

