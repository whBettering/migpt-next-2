import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../config.js';

function createEngine(calls) {
  return {
    config,
    speaker: {
      async abortXiaoAI() {
        calls.push(['abort']);
        return true;
      },
    },
    MiOT: {
      async doAction(siid, aiid, text) {
        calls.push(['tts', siid, aiid, text]);
        return true;
      },
    },
    async askAI(receivedMessage, options) {
      calls.push(['askAI', receivedMessage.text, options]);
      return { text: '这是豆包返回的答案' };
    },
  };
}

test('enables model-directed web search', () => {
  assert.equal(config.openai.webSearch?.enabled, true);
  assert.equal(config.openai.webSearch?.strategy, 'hybrid');
});

test('uses the L05B MIoT text action for thinking and the AI answer', async () => {
  const calls = [];
  const message = {
    id: 'message-1',
    sender: 'user',
    text: '华为是一家什么样的公司',
    timestamp: 1,
  };
  const engine = createEngine(calls);

  const reply = await config.onMessage(engine, message);

  assert.deepEqual(calls, [
    ['abort'],
    ['tts', 5, 3, '正在思考中'],
    ['askAI', message.text, { stream: false }],
    ['tts', 5, 3, '这是豆包返回的答案'],
  ]);
  assert.deepEqual(reply, { handled: true });
});

test('keeps a useful native XiaoAI answer without interrupting it', async () => {
  const calls = [];
  const message = {
    id: 'message-native',
    sender: 'user',
    text: '今天杭州天气怎么样',
    timestamp: 2,
    metadata: {
      xiaoAIAnswer: '今天杭州晴到多云，最高气温三十八度。',
      xiaoAIAnswerType: 'TTS',
    },
  };

  const reply = await config.onMessage(createEngine(calls), message);

  assert.deepEqual(calls, []);
  assert.deepEqual(reply, { handled: true });
});

test('uses the external LLM for explicit XiaoAI failure answers', async () => {
  const failures = [
    '这个我不知道',
    '抱歉，我暂时无法回答',
    '这个问题我回答不了',
    '我没听懂你说什么',
    '你可以换个问题',
    '被你问住了，看来要更努力学习了',
    '每个问题你都问住了，看来我要更努力学习了',
    '本设备暂不支持该功能，请前往手机小爱查询',
    '这个我暂时还回答不上诶，我要再学习学习',
    '这个问题把我难住了，我会继续努力的',
    '被难住了诶，看我还要再学习一下',
  ];

  for (const [index, xiaoAIAnswer] of failures.entries()) {
    const calls = [];
    const message = {
      id: `message-failure-${index}`,
      sender: 'user',
      text: '这是一个小爱不会的问题',
      timestamp: 3 + index,
      metadata: { xiaoAIAnswer, xiaoAIAnswerType: 'TTS' },
    };

    await config.onMessage(createEngine(calls), message);

    assert.deepEqual(calls, [
      ['abort'],
      ['tts', 5, 3, '正在思考中'],
      ['askAI', message.text, { stream: false }],
      ['tts', 5, 3, '这是豆包返回的答案'],
    ]);
  }
});
