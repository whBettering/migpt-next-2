# `@mi-gpt/config`

MiGPT 公共配置

## package.json

```json
{
  "type": "module",
  "devDependencies": {
    "@mi-gpt/config": "workspace:*",
    "@biomejs/biome": "^1.9.4",
    "tsup": "^8.4.0",
    "typescript": "^5.8.2"
  }
}
```

## tsconfig.json

```json
{
  "extends": "@mi-gpt/config/typescript",
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## biome.json

```json
{
  "extends": ["@mi-gpt/config/biome"]
}
```

## tsup.config.ts

```typescript
import { baseConfig } from "@mi-gpt/config/tsup";
import { defineConfig } from "tsup";

export default defineConfig({
  ...baseConfig,
});
```
