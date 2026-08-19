import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatBot } from '../packages/chat/dist/index.js';
import { MiGPTEngine } from '../packages/engine/dist/index.js';

test('supports a non-streaming AI reply for web-search requests', async () => {
  const originalChat = ChatBot.chat;
  const originalChatWithStream = ChatBot.chatWithStream;
  const calls = [];

  try {
    ChatBot.chat = async (message) => {
      calls.push(['chat', message.text]);
      return '联网回答';
    };
    ChatBot.chatWithStream = async (message) => {
      calls.push(['chatWithStream', message.text]);
      return { status: 'pending' };
    };

    const engine = new MiGPTEngine();
    const message = {
      id: 'web-search-message',
      sender: 'user',
      text: '今天黄金价格是多少',
      timestamp: 1,
    };

    const reply = await engine.askAI(message, { stream: false });

    assert.deepEqual(calls, [['chat', message.text]]);
    assert.deepEqual(reply, { text: '联网回答' });
  } finally {
    ChatBot.chat = originalChat;
    ChatBot.chatWithStream = originalChatWithStream;
  }
});
