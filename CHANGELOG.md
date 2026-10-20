- [Unreleased]
  - 仓库合并：旧仓库 `dsh-bili-free-scroll`（v1.x 合并版）的源码并入 `legacy/`，旧仓库归档并指向这里。

# Changelog

## 2.2.0 — 2026-10-20

### Fixed

- **`format v4 message requires a producer-owned source kind`**（用户报的运行时失败）：
  宿主内那一轮喂给 `followup()` 的消息里，`source.kind` 写的是 `'plugin'`。
  会话持久化的 v4 格式**明确禁止**这个值（`dsh-session-persistence-jsonl/lib/worker.cjs`：
  `if (… || value.kind === "plugin") throw new SessionFormatError("format v4 message requires a producer-owned source kind")`），
  `assertV4MessageSources` 对每条 durable message 都会校验 ⇒ 那一轮直接失败、报告写不完。
  改成自有的 producer kind **`'bili-duty'`**（v4 只要求「非空字符串且 ≠ `plugin`」，没有白名单；
  `dsh-agent/README.md` 的示例就是 `source: { kind: 'my-plugin' }`）。
- 起跑顺序对齐官方 automation：`create` → 等 `agent.whenIdle()`（最多 60 秒）→ 再 `followup()`，
  避免会话还没装配完就塞消息。

### Changed

- **设置页 UI 整体重做**（不沿用旧样式）：顶部改成**胶囊分页**，一次只渲染一屏 ——
  概览 / 定时 / 发言 / 关注 / 模型 / 环境；概览是一张 hero 卡（大数字 + 配额进度条 + 状态胶囊 + 一键跑一轮）。
  字段统一成「左标签 · 右控件」的栅格；细则只在开关打开时才出现。
  配色全部改走 DSH 自己的设计变量（`--dsw-alias-*` / `--dsw-radius-*`），深浅色主题跟着宿主走；
  新增「权限档位」下拉。

## 2.1.0 — 2026-10-20

五项更新（只改本插件，不动其它插件与 DSH 配置）。

### Added

- **宿主内运行（`runMode: in-host`，默认）**：跑一轮不再起 `dsh --profile headless` 子进程，而是用
  `ctx.agents` 在 DSH 里驱动**同一条固定会话**（`sessionId`，留空自动生成并记住）。
  每轮只是该会话里的新一轮对话 ⇒ 不新开会话。起跑前把审批钉成 `approval/policy: never`、
  权限档位 `permissionPreset`（默认 `workspace-write`），20 分钟超时，跑完 `sessions.flush` 落盘。
  `runMode: headless` 保留旧路径（子进程）。
- **多人私信 / 多人 @**：`dmUids`、`mentionNames`（逗号/空格/分号分隔，各最多 20 个）；
  私信改成**每个收件人各发一条**。旧的 `dmUid` / `mentionName` 仍然有效（会并进去）。
- **特别关注 UP 主**：`watchUids`（最多 50）、`watchNotify`（`off` / `dm` / `comment` / `both`）、
  `watchEveryMin`（默认 15）。后台每 60 秒醒一次、按间隔去问 `bili_user_videos`；
  第一次见到某个 UP 只记基线不补发，之后只对**新出现的**视频通知（每个 UP 一次最多 3 条）。
  - 新工具 `bili_watch_check`（`force` 可选）；新接口 `GET /api/bili-duty/watch`、`POST /api/bili-duty/watch/check`。
- **设置页重排**：顶部状态栏吸顶（含运行方式徽章）；次要分区改成可折叠（`<details>`）；
  新增「特别关注的 UP 主」区块与「怎么跑这一轮」（运行方式 + 固定会话）选项。

### Fixed

- **打开「上下文洞察」会中断正在跑的那一轮**（用户报的冲突）：
  子进程跑的那一轮在宿主 `sessions` 表里不存在，dsh-context 的 backfill 会把它当**冷会话**读日志、
  用 `interruptedTurnClosers` 补中断轮次并**回写投影**，与正在进行的 turn 撞车 ⇒ 那一轮报错、报告写不完。
  改宿主内运行之后这条会话对宿主是活的，洞察走活投影、backfill 直接跳过它 ⇒ 机制上不再冲突。

## 2.0.1 — 2026-10-20

### Fixed

- `link:` 安装（junction）下桥接插件解析失败：Node 的 ESM 默认 realpath，`import.meta.url` 是真实路径
  （`~/.dsh/plugins/dsh-bili-models/…`），从这里 `createRequire(...).resolve('dsh-our-free-model/package.json')`
  找不到 profile 树里的包 ⇒ 桥接被静默跳过、那一轮 `NO_ADAPTER`。
  现在解析失败后按候选根（`DSH_HOST_MODULES` / `~/.dsh/profiles/*/node_modules` / 全局 npm）再扫一遍。

## 2.0.0 — 2026-10-20

首个版本：在 [dsh-bili-scroll 0.1.11](https://github.com/c1overzz/dsh-bili-scroll) 基础上加「这一轮用哪个模型」。

### Added

- 设置页「用哪个模型干活」：provider / model / 推理强度 / 提供方插件，模型清单来自当前 DSH 真实注册的 provider（含其它插件提供的）。
- `GET /api/bili-duty/models`：provider、模型清单、已解析到的桥接插件。
- `GET /api/bili-duty/overlay`：查看当前生成的 headless overlay。
- 4 个配置键：`modelProvider`、`modelName`、`modelEffort`、`bridgePlugins`（默认 `dsh-our-free-model`）。
- 生成 overlay 时按 `bridgePlugins` 把对应插件以 `file://` 条目挂进那一轮，并覆盖 `agent-default-model`。

### Fixed

- 上游 `loadCfg()` 里 `hostDiff` / `lastDiffSig` 未声明导致的 `ReferenceError`：走到「宿主里有这行设置」分支时 host 半边直接挂掉、设置页永远停在「读设置中」。
- MCP 白名单补 `bili_send_message`（有私信时）与 `bili_received_replies`（开复核评论时）。

### Changed

- 包名 `dsh-bili-models`，loader 条目 id `bili-models`，家目录仍为 `~/.dsh/bili-duty`（可与上游共用配置）。
- client 不设 `immediately: true`，不抢 DSH 启动关键路径。
