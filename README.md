# Oracle Derby - On-chain Racing Game

Monad 블록체인 기반의 경마형 게임 dApp입니다. Chainlink Price Feed를 활용하여 코인 가격 변동에 따라 경주가 진행됩니다.

## 🎮 게임 개요

**Oracle Derby**는 4개의 암호화폐(BTC, SOL, DOGE, PEPE)가 경주하는 온체인 경마 게임입니다. 각 코인의 실시간 가격 변동이 말의 속도로 변환되어, 가장 먼저 결승선을 통과하거나 가장 멀리 이동한 코인이 승리합니다.

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Web3**: ethers.js v6
- **Smart Contract**: Solidity 0.8.20 (EVM-compatible, Monad)
- **Oracle**: Chainlink Price Feed
- **Build Tool**: Vite
- **Contract Framework**: Hardhat

## 📋 게임 규칙

### 라운드 구성 (90초)

1. **Betting Phase** (0-35초)
   - 유저들이 4개 코인 중 하나 또는 여러 개에 베팅 가능
   - 최소 베팅: 0.001 MONAD
   - 최대 베팅: 10 MONAD

2. **Racing Phase** (40-80초)
   - Chainlink Price Feed를 통해 주기적으로 각 코인의 가격을 읽어옴
   - 가격 변화율에 따라 말의 속도 결정
   - 위치 업데이트 및 애니메이션 표시
   - 경기장 크기: 500 units

3. **Settlement Phase** (80-90초)
   - 승자 확정 (가장 멀리 이동한 말 승리)
   - 배당금 계산 및 정산
   - 유저가 수익금 수령 가능

### 승리 조건

- **시간 종료 승리**: 80초까지 가장 멀리 이동한 말이 승리
- **동점 처리**: 같은 위치일 경우 말 ID가 낮은 쪽 승리
- **경기장 크기**: 500 units (위치 범위: 0~500)

### 배당금 계산

- 전체 베팅 풀을 승자에 베팅한 유저들에게 비례 분배
- 수수료는 현재 미적용 (추후 추가 가능)

### 속도 계산

- **기본 속도**: 2 units/sec
- **가격 변동 반영**: 가격 변화율에 따라 속도가 변동됩니다
- **속도 배수**: `SPEED_MULTIPLIER = 2500`

## 🚀 설치 및 실행

### 프론트엔드

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 스마트 컨트랙트

```bash
cd contracts

# 의존성 설치
npm install

# 컨트랙트 컴파일
npm run compile

# 테스트 실행
npm test

# 배포 (네트워크 설정 필요)
npm run deploy
```

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

### 게임 서버 (선택사항)

게임 서버는 자동으로 `updatePositions()` 및 `settleRound()`를 호출합니다.

```bash
cd game-server

# 의존성 설치
npm install

# .env 파일 설정
# SERVER_PRIVATE_KEY=your_private_key
# RPC_URL=https://testnet-rpc.monad.xyz
# CONTRACT_ADDRESS=0x...

# 서버 실행
npm start
```

자세한 내용은 [game-server/README.md](./game-server/README.md)를 참고하세요.

## 📁 프로젝트 구조

```
Monad-Hackaton/
├── contracts/                    # 스마트 컨트랙트
│   ├── contracts/
│   │   └── MonadBlitz.sol       # 메인 게임 컨트랙트
│   ├── scripts/
│   │   ├── deploy.js            # 배포 스크립트
│   │   ├── registerUpkeep.js    # Chainlink Automation 등록
│   │   └── manageUpkeep.js      # Chainlink Automation 관리
│   └── hardhat.config.js        # Hardhat 설정
├── src/                         # 프론트엔드 소스
│   ├── components/              # React 컴포넌트
│   │   ├── BettingPanel.tsx     # 베팅 패널
│   │   ├── GameTimer.tsx        # 게임 타이머
│   │   ├── RaceTrack.tsx        # 경주 트랙
│   │   ├── TradingViewChart.tsx # 가격 차트
│   │   ├── WalletButton.tsx     # 지갑 연결 버튼
│   │   └── WinningsPanel.tsx    # 상금 패널
│   ├── hooks/                   # Custom Hooks
│   │   ├── useGameState.ts      # 게임 상태 관리
│   │   └── useWallet.ts         # 지갑 연결 관리
│   ├── utils/                   # 유틸리티 함수
│   │   └── contract.ts          # 컨트랙트 인터랙션
│   ├── abis/                    # 컨트랙트 ABI
│   │   └── MonadBlitz.json
│   ├── config.ts                # 설정 파일
│   └── App.tsx                  # 메인 앱 컴포넌트
├── game-server/                 # 게임 서버
│   ├── index.js                 # 메인 서버 파일
│   └── README.md
└── README.md
```

## ⚙️ 설정

### 컨트랙트 주소 설정

배포 후 `src/config.ts`에서 컨트랙트 주소를 업데이트하세요:

```typescript
export const CONTRACT_ADDRESS = "0x896779DC2526e5eBA5852A0D98aA03326FF8eaA5";
```

### 네트워크 설정

`src/config.ts`에서 Monad 네트워크 정보를 확인/수정하세요:

```typescript
export const MONAD_NETWORK = {
  chainId: 0x279F, // 10143 (10진수) - Monad Testnet
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  nativeCurrency: {
    name: "Monad",
    symbol: "MONAD",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
};
```

### Chainlink Price Feed 주소

`contracts/scripts/deploy.js`에서 실제 Price Feed 주소로 업데이트하세요:

```javascript
const BTC_FEED = "0x...";  // BTC Price Feed 주소
const SOL_FEED = "0x...";  // SOL Price Feed 주소
const DOGE_FEED = "0x..."; // DOGE Price Feed 주소
const PEPE_FEED = "0x..."; // PEPE Price Feed 주소
```

## 🔧 주요 기능

- ✅ 지갑 연결 (MetaMask)
- ✅ 실시간 게임 상태 조회
- ✅ 베팅 기능 (다중 코인 베팅 가능)
- ✅ 경주 애니메이션
- ✅ 배당금 정산 및 수령
- ✅ 타이머 및 Phase 관리
- ✅ Chainlink Price Feed 연동
- ✅ TradingView 차트 연동
- ✅ 게임 서버 자동화 (선택사항)

## 📝 TODO

- [ ] Chainlink Automation을 통한 자동 `updatePositions()` 호출
- [ ] 속도 결정식 튜닝 및 최적화
- [ ] 수수료 로직 추가
- [ ] 이벤트 기반 베터 인덱싱 (가스 최적화)
- [ ] 모바일 반응형 UI 개선
- [ ] 게임 히스토리 조회 기능

## ⚠️ 주의사항

1. **Chainlink Price Feed**: Monad 네트워크에 Chainlink Price Feed가 배포되어 있어야 합니다.
2. **가스 비용**: `updatePositions()` 함수는 가스 비용이 많이 들 수 있으므로, 실제 운영 시 Chainlink Automation 사용을 권장합니다.
3. **테스트**: 배포 전에 로컬 네트워크에서 충분히 테스트하세요.
4. **게임 서버**: 게임 서버를 실행하려면 서버 지갑에 충분한 MONAD 토큰이 필요합니다.

## 📚 추가 문서

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [RUN_GUIDE.md](./RUN_GUIDE.md) - 실행 가이드
- [ENV_SETUP.md](./ENV_SETUP.md) - 환경 변수 설정
- [AUTOMATION_SETUP.md](./AUTOMATION_SETUP.md) - Chainlink Automation 설정
- [game-server/README.md](./game-server/README.md) - 게임 서버 가이드

## 📄 라이선스

MIT
