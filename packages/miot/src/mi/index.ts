import { uuid } from '../utils/hash.js';
import { readJSON, writeJSON } from '../utils/io.js';
import { getAccount } from './account.js';
import { MiNA } from './mina.js';
import { MIoT } from './miot.js';
import type { MiAccount } from './typing.js';

interface Store {
  miot?: MiAccount;
  mina?: MiAccount;
}
const kConfigFile = '.mi.json';

export async function getMiService(config: {
  service: 'miot' | 'mina';
  userId?: string;
  password?: string;
  passToken?: string;
  did?: string;
  relogin?: boolean;
}) {
  const { service, relogin, ...rest } = config;
  const overrides: any = relogin ? {} : rest;
  if (overrides.passToken) {
    overrides.pass = {
      ...overrides.pass,
      passToken: overrides.passToken,
    };
  }
  const randomDeviceId = `android_${uuid()}`;
  const store: Store = (await readJSON(kConfigFile)) ?? {};
  let account = {
    deviceId: randomDeviceId,
    ...store[service],
    ...overrides,
    sid: service === 'miot' ? 'xiaomiio' : 'micoapi',
  };
  if (!account.passToken && (!account.userId || !account.password)) {
    console.error('❌ 没有找到账号或密码，请检查是否已配置相关参数：userId, password');
    return;
  }
  account = await getAccount(account);
  if (!account?.serviceToken || !account.pass?.ssecurity) {
    return undefined;
  }
  store[service] = account;
  await writeJSON(kConfigFile, store);
  return service === 'miot' ? new MIoT(account as any) : new MiNA(account as any);
}
