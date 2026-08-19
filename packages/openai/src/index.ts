import { deepMerge } from '@mi-gpt/utils';
import type { Prettify } from '@mi-gpt/utils/typing';
import OpenAIClient from 'openai';
import type { RequestOptions } from 'openai/core';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import { ProxyAgent } from 'proxy-agent';
import { type OpenAIConfig, kDefaultOpenAIConfig } from './config.js';
import { parseWebSearchResponse, shouldUseWebSearch } from './web-search.js';

export {
  parseWebSearchResponse,
  sanitizeWebSearchText,
  shouldUseWebSearch,
} from './web-search.js';
export type { WebSearchResult, WebSearchSource } from './web-search.js';

class _OpenAI {
  private _client?: OpenAIClient;
  private _abortCallbacks: Record<string, VoidFunction> = {};

  config: OpenAIConfig = {};

  init(config?: OpenAIConfig) {
    this.config = deepMerge(kDefaultOpenAIConfig, config);
    this._client ??= new OpenAIClient({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      httpAgent: this.config.enableProxy ? new ProxyAgent() : undefined,
      ...(this.config.extra?.clientOptions as any),
    });
  }

  dispose() {
    this._client = null as any;
    this._abortCallbacks = {};
  }

  cancel(requestId?: string) {
    if (requestId && this._abortCallbacks[requestId]) {
      this._abortCallbacks[requestId]();
      delete this._abortCallbacks[requestId];
    }
  }

  async chat(options: {
    requestId?: string;
    onStream?: (text: string) => void;
    onError?: (error: Error) => Promise<void>;
    requestOptions?: Prettify<RequestOptions>;
    createParams: Prettify<Partial<ChatCompletionCreateParamsBase>>;
  }) {
    const { requestId, onStream, requestOptions, createParams, onError } = options;

    let signal: AbortSignal | undefined;
    if (requestId) {
      const controller = new AbortController();
      this._abortCallbacks[requestId] = () => controller.abort();
      signal = controller.signal;
    }

    const params = deepMerge(
      {
        model: this.config.model,
        ...(this.config.extra?.createParams as any),
      },
      createParams,
    );

    const mergedRequestOptions = deepMerge(
      {
        ...(this.config.extra?.requestOptions as any),
      },
      { ...requestOptions, signal },
    );

    let fallbackNotice = '';
    const webSearchEnabled =
      !params.stream &&
      this.config.webSearch?.enabled &&
      (this.config.webSearch.strategy === 'auto' ||
        shouldUseWebSearch(params.messages as any[]));
    if (webSearchEnabled) {
      try {
        const response = await this._client!.responses.create(
          {
            model: params.model!,
            input: params.messages as any,
            tools: [{ type: 'web_search' }],
            tool_choice: 'auto',
          } as any,
          mergedRequestOptions,
        );
        const result = parseWebSearchResponse(response);
        if (!result.text) {
          throw new Error('Responses API 未返回可播放的文字');
        }
        if (result.searched) {
          if (result.sources.length > 0) {
            console.log(
              '🌐 联网来源：',
              result.sources.map((source) => `${source.title}: ${source.url}`).join('\n'),
            );
          } else {
            console.log('🌐 已使用联网搜索');
          }
        }
        if (requestId) {
          delete this._abortCallbacks[requestId];
        }
        return result.text;
      } catch (error) {
        if (signal?.aborted) {
          if (requestId) {
            delete this._abortCallbacks[requestId];
          }
          return '';
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ 联网搜索异常，将使用普通模型回答：${message}`);
        fallbackNotice = this.config.webSearch?.fallbackNotice ?? '';
      }
    }

    const res = await this._client!.chat.completions.create(
      params,
      mergedRequestOptions,
    ).catch(async (e) => {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`❌ LLM 响应异常：${message}`);
      await onError?.(e);
      return null;
    });

    let result = '';

    if (params.stream) {
      for await (const chunk of (res ?? []) as any) {
        const text = chunk.choices[0]?.delta?.content || '';
        const aborted = requestId && !Object.keys(this._abortCallbacks).includes(requestId);
        if (aborted) {
          result = '';
          break;
        }
        if (text) {
          result += text;
          onStream?.(text);
        }
      }
    } else {
      result = res?.choices?.[0]?.message?.content ?? '';
      if (fallbackNotice && result) {
        result = `${fallbackNotice}${result}`;
      }
    }

    if (requestId) {
      delete this._abortCallbacks[requestId];
    }

    return result;
  }
}

export const OpenAI = new _OpenAI();
