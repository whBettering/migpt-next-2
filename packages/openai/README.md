# @mi-gpt/openai

MiGPT 底层 OpenAI 接口

```typescript
import { OpenAI } from "@mi-gpt/openai";

async function main() {
  const requestId = "1234";

  // 取消请求 
  // OpenAI.cancel(requestId);

  const answer = await OpenAI.chat({
    requestId,
    createParams: {
      stream: false,
      messages: [{ role: "user", content: "你好" }],
    },
  });

  console.log(answer);
}

main();
```
