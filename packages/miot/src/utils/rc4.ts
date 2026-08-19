import { sha1 } from './hash.js';

export class RC4 {
  iii: number;
  jjj: number;
  bytes: Uint8Array;

  constructor(buf: Buffer) {
    this.bytes = new Uint8Array(256);
    const length = buf.length;
    for (let i = 0; i < 256; i++) {
      this.bytes[i] = i;
    }
    let i2 = 0;
    for (let i3 = 0; i3 < 256; i3++) {
      const i4 = i2 + buf[i3 % length]!;
      const b = this.bytes[i3]!;
      i2 = (i4 + b) & 255;
      this.bytes[i3] = this.bytes[i2]!;
      this.bytes[i2] = b;
    }
    this.iii = 0;
    this.jjj = 0;
  }

  update(buf: Buffer) {
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i]!;
      const i2 = (this.iii + 1) & 255;
      this.iii = i2;
      const i3 = this.jjj;
      const arr = this.bytes;
      const b2 = arr[i2]!;
      const i4 = (i3 + b2) & 255;
      this.jjj = i4;
      arr[i2] = arr[i4]!;
      arr[i4] = b2;
      buf[i] = b ^ arr[(arr[i2] + b2) & 255]!;
    }
    return buf;
  }
}

export function rc4Hash(
  method: string,
  uri: string,
  data: { [x: string]: string },
  ssecurity: string,
) {
  const arrayList = [];
  if (method != null) {
    arrayList.push(method.toUpperCase());
  }
  if (uri != null) {
    arrayList.push(uri);
  }
  if (data != null) {
    for (const k in data) {
      arrayList.push(`${k}=${data[k]}`);
    }
  }
  arrayList.push(ssecurity);
  const sb = arrayList.join('&');
  return sha1(sb);
}
