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

### 2. Chainlink Price Feed 주소 설정

`contracts/scripts/deploy.js` 파일에서 실제 Chainlink Price Feed 주소로 업데이트:

```javascript
const BTC_FEED = "0x..."; // Monad 네트워크의 BTC Price Feed 주소
const ETH_FEED = "0x..."; // Monad 네트워크의 ETH Price Feed 주소
const MONAD_FEED = "0x..."; // Monad 네트워크의 MONAD Price Feed 주소
const DOGE_FEED = "0x..."; // Monad 네트워크의 DOGE Price Feed 주소
```

### 3. 네트워크 설정

`contracts/hardhat.config.js`에서 Monad 네트워크 RPC URL 확인 및 수정

### 4. 컨트랙트 컴파일

```bash
npm run compile
```

### 5. 배포

```bash
npm run deploy
```

배포 후 출력된 컨트랙트 주소를 복사합니다.

## 프론트엔드 설정

### 1. 컨트랙트 주소 업데이트

`src/config.ts` 파일에서 배포된 컨트랙트 주소로 업데이트:

```typescript
export const CONTRACT_ADDRESS = "0x..."; // 배포된 컨트랙트 주소
```

### 2. 네트워크 설정 확인

`src/config.ts`에서 Monad 네트워크 정보 확인:

```typescript
export const MONAD_NETWORK = {
  chainId: 0x1a4, // 실제 Monad 체인 ID
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz", // 실제 RPC URL
  // ...
};
```

### 3. ABI 업데이트 (선택사항)

컨트랙트를 수정한 경우, `src/abis/MonadBlitz.json`을 업데이트해야 합니다.

컴파일된 ABI는 `contracts/artifacts/contracts/MonadBlitz.sol/MonadBlitz.json`에서 확인할 수 있습니다.

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

