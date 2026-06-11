/**
 * 첫 화면에서 빈 워크스페이스를 보여주지 마라.
 * 부장님이 처음 보자마자 "이게 뭔지 알겠다" 느끼게 하는 BIT 시퀀스 데모.
 *
 * Claude Code 빌드 지침:
 *   workspace-panel.tsx의 useEffect 안에서 Blockly inject 후
 *   다음 함수를 호출하여 데모 블록을 로드한다.
 *
 *   Blockly.serialization.workspaces.load(INITIAL_WORKSPACE_STATE, workspace);
 *
 * Blockly의 JSON serialization 포맷을 사용한다.
 */

export const INITIAL_WORKSPACE_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'loop_every',
        x: 80,
        y: 60,
        fields: { INTERVAL_MS: 50 },
        inputs: {
          DO: {
            block: {
              type: 'do_write',
              fields: { CHANNEL: 'DO0', LEVEL: 'HIGH' },
              next: {
                block: {
                  type: 'delay_ms',
                  fields: { MS: 10 },
                  next: {
                    block: {
                      type: 'do_write',
                      fields: { CHANNEL: 'DO0', LEVEL: 'LOW' },
                      next: {
                        block: {
                          type: 'log_to_tdms',
                          fields: { CHANNEL_NAME: 'bit_response' },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'ai_read',
                                fields: { CHANNEL: 'AI0' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};
