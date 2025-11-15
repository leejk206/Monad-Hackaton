# .env 파일 설정 가이드

## 📁 파일 위치

`.env` 파일은 **`contracts/`** 폴더에 생성해야 합니다.

```
Monad-Hackaton/
├── contracts/
│   ├── .env          ← 여기에 생성!
│   ├── hardhat.config.js
│   ├── scripts/
│   └── ...
└── src/
```

## 📝 파일 내용

`contracts/.env` 파일에 다음 내용을 작성하세요:

```env
# 배포에 사용할 지갑의 개인키 (0x 접두사 없이)
PRIVATE_KEY=your_private_key_here_without_0x

# 선택사항: 배포된 컨트랙트 주소 (배포 후 수동 업데이트)
CONTRACT_ADDRESS=

# 선택사항: Chainlink Automation Upkeep ID (등록 후)
UPKEEP_ID=
```

## 🔑 PRIVATE_KEY 가져오는 방법

### MetaMask에서 가져오기

1. MetaMask 확장 프로그램 열기
2. 계정 메뉴 (점 3개) 클릭
3. **"계정 세부 정보"** 또는 **"Account details"** 선택
4. **"개인키 내보내기"** 또는 **"Export Private Key"** 클릭
5. 비밀번호 입력 후 개인키 복사
6. **주의**: `0x` 접두사가 있으면 제거하세요

### 예시

```env
# 올바른 형식 (0x 없음)
PRIVATE_KEY=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# 잘못된 형식 (0x 포함)
PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## ⚠️ 보안 주의사항

1. **절대 공개하지 마세요**: `.env` 파일은 이미 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.
2. **테스트용 지갑 사용**: 메인넷에 실제 자금이 있는 지갑의 개인키는 사용하지 마세요.
3. **충분한 가스비**: 배포 및 트랜잭션에 필요한 네이티브 토큰(MONAD)을 지갑에 보유하세요.

## 🚀 사용 방법

1. `contracts/` 폴더에 `.env` 파일 생성
2. 위의 형식에 맞춰 `PRIVATE_KEY` 입력
3. 배포 명령어 실행:
   ```bash
   cd contracts
   npm run deploy
   ```

## 📋 체크리스트

- [ ] `contracts/.env` 파일 생성
- [ ] `PRIVATE_KEY` 입력 (0x 없이)
- [ ] 지갑에 충분한 가스비 보유 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인 (이미 포함됨)

