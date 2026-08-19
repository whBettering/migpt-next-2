# Fast XiaoAI Fallback Interrupt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect newly generated XiaoAI fallback answers with minimal conversation-API delay, stop their native playback, announce “正在思考中”, and play the external LLM result without interrupting useful native answers.

**Architecture:** Extend the conversation reader with dependency-injected, bounded 100 ms polling that activates only for a new record whose native answer is not ready. Keep fallback classification and playback policy in `config.js`, while making `SpeakerManager.abortXiaoAI()` report the real MiNA stop result so failures are observable without delaying the LLM path.

**Tech Stack:** TypeScript, Node.js test runner, pnpm/Turbo/tsup, Docker Desktop

---

## File Structure

- Create `tests/message-polling.test.mjs`: adaptive pending-answer polling and timeout regressions.
- Create `tests/speaker.test.mjs`: real stop-result propagation regression.
- Modify `tests/config-on-message.test.mjs`: failed-stop logging and continuation regression.
- Modify `packages/next/src/message.ts`: injectable conversation source, stable request IDs, bounded fast polling.
- Modify `packages/next/src/speaker.ts`: return `MiNA.stop()` result.
- Modify `config.js`: inspect the stop result before playing the thinking prompt.
- Regenerate `packages/*/dist/**`: Docker image consumes built workspace artifacts.

### Task 1: Add failing adaptive-polling tests

**Files:**
- Create: `tests/message-polling.test.mjs`
- Test: `tests/message-polling.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create a test that imports `MiMessageManager` from `packages/next/dist/message.js`, supplies queued conversation responses and an injected sleep function, initializes the cursor from an old answered record, then verifies that a pending new record is re-read every 100 ms until its fallback TTS answer appears. Assert that the emitted message uses the Xiaomi `requestId`, contains the native answer metadata, and records only the short sleeps.

Add a second test with a 200 ms polling timeout. Keep the record unanswered for the entire first fetch, assert that the fetch returns `undefined`, then expose its completed answer and assert a later fetch returns the same record. This proves timeout does not advance the handled cursor.

```js
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm exec node --test tests/message-polling.test.mjs
```

Expected: FAIL because `MiMessageManager` is not exported/constructible.

### Task 2: Implement bounded pending-answer polling

**Files:**
- Modify: `packages/next/src/message.ts:1-144`
- Test: `tests/message-polling.test.mjs`

- [ ] **Step 1: Add injectable polling dependencies**

Export the message manager class and accept optional dependencies while retaining production defaults:

```ts
import { firstOf, lastOf, sleep } from '@mi-gpt/utils';

interface ConversationRecord {
  answers: Array<{
    type: string;
    tts?: { text?: string };
    llm?: { text?: string };
  }>;
  query: string;
  requestId?: string;
  time: number;
}

interface MiMessageManagerOptions {
  getConversations?: (options?: {
    limit?: number;
    timestamp?: number;
  }) => Promise<{ records: ConversationRecord[] } | undefined>;
  sleep?: (milliseconds: number) => Promise<void>;
  pendingPollInterval?: number;
  pendingPollTimeout?: number;
}

export class MiMessageManager {
  private readonly _getConversations: NonNullable<
    MiMessageManagerOptions['getConversations']
  >;
  private readonly _sleep: NonNullable<MiMessageManagerOptions['sleep']>;
  private readonly _pendingPollInterval: number;
  private readonly _pendingPollTimeout: number;

  constructor(options: MiMessageManagerOptions = {}) {
    this._getConversations =
      options.getConversations ?? ((request) => MiService.MiNA?.getConversations(request));
    this._sleep = options.sleep ?? sleep;
    this._pendingPollInterval = Math.max(50, options.pendingPollInterval ?? 100);
    this._pendingPollTimeout = Math.max(
      this._pendingPollInterval,
      options.pendingPollTimeout ?? 2000,
    );
  }
```

- [ ] **Step 2: Observe incomplete records and fast-poll only the active one**

Change `_fetchNext2Messages()` to request unfiltered records and pass them through a bounded helper before applying the existing timestamp/cursor logic:

```ts
let msgs = await this._fetchHistoryMsgs({ limit: 2, filterAnswer: false });
const newest = firstOf(msgs);
if (
  newest &&
  newest.timestamp > this._lastQueryMsg!.timestamp &&
  !this._hasNativeAnswer(newest)
) {
  const completed = await this._waitForNativeAnswer(newest);
  if (!completed) return;
  msgs = completed;
}
```

Implement the helpers:

```ts
private _hasNativeAnswer(msg: IMessage) {
  return typeof msg.metadata?.xiaoAIAnswer === 'string';
}

private async _waitForNativeAnswer(pending: IMessage) {
  for (
    let elapsed = 0;
    elapsed < this._pendingPollTimeout;
    elapsed += this._pendingPollInterval
  ) {
    await this._sleep(this._pendingPollInterval);
    const msgs = await this._fetchHistoryMsgs({ limit: 2, filterAnswer: false });
    const current = msgs.find(
      (msg) => msg.id === pending.id || msg.timestamp === pending.timestamp,
    );
    if (current && this._hasNativeAnswer(current)) return msgs;
  }
  return undefined;
}
```

Use the injected conversation source in `_fetchHistoryMsgs()` and retain stable IDs with this complete method:

```ts
private async _fetchHistoryMsgs(options?: {
  limit?: number;
  timestamp?: number;
  filterAnswer?: boolean;
}): Promise<IMessage[]> {
  const filterAnswer = options?.filterAnswer ?? true;
  const conversation = await this._getConversations(options);
  let records = conversation?.records ?? [];
  if (filterAnswer) {
    records = records.filter(
      (record) =>
        ['TTS', 'LLM'].includes(record.answers[0]?.type ?? '') &&
        record.answers.length === 1,
    );
  }
  return records.map((record) => {
    const nativeAnswer = extractNativeAnswer(record);
    return {
      id: record.requestId || randomUUID(),
      sender: 'user',
      text: record.query,
      timestamp: record.time,
      metadata: nativeAnswer
        ? {
            xiaoAIAnswer: nativeAnswer.text,
            xiaoAIAnswerType: nativeAnswer.type,
          }
        : undefined,
    };
  });
}
```

Keep the singleton export:

```ts
export const MiMessage = new MiMessageManager();
```

- [ ] **Step 3: Build the package and verify GREEN**

Run:

```bash
pnpm --filter @mi-gpt/next build
pnpm exec node --test tests/message-polling.test.mjs
```

Expected: 2 tests pass.

### Task 3: Add failing stop-result and fallback-continuation tests

**Files:**
- Create: `tests/speaker.test.mjs`
- Modify: `tests/config-on-message.test.mjs:6-107`
- Test: `tests/speaker.test.mjs`
- Test: `tests/config-on-message.test.mjs`

- [ ] **Step 1: Write the speaker RED test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { MiService } from '../packages/next/dist/service.js';
import { MiSpeaker } from '../packages/next/dist/speaker.js';

test('abortXiaoAI returns the underlying MiNA stop result', async () => {
  const original = MiService.MiNA;
  try {
    MiService.MiNA = { stop: async () => true };
    assert.equal(await MiSpeaker.abortXiaoAI(), true);
    MiService.MiNA = { stop: async () => false };
    assert.equal(await MiSpeaker.abortXiaoAI(), false);
  } finally {
    MiService.MiNA = original;
  }
});
```

- [ ] **Step 2: Write the config RED test**

Change the helper signature and mock return value:

```js
function createEngine(calls, { abortResult = true } = {}) {
  return {
    config,
    speaker: {
      async abortXiaoAI() {
        calls.push(['abort']);
        return abortResult;
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
```

Add a test that temporarily captures `console.warn`. Feed a recognized fallback answer, return `false` from `abortXiaoAI`, and assert both the warning and the playback call order:

```js
test('continues to the thinking prompt when native playback cannot be stopped', async () => {
  const calls = [];
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    await config.onMessage(createEngine(calls, { abortResult: false }), {
      id: 'message-stop-failed',
      sender: 'user',
      text: '小爱不会的问题',
      timestamp: 99,
      metadata: { xiaoAIAnswer: '被你问住了', xiaoAIAnswerType: 'TTS' },
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.match(warnings[0], /未能确认已停止小爱原生播报/);
  assert.deepEqual(calls, [
    ['abort'],
    ['tts', 5, 3, '正在思考中'],
    ['askAI', '小爱不会的问题', { stream: false }],
    ['tts', 5, 3, '这是豆包返回的答案'],
  ]);
});
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
pnpm exec node --test tests/speaker.test.mjs tests/config-on-message.test.mjs
```

Expected: speaker test fails because `abortXiaoAI()` always returns `false`; config test fails because no stop-failure warning is emitted.

### Task 4: Propagate and inspect the stop result

**Files:**
- Modify: `packages/next/src/speaker.ts:21-30`
- Modify: `config.js:122-130`
- Test: `tests/speaker.test.mjs`
- Test: `tests/config-on-message.test.mjs`

- [ ] **Step 1: Return the real MiNA stop result**

```ts
async abortXiaoAI() {
  if (!MiService.MiNA) {
    return false;
  }
  return MiService.MiNA.stop();
}
```

- [ ] **Step 2: Inspect failure without delaying fallback**

```js
const stopped = await engine.speaker.abortXiaoAI();
if (!stopped) {
  console.warn('⚠️ 未能确认已停止小爱原生播报，继续切换外接 LLM');
}
await engine.MiOT.doAction(5, 3, '正在思考中');
```

- [ ] **Step 3: Build and verify GREEN**

Run:

```bash
pnpm --filter @mi-gpt/next build
pnpm exec node --test tests/speaker.test.mjs tests/config-on-message.test.mjs
```

Expected: all targeted tests pass.

- [ ] **Step 4: Commit the implementation**

```bash
git add config.js packages/next/src/message.ts packages/next/src/speaker.ts tests/message-polling.test.mjs tests/speaker.test.mjs tests/config-on-message.test.mjs docs/superpowers/plans/2026-08-19-fast-xiaoai-fallback-interrupt.md
git commit -m "fix: interrupt XiaoAI fallback responses sooner"
```

### Task 5: Full verification and Docker deployment

**Files:**
- Verify: entire workspace
- Build context: `Dockerfile.local`

- [ ] **Step 1: Run the full tests**

```bash
pnpm exec node --test tests/*.test.mjs
```

Expected: zero failed tests.

- [ ] **Step 2: Run the full workspace build**

```bash
pnpm build
```

Expected: Turbo reports successful builds for every workspace package.

- [ ] **Step 3: Verify the worktree and built artifacts**

```bash
git diff --check
git status --short
rg -n "pendingPollInterval|未能确认已停止|return MiService.MiNA.stop" packages/next/src config.js packages/next/dist
```

Expected: no whitespace errors; generated `packages/next/dist` contains the new behavior.

- [ ] **Step 4: Build the Docker image**

```bash
docker build -f Dockerfile.local -t migpt-next-local:latest .
```

Expected: image build exits successfully.

- [ ] **Step 5: Recreate only the project container**

```bash
docker rm -f migpt-next
docker run -d \
  --name migpt-next \
  --restart unless-stopped \
  -e HTTP_PROXY=http://host.docker.internal:12001 \
  -e HTTPS_PROXY=http://host.docker.internal:12001 \
  -e NO_PROXY=localhost,127.0.0.1,host.docker.internal \
  -v /Users/wuhan/wh/myProject/migpt-next-main/config.js:/app/config.js:ro \
  migpt-next-local:latest
```

Expected: a new `migpt-next` container ID is printed. No unrelated container is modified.

- [ ] **Step 6: Verify runtime startup**

```bash
docker ps --filter name=^/migpt-next$ --format '{{.Names}} {{.Image}} {{.Status}}'
docker logs --since 2m migpt-next
```

Expected: `migpt-next` is running from `migpt-next-local:latest` and logs contain `✅ 服务已启动...` without startup errors.
