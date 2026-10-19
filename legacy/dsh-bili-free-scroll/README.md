> **⚠ 已被取代**：这份「两个插件合并成一个包」的方案在实测中被发现不稳（大 client bundle + 宿主半边启动路径，容易出现 web boot: entry did not activate）。现在改为在 dsh-bili-scroll 上只加模型选择，见 [ShingStars/dsh-bili-models](https://github.com/ShingStars/dsh-bili-models)。本仓库保留作历史参考。

# dsh-bili-free-scroll

一个 DSH（DeepSeek Harness）插件，把两件事装进同一个包：

1. **刷 B站** —— 每天在谷时自动开一轮：搜近期视频、读字幕、按你的口味挑几条、写一份日报，还能 @你、发私信、自动评论（这些按设置来）。
2. **免费模型通道** —— 内置四个账号渠道的登录 / 账号池 / 额度 / 每日签到：**LobsterAI（有道）**、**Qoder 中国版**、**Cline**、**Raccoon（商汤）**。登录一次，刷B站那一轮就能用它们的免费模型跑，不用再给 `deepseek-official` 配 API key。

> 默认模型：`qodercn` / `qfmodel`（Qwen3.8-Flash，免费、1M 上下文）。登录 Qoder 中国版后开箱即用。

---

## 它解决什么问题

刷B站的那一轮是**另起一个 `dsh` 进程**跑的（headless profile）。那个 profile 默认写死 `deepseek-official`，没配 `DEEPSEEK_API_KEY` 时会直接失败：

```
llm-deepseek: no API key for provider route "deepseek-official"
```

这个插件把「模型」和「刷B站」放进同一个包：headless 那一轮加载插件时，插件会注册四个渠道的 LLM adapter，并把那一轮的默认模型改成你选的（默认 Qoder 中国版的免费模型），于是不需要任何 API key。

---

## 安装

```bash
dsh plugin add dsh-bili-free-scroll
```

装完在 **DSH 设置页**会多出两个区块：

- **刷B站**（`order=30`）：开关、每轮挑几条、谷时窗口、@ 谁、私信、日报级别、模型选择。
- **免费模型**（`order=35`）：四个渠道的登录、账号池、额度、每日签到、模型清单。

### 四个渠道的登录

在「免费模型 → 白嫖模型接入」里选渠道 → 点登录 → 浏览器里完成授权。凭据只存在本机的
`$DSH_HOME/bili-free-scroll/models/` 下，不会上传到任何地方。

| 渠道 | 登录方式 | 每日签到 | 备注 |
| --- | --- | --- | --- |
| LobsterAI（有道） | 浏览器 | ✅ 自动 | 每日签到积分 |
| Qoder 中国版 | 浏览器 | ✅ 自动（每日 10:00 刷新） | 默认模型来源 |
| Cline | 浏览器 | ❌ | 只有免费额度 |
| Raccoon（商汤） | 手机号 | ❌（登录奖励一次性） | 服务端自动发额度 |

> 签到：插件启动后 30 秒检查一次，当天没领就领；**跨天也会重排**（不是只跑一次）。

---

## 设置项（刷B站）

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `perDay` | `5` | 每天挑几条 |
| `peakValley` / `noon` / `night` | `true` | 谷时窗口（避开高峰） |
| `commentPerRound` | `1` | 每轮发几条评论（0 = 不发） |
| `replyToComments` | `false` | 回评论 |
| `mentionName` / `dmMode` / `dmUid` | — | @ 谁 / 私信投递方式与收件人 |
| `reportLevel` | `full` | 日报详略（`off` = 不写文件） |
| `modelProvider` / `modelName` | `qodercn` / `qfmodel` | 刷B站那一轮用哪个模型 |
| `modelEffort` | 空 | 推理强度，留空 = 模型默认 |
| `overlayModel` | `true` | 把本插件的模型半边挂进那一轮 |

---

## 数据目录

全部在 `$DSH_HOME/bili-free-scroll/` 下，**不写插件包目录**：

```
bili-free-scroll/
  bili/      config.json  duty.md  out/YYYY-MM-DD.md  duty.log  bili_credential.json
  models/    settings.json  catalog.json  session-map.json  ...
```

插件依赖的 Python 环境：首次运行会在 `bili/` 下建 `.venv`（uv），装 `mcp`、`qrcode`、`pyyaml`。
二维码、字幕、评论都走 B站 公开接口 + 本机 MCP 子进程。

---

## 已知限制

- **B站账号等级**：公开评论要求账号已转正，私信要求一定等级；不够时接口会返回
  `-107`（账号未转正）或 `21016`（等级不够）。插件会如实写进日报，不会重试撞墙。
- **渠道账号风控**：免费渠道可能限流 / 要求重新登录；额度规则由各家随时调整，插件只负责调用。
- **自更新已关闭**：这份合并插件不会去上游仓库拉更新（避免把自己的代码覆盖成上游本体）。
  要更新请从本仓库拉新版本。
- **headless 环境**：刷B站那一轮没有 `webServer`，所以「刷B站」的宿主半边不会激活（也不需要）；
  只有模型半边会挂上。桌面端两个半边都激活。

---

## 开发

```bash
node tools/client-smoke.mjs      # 验证 client bundle 能装载、两个 settings.section 都注册
node build/merge-client.mjs      # 由 bili/client.js + models/client.js 生成根 client.js
node build/patch-channel-pack.mjs # 给 vendor/channel-pack/pack.js 打跨天签到补丁（幂等）
```

合并原理：一个 npm 包只能有一套 client（一个 bundle、一次 apply），所以两个设置页在
`client.js` 里合并成两个 `settings.section`；宿主半边则分 `bili/` 与 `models/` 两个入口，
由根 `index.js` 用嵌套 `ctx.inject` 分别挂载 —— 谁缺服务谁不激活，互不拖累。

---

## 来源与许可

本插件是两份上游的合并裁剪版，均以 MIT 许可发布：

- [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll)（0.1.11）—— 刷B站的全部功能、MCP 工具、日报、设置页。
- [Ebony-Vinyl/dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model)（2.5.5）—— 渠道包、账号池、额度与登录；本仓库只保留四个渠道。
- 渠道包的原始出处：[gitee.com/iJetLi/dsh-deepseek-harness-codearts](https://gitee.com/iJetLi/dsh-deepseek-harness-codearts)（Jet，MIT）。

详见 [NOTICE.md](./NOTICE.md)。本仓库自己的代码同样以 MIT 发布。
