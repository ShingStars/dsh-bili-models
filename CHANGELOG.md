- [Unreleased]
  - 仓库合并：旧仓库 `dsh-bili-free-scroll`（v1.x 合并版）的历史并入本仓库 git 历史（tag `v1.0.0` / `v1.0.1`），`legacy/` 目录已移除，旧仓库已归档（仅作历史参考）。

# Changelog

## 2.3.0 — 2026-10-20

### Added

- **交流轮（回评论 / 回私信）**：这是**单独一轮**，不跟「刷视频挑几条」混在一起 ——
  用户关掉刷视频（`perDay=0`）时仍然能聊天。宿主先把「该回什么」取好写进提示词
  （评论楼中楼带回 `BV号 / rpid / root / 昵称 / 原话`，私信带最近十几条往来），
  模型只决定「怎么回」，不决定「回谁」—— 配额、去重、回哪个楼都能钉死。
  去重表落在家目录 `converse-state.json`（`repliedComments` / `answeredDmTs`，各留最近 500 条）。
  默认只回名单里的人（`converseDmUids`），`converseAnyDm=true` 才回陌生人；系统通知/账号提醒一律跳过。
- **像真人一样说话**：`humanize`（默认开）把评论压到 10–40 字、私信 30–120 字，禁 markdown/分点/客套模板，
  禁「首先/其次/总的来说/希望对你有帮助」这类腔调；`voiceStyle` 每轮换一种口吻（auto / casual / witty / warm / blunt），
  `voiceNote` 可以追加自己的规矩。写的是**否定式硬约束**（列明不许做什么），比说一句「要自然」有效。
- **自定义定时时段**：`customWindowsOn` + `customWindows`（`HH:MM-HH:MM`，一天最多 8 段）+
  `customRepeatMin`（0 = 这段一天只跑一轮，>0 = 每 N 分钟可再来一轮）。峰谷是省钱窗口，自定义时段是日程表。
  去重键对自定义时段带重复槽（`今天:custom:1:槽号`），峰谷两个窗口仍维持一天一次。
- 三只只读工具：`bili_comment_replies` / `bili_dm_sessions` / `bili_dm_history`
  （Python 侧 `bilibili_api.session.get_replies` / `get_sessions` / `fetch_session_msgs`）。
  宿主侧也各注册一份 —— 宿主内那一轮拿到的是插件工具，不是 MCP 白名单。
- HTTP：`POST /api/bili-duty/converse`（手动跑一次）、`GET /api/bili-duty/converse`（排队情况）；
  `status()` 增加 `allWindows` / `customWindows` / `voice` / `converse`。

### Changed

- 设置页「定时」页新增「自定义定时时段」卡；「发言」页新增「像真人一样说话」与「交流轮」两张卡。
- `runDutyInHost` 参数化（`why, round`）：交流轮复用同一套「宿主内固定会话 + turn/start→turn/end 判据」，
  但不写日报、不数 picked、不触发复核。
- `mcpWhitelist()` 在交流轮开启时放行 `bili_received_replies` 与三只读对话工具。
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
