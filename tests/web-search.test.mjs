import assert from 'node:assert/strict';
import test from 'node:test';

import * as OpenAIModule from '../packages/openai/dist/index.js';

const { OpenAI } = OpenAIModule;

function useFakeClient({ response, chatAnswer = '普通模型回答', responseError } = {}) {
  const calls = { chat: [], responses: [] };

  OpenAI.config = {
    model: 'test-model',
    webSearch: {
      enabled: true,
      strategy: 'hybrid',
      fallbackNotice: '联网搜索暂时不可用，以下内容可能不是最新。',
    },
    extra: {
      requestOptions: {},
    },
  };

  OpenAI._client = {
    responses: {
      async create(params) {
        calls.responses.push(params);
        if (responseError) throw responseError;
        return response;
      },
    },
    chat: {
      completions: {
        async create(params) {
          calls.chat.push(params);
          return { choices: [{ message: { content: chatAnswer } }] };
        },
      },
    },
  };

  return calls;
}

test('detects only questions that need fresh information', () => {
  const shouldUseWebSearch = OpenAIModule.shouldUseWebSearch;
  assert.equal(typeof shouldUseWebSearch, 'function');

  assert.equal(
    shouldUseWebSearch?.([{ role: 'user', content: '介绍一下 OpenAI 这家公司' }]),
    false,
  );
  assert.equal(
    shouldUseWebSearch?.([{ role: 'user', content: 'OpenAI 最近发布了什么模型' }]),
    true,
  );
  assert.equal(
    shouldUseWebSearch?.([{ role: 'user', content: '联网查一下 OpenAI' }]),
    true,
  );
  assert.equal(
    shouldUseWebSearch?.([{ role: 'user', content: 'OpenAI 的 CEO 是谁' }]),
    true,
  );
});

test('parses sources and removes URLs from text spoken by the speaker', () => {
  const parse = OpenAIModule.parseWebSearchResponse;
  assert.equal(typeof parse, 'function');

  const parsed = parse?.({
    output_text:
      '今天 AI 圈有重要更新，可查看[新闻来源](https://news.example/a)，详情 https://news.example/b',
    output: [
      { type: 'web_search_call', id: 'search-1' },
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: '今天 AI 圈有重要更新。',
            annotations: [
              {
                type: 'url_citation',
                title: '新闻来源',
                url: 'https://news.example/a',
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(parsed, {
    text: '今天 AI 圈有重要更新，可查看新闻来源，详情',
    searched: true,
    sources: [{ title: '新闻来源', url: 'https://news.example/a' }],
  });
});

test('lets Responses API decide whether web search is needed', async () => {
  const messages = [{ role: 'user', content: '今天 AI 圈有什么大事' }];
  const calls = useFakeClient({
    response: {
      output_text: '这是联网后的回答',
      output: [{ type: 'web_search_call', id: 'search-1' }],
    },
  });

  const answer = await OpenAI.chat({
    requestId: 'request-1',
    createParams: { messages, stream: false },
  });

  assert.equal(answer, '这是联网后的回答');
  assert.equal(calls.chat.length, 0);
  assert.deepEqual(calls.responses[0]?.input, messages);
  assert.deepEqual(calls.responses[0]?.tools, [{ type: 'web_search' }]);
  assert.equal(calls.responses[0]?.tool_choice, 'auto');
});

test('routes stable knowledge directly to Chat Completions', async () => {
  const messages = [{ role: 'user', content: '介绍一下 OpenAI 这家公司' }];
  const calls = useFakeClient({
    response: {
      output_text: '不应该使用的联网回答',
      output: [{ type: 'web_search_call', id: 'search-1' }],
    },
    chatAnswer: '普通模型公司介绍',
  });

  const answer = await OpenAI.chat({
    requestId: 'request-stable',
    createParams: { messages, stream: false },
  });

  assert.equal(answer, '普通模型公司介绍');
  assert.equal(calls.responses.length, 0);
  assert.equal(calls.chat.length, 1);
});

test('falls back to Chat Completions with a stale-information warning', async () => {
  const calls = useFakeClient({
    responseError: new Error('web search unavailable'),
    chatAnswer: '基于模型已有知识的回答',
  });

  const answer = await OpenAI.chat({
    requestId: 'request-2',
    createParams: {
      messages: [{ role: 'user', content: '最新的 AI 新闻' }],
      stream: false,
    },
  });

  assert.equal(calls.responses.length, 1);
  assert.equal(calls.chat.length, 1);
  assert.equal(
    answer,
    '联网搜索暂时不可用，以下内容可能不是最新。基于模型已有知识的回答',
  );
});
