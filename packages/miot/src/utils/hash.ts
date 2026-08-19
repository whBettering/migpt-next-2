import * as crypto from 'node:crypto';

export function md5(s: string) {
  return crypto.createHash('md5').update(s).digest('hex');
}

export function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('base64');
}

export function sha256(snonce: string, msg: string) {
  return crypto.createHmac('sha256', Buffer.from(snonce, 'base64')).update(msg).digest('base64');
}

export function signNonce(ssecurity: string, nonce: string) {
  const m = crypto.createHash('sha256');
  m.update(ssecurity, 'base64');
  m.update(nonce, 'base64');
  return m.digest().toString('base64');
}

export function uuid() {
  return crypto.randomUUID();
}

export function randomString(len: number): string {
  if (len < 1) return '';
  const s = Math.random().toString(36).slice(2);
  return s + randomString(len - s.length);
}

export function randomNoise() {
  return Buffer.from(
    Array(12)
      .fill(0)
      .map(() => Math.floor(Math.random() * 256)),
  ).toString('base64');
}
