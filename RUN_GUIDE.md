# 실행 가이드

게임 서버와 프론트엔드를 실행하는 방법입니다.

## 📋 사전 준비

1. **서버 지갑 준비**: 가스비를 충전할 지갑이 필요합니다
2. **개인키 준비**: 서버 지갑의 개인키 (0x 없이)

## 🖥️ 1단계: 게임 서버 실행 (로컬 PC)

게임 서버는 `updatePositions()`, `settleRound()`, `startNewRound()`를 자동으로 호출합니다.

### 서버 설정

```bash
cd game-server
npm install
```

### .env 파일 생성

`game-server/.env` 파일을 생성하고 다음 내용을 입력:

```env
# 서버 지갑의 개인키 (가스비 충전 필요, 0x 없이)
SERVER_PRIVATE_KEY=your_private_key_here

# RPC URL (선택사항 - 기본값 사용)
RPC_URL=https://testnet-rpc.monad.xyz

# 컨트랙트 주소 (선택사항 - 기본값 사용)
CONTRACT_ADDRESS=0x4e1a649aE9ed9d22D97122eEd54272c361Ed8092
```

### 서버 실행

```bash
npm start
```

서버가 실행되면 다음과 같은 로그가 출력됩니다:
- 서버 지갑 주소 및 잔액
- 이벤트 리스너 설정 완료
- 자동 실행 시작 메시지
- 게임 상태 및 트랜잭션 로그

**중요**: 서버는 계속 실행되어야 합니다. 종료하면 자동 업데이트가 중단됩니다.

## 🌐 2단계: 프론트엔드 실행

프론트엔드는 지갑 연결, 베팅, 클레임만 처리합니다.

### 프론트엔드 실행

새 터미널 창을 열고:

```bash
cd C:\Users\Jk Lee\Documents\GitHub\Monad-Hackaton
npm run dev
```

브라우저에서 `http://localhost:5173` (또는 표시된 주소)로 접속합니다.

## ✅ 실행 확인

### 서버가 정상 작동하는지 확인:
- 서버 콘솔에 "🚀 Oracle Derby 게임 서버 시작" 메시지 표시
- 잔액이 충분한지 확인 (최소 0.01 MONAD 권장)
- Racing Phase가 되면 "updatePositions 호출" 메시지가 주기적으로 표시

### 프론트엔드가 정상 작동하는지 확인:
- 브라우저에서 게임 화면이 표시됨
- 지갑 연결 가능
- 게임 상태가 실시간으로 업데이트됨

## 🔧 문제 해결

### 서버 오류
- **"SERVER_PRIVATE_KEY가 설정되지 않았습니다"**: `.env` 파일에 `SERVER_PRIVATE_KEY`를 설정하세요
- **"잔액이 부족합니다"**: 서버 지갑에 MONAD 토큰을 충전하세요
- **트랜잭션 실패**: 네트워크 연결 및 가스비를 확인하세요

### 프론트엔드 오류
- **컨트랙트 연결 실패**: `src/config.ts`의 `CONTRACT_ADDRESS`가 올바른지 확인
- **네트워크 오류**: MetaMask에서 Monad Testnet이 선택되어 있는지 확인

## 📝 실행 순서 요약

1. **터미널 1**: 게임 서버 실행
   ```bash
   cd game-server
   npm install
   # .env 파일 생성 및 설정
   npm start
   ```

2. **터미널 2**: 프론트엔드 실행
   ```bash
   cd C:\Users\Jk Lee\Documents\GitHub\Monad-Hackaton
   npm run dev
   ```

3. **브라우저**: `http://localhost:5173` 접속

## 💡 팁

- 서버는 백그라운드에서 계속 실행되어야 합니다
- 서버 콘솔을 확인하여 트랜잭션이 정상적으로 전송되는지 모니터링하세요
- 가스비가 부족하면 서버 지갑에 토큰을 충전하세요

