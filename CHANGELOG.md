- [Unreleased]
  - 仓库合并：旧仓库 `dsh-bili-free-scroll`（v1.x 合并版）的历史并入本仓库 git 历史（tag `v1.0.0` / `v1.0.1`），`legacy/` 目录已移除，旧仓库已归档（仅作历史参考）。

# Changelog

## 2.5.0 — 2026-10-20

### Changed（按用户三点要求整合，去掉的是重复功能）

- **评论不再有总开关**：本轮挑中几条视频，就在它们下面各留一条跟内容相关的评论。
  删掉 `autoComment`（它和 `commentPerRound` 说的是同一件事）；`commentPerRound = 0` 表示不设上限。
- **回复评论 / 回私信只由「交流轮」负责**：删掉 `replyToComments` / `replyPerRound`（旧版值班轮里
  "顺手回一句"与交流轮完全重叠，同一楼会被回两遍）。值班轮提示词里明说"回复是交流轮的事"。
- **两个会话真分开**：交流轮有自己的会话（`converseSessionId`），**值班轮跑在它的子代理里**
  （`agents.create({parentAgent})`）——父会话常驻、随时能回消息，子会话去刷视频（几分钟），
  两边各有自己的 loop，是真的并发而不是排队。会话列表里能看出父子关系，标题分别是
  「刷B站·值班轮」/「刷B站·交流轮」。

### Added

- **按轮次划工具**：值班轮只拿浏览/评论/发动态那几只（`bili_search`/`bili_comments`/`bili_reply`…），
  交流轮只拿回消息那几只（`bili_comment_replies`/`bili_dm_sessions`/`bili_dm_history`…）；
  越界的工具调用直接返回错误，不靠提示词约束。
- **按目标互斥**：同一个评论楼 / 同一个收件人的发送串行化（`reply:<rpid>`、`dm:<uid>`），
  值班轮与交流轮同时动手也不会同一个人收到两条。
- **跨会话摘要**：`~/.dsh/bili-duty/activity.json` 记这个号最近说过什么（≤3 天、≤200 条），
  交流轮的提示词里注入一小段 —— 父子会话的消息流不共享，这样聊天能接上上下文。
- `status()` 增加 `round`（现在哪一轮在跑）、`activity`（最近 5 条）、`converse.sessionId` / `converse.parentOf`。

### Removed

- 设置页「发言」页的「自动评论并 @」总开关与整张「回复评论」卡（功能并入交流轮）；
  配置文件里残留的这三个键会被静默忽略（不报错、不回写）。

## 2.4.0 — 2026-10-20

### Added

- **从对话里学**（`learnOn`，默认开）：交流轮里模型察觉到值得长期记住的事（对方怎么称呼它、
  不爱听什么、能接着聊的具体信息）就用 `bili_learn` 记一条；条目落在 `~/.dsh/bili-duty/learn-state.json`
  （最多 20 条，旧的自然淘汰，同句去重），**每轮开始前注入「怎么说话」那一段** ——
  越聊越像，而不是每轮从零开始。HTTP：`GET/POST /api/bili-duty/learn`（`{clear:true}` 清空）。
- **自动评论与 @ 拆成两个开关**：`mentionOn`（默认关）只决定**要不要 @**；评论照发、正文不带 @。
  `bili_reply` 在工具层兜一道 —— `mentionOn` 关着时把正文里的 `@昵称` 剥掉（提示词说了不算，模型偶尔还是会带）。
- **每天发一条动态**（`dailyPostOn`，默认关）：刷完那一轮末尾用 `bili_post_dynamic` 发一条第一人称动态
  （≤200 字、纯文本、不写列表/话题标签）。一天只发一条（`state.json` 的 `postedDay` 钉住）。
  HTTP：`GET /api/bili-duty/dynamic`（今天发没发）、`POST /api/bili-duty/dynamic`（用今天报告拼一句人话立刻发，不花模型）。

### Changed

- **评论不再要求先填 @ 名单**：`commentOn = autoComment && dmMode !== 'only'`。
  旧版把「@ 谁」当成发评论的前提，等于两个功能绑在一个开关上；现在 `commentPerRound = 0` 表示
  **每条挑中的都评论**（不设上限），>0 才是上限。功能重复的部分按「评论归评论、@ 归 @」合并。
- 设置页「发言」页：自动评论卡拆成「自动评论 / 评论里 @ 人 / 要 @ 谁」，新增「每天发一条动态」与
  「从对话里学」两张卡（学到的条目列表 + 清空）。
- `bili_config` 描述补 2.4.0 三个键；`status()` 增加 `mention` / `learn` / `dynamic`。

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
