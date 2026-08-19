function isXiaoAIAnswerFailure(text) {
  return /(?:我(?:还|暂时|暂不|也)?(?:不知道|不知道咋说|不太清楚|不支持|不会|回答不上)|不太清楚|无法(?:回答|理解|获取|处理)|没法回答|回答不了|没听懂|不明白.{0,8}(?:说|意思)|换个问题|我还在学习|(?:你|我).{0,4}(?:问住|难住)了|被难住了(?:诶|呢|呀|哦)?|暂不支持(?:该|此)?功能|不知道咋说|还.{0,4}(?:支持.{0,6}功能|学习)|不如换.{0,6}(?:方式|问题|说)|超出.{0,6}(?:能力|范围)|(?:没有|无法)找到.{0,8}(?:答案|结果|内容)|(?:暂时|还)回答不)/i.test(
    text,
  );
}

/**
 * @type {import('@mi-gpt/next').MiGPTConfig}
 */
export default {
  debug: false, // 是否开启调试模式
  speaker: {
    /**
     * 小爱音箱在米家中设置的名称
     *
     * 如果提示找不到设备，请打开调试模式获取设备真实的 name、miotDID 或 mac 地址填入
     */
    did: '小爱音箱Play',
    /**
     * 小米 ID（一串数字）
     *
     * 注意：不是手机号或邮箱，请在小米账号「个人信息」-「小米 ID」查看
     */
    userId: 'xiaomizhanghaoidxxxx',
    /**
     * 小米账号登录密码
     *
     * 如果提示登录失败，请使用 passToken 登录
     */
    password: 'xiaomizhanghaomimaxxxx',
    /**
     * （可选）小米账号 passToken
     *
     * 获取教程：https://github.com/idootop/migpt-next/issues/4
     */
    passToken: 'xiaomizhanghaopasstokenxxxx',
  },
  openai: {
    enableProxy: true,
    /**
     * 你的大模型服务提供商的接口地址
     *
     * 支持兼容 OpenAI 接口的大模型服务，比如：DeepSeek V3 等
     *
     * 注意：一般以 /v1 结尾，不包含 /chat/completions 部分
     * - ✅ https://api.openai.com/v1
     * - ❌ https://api.openai.com/v1/（最后多了一个 /
     * - ❌ https://api.openai.com/v1/chat/completions（不需要加 /chat/completions）
     */
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3', //这里是火山引擎 baseURL示例
    /**
     * API 密钥
     */
    apiKey: 'apikeyxxxxxxxxxxxxxxxxxxx',
    /**
     * 模型名称，注意这里填的是火山引擎的模型接入点，ep 开头
     */
    model: 'ep-202608xxxxxxxxx',
    /**
     * 按需联网：由模型判断当前问题是否需要搜索最新信息。
     */
    webSearch: {
      enabled: true,
      strategy: 'hybrid',
      fallbackNotice: '联网搜索暂时不可用，以下内容可能不是最新。',
    },
    /**
     * 扩展配置
     */
    extra: {
      /**
       * 请求超时时间（毫秒），默认 30 秒
       */
      requestOptions: {
        timeout: 60000,
      },
    },
  },
  prompt: {
    /**
     * 系统提示词，如需关闭可设置为：''（空字符串）
     */
    system: '你是一个智能助手，请用简洁的语言回答用户的问题，每次回答控制在150字以内。',
  },
  context: {
    /**
     * 每次对话携带的最大历史消息数（如需关闭可设置为：0）
     */
    historyMaxLength: 10,
  },
  /**
   * 流式响应配置
   */
  stream: {
    /**
     * 单次响应的最大长度（控制分句大小）
     * 小爱音箱 L05B 对 TTS 文本长度有限制，建议不超过 100
     */
    maxReplyLength: 100,
  },
  /**
   * 只回答以下关键词开头的消息：
   *
   * - 请问地球为什么是圆的？
   * - 你知道世界上跑的最快的动物是什么吗？
   */
  callAIKeywords: [''],
  /**
   * 自定义消息回复
   */
  async onMessage(engine, msg) {
    if (!engine.config.callAIKeywords?.some((keyword) => msg.text.startsWith(keyword))) {
      return;
    }

    const xiaoAIAnswer =
      typeof msg.metadata?.xiaoAIAnswer === 'string' ? msg.metadata.xiaoAIAnswer.trim() : '';
    if (xiaoAIAnswer && !isXiaoAIAnswerFailure(xiaoAIAnswer)) {
      console.log(`🔈 保留小爱原生回答：${xiaoAIAnswer}`);
      return { handled: true };
    }
    if (xiaoAIAnswer) {
      console.log(`🤖 小爱无法回答，切换外接 LLM：${xiaoAIAnswer}`);
    }

    // L05B 的 MiNA TTS 无法稳定抢占小爱原生回复，改用 MIoT 的“播放文本”动作。
    const stopped = await engine.speaker.abortXiaoAI();
    if (!stopped) {
      console.warn('⚠️ 未能确认已停止小爱原生播报，继续切换外接 LLM');
    }
    await engine.MiOT.doAction(5, 3, '正在思考中');

    const { text } = await engine.askAI(msg, { stream: false });
    if (text) {
      console.log(`🔊 ${text}`);
      await engine.MiOT.doAction(5, 3, text);
    }

    // 阻止引擎再走默认的 MiNA TTS 链路。
    return { handled: true };
  },
};
