# @mi-gpt/chat

MiGPT 对话模块

```typescript
import { ChatBot, type IMessage } from "@mi-gpt/chat";

async function main() {
  const msg: IMessage = {
    id: "123456",
    sender: "user",
    text: "你好",
    timestamp: 1743903202225,
  };

  const answer = await ChatBot.chat(msg);

  console.log(answer);
}

main();
```
