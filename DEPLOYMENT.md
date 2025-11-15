# Monad Blitz 배포 가이드

## 사전 준비사항

1. **Monad 네트워크 설정**
   - Monad 테스트넷 또는 메인넷 RPC URL 확인
   - Chainlink Price Feed 주소 확인 (BTC, ETH, MONAD, DOGE)

2. **환경 변수 설정**
   - `PRIVATE_KEY`: 배포에 사용할 지갑의 개인키
   - `.env` 파일 생성 (contracts 디렉토리)

## 스마트 컨트랙트 배포

### 1. 의존성 설치

```bash
cd contracts
npm install
```

### 2. 환경 변수 설정

`contracts` 디렉토리에 `.env` 파일을 생성하고 배포에 사용할 개인키를 설정합니다:

```bash
PRIVATE_KEY=your_private_key_here
```

⚠️ **주의**: `.env` 파일은 절대 공개 저장소에 커밋하지 마세요!

### 3. Chainlink Price Feed 주소 설정

`contracts/scripts/deploy.js` 파일에서 실제 Chainlink Price Feed 주소로 업데이트:

```javascript
const BTC_FEED = "0x..."; // Monad 네트워크의 BTC Price Feed 주소
const SOL_FEED = "0x..."; // Monad 네트워크의 SOL Price Feed 주소
const DOGE_FEED = "0x..."; // Monad 네트워크의 DOGE Price Feed 주소
const PEPE_FEED = "0x..."; // Monad 네트워크의 PEPE Price Feed 주소
```

### 4. 네트워크 설정

`contracts/hardhat.config.js`에서 Monad 네트워크 RPC URL 확인 및 수정

### 5. 컨트랙트 컴파일

```bash
npm run compile
```

### 6. 배포

```bash
npm run deploy
```

배포 스크립트는 다음을 자동으로 수행합니다:
- 컨트랙트 배포
- 배포된 컨트랙트 주소 출력
- ABI 파일 자동 복사 (`src/abis/MonadBlitz.json`)

배포 후 출력된 컨트랙트 주소를 다음 파일에 업데이트해야 합니다:

## 프론트엔드 설정

### 1. 컨트랙트 주소 업데이트

배포 스크립트가 출력한 컨트랙트 주소를 `src/config.ts` 파일에 업데이트:

```typescript
export const CONTRACT_ADDRESS = "0x..."; // 배포된 컨트랙트 주소
```

배포 스크립트가 출력한 주소를 복사하여 붙여넣으세요.

### 2. 게임 서버 설정

`game-server` 디렉토리의 `.env` 파일에 배포된 컨트랙트 주소를 추가:

```bash
CONTRACT_ADDRESS=0x... # 배포된 컨트랙트 주소
RPC_URL=https://testnet-rpc.monad.xyz
SERVER_PRIVATE_KEY=your_server_private_key
```

### 3. 네트워크 설정 확인

`src/config.ts`에서 Monad 네트워크 정보 확인:

```typescript
export const MONAD_NETWORK = {
  chainId: 0x279F, // 10143 (10진수) - Monad Testnet
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  // ...
};
```

### 4. ABI 파일 확인

배포 스크립트가 자동으로 `src/abis/MonadBlitz.json`을 업데이트합니다. 
수동으로 업데이트가 필요한 경우, `contracts/artifacts/contracts/MonadBlitz.sol/MonadBlitz.json`의 `abi` 필드를 복사하세요.

## 실행

### 프론트엔드 개발 서버

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 주의사항

1. **Chainlink Price Feed**: Monad 네트워크에 Chainlink Price Feed가 배포되어 있어야 합니다. 없을 경우 모의(mock) Price Feed를 사용하거나 다른 오라클 솔루션을 고려해야 합니다.

2. **가스 비용**: `updatePositions()` 함수는 가스 비용이 많이 들 수 있습니다. 실제 운영 시 Chainlink Automation을 사용하여 자동으로 호출하도록 설정하는 것을 권장합니다.

3. **보안**: 개인키를 절대 공개 저장소에 커밋하지 마세요. `.env` 파일은 `.gitignore`에 포함되어 있습니다.

4. **테스트**: 배포 전에 로컬 네트워크(Hardhat Network)에서 충분히 테스트하세요.

