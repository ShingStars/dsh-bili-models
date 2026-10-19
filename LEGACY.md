# 历史：v1.x 的「合并版」（已废弃）

这个仓库现在的主线是 [**dsh-bili-models**](README.md)：在 `dsh-bili-scroll` 上只加一层模型选择。

在此之前，仓库里曾经做的是另一件事——把 `dsh-bili-scroll` 和 `dsh-our-free-model` **整个合并成一个插件包**，叫 `dsh-bili-free-scroll`（v1.0.0 / v1.0.1）。代码原样留在 `legacy/dsh-bili-free-scroll/`，只作历史参考，**不要安装**。

## 为什么放弃

| 问题 | 说明 |
| --- | --- |
| 一个 npm 包只能有一套 client | 两个设置页必须塞进同一个 bundle、同一次 `apply`，两个功能共用一个 fiber，失去独立启停 |
| 大 bundle 上启动关键路径 | 单文件 535 KB，DSH 的 web 启动自检会在「其他启动工作完成」的瞬间检查 fiber，卡在 `loading` 就判死（`web boot: 1 entry did not activate`） |
| 渠道包的维护负担 | 要留四渠道就得带着 2.9 MB 的 `vendor/channel-pack/pack.js`（esbuild 产物，离线无法重建：缺 jose 和打过补丁的 undici），还得靠文本补丁改签到节奏、剥掉内联的 Gemini 凭据 |
| 版本漂移 | 上游 `dsh-bili-scroll` 和 `dsh-our-free-model` 各自在演进，合并版每次都要跟两个上游对齐 |

## v1.x 里做对的部分（已经并进主线）

- 上游 `loadCfg()` 的 `ReferenceError`（`hostDiff` / `lastDiffSig` 未声明）——主线也修了；
- MCP 白名单补 `bili_send_message` / `bili_received_replies` ——主线也补了；
- 渠道包自带的本机 OpenAI 网关要关掉、内联的 Gemini OAuth 凭据要剥掉——主线不再内嵌渠道包，这两个问题随之消失。

## v1.x 的验证记录（留作参考）

- 本机临时 `DSH_HOME` + `dsh web` 实测：新装启动干净、后台路由 200、设置页两块都渲染；
- 也复现并修掉了「装好即崩」：探针定位到 `loadCfg()` 抛 `ReferenceError`，而不是前端或宿主的问题。

要装的话，请装主线 `dsh-bili-models`：

```bash
dsh plugin add file:C:/path/to/dsh-bili-models
```
