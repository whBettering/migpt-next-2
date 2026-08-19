import {
  type MIoT,
  type MiNA,
  type MiServiceConfig as _MiServiceConfig,
  getMIoT,
  getMiNA,
} from '@mi-gpt/miot';
import { jsonEncode } from '@mi-gpt/utils/parse';
import { assert } from './utils.js';

export type MiServiceConfig = _MiServiceConfig;

class _MiService {
  MiNA?: MiNA;
  MiOT?: MIoT;

  async init(config: { debug: boolean; speaker: MiServiceConfig }) {
    const { debug = false, speaker } = config;

    assert(!!speaker.did, '❌ Speaker 缺少 did 参数');
    assert(
      !!speaker.passToken || (!!speaker.userId && !!speaker.password),
      '❌ Speaker 缺少 passToken 或 userId 和 password',
    );

    speaker.debug = debug;
    speaker.timeout = Math.max(1000, speaker.timeout ?? 5000);

    this.MiNA = await getMiNA(speaker);
    this.MiOT = await getMIoT(speaker);

    assert(!!this.MiNA && !!this.MiOT, '❌ 初始化 Mi Services 失败');

    if (debug) {
      const device: any = this.MiOT!.account?.device;
      console.debug(
        '🐛 设备信息：',
        jsonEncode(
          {
            name: device?.name,
            desc: device?.desc,
            model: device?.model,
            rom: device?.extra?.fw_version,
          },
          { prettier: true },
        ),
      );
    }
  }
}

export const MiService = new _MiService();
