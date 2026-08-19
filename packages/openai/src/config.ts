import type { DeepPartial, Prettify } from '@mi-gpt/utils/typing';
import type { ClientOptions } from 'openai';
import type { RequestOptions } from 'openai/core';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';

export type OpenAIConfig = DeepPartial<{
  /**
   * 是否启用代理
   *
   * 默认：false
   */
  enableProxy: boolean;
  /**
   * 你的大模型服务提供商的接口地址
   *
   * 支持兼容 OpenAI 接口的大模型服务，比如：DeepSeek V3 等
   *
   * 注意：一般以 /v1 结尾，不包含 /chat/completions 部分
   * - ✅ https://api.openai.com/v1
   * - ❌ https://api.openai.com/v1/（最后多了一个 /）
   * - ❌ https://api.openai.com/v1/chat/completions（不需要加 /chat/completions）
   */
  baseURL: string;
  /**
   * 密钥
   *
   * 示例：sk-1234567890
   */
  apiKey: string;
  /**
   * 模型
   *
   * 默认：gpt-4o-mini
   */
  model: string;
  /**
   * 火山方舟 Responses API 内置联网搜索。
   *
   * 开启后由模型自动判断当前问题是否需要搜索。
   */
  webSearch: {
    enabled: boolean;
    /** `hybrid` 先本地判断时效性，`auto` 则每次都交给模型判断。 */
    strategy: 'auto' | 'hybrid';
    /** Responses 或搜索失败时，普通模型回答前的提示。 */
    fallbackNotice: string;
  };
  /**
   * 扩展配置
   */
  extra: {
    clientOptions: Prettify<ClientOptions>;
    createParams: Prettify<ChatCompletionCreateParamsBase>;
    requestOptions: Prettify<RequestOptions>;
  };
}>;

export const kDefaultOpenAIConfig: OpenAIConfig = {
  enableProxy: false,
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: 'sk-1234567890',
  webSearch: {
    enabled: false,
    strategy: 'hybrid',
    fallbackNotice: '联网搜索暂时不可用，以下内容可能不是最新。',
  },
  extra: {
    clientOptions: {},
    createParams: {},
    requestOptions: {},
  },
};
