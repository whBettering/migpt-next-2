import assert from 'node:assert/strict';
import test from 'node:test';

import * as NextModule from '../packages/next/dist/index.js';

test('extracts native TTS and LLM answers from Xiaomi conversation records', () => {
  const extractNativeAnswer = NextModule.extractNativeAnswer;
  assert.equal(typeof extractNativeAnswer, 'function');

  assert.deepEqual(
    extractNativeAnswer?.({ answers: [{ type: 'TTS', tts: { text: '  今天杭州晴天  ' } }] }),
    { text: '今天杭州晴天', type: 'TTS' },
  );
  assert.deepEqual(
    extractNativeAnswer?.({ answers: [{ type: 'LLM', llm: { text: '小爱的模型回答' } }] }),
    { text: '小爱的模型回答', type: 'LLM' },
  );
  assert.equal(extractNativeAnswer?.({ answers: [] }), undefined);
});
