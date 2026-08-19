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
