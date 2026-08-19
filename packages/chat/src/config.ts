import type { OpenAIConfig } from '@mi-gpt/openai/config';
import type { StreamResponseConfig } from '@mi-gpt/stream/config';
import type { DeepPartial } from '@mi-gpt/utils/typing';

export type ChatConfig = DeepPartial<{
  stream: StreamResponseConfig;
  openai: OpenAIConfig;
  /**
   * 提示词
   *
   * 支持使用变量模板，比如：
   *
   * {time} 陆小千：{msg} 👉 2025年 1 月 1 日 20:00 陆小千：请问地球为什么是圆的？
   */
  prompt: {
    /**
     * 系统提示词
     *
     * 示例：
     * 你是魔幻手机里的女主傻妞，你的主人是陆小千。
     * 请你用傻妞的语气，回答小千哥哥的问题，记得多关心他，偶尔撒娇。
     */
    system: string;
    /**
     * 用户提示词
     *
     * 示例：{time} 陆小千：{msg}
     */
    user: string;
    /**
     * 助手提示词
     *
     * 示例：{time} 傻妞：{msg}
     */
    assistant: string;
  };
  /**
   * 上下文
   */
  context: {
    /**
     * 提示词变量
     *
     * 内置变量列表如下
     *
     * |变量|说明|示例|
     * |---|---|---|
     * |{time}|当前时间|2025年 1 月 1 日 20:00|
     * |{msg}|当前消息|请问地球为什么是圆的？|
     */
    vars: Record<string, string | (() => string)>;
    /**
     * 历史消息数量上限（包含用户消息和助手消息）
     *
     * 默认：10
     */
    historyMaxLength: number;
  };
}>;

export const kDefaultChatConfig: ChatConfig = {
  prompt: {
    system: '',
    user: '{msg}',
    assistant: '{msg}',
  },
  context: {
    vars: {},
    historyMaxLength: 10,
  },
};
