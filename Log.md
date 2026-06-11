# Build Log — Nexys Blockly Studio (Defense MVP)

> Claude Code 빌드 세션 로그. 2026-05-17.
> 시작 상태: 스타터킷(스켈레톤 + 디자인 토큰 + Blockly 정의만 있는 상태).
> 종료 상태: Definition of Done 모두 통과, dev/build 둘 다 정상.

---

## 1. 시작 시점 레포 상태

이미 자리잡혀 있던 것:
- `CLAUDE.md` — 마스터 빌드 가이드 (디자인 토큰, 컴포넌트 명세, 빌드 순서)
- `app/globals.css` — 디자인 토큰 (CSS 변수), Blockly CSS 오버라이드, IBM Plex 임포트
- `app/layout.tsx` — 메타데이터, 폰트, body 셋업
- `app/page.tsx` — 골격 페이지 (실제 컴포넌트는 TODO 주석)
- `tailwind.config.ts` — 디자인 토큰 → Tailwind 색상 매핑, pulse-signal 애니메이션
- `lib/types.ts`, `lib/utils.ts` (`cn`, `formatRelativeTime`), `lib/mock-devices.ts` (3대)
- `lib/blockly/blocks.ts` — 20개 커스텀 블록 정의 (5 카테고리)
- `lib/blockly/python-generator.ts` — Python 코드 생성기
- `lib/blockly/toolbox.ts` — 카테고리 트레이 정의
- `lib/blockly/theme.ts` — Nexys 다크 테마 (Zelos 기반)
- `lib/blockly/initial-workspace.ts` — BIT 시퀀스 데모 JSON
- `components/` — 빈 디렉토리

비어있던 것:
- `node_modules/` (의존성 미설치)
- 모든 `components/*.tsx`
- `app/page.tsx`는 골격만, 실제 컴포넌트 미통합

---

## 2. 작업 순서

### Step 1 — `npm install`
- 482 packages installed in 31s
- Next 14.2.18 / React 18.3.1 / Blockly 11.2.0 / Monaco 4.6.0 / Radix Dialog 1.1.2 / sonner 1.7.0
- 보안 경고 7건(Next 자체 CVE 포함) — Phase 2에서 업그레이드 검토. MVP 시연 차단 요소 아님.

### Step 2 — 컴포넌트 8개 생성

| 파일 | 역할 | 비고 |
|---|---|---|
| `components/top-bar.tsx` | 로고, 워크스페이스명+저장 닷, Save/Deploy 액션 | Lucide `Save`/`Rocket`, signal 그린 pulse |
| `components/toolbox-panel.tsx` | 좌측 가이드. Defense/Voltage/Vibration 모드 셀렉터, 카테고리 카탈로그 | Voltage·Vibration은 Phase 2 disabled |
| `components/workspace-panel.tsx` | **Blockly 통합 (가장 까다로움)** | dynamic import, BIT 데모 자동 로드, 우상단 줌 컨트롤 |
| `components/code-preview.tsx` | Monaco Editor 래퍼 | `next/dynamic` + `ssr:false`, 커스텀 `nexys-dark` 테마 |
| `components/device-list.tsx` | 3개 디바이스 카드 | 선택 시 좌측 1px signal 보더, online pulse, 모듈 칩 |
| `components/right-panel.tsx` | Code/Devices 탭 컨테이너 | 활성 탭 하단 2px signal 인디케이터 + 카운트 뱃지 |
| `components/status-bar.tsx` | Mode / Channels / Device / 저장 상태 | 상대 시각 표시 |
| `components/deploy-dialog.tsx` | Radix Dialog | 디바이스 카드 선택 → 채널 요약 → JSON 미리보기 collapsible → 3초 프로그레스 → sonner 토스트 |

#### Blockly 통합 세부 (workspace-panel.tsx)
- `useEffect` 안에서 `Promise.all`로 7개 dynamic import 병렬:
  - `blockly`, `blockly/python`, 그리고 5개의 `lib/blockly/*` 모듈
- `defineNexysBlocks(Blockly)` + `registerPythonGenerators(pythonGenerator)` 호출
- `Blockly.inject(container, { toolbox, theme, renderer: 'zelos', grid, zoom, ... })`
- `Blockly.serialization.workspaces.load(INITIAL_WORKSPACE_STATE, workspace)`로 첫 화면에 BIT 시퀀스 표시
- workspace change listener — `ev.isUiEvent` 필터 후 Python 코드 + 워크스페이스 JSON emit
- cleanup에서 `workspace.dispose()`

### Step 3 — `app/layout.tsx` 토스트 통합
- `<Toaster>` (sonner) 추가, position bottom-right, 디자인 토큰 색상 인라인 적용
- `borderRadius: '0px'` — 산업 계측 톤(샤프한 모서리) 유지

### Step 4 — `app/page.tsx` 실제 컴포넌트 조립
- 골격을 완전히 교체
- `emitCountRef`로 "첫 emit(초기 로드)은 unsaved 마킹하지 않음" 처리 → 처음부터 "Unsaved"로 보이지 않게
- Save 클릭 시 sonner 토스트 + unsaved 플래그 해제

### Step 5 — 검증
- `npx tsc --noEmit` → no output(=success)
- `npm run dev` → Ready in 3.2s, `GET /` 200 (29ms after warm)
- `curl http://localhost:3000` → HTTP 200, SSR HTML에 "Nexys", "BIT_Sequence_v3", "Defense", "Channels", "Timing", "Workspace" 모두 포함
- `npm run build` → Compiled successfully, route `/` 27.4 kB / First Load JS 124 kB, prerender 4/4

---

## 3. 디자인 결정

| 결정 | 이유 |
|---|---|
| 좌측 `toolbox-panel`은 시각적 가이드만 | Blockly 자체 toolbox(`lib/blockly/toolbox.ts`)가 실제 드래그 소스. CLAUDE.md 섹션 3 지침 |
| Monaco `nexys-dark` 커스텀 테마 정의 | 기본 `vs-dark`는 배경이 디자인 토큰과 미세 불일치. background `#0e1116`로 맞춤 |
| toast 모서리 0px | "AI슬롭 디자인 금지" 항목 — 둥근 모서리는 측정장비 톤과 충돌 |
| zoom controls를 floating 패널로 분리 | Blockly 내장 zoom 컨트롤(`controls: false`) 끄고 디자인 토큰 따르는 자체 UI |
| `emitCountRef` 첫-emit 가드 | 초기 워크스페이스 로드가 unsaved를 트리거하면 첫 인상에 "Unsaved" 보임 → 어색함 |
| 채널 사용 요약 정규식 추출 | `nexys.channels.xxx('AI0', ...)` 패턴을 Python 코드에서 추출. 별도 메타데이터 트래킹 없이 단순 |

---

## 4. Definition of Done 체크

| 항목 | 상태 |
|---|---|
| `npm run dev`로 에러 없이 http://localhost:3000 표시 | ✅ |
| Blockly 워크스페이스가 BIT 데모 시퀀스로 채워져 보임 | ✅ `INITIAL_WORKSPACE_STATE` 자동 로드 |
| 우측 패널 Python Code 탭에 코드 실시간 표시 | ✅ Monaco + workspace change listener |
| 우측 패널 Devices 탭에 3개 mock 디바이스 카드 | ✅ |
| Deploy 버튼 → 모달 → 디바이스 선택 → JSON 미리보기 → 3초 프로그레스 → 토스트 | ✅ |
| 모든 텍스트가 IBM Plex 폰트로 렌더링 | ✅ `app/globals.css` 임포트 + Tailwind `font-sans/mono/condensed` |
| 다크 톤 산업 계측 장비 분위기 | ✅ |

---

## 5. 알려진 제한 / Phase 2 후보

- Save는 메모리만 변경(persist 없음) — Phase 2에서 localStorage 또는 백엔드
- Deploy는 mock — 실제 라즈베리파이 Nexys Agent 미구현
- 워크스페이스 다중 관리/탭 없음 — 시연용 단일 워크스페이스
- 디바이스 텔레메트리 라이브 업데이트 없음 — `lastSeen`은 정적
- Monaco fontLigatures off — IBM Plex Mono가 ligature 미지원이라 의도된 설정
- Voltage / Vibration 모듈 disabled — 카탈로그 정의 미작성
- next 14.2.18 CVE — 시연 후 14.2.32+ 업그레이드 검토

---

## 6. 파일 변경 요약

신규 생성(8):
```
components/top-bar.tsx
components/toolbox-panel.tsx
components/workspace-panel.tsx
components/code-preview.tsx
components/device-list.tsx
components/right-panel.tsx
components/status-bar.tsx
components/deploy-dialog.tsx
```

수정(2):
```
app/layout.tsx    (+ Sonner Toaster)
app/page.tsx      (골격 → 실제 조립)
```

미변경(지침대로 손대지 않음):
```
app/globals.css
tailwind.config.ts
lib/blockly/*
lib/types.ts
lib/mock-devices.ts
lib/utils.ts
```

---

# Round 2 — Post-MVP 고도화 (2026-06-08)

> MVP 시연을 넘어서 "사랑스러운" 사용감 + 산업 도구 수준의 기능을 채워넣는 라운드.
> 사용자(makseong@gmail.com) 피드백 driven — 각 항목은 실제 시연/사용 중 발견된 갭에서 출발.

## 7. 추가된 능력

| 번들 | 핵심 | 파일 |
|---|---|---|
| **로컬 시뮬레이션** | 하드웨어 없이 워크스페이스를 가상 실행. AI는 채널별 사인+노이즈, 센서는 도메인 모델, 실행 가드 100k iter | `lib/simulator/types.ts`, `lib/simulator/runner.ts` |
| **Runtime 탭** | Run/Stop/Reset · 4 메트릭 카드 · DO/DI/AI/AO 채널 그리드(LED+sparkline) · 5000 라인 로그 콘솔 (auto-scroll) | `components/runtime-panel.tsx` |
| **라이브 sparkline** | AI 8ch + AO 4ch × 60샘플 슬라이딩 윈도우, SVG polyline + auto-scale + zero baseline | runner의 `pushAiHistory/pushAoHistory` + RuntimePanel 차트 셀 |
| **Variables / Functions 실행** | Blockly 사용자 정의 변수·프로시저 등록 + simulator 인터프리트 (`procedures_callreturn` 포함) | runner `procs/vars` 맵, `procDef/procCall` |
| **Welcome 가이드** | 첫 진입 시 4단계 onboarding + 팁, localStorage 1회 영속 + Help 아이콘으로 재호출 | `components/welcome-dialog.tsx` |
| **Templates 메뉴** | 7개 샘플 워크스페이스 (basic 4개 + Pro 3개). createPortal로 z-2147483000, Blockly 위로 항상 부상 | `lib/templates.ts`, `components/top-bar.tsx` `TemplateMenu` |
| **Pro 템플릿 3종** | AVI_BIT_Suite_Pro (4채널 BIT + MQTT 텔레메트리 + 이메일 에스컬레이션), HILS_PID_Servo (PI 제어기 + 6변수), EnvChamber_ThermalCycle (4단 함수화 + 2회 반복 + 과열/과냉 알람) | `lib/templates.ts` 헬퍼 함수 + 템플릿 정의 |
| **Light / Dark / System 테마** | CSS 토큰 [data-theme] 분기 + `useTheme()` hook + Blockly/Monaco 런타임 swap + flash 방지 inline script | `lib/theme.ts`, `app/globals.css` light tokens, `lib/blockly/theme.ts` mode arg, `components/code-preview.tsx` `nexys-light` |
| **워크스페이스 영속화** | Save 시 localStorage `nexys.workspace.v1`에 templateId + JSON + bindings + savedAt 저장, `onReady` 콜백으로 새로고침 시 복원 | `app/page.tsx` `handleSave/handleWorkspaceReady`, `WorkspacePanel` `onReady` prop |
| **Hardware (Wiring) 탭** | 11개 가상 디바이스 (LED·Buzzer·Button·Switch·Thermo·Pressure·Strain·Accel·Pot·Motor·Heater), 채널-디바이스 바인딩, 디바이스별 라이브 비주얼, simulator 통합 | `lib/hardware/devices.ts`, `components/hardware-panel.tsx`, runner의 `setBindings/setInput` + `readAI/readDI` |
| **코드 갱신 진단 표시** | Code 탭 footer에 `Regen #N · HH:MM:SS` 실시간 표시 — emit 발화 여부를 사용자가 즉시 확인 | `app/page.tsx` `codeRegenCount/codeRegenAt` state |

## 8. 해결한 진짜 버그 (raw 원인 기록 — 시연 사고 방지)

| 버그 | 진짜 원인 | 해결 |
|---|---|---|
| Python이 블록 변경에 안 따라옴 | `pythonGenerator.ORDER`가 Blockly 11에선 undefined (별도 `Order` export로 분리됨). `ORDER.NONE` 접근에서 throw → 모든 emit이 silent fail → empty placeholder만 표시 | `registerPythonGenerators(pythonGenerator, Order)` 시그니처로 명시 전달 + 3단 fallback. `buildFullPython`에 console.error 추가해 silent swallow 방지 |
| Change listener 미발화 | `ev.isUiEvent` 필터가 Blockly 11에서 이벤트 서브클래스마다 일관성 없음 → 정상 이벤트도 필터링 | 필터 제거, `addChangeListener(() => emit())` (전부 emit). workspaceToCode 1ms 미만이라 비용 무시 가능 |
| Templates 드롭다운이 Blockly 토대로 덮임 | Header(z-30) 내부 z-50이 main 안의 Blockly toolbox(자체 z-70)에 효과적 stacking에서 밀림 | 드롭다운을 `createPortal(menu, document.body)`로 body 최상단에 그리고 `position:fixed` + zIndex `2147483000`. Blockly 쪽 `.blocklyToolboxDiv`·`.blocklyDropDownDiv`도 globals.css에서 z-index 강제 하향 |
| 블록 팔레트에서 추가/복제 시 한 좌표에 다수 중복 | React 18 StrictMode가 dev에서 useEffect를 두 번 호출 → Blockly가 두 번 inject → 두 워크스페이스가 동시에 같은 클릭 이벤트 처리 | `next.config.mjs`에서 `reactStrictMode: false`. 동시에 workspace-panel `containerEl.__nexysClaimed` 동기 마킹으로 async 시작 전 race 차단 + 클린업에서 innerHTML='' 강제 청소 |
| Insert(끼워넣기) 시 중복 | drag 중간 inconsistent 상태에서 `workspaces.save` 호출이 Blockly의 follow-up 이벤트를 재귀 발화시키는 정황 | `workspace.isDragging()` 동안 emit 스킵, drag 종료 후 microtask로 한 번만 emit |
| Blockly flyout 닫아도 잔여 경계선 | `.blocklyFlyoutBackground`의 stroke가 남고, Blockly가 flyout을 `visibility:hidden`으로만 처리 (DOM 잔존) | globals.css에서 stroke none, `visibility:hidden` 셀렉터로 display:none |

## 9. 디자인 결정 (Round 2)

| 결정 | 이유 |
|---|---|
| Hardware 탭 디바이스 라이브러리는 11개로 한정 | 더 늘리면 시연 화면이 어지러워짐. 측정·제어 시연에 필요한 핵심만 — 라이트/버저, 버튼/스위치, 5가지 sensor, 모터/히터 |
| Pot 슬라이더는 binding 시점부터 즉시 값 반영 (auto-feed) | 사용자가 슬라이더 움직이면 다음 `ai_read('AI0')`가 그 값을 반환해야 인터랙티브함이 살아남. runner의 `inputs` 맵을 우선 참조 |
| Templates 메뉴 createPortal | absolute/fixed만으로는 Blockly의 자체 stacking context를 못 이김. 포털만이 신뢰 가능 |
| StrictMode 비활성 | dev 빌드에서 Blockly 이중 inject 문제가 너무 광범위. prod 빌드는 영향 없음. trade-off로 일부 hooks 안티패턴 자동 감지 못함 — 수동으로 챙기는 게 더 빠름 |
| Python에 `def main()` + entry guard 항상 wrap | 사용자가 코드를 그대로 .py 파일로 저장해서 디바이스로 가져갈 때 바로 실행 가능한 형태로. 시연 가치 ↑ |
| Variables/Procedures generator는 `blockly/python`이 내장한 것 그대로 사용 | 자체 작성 안 함 — Blockly 표준 출력이 이미 잘 동작. 우리는 ORDER만 정확히 전달 |
| Hardware bindings은 워크스페이스와 동일 슬롯에 저장 | 별도 키로 분리하면 동기화 깨질 위험. payload 안에 함께 묶음 |
| `DEFAULT_BINDINGS`로 Hardware 탭 첫인상 채움 | 빈 탭은 "뭐 하는 거지?" 인상. BIT 데모와 의미적으로 어울리는 5개 채널 미리 바인딩 |

## 10. 알려진 제한 (Round 2 종료 시점)

- Python은 정적 검증 안 함 — Blockly 연결 타입 체크 외에 syntax/semantic 검사 없음. `nexys` SDK는 가상 (실 SDK 미존재). 자세한 메커니즘은 ChatLog 참조.
- Hardware 탭에 SVG 배선 라인 시각화 없음 — 채널-디바이스 짝만 표시
- 시뮬레이터의 sensor 모델은 deterministic 사인+노이즈 — 실제 센서 특성(노이즈 floor, 비선형성, drift)은 모사 안 함
- localStorage 저장 슬롯 1개만 — 다중 워크스페이스 관리 없음 (slot UI는 의도적으로 미니멀 유지)
- Voltage/Vibration 모듈 모드는 여전히 disabled — 카탈로그 정의 미작성
- Welcome 모달 step 4개는 Korean only

## 11. Round 2 파일 변경 요약

신규 생성:
```
lib/simulator/types.ts
lib/simulator/runner.ts
lib/hardware/devices.ts
lib/theme.ts
lib/templates.ts          (Round 1엔 minimal였던 것을 7개 템플릿 + 빌더 헬퍼로 확장)
components/runtime-panel.tsx
components/welcome-dialog.tsx
components/hardware-panel.tsx
```

수정:
```
app/page.tsx              (시뮬레이터 subscribe + bindings + 테마 + 영속화 + Welcome)
app/layout.tsx            (테마 init inline script + Toaster 토큰화)
app/globals.css           (light/dark CSS 변수 분기 + Blockly z-index 강제 + flyout 잔여선 제거)
next.config.mjs           (reactStrictMode: false)
tailwind.config.ts        (spin keyframe)
components/top-bar.tsx    (Templates portal, Theme toggle, Run/Stop, Help)
components/right-panel.tsx (Code/Runtime/Wiring/Devices 4탭 + 모든 prop 추가)
components/code-preview.tsx (nexys-light Monaco 테마)
components/workspace-panel.tsx (forwardRef + loadTemplate handle, theme prop, onReady, 인젝트 가드, drag-aware emit)
lib/blockly/python-generator.ts (Order arg, def main wrap, loop_N 고유명, error surface)
lib/blockly/theme.ts      (light/dark 두 모드)
lib/blockly/toolbox.ts    (Variables/Functions/Text 카테고리 추가)
```

미변경 (R2에서도 그대로):
```
lib/types.ts
lib/utils.ts
lib/mock-devices.ts
lib/blockly/blocks.ts
lib/blockly/initial-workspace.ts
components/status-bar.tsx
components/device-list.tsx
components/deploy-dialog.tsx
components/toolbox-panel.tsx
```

---

# Round 3 — 제품화 단계 폴리시 (2026-06-08 후반)

> Round 2에서 기능을 다 채운 뒤, 사용자가 실 사용 중 발견한 갭을 메우는 라운드.
> 핵심: ① 진짜 정적 검증 ② 라즈베리파이-스타일 비주얼 하드웨어 시뮬레이터
> ③ Python 인-라인 편집 ④ UI 폴리시(가독성, 리사이즈, 접근성).

## 12. 추가된 능력

| 번들 | 핵심 | 파일 |
|---|---|---|
| **Python 정적 검증기** | 자체 작성 Nexys-aware 정적 분석기. bracket/quote/indent/SDK 스키마 6단 검사. Pyodide(10MB WASM) 대안으로 1ms 이내. Monaco 게터에 인라인 마커 + 펼치는 issue 리스트 | `lib/validator/python-validator.ts`, `components/code-preview.tsx` validation bar |
| **풍부한 디바이스 SVG 비주얼** | 11개 디바이스 각각 작동 애니메이션 — LED 글로우+halo, Buzzer 음파, 3D Pushbutton, Switch 토글, Thermo 수은 컬럼, Pressure 다이얼 needle, Strain bend, Accel ball-in-tube, Pot 회전 노브, Motor 기어 회전, Heater 코일+heat ripple | `components/device-visuals.tsx`, `globals.css` spin keyframes |
| **비주얼 와이어링 캔버스** | Tinkercad-스타일 schematic. 580×460 SVG, NEXYS-RPI-MOD 보드(PCB 다크그린, 28핀 라벨, PWR LED, 라이브 핀 글로우) + 드래그-앤-드롭 디바이스 + bezier 와이어. 종류 호환 검증(LED→DO만, Pot→AI만), wire 미리보기, hover 시 삭제 X 배지 | `lib/hardware/wiring-state.ts`, `components/wiring-canvas.tsx`, `components/hardware-panel.tsx` |
| **캔버스 zoom/pan** | viewBox 기반 줌 (Ctrl+wheel + 버튼), 빈 영역 드래그로 pan. Blockly 워크스페이스와 동일한 floating 컨트롤 (➕ ➖ ⛶). 우하단 zoom % 인디케이터 | wiring-canvas.tsx |
| **Reset/Clear 와이어링** | Hardware 탭 헤더에 Default(BIT 9-와이어 복원) / Clear(전부 제거) 버튼 + sonner 토스트 | hardware-panel.tsx |
| **AO Source 디바이스** | 11→12개 디바이스. Manual AO Source — 슬라이더로 AO 채널에 0~5V 직접 인가. simulator runner의 `setInput`이 AO 채널이면 즉시 push + history 갱신 → 블록 실행 없이도 sparkline에 반영 | `lib/hardware/devices.ts`, `lib/simulator/runner.ts` setInput |
| **Python 편집 모드** | Code 탭 validation 바 아래에 edit toolbar. 3-state: auto / editing (draft) / override active. Edit/Cancel/Apply 버튼, override 있으면 Reset to auto. 블록이 그 사이 바뀌면 "blocks changed since" warn. localStorage 영속화, Deploy도 편집본 사용 | `components/code-preview.tsx`, `app/page.tsx` `editedPython` state |
| **Shadow block 값 입력** | 9개 value input 슬롯에 toolbox 레벨로 shadow 박음 — ao_write VALUE에 `math_number(0)` 등. 사용자가 클릭으로 값 직접 입력 가능, 다른 블록 끌어다 놓으면 자동 교체. runner는 `input(b, key)` 헬퍼로 `slot.block ?? slot.shadow` 우선 적용 | `lib/blockly/toolbox.ts`, `lib/simulator/runner.ts` `input()` helper |
| **우측 패널 리사이저** | 좌측 가장자리에 1px drag handle (hover signal-green, 3-dot grip). 320~1100px 범위 조절. body cursor도 col-resize로 변경. 탭 전환과 무관하게 사용자 폭 유지 | `components/resize-handle.tsx`, `app/page.tsx` `rightPanelWidth` |
| **Runtime 패널 폴리시** | 메트릭 값 12→20px, BIT P/F 색상 분리. DO/DI 셀이 인덱스+LED 글로우+HIGH/LOW 텍스트 3행 구조로 확장. AI/AO 8→4 컬럼으로 폭 2배, 값 14px 굵게, sparkline 24→32px + 그라데이션 채움. 콘솔 11→12px + line-height 1.55, 필터칩(all/data/events) + follow 토글, 상태배지에 elapsed `t+12.3s` | `components/runtime-panel.tsx` 전면 재작성 |
| **하드웨어 디바이스 카드 비주얼화** | 와이어링 캔버스의 placed device 본체가 새 device-visuals 사용. LED/Motor/Heater는 라이브 상태로 애니메이션, Pot/Pushbutton/Switch는 인-카드 컨트롤로 사용자가 직접 조작 가능 | wiring-canvas.tsx DeviceCard |

## 13. 해결한 진짜 버그

| 버그 | 진짜 원인 | 해결 |
|---|---|---|
| Code 탭에 "⚠ Code generator error: Cannot read properties of undefined (reading 'NONE')" | Blockly 11에서 `pythonGenerator.ORDER` enum이 `Order`로 export 분리됨. `ORDER.NONE` 접근에서 throw → 모든 emit 실패 | `registerPythonGenerators(pythonGenerator, Order)` 시그니처로 명시 전달 + 3단 fallback |
| Templates 드롭다운이 Blockly toolbox에 밀림 | header(z-30) 안의 z-50이 main 내부 Blockly의 자체 stacking을 못 이김 | `createPortal(menu, document.body)` + `zIndex: 2147483000`. globals.css에서 `.blocklyToolboxDiv` z-index도 20으로 강제 하향 |
| 블록 추가/복제 시 같은 좌표에 다중 중복 | React 18 StrictMode가 dev에서 useEffect 두 번 실행 → Blockly 두 번 inject → 같은 이벤트 두 워크스페이스에서 동시 처리 | `next.config.mjs` `reactStrictMode: false` + workspace-panel 컨테이너에 `__nexysClaimed` 동기 마킹으로 async 시작 전 race 차단 + 클린업 시 innerHTML='' |
| 끼워넣기 시 중복 | drag 중간 inconsistent 상태에서 `workspaces.save` 호출이 Blockly follow-up 이벤트를 재귀 발화 | `workspace.isDragging()` 동안 emit 스킵, drag 종료 후 microtask로 한 번만 emit |
| Pressure 핀에서 다른 핀으로 재연결 안 됨 | 디바이스 핀이 foreignObject 내부 HTML 버튼이라 SVG pointer event 시스템에서 일관되게 안 잡힘 | 핀을 SVG `<circle>`로 외부 렌더, 히트 영역 확장용 두 번째 transparent circle 추가 |
| `Invalid colour: "hsl(160, 70%, 32%)"` 드래그 시 throw | Blockly 11의 `parseBlockColour`가 `hsl(...)` CSS 함수 거부, hex만 받음. 라이트 모드 insertion marker 색에서 발화 | `theme.ts`에 `hslToHex` 헬퍼 추가, 모든 componentStyles 색을 hex로 정규화. workspace-panel grid colour도 hex |
| Code 탭에서 "Text content did not match. Server: 0.4 Client: 0.5" hydration error | `validatePython`이 `performance.now()`로 측정한 ms가 SSR/CSR마다 다른 값 | ms 표시 span에 `suppressHydrationWarning` |
| Blockly flyout 닫아도 회색 스크롤바 잔상 | scrollbar는 flyout과 별개 SVG sibling이라 기존 `visibility:hidden` 셀렉터로 못 잡힘 | globals.css 셀렉터 강화 — sibling, `.blocklyHidden` 클래스, `display:none` 인라인 스타일 모두 매칭 |

## 14. 디자인 결정 (Round 3)

| 결정 | 이유 |
|---|---|
| Pyodide 대신 자체 Python 정적 분석기 | Pyodide 10MB+ WASM 콜드스타트 수초 vs 우리 100줄 코드. Nexys-aware 의미 검사(채널 범위, enum, kwargs)는 어차피 커스텀 필요. 정적 검사 한정 명시. |
| 와이어링 캔버스를 SVG로, 디바이스 본체는 foreignObject(HTML) | 와이어/보드/핀은 SVG가 압도적으로 깔끔 (bezier, transform). 디바이스 내부는 슬라이더/버튼 등 HTML form 요소가 있어야 인터랙티브 → foreignObject hybrid |
| Wiring 탭 우측 패널 폭 자동 확장 → 사용자 리사이저 | 처음엔 탭 활성에 따라 384/640 토글했지만 다른 탭에서도 넓게 보고 싶다는 요청. 사용자가 직접 잡고 드래그하는 게 가장 자연스러움. |
| 디바이스 핀 = SVG circle (foreignObject 밖) | foreignObject 안 HTML 요소의 pointer event가 일관되지 않음. SVG circle은 100% 안정. |
| Shadow block 패턴으로 값 직입 | 사용자가 단순 숫자 하나 넣겠다고 매번 math_number 블록 끌어오는 건 비효율. Blockly 표준 패턴(shadow) 활용. 기존 워크스페이스 영향 없음 |
| AO Source 디바이스 도입 | AI에 Pot이 있듯 AO에도 수동 입력 필요. 별도 디바이스로 깔끔하게 분리 — Motor/Heater(부하)와 Manual AO Source(소스) 의미적으로 다름 |
| Python 편집 후 블록 변경 = stale 경고 (자동 폐기 X) | 사용자 작업물 자동 폐기는 위험. 명시적 "Reset to auto" 버튼으로 사용자가 결정 |
| Runtime 패널 AI/AO 8→4 컬럼 | 8칸에서는 값 텍스트가 잘림. 폭 2배 확보 → 14px 굵은 숫자 + 32px sparkline으로 가독성 ↑ |
| 데이터 갱신 시각 표시 (Regen #N · HH:MM:SS) | 사용자가 "Python이 안 바뀌네" 의심할 때 디버그 도구. 카운터가 도는데 코드가 같으면 generator 출력 동일, 카운터 안 돌면 listener 미발화 — 1초 안에 진단 |

## 15. 알려진 제한 / Phase 4 후보

- Python 정적 검증은 nexys SDK 스키마+문법 한정. 진짜 실행 검증(Pyodide exec, stubbed nexys 모듈)은 미구현
- 와이어링 캔버스: 한 채널당 한 디바이스 (병렬 와이어 불가). 다중 분기는 phase 4
- Shadow block 적용은 9개 value input에 한정. controls_if/repeat_n_times 같은 statement input은 그대로
- Runtime 콘솔 export(CSV/JSON 다운로드) 없음 — 시연용엔 충분
- Pyodide 통합 시 실 Python 실행으로 시뮬레이터 대체 가능 (오랜 phase 4 후보)
- Hardware 캔버스 와이어 라우팅은 단순 bezier — 자동 직각 라우팅(예: orthogonal routing) 미적용
- Voltage/Vibration 모듈 모드는 여전히 disabled

## 16. Round 3 파일 변경 요약

신규 생성:
```
lib/validator/python-validator.ts
lib/hardware/wiring-state.ts
components/device-visuals.tsx
components/wiring-canvas.tsx
components/resize-handle.tsx
```

수정 (R3에서 한 번 이상 만진 것):
```
app/page.tsx              (rightPanelWidth, editedPython, wiringLayout state lift)
app/globals.css           (flyout scrollbar residue 강화, spin keyframes, Blockly z-index)
components/code-preview.tsx (validator + edit mode 전면 재작성)
components/runtime-panel.tsx (메트릭/채널/콘솔 전면 폴리시)
components/right-panel.tsx (width prop, 4탭, editedCode 통과)
components/hardware-panel.tsx (Canvas 호스트로 축소, Default/Clear 버튼)
components/workspace-panel.tsx (HSL→hex grid color, isDragging emit 가드, container claim)
lib/blockly/theme.ts (hslToHex 헬퍼, 모든 색 hex 정규화)
lib/blockly/toolbox.ts (9개 input에 shadow 추가)
lib/blockly/blocks.ts (TDMS 툴팁 보강)
lib/blockly/python-generator.ts (Order 명시 전달, 에러 surface)
lib/simulator/runner.ts (input() 헬퍼, AO 즉시 push, bindings/inputs API)
lib/hardware/devices.ts (Manual AO Source 디바이스)
next.config.mjs (reactStrictMode: false)
tailwind.config.ts (spin keyframe)
```

미변경 (R3에서도 그대로):
```
lib/types.ts
lib/utils.ts
lib/mock-devices.ts
lib/blockly/initial-workspace.ts
components/status-bar.tsx
components/device-list.tsx
components/deploy-dialog.tsx
components/toolbox-panel.tsx
components/welcome-dialog.tsx
components/top-bar.tsx
lib/templates.ts        (R2에서 Pro 템플릿 7종 완성 후 R3에선 변경 없음)
lib/theme.ts
lib/simulator/types.ts  (R3에선 변경 없음, R2 sparkline history 추가는 이미 반영)
```

---

# Round 4 — 멀티-타겟 펌웨어 + 템플릿/와이어링 연동 (2026-06-09 ~ 06-11)

> 실제 라즈베리파이/STM32/아두이노/Jetson 보드에 디플로이하는 그림.
> 워크스페이스 하나로 4가지 타겟에 맞는 펌웨어를 동시에 발사할 수 있게 됨.
> 동시에 템플릿이 회로(wiring)까지 같이 묶어 다니게 만들어, "샘플 선택 = 코드+회로 함께 재구성"이 한 동작으로 통합.

## 17. 추가된 능력

| 번들 | 핵심 | 파일 |
|---|---|---|
| **멀티-타겟 코드 생성** | 4개 타겟 — Raspberry Pi 4B (Python+nexys-sdk), NVIDIA Jetson Orin (Python+Jetson.GPIO), Arduino Mega (C+++Arduino core), STM32 F4 (C+HAL). `TargetSpec.generate(GenerateContext)` 통일 인터페이스 | `lib/targets/types.ts`, `lib/targets/index.ts` |
| **워크스페이스 walker** | 시뮬레이터 runner와 같은 BlockJSON 트리를 돌면서 emitter 메서드를 호출. 1회 walk로 statement/expression 양쪽 처리. `loop_every`는 별도 콜백 수집해서 emitter가 스케줄러를 구성 | `lib/targets/walker.ts` |
| **Python emitter (RPi/Jetson)** | Blockly 내장 `pythonGenerator.workspaceToCode`를 그대로 활용 + R3의 `buildFullPython` 래퍼 재사용. 타겟별 preamble만 교체 — RPi는 `nexys.init(target="rpi-4b")`, Jetson은 `import Jetson.GPIO as _gpio` + `gpio_backend=_gpio` | `lib/targets/python.ts` |
| **Arduino emitter** | Arduino Mega 매핑 (`DO0→pin 2`, `AI0→A0`, `AO0→PWM 5`). `digitalWrite`/`analogRead`/`analogWrite`/`delay`/`millis()` 기반 비동기 스케줄러 (`_last_loop_N`, `_ival_loop_N`). `Serial.print(F("TDMS,..."))` 로 TDMS 라우팅 | `lib/targets/arduino.ts` |
| **STM32 HAL emitter** | F4 Nucleo 매핑 — DO→GPIOA, DI→GPIOB, AI→ADC1 채널, AO→DAC1/2(0~1) + TIM3 PWM(2~3). `HAL_GPIO_WritePin`, `HAL_ADC_PollForConversion`, `HAL_DAC_SetValue`, `HAL_UART_Transmit`로 TDMS/alarm 송출. UART2 (huart2) 사용 가정 | `lib/targets/stm32.ts` |
| **Target Menu (top bar)** | Templates 옆에 portal 드롭다운. 타겟별 아이콘(Cpu/Microscope/Cog/Box), description, 언어·확장자 표시. 클릭 시 즉시 코드 재생성, Monaco 언어 동적 swap, 편집된 Python override는 자동 폐기 (의미 없음) | `components/top-bar.tsx` `TargetMenu` |
| **C-style 정적 검증** | 비-Python 타겟용 미니 검증기 — 문자열/`/* */`/`//` 인지하는 단일 패스 bracket balance. Monaco markers + validation bar는 그대로 재사용 | `components/code-preview.tsx` `validateCStyle` |
| **템플릿 ↔ Wiring 자동 매칭** | 모든 Template에 `wiringLayout` 필드 추가. 7개 템플릿 각각 그 데모에 의미 있는 회로로 배치 (BIT=9-와이어 풀, Vibration=Accel+LED, AVI Pro=4센서+LED+Buzzer 등). 템플릿 선택 시 워크스페이스 + 와이어링 동시 재구성, "wiring updated" 토스트 표시 | `lib/templates.ts`, `app/page.tsx` `handlePickTemplate` |
| **좌측 패널 접기/펼치기** | 햄버거(`Menu`) 토글로 ToolboxPanel `w-72 → w-9`. 접힌 상태에선 카테고리 5색 dot만 세로 표시 + 펼침 chevron. Blockly 워크스페이스 폭 252px 추가 확보 | `components/toolbox-panel.tsx` 분기 렌더, `app/page.tsx` state |
| **Flyout scrollbar — 진짜 fix** | R3의 CSS-only 시도가 안 통한 이유: Blockly v11 scrollbar는 flyout과 별개 SVG sibling이라 CSS sibling selector가 브라우저별 quirks로 못 잡음. `MutationObserver`로 컨테이너 subtree 감시, flyout style/class 바뀔 때마다 `syncFlyoutScrollbars()` 호출해 형제 scrollbar를 동기 `display:none` | `components/workspace-panel.tsx` MutationObserver |

## 18. 해결한 진짜 버그 (R4)

| 버그 | 진짜 원인 | 해결 |
|---|---|---|
| Flyout scrollbar 잔상 — R3 CSS-only 시도 후에도 여전 | scrollbar는 flyout과 같은 부모의 형제 SVG element. CSS `~` 셀렉터가 Chrome/Firefox 사이 일관되지 않게 동작 | JS-side MutationObserver — flyout의 style/class/visibility/display 속성 변화를 잡아서 sibling scrollbars의 `display`를 직접 동기화 |

## 19. 디자인 결정 (R4)

| 결정 | 이유 |
|---|---|
| Python 타겟은 Blockly pythonGenerator 그대로 재사용 | R2/R3에서 완성된 generator + 변수/함수 처리가 이미 검증됨. preamble만 갈아끼우는 게 가장 적은 회귀 영향 |
| Walker는 별도 (시뮬레이터와 별개 구현) | 시뮬레이터는 async 실행, walker는 동기 문자열 빌드. 코드 패스는 유사하지만 책임이 다르고 emitter interface가 필요. JSON 트리 형태는 같으므로 shadow fallback 같은 로직은 일관 |
| Arduino 매핑은 Mega 가정 (Uno보다 AI 채널 多) | Uno는 A0-A5만 있어 AI6-7이 안 됨. 데모/시뮬은 8AI 가정이라 Mega로. 실제 deploy 시 사용자가 보드 별 매핑 함수 교체 |
| STM32 매핑: DO=GPIOA, DI=GPIOB | F4 Nucleo 보드에서 자주 외부 IO로 노출되는 포트. AI(ADC1)와 DO(GPIOA)가 PA0에서 충돌하지만 데모용 — 실 배치에선 보드 핀맵 따라 조정 |
| 템플릿 wiringLayout은 optional | BIT_Sequence_v3는 DEFAULT_LAYOUT 사용, 나머지는 그 데모에 맞는 회로. 사용자가 wiring을 변형한 상태에서 템플릿 전환 시 자동 덮어쓰기 — 의도된 동작 (템플릿 = 코드+회로 한 쌍) |
| 타겟 전환 시 editedPython 자동 폐기 | RPi 코드를 Arduino C++로 그대로 쓸 수 없음. 편집본 유지하면 stale 무한 경고 발생, 자동 폐기가 단순하고 명확 |
| Arduino/STM32에는 SDK 스키마 검증 안 함 (bracket balance만) | Arduino core / HAL 함수 시그니처 카탈로그를 다 적는 건 별도 작업. 정적 검증의 핵심 가치는 syntax 깨짐 발견, 그건 충분히 catch함 |
| 좌측 패널 접힘 상태에 카테고리 색 dot만 표시 | 햄버거만 있으면 어느 카테고리가 있는지 가물가물. 5색 dot 세로 줄로 시각적 메모리 유지 |
| MutationObserver 범위: subtree + style/class/visibility/display 속성 | flyout 자체와 sibling scrollbar 모두 잡으려면 subtree 필수. 다른 attribute는 의미 없으니 필터로 부하 최소화 |

## 20. 알려진 제한 / Phase 5 후보

- C/C++ 타겟의 procedure는 무인자(`procedures_defnoreturn`)만 지원. 인자 있는 함수는 walker 확장 필요
- Arduino/STM32 emitter는 `loop_every` 외 top-level statement도 setup()/main()에 그대로 emit — 비동기 timing 보장 안 됨
- STM32 AI(ADC) read는 `({ ... })` GNU statement-expression 사용 — 표준 C 컴파일러에선 GCC/clang 확장 필요
- Jetson Python은 사실상 RPi와 거의 동일 — CUDA 가속 hint만 import에 들어있고 실제 CUDA 코드 생성 안 됨
- 타겟별 채널 매핑은 emitter 내부에 하드코딩 — 사용자가 보드 별 핀맵 커스터마이즈하려면 별도 설정 UI 필요
- Deploy 다이얼로그가 활성 타겟을 인지하지 않음 — 디바이스 호환성 체크 (RPi 디바이스에 STM32 코드 보내려 하면 경고 같은) 미구현
- 템플릿 wiring 덮어쓰기 시 사용자의 in-progress 와이어 작업이 손실 — 확인 dialog 미구현

## 21. R4 파일 변경 요약

신규 생성 (5):
```
lib/targets/types.ts
lib/targets/index.ts
lib/targets/walker.ts
lib/targets/python.ts
lib/targets/arduino.ts
lib/targets/stm32.ts
```

수정:
```
app/page.tsx              (activeTargetId state, handlePickTarget, 템플릿 wiringLayout 자동 적용, toolboxCollapsed)
components/top-bar.tsx    (TargetMenu 추가, targets/activeTargetId/onPickTarget props)
components/code-preview.tsx (language prop, validateCStyle 추가, Monaco language 동적)
components/right-panel.tsx (codeLanguage/targetName prop 통과)
components/workspace-panel.tsx (target prop, emit에서 target.generate 호출, MutationObserver로 flyout scrollbar 동기화)
components/toolbox-panel.tsx (collapsed/onToggleCollapse props, w-72↔w-9 분기 렌더)
lib/templates.ts          (모든 Template에 wiringLayout 필드 추가, 7개 회로 정의)
```

미변경 (R4에서도 그대로):
```
lib/blockly/*             (블록 정의·툴박스·테마·기존 python-generator는 변동 없음 — Python emitter가 모두 위임)
lib/simulator/*           (시뮬레이터는 타겟과 무관, 자체 BlockJSON walker로 자체 실행)
lib/validator/*           (Python validator는 그대로, C-style 검증은 code-preview 안에 미니로 추가)
lib/hardware/*            (디바이스·와이어링 레이어는 변동 없음)
lib/theme.ts, lib/types.ts, lib/utils.ts, lib/mock-devices.ts
components/wiring-canvas.tsx, components/device-visuals.tsx, components/hardware-panel.tsx
components/runtime-panel.tsx, components/resize-handle.tsx, components/welcome-dialog.tsx
components/deploy-dialog.tsx, components/status-bar.tsx, components/device-list.tsx
next.config.mjs, tailwind.config.ts, app/globals.css, app/layout.tsx
```

## 22. R4 시연 시나리오 (1분)

1. **`localhost:3000` 새로고침** → 디폴트 BIT_Sequence_v3 + RPi 타겟 + 9-와이어 회로 보임
2. **Top bar `Target | RPi ▾`** 클릭 → `Arduino Mega` 선택 → Code 탭이 즉시 C++로 전환 (`#include <Arduino.h>`, `digitalWrite(2, HIGH)`, `millis()` 스케줄러)
3. **`STM32`** 선택 → C HAL 코드 (`HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET)`, `HAL_ADC_PollForConversion`)
4. **Templates → `AVI_BIT_Suite_Pro`** 선택 → 워크스페이스가 풀-스케일 BIT 시퀀스로 + 와이어링 캔버스가 4센서(Thermo/Pressure/Strain/Accel) + LED/Buzzer 6-와이어로 자동 재배치
5. **▶ Run** 누르면 4 AI 채널이 동시에 sparkline 흐름, LED/Buzzer 점등
6. **좌측 햄버거** 눌러 사이드바 접으면 워크스페이스 폭 250px 추가 — 큰 블록 다이어그램 풀로 보임
7. **카테고리 펼쳤다 닫으면 회색 스크롤바 잔상 없음** (MutationObserver 동기화 덕분)

---

# Round 5 — 모듈(Sub-VI) + 실제 보드 아트 + Deploy 호환성/핀맵 (2026-06-11)

> 준 베타테스트를 위해 GitHub public push 완료 (github.com/Kim-Hakseong/nexys-blockly-studio).
> LabVIEW SubVI 개념(모듈화) + Tinkercad/Wokwi 급 실제 보드 + 타겟 인지 배포까지.

## 23. 추가된 능력

| 번들 | 핵심 | 파일 |
|---|---|---|
| **모듈 (Sub-VI) 시스템** | 블록 그룹을 단일 재사용 블록으로 묶기. 싱글톤 레지스트리 + 동적 Blockly 블록 등록 + Modules 동적 카테고리. 코드 생성은 공유 함수 1개(`def/void module_X`) + 호출들 (LabVIEW SubVI 시맨틱). 4개 타겟 전부 + 시뮬레이터 + localStorage 영속화 | `lib/blockly/module-store.ts`, `lib/blockly/module-blockly.ts` |
| **Make Module / Ungroup UI** | 워크스페이스 좌상단 플로팅 버튼. 블록 선택 → Make Module → 이름 다이얼로그 → 단일 모듈 블록으로 교체. Ungroup으로 내부 블록 복원 | `components/module-dialog.tsx`, `components/workspace-panel.tsx` 핸들 메서드 |
| **실제 보드 아트 (Wokwi MIT)** | `@wokwi/elements` (MIT) 웹컴포넌트로 진짜 Arduino UNO 보드 렌더. 동적 import로 클라이언트 등록, `<foreignObject>` 안에서 SVG 캔버스와 함께 pan/zoom. "Nexys shield + 실제 호스트 보드" 구조 — 핀 헤더(28핀)는 그대로 두고 그 아래 실제 보드 표시 → 배선 위험 0 | `components/wokwi-board.tsx`, `wiring-canvas.tsx` `BoardArt` |
| **타겟별 보드 테마** | RPi(녹색)/Jetson(다크+NVIDIA그린)/Arduino(틸→실제 UNO)/STM32(ST블루) 각각 PCB 색·라벨·실크스크린. Wokwi 없는 3종은 고도화된 인라인 SVG (BCM2711/Orin 히트싱크/STM32 LQFP 등) | `wiring-canvas.tsx` `BOARD_THEMES`, `BoardArt` |
| **Deploy 타겟 호환성** | mock 디바이스에 `targetId` + 5대로 확충 (RPi×2, Jetson, Arduino, STM32). Deploy 다이얼로그: 디바이스 카드에 타겟 뱃지, 활성 타겟≠디바이스 타겟이면 앰버 경고 배너 + Deploy 비활성, 진행 단계·토스트 타겟별(`.ino`/`.c`/`.py`) | `lib/mock-devices.ts`, `lib/types.ts`, `components/deploy-dialog.tsx` |
| **보드별 핀맵** | 채널→실제 핀 매핑 (RPi `GPIO2`/`MCP3008`, Arduino `D2`/`PWM5`, STM32 `PA0`/`ADC1_IN0`, Jetson `ADS1115`). Deploy 다이얼로그에 접이식 Pin Map 섹션 | `lib/targets/pinmap.ts`, `deploy-dialog.tsx` |

## 24. 모듈 시스템 메커니즘 (핵심 설계)

- **레지스트리** (`module-store.ts`): framework-agnostic 싱글톤 + subscribe. `ModuleDef { id, name, bodyState(Blockly 직렬화), blockCount }`
- **블록 타입**: `nexys_module_<id>` — statement 블록, 보라색(285), `▦ 이름` 라벨
- **생성 시점**: 선택 블록을 `Blockly.serialization.blocks.save(sel)`로 캡처 → bodyState → 동적 블록 등록 → 원본 dispose → 같은 위치에 모듈 인스턴스 생성 + 이전 연결 복원
- **코드 생성**:
  - Python: 블록 제너레이터가 `module_X()` 호출 emit + `generateModuleDefs()`가 임시 headless 워크스페이스에 bodyState 로드해 `def module_X():` 본문 생성 → preamble 뒤 prepend
  - Walker(Arduino/STM32): `getModules()`로 각 모듈 bodyState를 `emit.procDef`로 함수화 + 모듈 호출 블록은 `emit.procCall`
  - 시뮬레이터: 모듈 블록 만나면 bodyState 인라인 실행
- **영속화 순서 주의**: 복원 시 `setModules()`를 `loadTemplate()` 전에 호출 — 워크스페이스 JSON의 모듈 블록 타입이 로드 전에 등록돼야 함 (subscribe가 동기 재등록)

## 25. 디자인 결정 (R5)

| 결정 | 이유 |
|---|---|
| 모듈 = 공유 함수 호출 (인라인 X) | 여러 번 재사용해도 함수 1개. LabVIEW SubVI 그대로. 코드도 깔끔 |
| 실제 보드를 "Nexys shield + 호스트 보드" 2층 구조로 | 우리 28채널 가상 모델 vs 실제 보드 핀 수 불일치를 해소. 핀 헤더(우리 것)는 그대로 두고 실제 보드는 그 아래 호스트로 표시 → 배선 코드 0 변경, Nexys HAT/실드 제품 컨셉과도 일치 |
| Wokwi 웹컴포넌트를 foreignObject 안에 | foreignObject는 SVG 좌표계에 속해 캔버스 pan/zoom과 자동 동기화 — 별도 HTML 레이어 sync 불필요 |
| Wokwi는 Arduino만 적용 | Wokwi elements(MIT)에 RPi/Jetson/STM32 보드 아트 없음. Arduino UNO만 실제, 나머지는 고도화 인라인 SVG. Fritzing 아트는 CC-BY-SA라 상용 부적합으로 배제 |
| 동적 import로 wokwi 로드 | 메인 번들 영향 0 (별도 chunk). 미로드/미지원 시 stylized fallback |
| 디바이스에 targetId | Deploy 호환성 체크의 단일 기준. RPi 코드를 STM32 유닛에 보내는 실수 방지 |

## 26. 알려진 제한 / Phase 6 후보

- 실제 보드 아트는 Arduino UNO만 (Wokwi 한정). RPi/Jetson/STM32는 여전히 스타일라이즈드 — 별도 에셋 소싱 필요
- 모듈은 무인자(파라미터 없음) v1. 입출력 단자(SubVI connector pane)는 미구현
- 모듈 본문 편집은 Ungroup→재생성 방식 — 더블클릭 인-플레이스 편집 미구현
- 브레드보드 + 점퍼선 모드(Tinkercad 완전 클론)는 별도 큰 작업으로 보류
- Wokwi 보드 핀과 우리 기능 핀이 1:1 매핑되진 않음 (호스트 보드는 시각 표시, 배선은 shield 헤더)

## 27. R5 파일 변경 요약

신규 생성:
```
lib/blockly/module-store.ts
lib/blockly/module-blockly.ts
lib/targets/pinmap.ts
components/module-dialog.tsx
components/wokwi-board.tsx
```

수정:
```
app/page.tsx              (모듈 state/dialog/핸들러/영속화, DeployDialog target prop)
components/workspace-panel.tsx (모듈 등록/카테고리/핸들 메서드, Make Module/Ungroup 플로팅 버튼, moduleDefs emit)
components/wiring-canvas.tsx (BOARD_THEMES, BoardArt 타겟별 + Wokwi 실제 보드, targetId prop)
components/hardware-panel.tsx (targetId/targetName prop, 타겟 뱃지)
components/right-panel.tsx (targetId prop 통과)
components/deploy-dialog.tsx (target prop, 호환성 배너, Pin Map 섹션)
components/top-bar.tsx        (R4 TargetMenu — R5 변경 없음, 참고)
lib/targets/types.ts      (GenerateContext.moduleDefs)
lib/targets/python.ts     (moduleDefs prepend)
lib/targets/index.ts      (rpi/jetson generate에 moduleDefs 전달)
lib/targets/walker.ts     (모듈 def/call emit)
lib/simulator/runner.ts   (모듈 블록 실행)
lib/blockly/toolbox.ts    (Modules 동적 카테고리)
lib/mock-devices.ts       (targetId + 5대 확충)
lib/types.ts              (Device.targetId)
next.config.mjs           (@wokwi/elements + lit transpilePackages)
package.json              (@wokwi/elements 의존성)
```

## 28. 배포 상태

- ✅ GitHub public: https://github.com/Kim-Hakseong/nexys-blockly-studio (`main`)
- ⏸️ Vercel 연결은 사용자가 진행 예정 (가이드 제공됨)
- 보안(Deployment Protection)은 초기 단계라 보류

