import { encodeQuery, parseAuthPass } from '../utils/codec.js';
import { md5, sha1 } from '../utils/hash.js';
import { Http } from '../utils/http.js';
import { MiNA } from './mina.js';
import { MIoT } from './miot.js';
import type { MiAccount, MiPass } from './typing.js';

const kLoginAPI = 'https://account.xiaomi.com/pass';

export async function getAccount(_account: MiAccount): Promise<MiAccount | undefined> {
  let account = _account;
  let res = await Http.get(
    `${kLoginAPI}/serviceLogin`,
    { sid: account.sid, _json: true, _locale: 'zh_CN' },
    { cookies: _getLoginCookies(account) },
  );
  if (res.isError) {
    console.error('❌ 登录失败', res);
    return undefined;
  }
  let pass = parseAuthPass(res);
  if (pass.code !== 0) {
    // 登录态失效，重新登录
    const data = {
      _json: 'true',
      qs: pass.qs,
      sid: account.sid,
      _sign: pass._sign,
      callback: pass.callback,
      user: account.userId,
      hash: md5(account.password).toUpperCase(),
    };
    res = await Http.post(`${kLoginAPI}/serviceLoginAuth2`, encodeQuery(data), {
      cookies: _getLoginCookies(account),
    });
    if (res.isError) {
      console.error('❌ OAuth2 登录失败', res);
      return undefined;
    }
    pass = parseAuthPass(res);
  }
  if (pass.notificationUrl?.includes('identity/authStart')) {
    console.error('❌ 本次登录需要验证码，请使用 passToken 重新登录');
    console.log('💡 获取 passToken 教程：https://github.com/idootop/migpt-next/issues/4');
    return undefined;
  }
  if (!pass.location || !pass.nonce || !pass.passToken) {
    console.error('❌ 登录失败，请检查你的账号密码是否正确', res);
    return undefined;
  }
  // 刷新登录态
  const serviceToken = await _getServiceToken(pass);
  if (!serviceToken) {
    return undefined;
  }
  account = { ...account, pass, serviceToken };
  account = await MiNA.getDevice(account as any);
  account = await MIoT.getDevice(account as any);
  if (account.did && !account.device) {
    console.error(`❌ 找不到设备：${account.did}`);
    console.log(
      '🐛 请检查你的 did 与米家中的设备名称是否一致。注意错别字、空格和大小写，比如：音响 👉 音箱',
    );
    console.log(
      '💡 建议打开 debug 选项，查看目标设备的真实 name、miotDID 或 mac 地址，更新 did 参数',
    );
    return undefined;
  }
  return account;
}

function _getLoginCookies(account: MiAccount) {
  return {
    userId: account.userId,
    deviceId: account.deviceId,
    passToken: account.pass?.passToken,
  };
}

async function _getServiceToken(pass: MiPass): Promise<string | undefined> {
  const { location, nonce, ssecurity } = pass ?? {};
  const res = await Http.get(
    location!,
    {
      _userIdNeedEncrypt: true,
      clientSign: sha1(`nonce=${nonce}&${ssecurity}`),
    },
    { rawResponse: true },
  );

  const cookies = res.headers?.['set-cookie'] ?? [];
  for (const cookie of cookies) {
    if (cookie.includes('serviceToken')) {
      return cookie.split(';')[0].replace('serviceToken=', '');
    }
  }
  console.error('❌ 获取 Mi Service Token 失败', res);
  return undefined;
}
