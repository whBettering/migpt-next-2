import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const miotDistURL = new URL('../packages/miot/dist/', import.meta.url);

async function loadMiOTChunk() {
  const indexSource = await readFile(new URL('index.js', miotDistURL), 'utf8');
  const chunkPath = indexSource.match(/import \{ Http[^;]+from '([^']+)'/)?.[1];
  assert.ok(chunkPath, 'MiOT bundle should import the chunk that exports Http');
  return import(`${new URL(chunkPath, miotDistURL).href}?proxy-test=${Date.now()}`);
}

test('routes MiOT HTTP requests through HTTP_PROXY', async () => {
  const requests = [];
  const proxy = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ proxied: true }));
  });

  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });

  const address = proxy.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');

  const previousHTTPProxy = process.env.HTTP_PROXY;
  process.env.HTTP_PROXY = `http://127.0.0.1:${address.port}`;

  try {
    const { Http } = await loadMiOTChunk();
    const result = await Http.get('http://miot-proxy-test.invalid/probe', { timeout: 1000 });

    assert.deepEqual(result, { proxied: true });
    assert.deepEqual(requests, ['http://miot-proxy-test.invalid/probe']);
  } finally {
    if (previousHTTPProxy === undefined) {
      delete process.env.HTTP_PROXY;
    } else {
      process.env.HTTP_PROXY = previousHTTPProxy;
    }
    await new Promise((resolve, reject) =>
      proxy.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
