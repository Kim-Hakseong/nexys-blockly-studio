# 개발자 가이드 — 사용자화 (Customization)

이 문서는 Nexys Blockly Studio를 **고치고 확장**하려는 개발자를 위한 것입니다.
"무엇을 코딩하면 코드의 어디가 바뀌는지"를 중심으로 설명합니다.

스튜디오 화면 우상단 **Guide** 버튼으로 이 내용의 요약본을 앱 안에서도 볼 수 있습니다.

---

## 1. 큰 그림

```
┌────────────────────────────────────────────────────────────┐
│  웹 스튜디오 (Next.js / React / TypeScript)                  │
│                                                            │
│  Blockly 워크스페이스 ──(실시간)──► Python 코드 (Code 탭)    │
│        │                                  │                 │
│        │ 시뮬레이터(JS)가 직접 해석         │ 생성 텍스트     │
│        ▼                                  ▼                 │
│  Runtime 탭 (가상 실행)            nexys SDK 호출 형태       │
└────────────────────────────────────────────────────────────┘
                          │ pip install -e sdk
                          ▼
        nexys SDK (Python) — 생성 코드를 실제로 실행
        backends: sim (무하드웨어) / ni (nidaqmx)
        interfaces: UDP/TCP/Serial + selftest(BIT)
```

핵심 두 가지를 혼동하지 마세요:
- **Code 탭의 Python** = 보여주기/배포용 텍스트. `nexys` SDK를 호출하는 형태로 생성됩니다.
- **Run(시뮬레이터)** = 그 Python을 실행하는 게 아니라, 워크스페이스 JSON을 **JS로 직접 해석**합니다 (`lib/simulator/runner.ts`).
  둘은 같은 블록을 보지만 서로를 호출하지 않습니다.

---

## 2. 디렉터리 지도

```
app/page.tsx                 전체 상태 조립 (코드/워크스페이스/타겟/모듈/테마)
components/
  workspace-panel.tsx        Blockly 주입 + 변경 감지 → 코드 재생성(emit)
  right-panel.tsx            우측 탭 (Code / Runtime / Wiring·Devices 비활성)
  code-preview.tsx           Monaco 코드 미리보기 + 정적 검증 + 수동 편집
  runtime-panel.tsx          시뮬레이터 실행/로그/채널/TDMS Export
  top-bar.tsx                Templates · Target · Theme · Guide · Run · Deploy
  guide-dialog.tsx           이 문서의 인앱 요약
lib/blockly/
  blocks.ts                  블록 정의 (모양·필드·색)
  python-generator.ts        블록 → Python 변환
  toolbox.ts                 좌측 카테고리/툴박스
  theme.ts                   Blockly 다크/라이트 테마
  module-store.ts            모듈(Sub-VI) 저장소 + 자유변수 검출
  module-blockly.ts          모듈 블록 등록 + 모듈 코드 생성
  sample-modules.ts          기본 제공 모듈 (NI_* 예제)
  initial-workspace.ts       첫 화면 BIT 데모
lib/targets/
  index.ts                   타겟 카탈로그 (NI PXIe / cRIO / cDAQ)
  python.ts                  타겟별 Python 헤더/preamble
  pinmap.ts                  채널 → NI-DAQmx 물리 채널 매핑
lib/simulator/runner.ts      가상 런타임 (워크스페이스 JSON 해석)
lib/tdms/writer.ts           실제 TDMS 2.0 바이너리 라이터 (브라우저용)
sdk/                         nexys Python SDK (아래 5장)
```

---

## 3. 블록을 바꾸면 코드의 어디가 변하나

블록 ↔ Python은 **1:1 실시간 연동**입니다. 워크스페이스를 편집하면 약 50ms 뒤 코드가 재생성되고
우측 Code 탭이 갱신됩니다 (footer의 `Regen #N` 카운터가 증가).

흐름: `workspace-panel.tsx`의 변경 리스너 → `emit()` →
`target.generate()` (= `lib/targets/python.ts` + `lib/blockly/python-generator.ts`) →
`page.tsx`의 `pythonCode` 상태 → `code-preview.tsx`(Monaco).

> **주의 — 수동 편집:** Code 탭의 **Edit**로 Python을 직접 고칠 수 있지만,
> **블록을 다시 변경하면 자동 생성 코드로 되돌아갑니다** (블록이 항상 원본).
> 예전에 "블록을 바꿔도 코드가 안 변한다"고 느꼈다면, 저장된 수동 편집본이 화면을 덮고 있었기 때문입니다.
> 지금은 블록 변경 시 자동 해제되고, 수동 편집은 새로고침 후 유지되지 않습니다.

### 3-1. 새 블록 추가 레시피
같은 *type* 키로 세 곳에 항목을 추가하면 됩니다.

1. **정의** — `lib/blockly/blocks.ts`
   ```ts
   defineBlock(Blockly, 'channels', 'my_block', {
     init(b) {
       b.appendDummyInput().appendField('내 블록')
        .appendField(new Blockly.FieldNumber(0), 'N');
       b.setPreviousStatement(true, null);
       b.setNextStatement(true, null);
     },
   });
   ```
2. **코드 생성** — `lib/blockly/python-generator.ts`
   ```ts
   pythonGenerator.forBlock['my_block'] = (b) => {
     const n = b.getFieldValue('N');
     return `nexys.channels.my_block(${n})\n`;
   };
   ```
3. **툴박스** — `lib/blockly/toolbox.ts` 의 해당 카테고리에 `{ kind: 'block', type: 'my_block' }` 추가.
4. (실행까지 하려면) **SDK** — `sdk/nexys/channels.py` 등에 `my_block()` 구현.

---

## 4. 모듈 (Sub-VI) — 여러 블록을 묶어 재사용

LabVIEW의 SubVI와 같은 개념입니다.

- 워크스페이스에서 블록(맨 위)을 선택 → 좌상단 **Make Module** → 이름 입력.
  선택 블록 + 아래 체인이 하나의 **모듈 블록(▦)**으로 묶입니다.
- MODULES 카테고리에서 몇 번이고 드롭해 재사용. 모든 재사용은 **하나의 공유 함수**로 코드 생성됩니다.
- 모듈 블록 선택 → **Ungroup** → 내부 블록으로 다시 펼침.

```python
def module_BIT_Pulse():     # 본문 (한 번만 정의)
    nexys.channels.do_write('DO0', 'HIGH')
    nexys.timing.delay_ms(10)
    nexys.channels.do_write('DO0', 'LOW')

def main():
    module_BIT_Pulse()      # 호출 (재사용마다)
```

### 4-1. 입력 파라미터(터미널)
모듈 본문에서 **읽기만 하고 쓰지 않는 변수**는 자동으로 입력이 됩니다.
예: `NI_AO_Voltage` 모듈의 `volts` → `module_NI_AO_Voltage(volts)`.
검출 로직은 `module-store.ts`의 `detectFreeVars`.

기본 제공 모듈(NI 예제)은 `sample-modules.ts`에 있습니다.

---

## 5. nexys SDK (`sdk/`)

생성된 `import nexys` 코드를 **실제로 실행**하는 Python 패키지입니다. 약 20개 함수.

```
nexys.init(target=..., backend=..., device=...)   # _core.py
nexys.tdms_open(path) / tdms_close()
nexys.channels.{ai_read, ao_write, di_read, do_write, sensor_read}   # channels.py
nexys.timing.{loop_every, delay_ms, wait_until}                       # timing.py
nexys.signal.{scale_linear, rms, lpf, in_range}                       # signal.py
nexys.output.{log_tdms, mqtt_publish, alarm, bit_result}             # output.py
nexys.interfaces.{UdpTransport, TcpTransport, SerialTransport}        # interfaces/
nexys.selftest.run()                                                  # selftest.py
```

### 5-1. 백엔드 교체
- `backends/sim.py` — 하드웨어 없이 합성 신호 (기본).
- `backends/ni.py` — 실제 NI 하드웨어. 채널 매핑:
  `AI{n}→{dev}/ai{n}`, `AO{n}→{dev}/ao{n}`, `DI{n}→{dev}/port0/line{n}`, `DO{n}→{dev}/port1/line{n}`.

```python
nexys.init(target="sim")                                       # 노트북에서 바로
nexys.init(target="ni-pxie", backend="nidaqmx", device="PXI1Slot2")  # 실장비
```

새 백엔드를 추가하려면 `backends/base.py`의 인터페이스(ai_read/ao_write/...)를 구현하고
`_core.py`의 `_select_backend`에 분기를 추가하면 됩니다.

### 5-2. TDMS는 진짜다
`log_tdms`는 **실제 TDMS 2.0 바이너리**를 씁니다 (`sdk/nexys/tdms.py`, 브라우저는 `lib/tdms/writer.ts`).
npTDMS로 라운드트립 검증됨 → LabVIEW/DIAdem에서 열림. 스튜디오 Runtime 탭의 **Export .tdms**로도 받을 수 있습니다.

---

## 6. 통신 인터페이스 + 자체검증(BIT)

```python
import nexys
nexys.init(target="sim")
report = nexys.selftest.run()    # UDP/TCP/Serial 루프백 + 채널 BIT
print(report.summary())
```

실제 이더넷으로 값이 오는지 확인 (두 PC):
```bash
# 수신 PC
python -m nexys.netcheck listen --proto udp --port 5005
# 송신 PC / 장비
python -m nexys.netcheck send --proto udp --host <수신PC IP> --port 5005 --count 100 --hz 20
```
리스너는 소스 IP·시퀀스·값·지연·유실을 표시합니다. 와이어 포맷 `NEXYS,<seq>,<time>,<value>`.

---

## 7. 타겟 (NI 전용)

현재 타겟은 NI 계측 장비 3종입니다 (`lib/targets/index.ts`): **NI PXIe · CompactRIO · CompactDAQ**.
모두 NI-DAQmx 기반 Python을 생성합니다. 타겟별 preamble은 `lib/targets/python.ts`,
채널→물리핀 매핑은 `lib/targets/pinmap.ts`.

새 타겟 추가: `index.ts`의 `TARGETS`에 항목 추가 + `python.ts`에 헤더 추가 (+ 필요 시 `pinmap.ts`).

---

## 8. 검증 / 빌드

```bash
npx tsc --noEmit     # 타입 체크
npm run build        # 웹 프로덕션 빌드
pytest sdk           # SDK 테스트 (sim/TDMS/인터페이스/BIT/netcheck)
```
