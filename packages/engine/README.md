# @mi-gpt/engine

MiGPT 核心模块

### 实现 Speaker

```typescript
import type { ISpeaker } from "@mi-gpt/engine/base";

class MySpeaker implements ISpeaker {
  play({ url, text }) {
    // todo 自定义播放音频/文字实现
  }

  abortXiaoAI() {
    // todo 自定义打断小爱回复实现
  }

  // todo 也可以添加更多能力，比如播放暂停等
}
```

### 实现 Engine

```typescript
import { MiGPTEngine } from "@mi-gpt/engine/index";

class MyEngine extends MiGPTEngine {
  config: MyConfig = {};

  // todo 自定义 speaker 实现
  speaker = new MySpeaker();

  async askAI(msg: IMessage): Promise<IReply> {
    // todo 自定义消息回复逻辑
    return { text: "hello " + msg.text };
  }

  async start(config?: MyConfig) {
    await super.start(config);

    // todo 自定义消息拉取逻辑
    while (this.status === "running") {
      this.onMessage({
        id: "123456",
        sender: "user",
        text: "你好",
        timestamp: Date.now(),
      });
      await sleep(100);
    }
  }
}
```

### 使用 Engine

```typescript
async function main() {
  // 创建
  const kMyEngine = new MyEngine();

  // 启动
  await kMyEngine.start({
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

        // 告诉 Engine 已经处理过这条消息了，不再使用默认的 AI 回复
        return { handled: true };
      }
    },
  });

  // 退出
  process.exit(0);
}

main();
```
