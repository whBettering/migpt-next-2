import { randomUUID } from 'node:crypto';
import { OpenAI } from '@mi-gpt/openai';
import { StreamResponse } from '@mi-gpt/stream';
import { deepMerge } from '@mi-gpt/utils';
import { replaceVars, toUTC8Time } from '@mi-gpt/utils/string';
import { type ChatConfig, kDefaultChatConfig } from './config.js';

export interface IMessage {
  id: string;
  text: string;
  timestamp: number;
  sender: 'user' | 'assistant';
  /** Transport-specific context that is not sent to the language model. */
  metadata?: Record<string, unknown>;
}

export class _ChatBot {
  history: IMessage[] = [];

  config: ChatConfig = {};

  init(config?: ChatConfig) {
    this.config = deepMerge(kDefaultChatConfig, config);
    OpenAI.init(config?.openai);
    StreamResponse.init(config?.stream);
  }

  dispose() {
    this.history = [];
    OpenAI.dispose();
  }

  async chat(msg: IMessage) {
    const answer = await OpenAI.chat({
      requestId: msg.id,
      createParams: {
        messages: this._getMessages(msg),
        stream: false,
      },
    });

    if (answer) {
      this._addMessage({
        id: randomUUID(),
        text: answer,
        timestamp: Date.now(),
        sender: 'assistant',
      });
    }

    return answer;
  }

  /**
   * 处理用户消息，返回流式响应
   */
  async chatWithStream(msg: IMessage, onError?: (error: Error) => Promise<void>) {
    const stream = new StreamResponse();

    OpenAI.chat({
      requestId: msg.id,
      createParams: {
        messages: this._getMessages(msg),
        stream: true,
      },
      onStream: (text) => {
        if (stream.status === 'canceled') {
          return OpenAI.cancel(msg.id);
        }
        stream.write(text);
      },
      onError: async (error) => {
        stream.cancel();
        await onError?.(error);
      },
    }).then((answer) => {
      if (answer) {
        stream.flush();
        this._addMessage({
          id: randomUUID(),
          text: answer,
          timestamp: Date.now(),
          sender: 'assistant',
        });
      } else {
        stream.cancel();
      }
    });

    return stream;
  }

  private _getMessages(msg: IMessage) {
    const { context } = this._addMessage(msg);

    const messages: any[] = this.history.map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    if (this.config.prompt!.system) {
      messages.unshift({
        role: 'system',
        content: replaceVars(this.config.prompt!.system, context),
      });
    }

    return messages;
  }

  private _addMessage(msg: IMessage) {
    const context = {
      msg: msg.text,
      time: toUTC8Time(new Date(msg.timestamp)),
      ...this.config.context!.vars,
    };

    const message: IMessage = {
      ...msg,
      text: replaceVars(this.config.prompt![msg.sender]!, context),
    };

    const maxHistoryLength = Math.max(1, this.config.context!.historyMaxLength!);

    if (this.history.length === maxHistoryLength) {
      this.history.shift();
    }

    if (this.history.length < maxHistoryLength) {
      this.history.push(message);
    }

    return { message, context };
  }
}

export const ChatBot = new _ChatBot();
