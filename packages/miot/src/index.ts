import { getMiService } from './mi/index.js';
import { MiNA } from './mi/mina.js';
import { MIoT } from './mi/miot.js';
import { Debugger } from './utils/debug.js';
import { Http } from './utils/http.js';

export { MiNA, MIoT };

export interface MiServiceConfig {
  /**
   * 小爱音箱在米家中设置的名称
   *
   * 如果提示找不到设备，请打开 debug 选项获取设备真实的 name、miotDID 或 mac 地址填入
   */
  did: string;
  /**
   * 小米 ID（一串数字）
   *
   * 注意：不是手机号或邮箱，请在小米账号「个人信息」-「小米 ID」查看
   */
  userId?: string;
  /**
   * 小米账号密码
   */
  password?: string;
  /**
   * 小米账号 passToken
   *
   * 获取教程：https://github.com/idootop/migpt-next/issues/4
   */
  passToken?: string;
  /**
   * 是否开启调试模式
   *
   * 开启后会打印设备列表等信息
   */
  debug?: boolean;
  /**
   * 网络请求超时时长（毫秒）
   *
   * 默认 5000（5 秒）
   */
  timeout?: number;
}

export async function getMIoT(config: MiServiceConfig): Promise<MIoT | undefined> {
  Debugger.debug = config.debug;
  Http.timeout = config.timeout ?? Http.timeout;
  return getMiService({ service: 'miot', ...config }) as any;
}

export async function getMiNA(config: MiServiceConfig): Promise<MiNA | undefined> {
  Debugger.debug = config.debug;
  Http.timeout = config.timeout ?? Http.timeout;
  return getMiService({ service: 'mina', ...config }) as any;
}
