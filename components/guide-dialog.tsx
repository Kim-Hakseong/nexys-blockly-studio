'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, MonitorCog, Blocks, Package, Server, Network, Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SectionId = 'setup' | 'blocks' | 'modules' | 'sdk' | 'interfaces';

const SECTIONS: { id: SectionId; label: string; icon: typeof Blocks }[] = [
  { id: 'setup', label: '환경 세팅', icon: MonitorCog },
  { id: 'blocks', label: '블록 → 코드', icon: Blocks },
  { id: 'modules', label: '모듈 (Sub-VI)', icon: Package },
  { id: 'sdk', label: 'nexys SDK', icon: Server },
  { id: 'interfaces', label: '인터페이스 · 검증', icon: Network },
];

export function GuideDialog({ open, onOpenChange }: GuideDialogProps) {
  const [section, setSection] = useState<SectionId>('setup');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-bg/70 backdrop-blur-[2px] z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[min(880px,calc(100vw-32px))] h-[min(640px,calc(100vh-48px))]',
            'bg-surface border border-border shadow-2xl flex flex-col animate-fade-in focus:outline-none'
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
            <div>
              <div className="overline text-signal">Developer Guide</div>
              <Dialog.Title className="text-base font-medium text-text mt-1">
                사용자화 가이드 — 환경 세팅부터 nexys SDK까지
              </Dialog.Title>
            </div>
            <Dialog.Close className="p-1 text-text-muted hover:text-text" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Left rail */}
            <nav className="w-44 shrink-0 border-r border-border py-2 bg-surface-2/30">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left transition-colors',
                      active
                        ? 'text-signal bg-surface border-l-2 border-signal'
                        : 'text-text-muted hover:text-text hover:bg-surface-2 border-l-2 border-transparent'
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {s.label}
                  </button>
                );
              })}
            </nav>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 text-[13px] leading-relaxed text-text">
              {section === 'setup' && <SetupSection />}
              {section === 'blocks' && <BlocksSection />}
              {section === 'modules' && <ModulesSection />}
              {section === 'sdk' && <SdkSection />}
              {section === 'interfaces' && <InterfacesSection />}
            </div>
          </div>

          <div className="px-6 py-2.5 border-t border-border shrink-0 flex items-center justify-between text-[11px] text-text-muted">
            <span className="overline">전체 문서는 레포의 docs/ 폴더 참고</span>
            <span className="mono">docs/SETUP.md · docs/DEVELOPER_GUIDE.md</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── shared bits ──
function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-text font-medium text-sm mt-5 mb-2 first:mt-0">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-text-muted mb-2">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-bg border border-border rounded px-3 py-2 my-2 overflow-x-auto mono text-[12px] text-text whitespace-pre">
      {children}
    </pre>
  );
}
function Kbd({ children }: { children: React.ReactNode }) {
  return <code className="mono text-[12px] text-signal bg-surface-2 px-1 py-0.5 rounded">{children}</code>;
}

function SetupSection() {
  return (
    <div>
      <H>로컬 실행에 필요한 것 (공통)</H>
      <P>
        <Kbd>package.json</Kbd>의 의존성(Next 14 · Blockly · Monaco · Tailwind)이 전부입니다.
        외부 DB·백엔드·API 키가 필요 없습니다. 필요한 것은 <b>Node.js 18.18+ (권장 20 LTS)</b>와 <b>git</b> 뿐입니다.
      </P>
      <Code>{`git clone <repo-url>
cd nexys-blockly-studio
npm install        # package.json 의존성 설치
npm run dev        # http://localhost:3000`}</Code>

      <H>macOS</H>
      <P>Homebrew로 Node 설치 후 위 명령 실행:</P>
      <Code>{`brew install node@20 git
node -v   # v20.x 확인
npm install && npm run dev`}</Code>

      <H>Windows</H>
      <P>
        <b>nvm-windows</b> 또는 nodejs.org 설치 프로그램으로 Node 20 LTS 설치 → PowerShell에서:
      </P>
      <Code>{`# (옵션) nvm-windows 사용 시
nvm install 20
nvm use 20
node -v

git clone <repo-url>
cd nexys-blockly-studio
npm install
npm run dev`}</Code>
      <P>
        실행 정책 오류가 나면 PowerShell을 관리자로 열고
        <Kbd>Set-ExecutionPolicy -Scope CurrentUser RemoteSigned</Kbd> 후 재시도하세요.
      </P>

      <H>nexys SDK (Python, 선택)</H>
      <P>
        스튜디오는 Node로 돌지만, 생성된 Python을 실제로 실행하거나 자체검증(BIT)을 하려면 <Kbd>sdk/</Kbd>의
        Python 패키지를 설치합니다 (Python 3.8+):
      </P>
      <Code>{`pip install -e sdk            # 시뮬 + TDMS (순수 stdlib)
pip install -e "sdk[ni]"     # 실제 NI 하드웨어 (nidaqmx)
pip install -e "sdk[dev]"    # pytest + npTDMS (테스트)`}</Code>
    </div>
  );
}

function BlocksSection() {
  return (
    <div>
      <H>블록을 바꾸면 코드의 어디가 변하나</H>
      <P>
        워크스페이스의 블록은 우측 <b>Code 탭</b>의 Python과 <b>1:1로 실시간 연동</b>됩니다.
        블록을 드래그·연결·필드 수정하면 약 50ms 뒤 코드가 자동 재생성됩니다 (footer의 <Kbd>Regen #N</Kbd> 카운터로 확인).
      </P>
      <P>각 블록이 만드는 코드의 출처:</P>
      <Code>{`블록 정의       lib/blockly/blocks.ts          (모양·필드·색)
코드 생성       lib/blockly/python-generator.ts (블록→Python)
툴박스 분류     lib/blockly/toolbox.ts
타겟별 헤더     lib/targets/python.ts          (NI PXIe/cRIO/cDAQ)`}</Code>
      <P>예: <Kbd>ai_read</Kbd> 블록 → <Kbd>nexys.channels.ai_read(&apos;AI0&apos;)</Kbd>.
        새 블록을 추가하려면 위 3개 파일(정의·생성기·툴박스)에 같은 <i>type</i> 키로 항목을 추가하면 됩니다.</P>

      <H>수동 편집과의 관계</H>
      <P>
        Code 탭의 <b>Edit</b>로 Python을 직접 고칠 수 있지만, <b>블록을 다시 바꾸면 자동 생성 코드로 되돌아갑니다</b>
        (블록이 항상 원본(source of truth)). 직접 편집본을 유지하려는 동안에는 블록을 건드리지 마세요.
      </P>
    </div>
  );
}

function ModulesSection() {
  return (
    <div>
      <H>모듈 = 여러 블록을 묶은 재사용 단위 (LabVIEW Sub-VI)</H>
      <P>
        워크스페이스에서 블록(맨 위 블록)을 선택하고 좌상단 <Kbd>Make Module</Kbd>을 누르면, 그 블록과 아래 체인이
        하나의 <b>모듈 블록(▦)</b>으로 묶입니다. MODULES 카테고리에서 몇 번이고 재사용할 수 있고,
        모든 재사용은 하나의 공유 함수 호출로 코드 생성됩니다.
      </P>
      <Code>{`def module_BIT_Pulse():     # 모듈 본문 (한 번만 정의)
    nexys.channels.do_write('DO0', 'HIGH')
    ...
def main():
    module_BIT_Pulse()      # 호출부 (재사용마다)`}</Code>
      <P>
        모듈 본문에서 <b>읽기만 하고 쓰지 않는 변수</b>는 자동으로 <b>입력 파라미터(터미널)</b>가 됩니다.
        예: <Kbd>NI_AO_Voltage</Kbd> 모듈의 <Kbd>volts</Kbd> → <Kbd>module_NI_AO_Voltage(volts)</Kbd>.
      </P>
      <P>모듈 블록을 선택하고 <Kbd>Ungroup</Kbd>을 누르면 내부 블록으로 다시 펼쳐 편집할 수 있습니다.</P>
      <Code>{`구현    lib/blockly/module-store.ts     (정의·자유변수 검출)
        lib/blockly/module-blockly.ts   (블록 등록·코드 생성)
샘플    lib/blockly/sample-modules.ts   (NI_* 예제)`}</Code>
    </div>
  );
}

function SdkSection() {
  return (
    <div>
      <H>nexys = 생성 코드가 호출하는 실제 Python SDK</H>
      <P>
        생성된 <Kbd>import nexys</Kbd> 코드는 <Kbd>sdk/nexys/</Kbd> 패키지가 실행합니다. 약 20개 함수의 작은 패키지로,
        백엔드를 바꿔 끼울 수 있습니다.
      </P>
      <Code>{`nexys.init(target=...)                 _core.py    런타임·백엔드 선택
nexys.channels.{ai_read,ao_write,      channels.py 채널 I/O
                di_read,do_write,sensor_read}
nexys.timing.{loop_every,delay_ms,     timing.py   타이밍
              wait_until}
nexys.signal.{scale_linear,rms,lpf,    signal.py   신호처리
              in_range}
nexys.output.{log_tdms,mqtt_publish,   output.py   출력/로깅
              alarm,bit_result}`}</Code>
      <P>백엔드:</P>
      <Code>{`backends/sim.py   하드웨어 없이 동작 (합성 신호) — 기본
backends/ni.py    실제 NI 하드웨어 (nidaqmx)
                  AI{n}->dev/ai{n}, DO{n}->dev/port1/line{n} ...`}</Code>
      <P>
        TDMS 로그는 <b>실제 TDMS 2.0 바이너리</b>로 저장됩니다 (<Kbd>tdms.py</Kbd>, npTDMS 라운드트립 검증 완료).
        실행: <Kbd>python sdk/examples/ni_acquire_demo.py</Kbd> → 진짜 <Kbd>.tdms</Kbd> 생성.
      </P>
    </div>
  );
}

function InterfacesSection() {
  return (
    <div>
      <H>통신 인터페이스 + 자체검증(BIT)</H>
      <P>
        <Kbd>nexys.interfaces</Kbd>는 UDP · TCP · Serial 전송을 제공하고, <Kbd>nexys.selftest</Kbd>는
        루프백으로 링크 무결성을 검증합니다(하드웨어 불필요).
      </P>
      <Code>{`import nexys
nexys.init(target="sim")
report = nexys.selftest.run()
print(report.summary())   # UDP/TCP/Serial 루프백 + 채널 BIT`}</Code>

      <H>실제 이더넷으로 값이 오는지 확인</H>
      <P>한쪽 PC에서 수신, 다른 PC/장비에서 송신:</P>
      <Code>{`# 수신 PC (자기 IP를 출력해줌)
python -m nexys.netcheck listen --proto udp --port 5005

# 송신 PC / 장비
python -m nexys.netcheck send --proto udp --host <수신PC IP> --port 5005 \\
    --count 100 --hz 20 --pattern sine`}</Code>
      <P>
        리스너는 들어오는 값마다 소스 IP·시퀀스·값·지연(ms)·패킷 유실을 표시합니다.
        와이어 포맷 <Kbd>NEXYS,&lt;seq&gt;,&lt;time&gt;,&lt;value&gt;</Kbd> — 장비가 직접 보내도 됩니다.
      </P>
    </div>
  );
}
