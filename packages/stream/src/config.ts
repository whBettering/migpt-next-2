export type StreamResponseConfig = Partial<{
  /**
   * 句子结束符号，用来切分语句
   *
   * 默认值： 。？！；?!;
   */
  sentenceEndings: string;
  /**
   * 单次响应的最大长度，用来控制句子分片长度
   *
   * 默认值：200
   */
  maxReplyLength: number;
  /**
   * 首次响应的超时时长（单位：毫秒）
   *
   * 默认值：500 (最小100)
   */
  firstReplyTimeout: number;
}>;

export const kDefaultStreamResponseConfig: StreamResponseConfig = {
  maxReplyLength: 200,
  firstReplyTimeout: 500,
  sentenceEndings: '。？！；?!;',
};
