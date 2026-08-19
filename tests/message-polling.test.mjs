import assert from 'node:assert/strict';
import test from 'node:test';

import * as MessageModule from '../packages/next/dist/message.js';

const answeredRecord = (requestId, time, query, text) => ({
  requestId,
  time,
  query,
  answers: [{ type: 'TTS', tts: { text } }],
});

const pendingRecord = (requestId, time, query) => ({
  requestId,
  time,
  query,
  answers: [],
});

function createConversationSource(responses) {
  let index = 0;
  return async () => responses[Math.min(index++, responses.length - 1)];
}

test('fast-polls a new pending conversation until its native answer appears', async () => {
  const MiMessageManager = MessageModule.MiMessageManager;
  assert.equal(typeof MiMessageManager, 'function');

  const oldRecord = answeredRecord('old', 1, '旧问题', '旧答案');
  const pending = pendingRecord('new', 2, '新问题');
  const answered = answeredRecord('new', 2, '新问题', '被你问住了');
  const sleeps = [];
  const manager = new MiMessageManager({
    getConversations: createConversationSource([
      { records: [oldRecord] },
      { records: [pending, oldRecord] },
      { records: [pending, oldRecord] },
      { records: [answered, oldRecord] },
    ]),
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    pendingPollInterval: 100,
    pendingPollTimeout: 500,
  });

  assert.equal(await manager.fetchNextMessage(), undefined);
  const message = await manager.fetchNextMessage();

  assert.equal(message.id, 'new');
  assert.equal(message.text, '新问题');
  assert.deepEqual(message.metadata, {
    xiaoAIAnswer: '被你问住了',
    xiaoAIAnswerType: 'TTS',
  });
  assert.deepEqual(sleeps, [100, 100]);
});

test('does not consume a pending conversation when fast polling times out', async () => {
  const oldRecord = answeredRecord('old', 1, '旧问题', '旧答案');
  const pending = pendingRecord('new', 2, '新问题');
  const answered = answeredRecord('new', 2, '新问题', '稍后出现的答案');
  let ready = false;
  let calls = 0;
  const sleeps = [];
  const manager = new MessageModule.MiMessageManager({
    getConversations: async () => {
      calls += 1;
      return calls === 1
        ? { records: [oldRecord] }
        : { records: [ready ? answered : pending, oldRecord] };
    },
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    pendingPollInterval: 100,
    pendingPollTimeout: 200,
  });

  assert.equal(await manager.fetchNextMessage(), undefined);
  assert.equal(await manager.fetchNextMessage(), undefined);
  assert.deepEqual(sleeps, [100, 100]);

  ready = true;
  const message = await manager.fetchNextMessage();
  assert.equal(message.id, 'new');
  assert.equal(message.metadata.xiaoAIAnswer, '稍后出现的答案');
});
