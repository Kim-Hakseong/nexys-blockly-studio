# CLAUDE.md — Build Guide for Nexys Blockly Studio (Defense MVP)

> 이 문서는 Claude Code가 이 프로젝트를 빌드할 때 따라야 할 마스터 가이드다.
> 이 파일을 끝까지 읽고, 미완성 부분을 채워 완전히 동작하는 MVP를 만들어라.

---

## 1. 프로젝트 정체성

**제품명**: Nexys Blockly Studio (Defense MVP)
**한 줄 정의**: 라즈베리파이 기반 산업·방산 계측 모듈을, 공장/연구소 엔지니어가 코딩 없이 드래그앤드롭으로 30% 커스터마이즈할 수 있는 비주얼 프로그래밍 웹 IDE.

**비즈니스 컨텍스트**:
- 회사명: 넥시스 (LabVIEW 기반 산업 SI 전문)
- 모델: 라즈베리파이 기반 계측 모듈(HW+SW 패키지)을 제품으로 판매. Blockly로 고객이 30% 자율 커스터마이즈.
- 첫 타겟: 방산 (Built-in Test, MIL-STD-810 진동시험, HILS 미니루프 등)
- 대체 시장: LabVIEW가 너무 무겁거나 비싸서 도입 못하는 중소·연구소·하위 벤더

**디자인 톤**: Industrial / Engineering / Measurement Instrument
- LabVIEW Measurement Studio + Linear의 차분함 + 다크모드 베이스
- 절대 "AI슬롭" 디자인 금지 (purple gradient, glassmorphism, 보라색-핑크 그라데이션 등)
- 정확하고, 차분하고, 측정장비스러운 분위기

---

## 2. 기술 스택 (확정)

- **Next.js 14.2.x (App Router) + React 18 + TypeScript 5**
- **Tailwind CSS 3.4**
- **Blockly 11.x** — `npm i blockly` — SSR 비호환이므로 `dynamic import` + `'use client'` 필수
- **Monaco Editor** (`@monaco-editor/react`) — 생성된 Python 코드 읽기 전용 미리보기
- **Lucide React** — 아이콘
- **clsx + tailwind-merge** — 클래스 유틸 (`lib/utils.ts`의 `cn` 함수)
- 외부 백엔드/DB **없음** — 모든 데이터는 `lib/mock-devices.ts`에서 가져오는 mock

---

## 3. UI 레이아웃 — 데스크탑 우선 (min-width 1280px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (h-14)                                                          │
│  [Nexys · Blockly Studio]  Workspace: BIT_Sequence_v3 ●  [Save] [Deploy] │
├──────────┬─────────────────────────────────────┬────────────────────────┤
│ TOOLBOX  │  BLOCKLY WORKSPACE                  │  RIGHT PANEL (tabs)    │
│ (w-72)   │                                     │  (w-96)                │
│          │                                     │                        │
│ Channels │     [Drag blocks here]              │  [Code] [Devices]      │
│  ├ AI    │                                     │                        │
│  ├ AO    │                                     │  (code preview         │
│  ├ DI    │     ┌─────────────────┐             │   or device list)      │
│  ├ DO    │     │ Loop every 10ms │             │                        │
│  └ Sensor│     └─────────────────┘             │                        │
│          │                                     │                        │
│ Timing   │                                     │                        │
│ Signal   │                                     │                        │
│ Logic    │                                     │                        │
│ Output   │                                     │                        │
│          │                                     │                        │
└──────────┴─────────────────────────────────────┴────────────────────────┘
   STATUS BAR (h-7): Mode: Defense | Channels: 8AI+4AO+8DI+8DO | ● Saved
```

### Top Bar
- 왼쪽: 로고 (`Nexys` 모노스페이스 굵게 + `· Blockly Studio` 가는 무게)
- 중앙: 현재 워크스페이스 이름 + 저장상태 닷
- 오른쪽: `Save` (secondary), `Deploy` (primary, 시그널 그린)
- 높이 `h-14`, 하단 `border-b border-border` 1px

### Toolbox Panel (좌측 사이드바, `w-72`)
- 상단에 모듈 모드 셀렉터: "Defense Module" / "Voltage Module" / "Vibration Module" — MVP에서는 Defense만 활성, 나머지 disabled
- 카테고리 트리 (`Channels`, `Timing`, `Signal Processing`, `Logic`, `Output`)
- 카테고리 호버 시 미세 강조, 클릭 시 펼침
- 각 블록은 카테고리 색상 닷 + 블록명 + (option) 짧은 한 줄 설명
- 드래그하면 Workspace로 이동 (Blockly 기본 동작)

### Workspace Panel (중앙)
- 순수 Blockly 워크스페이스
- 배경은 `bg-workspace` (디자인 토큰 — `globals.css` 참조)
- 그리드 패턴 (Blockly grid option 활성)
- 우상단 작은 컨트롤: 줌인/아웃/리셋 (Lucide 아이콘)

### Right Panel (우측, `w-96`)
- 탭 2개: `Python Code`, `Devices`
- `Python Code`: Monaco editor, 읽기전용, `vs-dark` 테마, 폰트는 IBM Plex Mono
- `Devices`: 디바이스 카드 리스트 (`lib/mock-devices.ts`)
  - 각 카드: 디바이스 이름, 모듈 모드, 상태(Online/Offline/Deploying), 마지막 텔레메트리 시각
  - 상태 닷: green/gray/amber
  - 디바이스 클릭 시 선택 상태 표시 (좌측 1px 그린 보더)

### Status Bar (최하단)
- 좌측: 현재 모드, 가용 채널 요약
- 우측: 저장 상태 + 마지막 변경 시각

### Deploy Dialog
- 모달 (배경 dim)
- 상단: "Deploy workspace to device"
- 본문:
  - 선택된 디바이스 카드 (큰 사이즈)
  - 워크스페이스 JSON 미리보기 (collapsible, Monaco — 모노스페이스, 읽기전용)
  - 채널 사용 요약 ("AI0~AI2, DO0~DO1 사용" 식)
- 하단: `Cancel` (secondary), `Deploy now` (primary)
- Deploy now 누르면 → 3초 가짜 프로그레스 바 → "Deployed successfully" 토스트
- 실제 네트워크 호출 절대 하지 말 것 (mock only)

---

## 4. 디자인 토큰 — `app/globals.css` 참조

이미 작성되어 있다. 절대 임의로 색을 추가하지 마라. 다음 토큰만 사용:

```
--bg          : 페이지 배경 (거의 검정)
--surface     : 패널 배경
--surface-2   : 패널 내 부속 배경
--border      : 1px 보더
--text        : 주 텍스트
--text-muted  : 보조 텍스트
--signal      : 그린 (시그널 활성, 저장됨, 디바이스 온라인)
--warn        : 앰버 (배포 중, 변경 미저장)
--alarm       : 레드 (알람, 임계 초과)
--info        : 블루 (정보, 선택됨)
--workspace   : Blockly 워크스페이스 배경 (살짝 채도 있는 매우 어두운 청회색)
--grid        : 워크스페이스 그리드 라인
```

### 타이포그래피
- 본문/UI: **IBM Plex Sans**
- 코드/데이터: **IBM Plex Mono**
- 라벨/오버라인: **IBM Plex Sans Condensed** (선택적)
- 절대 Inter, Roboto, Arial 사용 금지

### 폰트 사이즈/굵기
- 기본 본문: 14px / weight 400
- 라벨/오버라인: 11px / weight 500 / uppercase / tracking 0.06em
- 헤더(다이얼로그 등): 16px / weight 500
- 모노스페이스 코드: 13px

### 인터랙션
- 트랜지션은 `transition-colors duration-150` 정도로 차분하게
- hover시 surface 살짝 밝아짐 정도. 큰 트랜스폼 금지.
- 디바이스 닷의 online은 `--signal`, 부드러운 pulse (2초 주기) — `@keyframes pulse-signal`

---

## 5. Blockly 통합 — 가장 까다로운 부분

### 5.1 동적 import 필수

```typescript
// components/workspace-panel.tsx
'use client';
import { useEffect, useRef } from 'react';

export function WorkspacePanel({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);

  useEffect(() => {
    let workspace: any;
    (async () => {
      const Blockly = await import('blockly');
      const { pythonGenerator } = await import('blockly/python');
      const { defineNexysBlocks } = await import('@/lib/blockly/blocks');
      const { nexysToolbox } = await import('@/lib/blockly/toolbox');
      const { registerPythonGenerators } = await import('@/lib/blockly/python-generator');

      defineNexysBlocks(Blockly);
      registerPythonGenerators(pythonGenerator);

      workspace = Blockly.inject(containerRef.current!, {
        toolbox: nexysToolbox,
        theme: createNexysTheme(Blockly),
        renderer: 'zelos',
        grid: { spacing: 24, length: 1, colour: 'var(--grid)', snap: true },
        zoom: { controls: false, wheel: true, startScale: 0.95, maxScale: 1.5, minScale: 0.6 },
        trashcan: false,
        sounds: false,
      });
      workspaceRef.current = workspace;

      workspace.addChangeListener(() => {
        try {
          const code = pythonGenerator.workspaceToCode(workspace);
          onCodeChange(code);
        } catch (e) { /* ignore generator errors during streaming edits */ }
      });

      // 데모용 초기 블록 (BIT 시퀀스 예시) — 시연 시 첫 인상 좋게
      loadInitialDemoBlocks(workspace, Blockly);
    })();

    return () => { workspace?.dispose(); };
  }, [onCodeChange]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
```

### 5.2 Nexys Theme

`zelos` 렌더러를 베이스로 다크 테마 적용:
- 카테고리 색상 (HSL):
  - Channels (AI/AO/DI/DO): `#10b981` 계열 (signal 그린)
  - Timing: `#f59e0b` (amber)
  - Signal Processing: `#8b5cf6` (purple, 단 차분한 톤)
  - Logic: `#94a3b8` (slate)
  - Output: `#3b82f6` (blue)
- 블록 그림자/광택 비활성, 평평한 디자인
- 폰트는 Blockly 내부에서 IBM Plex Sans 사용하도록 CSS 오버라이드

### 5.3 커스텀 블록 (Defense MVP — 약 20개)

`lib/blockly/blocks.ts`에 스켈레톤 있음. 다음 블록들을 완성하라:

**Channels 카테고리**
- `ai_read` — Analog Input 채널 읽기. 드롭다운으로 AI0~AI7. 출력값(float).
- `ao_write` — Analog Output 채널 쓰기. AO0~AO3 + 값(value input).
- `di_read` — Digital Input 채널 읽기. DI0~DI7. 출력(bool).
- `do_write` — Digital Output 채널 쓰기. DO0~DO7 + HIGH/LOW.
- `sensor_read` — 통합 센서 (드롭다운: Thermocouple / Pressure / Strain / Accel)

**Timing 카테고리**
- `loop_every` — 매 N ms마다. statement 입력 슬롯.
- `delay_ms` — N ms 대기.
- `wait_until` — 조건이 참이 될 때까지 대기. 조건 입력.
- `repeat_n_times` — N회 반복. 카운트 + statement.

**Signal Processing 카테고리**
- `scale_linear` — y = a*x + b. 입력값, 계수 a, 오프셋 b.
- `compute_rms` — N샘플의 RMS 계산.
- `low_pass_filter` — 1차 LPF. 입력, cutoff Hz.
- `threshold_check` — 값이 임계 [상/하] 사이인지. bool 반환.

**Logic 카테고리** (Blockly 기본 logic_if/logic_compare 사용 + 다음 추가)
- `if_channel_then` — "DI0가 HIGH면 다음 실행" 같은 도메인 특화 압축형.

**Output 카테고리**
- `log_to_tdms` — TDMS 파일 로깅 (방산 표준). 채널명 + 값.
- `publish_mqtt` — MQTT 발행. 토픽 + 페이로드 변수.
- `send_alarm` — 알람. 채널(email/slack/buzzer) + 메시지.
- `bit_result` — BIT 합/불 판정 결과 출력.

각 블록은:
1. `Blockly.Blocks['xxx'] = { init: function() {...} }` 정의
2. `lib/blockly/python-generator.ts`에서 대응되는 Python 코드 생성 함수
3. 생성되는 Python은 `nexys.channels.ai_read(0)`, `nexys.timing.loop_every(10, lambda: ...)`처럼 가상 nexys SDK 호출 형태

---

## 6. Mock Devices (`lib/mock-devices.ts`)

이미 작성되어 있다. 다음 3대가 정의됨:
- `rpi-defense-bit-01` — BIT 시험용. Online. Mode: Defense.
- `rpi-vibration-mil810` — MIL-STD-810 진동시험용. Online. Mode: Defense.
- `rpi-hils-loopback` — HILS 미니루프 PoC. Offline.

각 디바이스는 `id, name, mode, status, lastSeen, channels: { ai: 8, ao: 4, di: 8, do: 8 }, modulesInstalled: string[]` 구조.

---

## 7. 데모용 초기 블록 — 첫 인상이 핵심

워크스페이스 빈 화면으로 시작하지 마라. **BIT 시퀀스 데모 블록**을 미리 로드해서 사용자가 처음 보자마자 "오, 이게 뭔지 알겠다" 느끼게 해라.

```python
# 워크스페이스에 미리 로드될 블록이 생성할 Python 코드 (참고용)
nexys.timing.loop_every(50, lambda: (
    nexys.channels.do_write(0, 'HIGH'),        # 자극 신호 출력
    nexys.timing.delay_ms(10),
    response := nexys.channels.ai_read(0),     # 응답 측정
    nexys.channels.do_write(0, 'LOW'),
    nexys.signal.threshold_check(response, 2.5, 3.5)
        and nexys.output.bit_result('PASS', response)
        or nexys.output.bit_result('FAIL', response),
    nexys.output.log_to_tdms('bit_ch1', response),
))
```

이걸 블록으로 표현한 워크스페이스 XML/JSON을 `lib/blockly/initial-workspace.ts`로 분리해서 로드.

---

## 8. 빌드 순서 (Claude Code가 따라갈 작업)

1. `npm install` — 의존성 설치
2. `app/globals.css`에 IBM Plex 임포트 + CSS 변수 적용 확인
3. `lib/utils.ts`의 `cn` 헬퍼 작성 (`clsx + tailwind-merge`)
4. `components/top-bar.tsx` — 헤더 작성
5. `components/toolbox-panel.tsx` — 좌측 사이드바 (정적 카테고리, Blockly toolbox와는 별도의 시각적 사이드바이며 실제 toolbox는 Blockly 내부)
   - **주의**: Blockly의 자체 toolbox를 사용하므로, 별도 toolbox-panel은 시각적 가이드 역할일 뿐. Blockly에 카테고리 전달은 `lib/blockly/toolbox.ts`에서.
6. `components/workspace-panel.tsx` — Blockly 통합
7. `components/right-panel.tsx` + `code-preview.tsx` + `device-list.tsx`
8. `components/deploy-dialog.tsx` — Headless 모달 (Radix Dialog 또는 native dialog)
9. `lib/blockly/blocks.ts` — 모든 커스텀 블록 정의 완성
10. `lib/blockly/python-generator.ts` — 코드 생성기 완성
11. `lib/blockly/toolbox.ts` — XML/JSON 툴박스 정의
12. `lib/blockly/initial-workspace.ts` — BIT 데모 시퀀스
13. `lib/blockly/theme.ts` — Nexys 다크 테마
14. `app/page.tsx` — 전체 조립
15. `npm run dev` — 검증

---

## 9. 절대 금지 사항

- 외부 API 호출 (배포는 mock으로만)
- 실제 라즈베리파이/MQTT 연동 (Phase 2)
- 사용자 인증/로그인 (불필요)
- 다국어 (1차는 한국어 + 영어 라벨 혼용 OK)
- 보라색-핑크 그라데이션, glassmorphism, 형광색
- Inter/Roboto/Arial 폰트
- shadcn/ui 풀 셋업 (시간 낭비 — 필요한 부분만 inline Tailwind로)

---

## 10. 완료 정의 (Definition of Done)

다음을 모두 만족하면 빌드 완료:
- [ ] `npm run dev`로 에러 없이 http://localhost:3000에서 화면 표시
- [ ] Blockly 워크스페이스가 BIT 데모 시퀀스로 채워져 보임
- [ ] 우측 패널의 Python Code 탭에 생성된 코드가 실시간 표시
- [ ] 우측 패널 Devices 탭에 3개 mock 디바이스 카드 표시
- [ ] Deploy 버튼 클릭 시 모달 열림 → 디바이스 선택 → JSON 미리보기 → "Deploy now" 시 3초 프로그레스 → 성공 토스트
- [ ] 모든 텍스트가 IBM Plex 폰트로 렌더링
- [ ] 다크 톤 산업 계측 장비 분위기가 시각적으로 명확히 느껴짐 (스샷 하나로 부장님 설득 가능한 수준)

---

## 11. 우선순위가 헷갈리면

1순위: **시연용 외관 완성** (디자인 일관성, BIT 데모 시퀀스가 보이는 첫 화면)
2순위: **Blockly 통합 정확성** (블록 정의, 코드 생성, 툴박스)
3순위: **Deploy 모달 UX**
4순위: 그 외 디테일

시연이 코어다. "사랑스러운(lovable) MVP"는 디테일 일관성과 첫인상에서 결정된다.

---

빌드 시작.
