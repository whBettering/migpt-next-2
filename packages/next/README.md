# MiGPT-Next

让小爱音箱「听你的」，解锁无限可能。

## 快速开始

### 1. 安装依赖

```shell
pnpm install @mi-gpt/next
```

### 2. 运行

```typescript
import { MiGPT } from "@mi-gpt/next";

async function main() {
  await MiGPT.start({
    speaker: {
      userId: "123456",
      password: "xxxxxxxx",
      did: "Xiaomi 智能音箱 Pro",
    },
    openai: {
      model: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    prompt: {
      system: "你是一个智能助手，请根据用户的问题给出回答。",
    },
    callAIKeywords: ["请", "你"],
    async onMessage(_engine, { text }) {
      if (text.startsWith("你好")) {
        return { text: "你好，很高兴认识你！" };
      }
    },
  });
  process.exit(0);
}

main();
```

## 基础配置

### 1. 配置小爱音箱

```typescript
await MiGPT.start({
  speaker: {
    /**
     * 小米 ID（一串数字）
     *
     * 注意：不是手机号或邮箱，请在小米账号「个人信息」-「小米 ID」查看
     */
    userId: "123456",
    /**
     * 小米账号登录密码
     */
    password: "xxxxxxxx",
    /**
     * 小爱音箱在米家中设置的名称
     */
    did: "Xiaomi 智能音箱 Pro",
  },
});
```

### 2. 配置大语言模型（LLM）

```typescript
await MiGPT.start({
  openai: {
    model: "gpt-4o-mini",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
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
    baseURL: "https://api.openai.com/v1",
  },
  prompt: {
    /**
     * 系统提示词
     *
     * 如需关闭系统提示词，可设置为：''（空字符串）
     */
    system: "你是一个智能助手，请根据用户的问题给出回答。",
  },
});
```

## 高级选项

### 1. 🔥 自定义消息回复

```typescript
await MiGPT.start({
  /**
   * 默认只会处理以下关键词开头的消息，你也可以自定义：
   * 
   * - 请问地球为什么是圆的？
   * - 你知道世界上跑的最快的动物是什么吗？
   */
  callAIKeywords: ["请", "你"],
  /**
   * 自定义消息回复
   */
  async onMessage(engine, { text }) {
    if (text.startsWith("你好")) {
      // 回复文字
      return { text: "你好，很高兴认识你！" };
    }

    if (text.startsWith("播放音乐")) {
      // 也可以回复音频链接
      return { url: "https://example.com/hello.mp3" };
    }

    // 也可以直接调用 engine 上提供的各种能力
    if (text.startsWith("你是谁")) {
      // 打断原来小爱的回复
      await engine.speaker.abortXiaoAI();
      // 播放文字
      await engine.speaker.play({ text: "猜猜看" });
      // 播放音频链接
      await engine.speaker.play({ url: "https://example.com/hello.mp3" });

      // 调用 MiNA 的能力
      await engine.MiNA.setVolume(50);

      // 调用 MioT 的能力
      await engine.MiOT.doAction(3, 1);

      // 告诉 MiGPT 已经处理过这条消息了，不再使用默认的 AI 回复
      return { handled: true };
    }
  },
});
```

### 2. 自定义对话上下文

```typescript
await MiGPT.start({
  context: {
    /**
     * 每次对话携带的历史消息数
     *
     * 如需关闭上下文，可设置为：0
     */
    historyMaxLength: 10,
    /**
     * 提示词变量表
     *
     * [变量名称]:[字符串]
     */
    vars: {
      age: "18",
      // 也可以是一个构造函数，返回字符串
      time: () => new Date().toLocaleString(),
    },
  },
  prompt: {
    /**
     * 可以在提示词模板中引用上面提供的变量
     *
     * 比如：
     * - {age}  会被解析成 👉 18
     * - {time} 会被解析成 👉 2025/4/6 11:02:37
     */
    system: "现在是 {time}，你已经 {age} 岁了。",
  },
});
```

### 3. 自定义大模型请求参数

```typescript
await MiGPT.start({
  openai: {
    /**
     * 是否开启系统代理
     */
    enableProxy: true,
    extra: {
      /**
       * 自定义 /chat/completions 请求参数
       */
      createParams: {
        temperature: 0.5,
        top_p: 1,
        // 其他参数 ...
        enable_search: true,
      },
      /**
       * 自定义网络请求选项
       */
      requestOptions: {
        headers: {
          hello: "world",
        },
      },
    },
  },
});
```

## 免责声明

1. **适用范围**
   本项目为非盈利开源项目，仅限于技术原理研究、安全漏洞验证及非营利性个人使用。严禁用于商业服务、网络攻击、数据窃取、系统破坏等违反《网络安全法》及使用者所在地司法管辖区的法律规定的场景。
2. **非官方声明**
   本项目由第三方开发者独立开发，与小米集团及其关联方（下称"权利方"）无任何隶属/合作关系，未获其官方授权/认可或技术支持。项目中涉及的商标、固件、云服务的所有权利归属小米集团。若权利方主张权益，使用者应立即主动停止使用并删除本项目。

继续下载或运行本项目，即表示您已完整阅读并同意[用户协议](https://github.com/idootop/migpt-next/blob/main/agreement.md)，否则请立即终止使用并彻底删除本项目。

## License

MIT License © 2024-PRESENT [Del Wang](https://del.wang)
