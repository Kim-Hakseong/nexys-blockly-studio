# Nexys Blockly Studio — Defense MVP Starter Kit

> 라즈베리파이 기반 산업·방산 계측 모듈을 코딩 없이 30% 커스터마이즈할 수 있는 비주얼 IDE.
> **이 ZIP은 스타터킷이다.** Claude Code MAX로 빌드 마무리하면 lovable한 MVP가 완성된다.

---

## 빠른 시작 — 3분 안에 빌드 착수

```bash
# 1. ZIP 압축 해제 후 디렉토리 진입
unzip nexys-blockly-studio.zip
cd nexys-blockly-studio

# 2. Claude Code 실행
claude

# 3. 프롬프트 한 줄:
> CLAUDE.md를 끝까지 읽고, Definition of Done을 모두 만족하는 lovable MVP를 빌드해줘.
> 빌드 도중 결정 필요한 부분은 산업 계측 장비 톤(IBM Plex, 다크, 차분한 시그널 그린)을
> 유지하는 방향으로 자율적으로 결정해. npm install부터 시작해.
```

이게 끝이다. Claude Code가 알아서 `npm install` → 파일 채우기 → `npm run dev`까지 간다.

---

## 무엇이 들어있나

```
nexys-blockly-studio/
├── CLAUDE.md              ← Claude Code 빌드 마스터 가이드 (가장 중요)
├── README.md              ← 지금 보고 있는 이 파일
├── package.json           ← 의존성 (Next 14 + Blockly + Monaco + Tailwind)
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .gitignore
├── .env.example
├── app/
│   ├── layout.tsx         ← 폰트, 메타데이터
│   ├── page.tsx           ← 메인 페이지 골격 (Claude Code가 완성)
│   └── globals.css        ← 디자인 토큰 (CSS 변수) — 손대지 말 것
├── components/            ← (Claude Code가 채워넣음)
└── lib/
    ├── types.ts           ← TypeScript 도메인 모델
    ├── mock-devices.ts    ← 가짜 디바이스 3대 (BIT/MIL810/HILS)
    └── blockly/
        ├── blocks.ts          ← 커스텀 블록 정의 (스켈레톤만)
        ├── python-generator.ts
        ├── toolbox.ts
        └── theme.ts
```

---

## 시연 시나리오 — 부장님께 보여줄 그림

3대 디바이스가 각각 다른 방산 유즈케이스를 대표한다:

| 디바이스 ID | 용도 | 사용 채널 | 비고 |
|---|---|---|---|
| `rpi-defense-bit-01` | Built-in Test 자동화 | DO0 자극 → AI0 응답 → 임계검증 | 첫 데모 |
| `rpi-vibration-mil810` | MIL-STD-810 진동 시험 | AI0/1/2(3축) → RMS → DO0 정지신호 | 환경시험 데모 |
| `rpi-hils-loopback` | HILS 미니 루프 | AI0 → 모델 → AO0 (1ms 동기) | VeriStand 압축판 |

---

## 빌드 후 검증 체크리스트

Claude Code 빌드 후 `npm run dev`로 실행한 뒤:

- [ ] http://localhost:3000 화면 정상 표시
- [ ] 다크 톤, IBM Plex 폰트 적용 확인
- [ ] Blockly 워크스페이스에 BIT 시퀀스가 미리 로드되어 있음
- [ ] 좌측 Toolbox에 5개 카테고리 (Channels / Timing / Signal / Logic / Output)
- [ ] 우측 Python Code 탭에서 코드 실시간 갱신
- [ ] 우측 Devices 탭에 3개 디바이스 카드
- [ ] Deploy 버튼 → 모달 → JSON 미리보기 → 가짜 배포 성공 토스트

문제 생기면 Claude Code에 그냥 보고하면 알아서 고친다:
```
> 빌드 결과를 점검해줘. CLAUDE.md의 Definition of Done과 비교해서 누락된 부분 채워줘.
```

---

## Phase 2 (시연 통과 후)

- 실제 라즈베리파이 Nexys Agent (Python 인터프리터)
- MQTT 통신 (EMQX 무료 인스턴스)
- 모듈 모드 추가 (Vibration, Sound, Voltage)
- TDMS 파일 출력 (방산 표준)
- 보안: 디바이스 인증서, 워크스페이스 서명

---

## 라이선스/IP 주의

이 코드는 넥시스 회사 산출물 IP 범위에 들어갈 가능성이 높다.
글로벌 SaaS 사이드 트랙(개인 IP)으로 분리하려면 **회사와 명확한 합의** 후 진행할 것.
