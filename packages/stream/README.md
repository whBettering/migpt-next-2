# @mi-gpt/stream

MiGPT 长文本自动分片 + 流式响应

```typescript
import { StreamResponse } from "@mi-gpt/stream";

async function main() {
  const stream = new StreamResponse();
  setTimeout(() => {
    stream.write("你好");
    stream.write("世界");
    stream.flush(); // 或取消 stream.cancel();
  }, 1000);
  const result = await stream.result();
  console.log(result);
}

main();
```
