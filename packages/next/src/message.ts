import { randomUUID } from 'node:crypto';
import type { IMessage } from '@mi-gpt/chat';
import { firstOf, lastOf, sleep } from '@mi-gpt/utils';
import { extractNativeAnswer } from './native-answer.js';
import { MiService } from './service.js';

interface ConversationRecord {
  answers: Array<{
    type: string;
    tts?: { text?: string };
    llm?: { text?: string };
  }>;
  query: string;
  requestId?: string;
  time: number;
}

interface MiMessageManagerOptions {
  getConversations?: (options?: {
    limit?: number;
    timestamp?: number;
  }) => Promise<{ records: ConversationRecord[] } | undefined> | undefined;
  sleep?: (milliseconds: number) => Promise<void>;
  pendingPollInterval?: number;
  pendingPollTimeout?: number;
}

export class MiMessageManager {
  private _lastQueryMsg?: IMessage;
  private _tempQueryMsgs: IMessage[] = [];
  private readonly _getConversations: NonNullable<MiMessageManagerOptions['getConversations']>;
  private readonly _sleep: NonNullable<MiMessageManagerOptions['sleep']>;
  private readonly _pendingPollInterval: number;
  private readonly _pendingPollTimeout: number;

  constructor(options: MiMessageManagerOptions = {}) {
    this._getConversations =
      options.getConversations ?? ((request) => MiService.MiNA?.getConversations(request));
    this._sleep = options.sleep ?? sleep;
    this._pendingPollInterval = Math.max(50, options.pendingPollInterval ?? 100);
    this._pendingPollTimeout = Math.max(
      this._pendingPollInterval,
      options.pendingPollTimeout ?? 2000,
    );
  }

  async fetchNextMessage(): Promise<IMessage | undefined> {
    if (!this._lastQueryMsg) {
      return this._fetchFirstMessage();
    }
    return this._fetchNextMessage();
  }

  private async _fetchFirstMessage() {
    const msgs = await this._fetchHistoryMsgs({
      limit: 1,
      filterAnswer: false,
    });
    this._lastQueryMsg = msgs[0];
    return undefined;
  }

  private async _fetchNextMessage(): Promise<IMessage | undefined> {
    if (this._tempQueryMsgs.length > 0) {
      // 当前有暂存的新消息（从新到旧），依次处理之
      return this._fetchNextTempMessage();
    }
    // 拉取最新的 2 条 msg（用于和上一条消息比对是否连续）
    const nextMsg = await this._fetchNext2Messages();
    if (nextMsg !== 'continue') {
      return nextMsg;
    }
    // 继续向上拉取其他新消息
    return this._fetchNextRemainingMessages();
  }

  /**
   * 拉取最新的 2 条消息，用于和上一条消息比对是否连续
   */
  private async _fetchNext2Messages() {
    let msgs = await this._fetchHistoryMsgs({ limit: 2, filterAnswer: false });
    const newest = firstOf(msgs);
    if (
      newest &&
      newest.timestamp > this._lastQueryMsg!.timestamp &&
      !this._hasNativeAnswer(newest)
    ) {
      const completed = await this._waitForNativeAnswer(newest);
      if (!completed) {
        return;
      }
      msgs = completed;
    }
    if (msgs.length < 1 || firstOf(msgs)!.timestamp <= this._lastQueryMsg!.timestamp) {
      // 没有拉到新消息
      return;
    }
    if (
      firstOf(msgs)!.timestamp > this._lastQueryMsg!.timestamp &&
      (msgs.length === 1 || lastOf(msgs)!.timestamp <= this._lastQueryMsg!.timestamp)
    ) {
      // 刚好收到一条新消息
      this._lastQueryMsg = firstOf(msgs);
      return this._lastQueryMsg;
    }
    // 还有其他新消息，暂存当前的新消息
    for (const msg of msgs) {
      if (msg.timestamp > this._lastQueryMsg!.timestamp) {
        this._tempQueryMsgs.push(msg);
      }
    }
    return 'continue';
  }

  private _hasNativeAnswer(msg: IMessage) {
    return typeof msg.metadata?.xiaoAIAnswer === 'string';
  }

  private async _waitForNativeAnswer(pending: IMessage): Promise<IMessage[] | undefined> {
    for (
      let elapsed = 0;
      elapsed < this._pendingPollTimeout;
      elapsed += this._pendingPollInterval
    ) {
      await this._sleep(this._pendingPollInterval);
      const msgs = await this._fetchHistoryMsgs({ limit: 2, filterAnswer: false });
      const current = msgs.find(
        (msg) => msg.id === pending.id || msg.timestamp === pending.timestamp,
      );
      if (current && this._hasNativeAnswer(current)) {
        return msgs;
      }
    }
    return undefined;
  }

  /**
   * 继续向上拉取其他新消息
   */
  private async _fetchNextRemainingMessages(options?: {
    maxPage?: number;
    pageSize?: number;
  }) {
    let currentPage = 0;
    const { maxPage = 3, pageSize = 10 } = options ?? {};
    while (true) {
      currentPage++;
      if (currentPage > maxPage) {
        // 拉取新消息超长，取消拉取
        return this._fetchNextTempMessage();
      }
      const nextTimestamp = lastOf(this._tempQueryMsgs)!.timestamp;
      const msgs = await this._fetchHistoryMsgs({
        limit: pageSize,
        timestamp: nextTimestamp,
      });
      for (const msg of msgs) {
        if (msg.timestamp >= nextTimestamp) {
          // 忽略上一页的消息
        } else if (msg.timestamp > this._lastQueryMsg!.timestamp) {
          // 继续添加新消息
          this._tempQueryMsgs.push(msg);
        } else {
          // 拉取到历史消息处
          return this._fetchNextTempMessage();
        }
      }
    }
  }

  /**
   * 读取暂存的消息
   */
  private _fetchNextTempMessage() {
    const nextMsg = this._tempQueryMsgs.pop();
    this._lastQueryMsg = nextMsg;
    return nextMsg;
  }

  private async _fetchHistoryMsgs(options?: {
    limit?: number;
    timestamp?: number;
    filterAnswer?: boolean;
  }): Promise<IMessage[]> {
    const filterAnswer = options?.filterAnswer ?? true;
    const conversation = await this._getConversations(options);
    let records = conversation?.records ?? [];
    if (filterAnswer) {
      // 过滤有小爱回答的消息
      records = records.filter(
        (e) =>
          ['TTS', 'LLM'].includes(e.answers[0]?.type ?? '') && // 过滤 TTS 和 LLM 消息
          e.answers.length === 1, // 播放音乐时会有 TTS、Audio 两个 Answer
      );
    }
    return records.map((e) => {
      const nativeAnswer = extractNativeAnswer(e);
      return {
        id: e.requestId || randomUUID(),
        sender: 'user',
        text: e.query,
        timestamp: e.time,
        metadata: nativeAnswer
          ? {
              xiaoAIAnswer: nativeAnswer.text,
              xiaoAIAnswerType: nativeAnswer.type,
            }
          : undefined,
      };
    });
  }
}

export const MiMessage = new MiMessageManager();
