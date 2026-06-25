# 환경 세팅 가이드 — Nexys Blockly Studio

팀원이 이 레포를 **로컬에서 실행**하기 위한 단계별 가이드입니다. Windows / macOS 모두 다룹니다.

---

## 0. 요약 — 무엇이 필요한가?

이 프로젝트는 **순수 프론트엔드 웹앱**입니다. 외부 DB·백엔드 서버·API 키·클라우드 계정이 **필요 없습니다.**

| 항목 | 필요 버전 | 용도 |
|---|---|---|
| **Node.js** | 18.18 이상 (권장 **20 LTS**) | Next.js 개발 서버 실행 |
| **npm** | Node에 포함 | 의존성 설치 |
| **git** | 최신 | 레포 클론 |
| (선택) **Python** | 3.8 이상 | `sdk/` — 생성 코드 실행 / 자체검증 |

`package.json`의 의존성(Next 14 · React 18 · Blockly 11 · Monaco · Tailwind 3 · Radix Dialog · lucide · sonner)은 `npm install` 한 번으로 전부 설치됩니다. **그 외 수동 설치 항목은 없습니다.**

---

## 1. 공통 절차

```bash
git clone <repo-url>
cd nexys-blockly-studio
npm install          # package.json 의존성 설치 (수 분 소요)
npm run dev          # 개발 서버 시작
```

브라우저에서 **http://localhost:3000** 접속 → 스튜디오 화면이 뜨면 성공입니다.

> 최소 화면 폭 1280px 기준으로 설계되었습니다 (데스크탑 우선).

기타 명령:

```bash
npm run build        # 프로덕션 빌드 (배포 전 검증)
npm run start        # 빌드 결과 실행
npm run lint         # 린트 (있는 경우)
```

---

## 2. macOS

### 2-1. Homebrew로 Node + git 설치
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"  # Homebrew 없을 때만
brew install node@20 git
node -v    # v20.x 확인
npm -v
```

`node@20`이 PATH에 안 잡히면:
```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 2-2. 실행
```bash
git clone <repo-url>
cd nexys-blockly-studio
npm install
npm run dev
```

---

## 3. Windows

### 3-1. Node 설치 (둘 중 하나)
- **간단**: <https://nodejs.org> 에서 **20 LTS** 설치 프로그램 실행.
- **버전 관리 권장**: [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 설치 후
  ```powershell
  nvm install 20
  nvm use 20
  node -v
  ```

git: <https://git-scm.com/download/win> 설치.

### 3-2. 실행 (PowerShell)
```powershell
git clone <repo-url>
cd nexys-blockly-studio
npm install
npm run dev
```

### 3-3. 자주 겪는 문제
- **스크립트 실행 정책 오류** (`npm.ps1 cannot be loaded`):
  관리자 PowerShell에서 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 실행 후 재시도.
- **경로 길이 / 권한**: 레포를 `C:\dev\` 처럼 짧고 권한 있는 경로에 두세요. OneDrive 동기화 폴더는 피하세요.
- **포트 3000 사용 중**: `npm run dev -- -p 3001` 로 포트 변경.

---

## 4. nexys SDK (Python · 선택)

스튜디오 화면은 Node만으로 동작합니다. 아래는 **생성된 Python을 실제로 실행**하거나 **자체검증(BIT)**, **이더넷 수신 확인**을 하려는 경우에만 필요합니다.

```bash
# 가상환경 권장
python3 -m venv .venv
# macOS:        source .venv/bin/activate
# Windows:      .venv\Scripts\activate

pip install -e sdk            # 시뮬 백엔드 + TDMS (순수 stdlib, 의존성 0)
pip install -e "sdk[ni]"     # 실제 NI 하드웨어 (nidaqmx)
pip install -e "sdk[dev]"    # pytest + npTDMS (테스트용)
```

확인:
```bash
python sdk/examples/bit_demo.py        # 시뮬 BIT 실행 + bit_demo.tdms 생성
python sdk/examples/selftest_demo.py   # UDP/TCP/Serial 루프백 자체검증
python -m nexys.netcheck ips           # 이 PC의 IP 주소 출력
pytest sdk                             # 전체 테스트
```

---

## 5. 팀 협업 (프로토타입 공유)

- 코드는 **git push**로 공유합니다.
- 팀원에게 보여줄 라이브 URL이 필요하면 **Vercel**에 연결하는 것이 가장 간단합니다
  (이 레포를 import → 자동 빌드/배포). 별도 서버 설정 불필요.
- 보안(접근 제한)은 초기 단계에서는 생략 가능하며, 필요해지면 Vercel Deployment Protection으로 추가합니다.

---

문제가 계속되면 `node -v`, `npm -v`, OS 버전, 에러 전문을 공유해 주세요.
