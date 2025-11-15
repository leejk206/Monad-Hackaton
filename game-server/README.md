# Oracle Derby 게임 서버

로컬 PC에서 실행하는 게임 서버입니다. `updatePositions()`, `settleRound()`, `startNewRound()`를 자동으로 호출합니다.

## 기능

- ✅ Racing Phase 중 `updatePositions()` 자동 호출 (5초마다)
- ✅ Settlement Phase에서 `settleRound()` 자동 호출
- ✅ Finished Phase에서 `startNewRound()` 자동 호출
- ✅ 게임 상태 모니터링
- ✅ 이벤트 리스닝 (라운드 시작, 위치 업데이트, 정산 등)

## 설치

```bash
cd game-server
npm install
```

## 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# 서버 지갑의 개인키 (가스비 충전 필요, 0x 없이)
SERVER_PRIVATE_KEY=your_private_key_here

# RPC URL (선택사항)
RPC_URL=https://testnet-rpc.monad.xyz

# 컨트랙트 주소 (선택사항, 기본값: 최신 배포 주소)
CONTRACT_ADDRESS=0xE60028f572D45912C655f03A260f81Ee0848c387
```

## 실행

```bash
npm start
```

또는

```bash
node index.js
```

## 주의사항

1. **가스비 충전**: 서버 지갑에 충분한 MONAD 토큰을 보유해야 합니다.
2. **네트워크**: Monad Testnet에 연결되어 있어야 합니다.
3. **컨트랙트 주소**: 배포된 컨트랙트 주소와 일치해야 합니다.

## 로그

서버는 다음 정보를 출력합니다:
- 게임 상태 (10초마다)
- 트랜잭션 전송 및 확인
- 이벤트 발생 (라운드 시작, 베팅, 정산 등)
- 잔액 확인 (5분마다)

