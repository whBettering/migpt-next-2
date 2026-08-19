# @mi-gpt/miot

MIoT 非官方 Node.js 客户端

## 安装依赖

```shell
pnpm install @mi-gpt/miot
```

## 使用教程

```typescript
import { getMIoT, getMiNA, type MiServiceConfig } from "@mi-gpt/miot";

async function main() {
  const config: MiServiceConfig = {
    /**
     * 小米 ID（一串数字）
     *
     * 注意：不是手机号或邮箱，请在小米账号「个人信息」-「小米 ID」查看
     */
    userId: "123456",
    /**
     * 小米账号密码
     */
    password: "xxxxxxx",
    /**
     * 小爱音箱在米家中设置的名称
     *
     * 如果提示找不到设备，请打开 debug 选项获取设备真实 did
     */
    did: "Xiaomi 智能音箱 Pro",
  };

  // 初始化客户端
  const MiNA = await getMiNA(config);
  const MIoT = await getMIoT(config);

  // 调用 MiNA 指令（比如获取设备列表）
  await MiNA.getDevices();

  // 调用 MIoT 指令（你可以在 https://home.miot-spec.com/ 查询具体指令）
  await MIoT.doAction(5, 1, "Hello world, 你好！");
}

main();
```

## 免责声明

1. **适用范围**
   本项目为非盈利开源项目，仅限于技术原理研究、安全漏洞验证及非营利性个人使用。严禁用于商业服务、网络攻击、数据窃取、系统破坏等违反《网络安全法》及使用者所在地司法管辖区的法律规定的场景。
2. **非官方声明**
   本项目由第三方开发者独立开发，与小米集团及其关联方（下称"权利方"）无任何隶属/合作关系，未获其官方授权/认可或技术支持。项目中涉及的商标、固件、云服务的所有权利归属小米集团。若权利方主张权益，使用者应立即主动停止使用并删除本项目。

继续下载或运行本项目，即表示您已完整阅读并同意[用户协议](https://github.com/idootop/migpt-next/blob/main/agreement.md)，否则请立即终止使用并彻底删除本项目。

## License

MIT License © 2024-PRESENT [Del Wang](https://del.wang)
