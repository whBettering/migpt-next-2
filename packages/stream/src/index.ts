import { deepMerge, sleep } from '@mi-gpt/utils';
import { removeEmojis } from '@mi-gpt/utils/string';
import { type StreamResponseConfig, kDefaultStreamResponseConfig } from './config.js';

type ResponseStatus = 'idle' | 'responding' | 'finished' | 'canceled';

export class StreamResponse {
  /**
   * 将已有的文字回复转换成分句回复
   */
  static chunk(text: string, config?: StreamResponseConfig) {
    const stream = new StreamResponse(config);
    if (text.length > stream.config.maxReplyLength!) {
      stream.write(text);
      stream.flush();
      return stream;
    }
  }

  status: ResponseStatus = 'idle';
  config: StreamResponseConfig = {};

  private static _globalConfig: StreamResponseConfig = {};

  static init(config?: StreamResponseConfig) {
    StreamResponse._globalConfig = deepMerge(kDefaultStreamResponseConfig, config);
  }

  constructor(config?: StreamResponseConfig) {
    this.config = deepMerge(StreamResponse._globalConfig, config);
  }

  /**
   * 写入流式响应
   */
  write(_text: string) {
    if (this.status === 'idle') {
      this.status = 'responding';
    }
    if (this.status !== 'responding') {
      return;
    }
    // 移除不发音字符（emoji）
    const text = removeEmojis(_text);
    if (!text) {
      return;
    }
    this._batchSubmit(text);
  }

  /**
   * 读取下一个句子分片
   */
  read(): { next?: string; noMore: boolean } {
    if (this._submitCount > 0) {
      // 在读取下一条分片前，提交当前收到的所有分片
      this._batchSubmitImmediately();
    }

    const next = this._chunks[this._nextIdx];
    if (next) {
      this._nextIdx++;
    }

    const noMore =
      this._nextIdx > this._chunks.length - 1 && ['finished', 'canceled'].includes(this.status);
    return { next, noMore };
  }

  /**
   * 结束流式响应，返回最终结果
   */
  flush() {
    if (this.status === 'canceled') {
      return null;
    }
    if (['idle', 'responding'].includes(this.status)) {
      this._batchSubmitImmediately();
      this._forceChunkText();
      this.status = 'finished';
    }
    return this._result;
  }

  /**
   * 获取最终结果
   *
   * 如果流式响应未结束，会一直等待直到结束
   */
  async result() {
    while (true) {
      if (this.status === 'finished') {
        return this._result;
      }
      if (this.status === 'canceled') {
        return null;
      }
      await sleep(10);
    }
  }

  /**
   * 取消流式响应
   *
   * 如果流式响应未结束，会直接返回最终结果
   */
  cancel() {
    if (['idle', 'responding'].includes(this.status)) {
      this.status = 'canceled';
    }
    return this._result;
  }

  private _chunks: string[] = [];
  private _isFirstSubmit = true;
  private _result = '';
  private _tempText = '';
  private _remainingText = '';

  private _nextIdx = 0;
  private _forceChunkText() {
    if (this._remainingText) {
      this._write('', { force: true });
    }
  }

  private _submitCount = 0;
  private _batchSubmitImmediately() {
    if (this._tempText) {
      this._write(this._tempText);
      this._tempText = '';
      this._submitCount++;
    }
  }

  private _batchSubmit(text: string) {
    this._tempText += text;
    if (this._isFirstSubmit) {
      this._isFirstSubmit = false;
      setTimeout(() => {
        // 达到首次消息收集时长后，批量提交消息
        if (this._submitCount === 0) {
          this._batchSubmitImmediately();
        }
      }, this.config.firstReplyTimeout);
    } else if (this._submitCount === 0) {
      // 当首次消息积攒到一定长度后，也批量提交消息
      if (this._tempText.length > this.config.maxReplyLength!) {
        this._batchSubmitImmediately();
      }
    }
  }

  private _write(text: string, options?: { force: boolean }) {
    this._remainingText += text;
    while (this._remainingText.length > 0) {
      const lastCutIndex: number = options?.force
        ? this.config.maxReplyLength!
        : this._findLastCutIndex(this._remainingText);
      if (lastCutIndex > 0) {
        const currentChunk = this._remainingText.substring(0, lastCutIndex);
        this._chunks.push(currentChunk);
        this._remainingText = this._remainingText.substring(lastCutIndex);
      } else {
        break;
      }
    }
  }

  private _findLastCutIndex(text: string): number {
    let lastCutIndex = -1;
    for (let i = 0; i < Math.min(text.length, this.config.maxReplyLength!); i++) {
      if (this.config.sentenceEndings!.includes(text[i]!)) {
        lastCutIndex = i + 1;
      }
    }
    return lastCutIndex;
  }
}
