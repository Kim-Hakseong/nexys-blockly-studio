# Nexys Blockly Studio

> 라즈베리파이/NI 기반 산업·방산 계측 모듈을 **코딩 없이 드래그앤드롭으로 커스터마이즈**하는 비주얼 프로그래밍 웹 IDE.
> 블록을 조립하면 NI-DAQmx 기반 Python이 실시간 생성되고, 하드웨어 없이 시뮬레이션·자체검증(BIT)까지 할 수 있습니다.

---

## 빠른 시작 (로컬 실행)

필요한 건 **Node.js 20 LTS + git** 뿐입니다. 외부 DB·백엔드·API 키가 필요 없습니다.

```bash
git clone <repo-url>
cd nexys-blockly-studio
npm install          # package.json 의존성 설치
npm run dev          # http://localhost:3000
```

브라우저에서 **http://localhost:3000** 접속 → 스튜디오가 뜨면 성공입니다. (데스크탑 우선, 최소 폭 1280px)

> **Windows / macOS 단계별 가이드, 트러블슈팅, Python SDK 설치는 → [`docs/SETUP.md`](docs/SETUP.md)**
> 스튜디오 화면 우상단 **Guide** 버튼으로도 환경 세팅 요약을 볼 수 있습니다.

기타 명령:
```bash
npm run build        # 프로덕션 빌드 (배포 전 검증)
npx tsc --noEmit     # 타입 체크
```

---

## 문서

| 문서 | 내용 |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | **환경 세팅** — Windows/macOS 로컬 실행, 트러블슈팅, SDK 설치 |
| [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) | **개발자/사용자화 가이드** — 블록↔코드 연동, 새 블록 추가, 모듈(Sub-VI), nexys SDK, 인터페이스 |
| [`sdk/README.md`](sdk/README.md) | **nexys Python SDK** — 백엔드(sim/NI), TDMS, 인터페이스, 자체검증 |
| `CLAUDE.md` | 초기 빌드 마스터 가이드 (히스토리) |
| `Log.md` | 라운드별 변경 로그 |

---

## 구성

```
nexys-blockly-studio/
├── app/                  Next.js App Router (page.tsx = 전체 상태 조립)
├── components/           UI (workspace / right-panel / code-preview / runtime / top-bar / dialogs)
├── lib/
│   ├── blockly/          블록 정의·코드 생성·툴박스·모듈(Sub-VI)·테마
│   ├── targets/          타겟 카탈로그 (NI PXIe / cRIO / cDAQ) + Python 헤더 + 핀맵
│   ├── simulator/        하드웨어 없는 가상 런타임
│   ├── tdms/             실제 TDMS 2.0 바이너리 라이터
│   └── mock-devices.ts   시연용 NI 디바이스
├── sdk/                  nexys Python SDK (생성 코드를 실제로 실행)
└── docs/                 SETUP / DEVELOPER_GUIDE
```

**기술 스택**: Next.js 14 · React 18 · TypeScript 5 · Blockly 11 · Monaco Editor · Tailwind 3 · Radix Dialog · lucide · sonner.

---

## 핵심 기능

- **블록 → Python 실시간 생성** — 블록을 바꾸면 우측 Code 탭이 즉시 갱신 (NI-DAQmx 기반).
- **모듈 (Sub-VI)** — 여러 블록을 하나의 재사용 단위로 묶기 (LabVIEW SubVI 개념).
- **타겟**: NI PXIe · CompactRIO · CompactDAQ (모두 Python · nidaqmx).
- **무하드웨어 시뮬레이션** — Run으로 가상 실행, 로그·채널 상태 확인.
- **실제 TDMS 2.0 저장** — npTDMS/LabVIEW/DIAdem 호환 (`Export .tdms`).
- **통신 인터페이스 + 자체검증(BIT)** — UDP/TCP/Serial 루프백 + 실제 이더넷 수신 확인(`nexys-netcheck`).

---

## nexys SDK (선택)

생성된 Python을 실제로 실행하거나 자체검증·이더넷 확인을 하려면:

```bash
pip install -e sdk            # 시뮬 + TDMS (순수 stdlib)
pip install -e "sdk[ni]"     # 실제 NI 하드웨어 (nidaqmx)

python sdk/examples/ni_acquire_demo.py   # 무하드웨어 실행 → 실제 .tdms 생성
python sdk/examples/selftest_demo.py     # UDP/TCP/Serial 자체검증(BIT)
```

자세한 내용은 [`sdk/README.md`](sdk/README.md) 참고.
