# dsh-bili-models

[dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll) 的社区分支（fork）：保留原版「每天替你刷一轮 B 站」的全部能力，在此之上加了**每一轮的模型选择**、**宿主内固定会话运行**、**多人私信/@**、**特别关注 UP 主通知**，并重做了设置页。

> 原版 `dsh-bili-scroll`（by [c1overzz](https://github.com/c1overzz)，MIT）每日自动刷 B 站：搜索关键词 → 读字幕挑出值得看的 → 写一份日报 → 值得的 @ 你 / 私信你。本仓库基于上游 0.1.11 演化而来，家目录（`~/.dsh/bili-duty/`）与上游完全兼容，可以从原版直接迁移，旧配置、判重表、日报、扫码登录的凭证都能沿用。

## 与原版 dsh-bili-scroll 的区别

| # | 能力 | 原版 dsh-bili-scroll | 本分支 dsh-bili-models |
| --- | --- | --- | --- |
| 1 | **每一轮用什么模型** | 另起 `dsh --profile headless` 子进程，用 profile 里写死的默认模型；没配 API key 整轮失败 | 设置页可任选 **当前 DSH 里真实注册的模型**（含其它插件提供的免费模型，如 [Our Free Model](https://github.com/Ebony-Vinyl/dsh-our-free-model)）；`GET /api/bili-duty/models` 实时列清单 |
| 2 | **跑一轮的方式** | 每次新起一个子进程 = 新开会话 | 默认 **宿主内固定会话**（`ctx.agents`，同一条会话上的新一轮对话），不起子进程、不再新开会话；`runMode: headless` 可切回原版方式 |
| 3 | **上下文洞察冲突** | 子进程会话不在宿主 sessions 表里，打开「上下文洞察」面板会被当冷会话回写投影，正在跑的那一轮被中断 | 宿主内会话对宿主是活的，冲突从机制上消失 |
| 4 | **私信 / @ 的人数** | 各限一人（`dmUid` / `mentionName`） | 多人：`dmUids` / `mentionNames` 逗号分隔，最多各 20 人，每个收件人各发一条 |
| 5 | **特别关注 UP 主** | 无 | `watchUids` 关注最多 50 个 UP，有新视频时私信 / @ 通知（`watchNotify`），可设检查间隔，设置页可「立刻检查一遍」 |
| 6 | **崩溃 bug** | `loadCfg()` 引用未声明变量（`hostDiff` / `lastDiffSig`），宿主里配过设置就 `ReferenceError`，host 半边起不来 | 已修（v1.0.1 起） |
| 7 | **MCP 工具白名单** | 缺 `bili_send_message` / `bili_received_replies`，私信与评论复核在子进程里看不到工具 | 已补齐 |
| 8 | **v4 会话格式** | — | 宿主内投喂的消息 `source.kind` 用自有 producer（`'bili-duty'`），过 v4 会话持久化校验（v2.2.0 修） |
| 9 | **设置页 UI** | 一整页平铺的开关 | 胶囊分页（概览 / 定时 / 发言 / 关注 / 模型 / 环境），hero 卡 + 配额进度条，配色走 DSH 设计变量，深浅色跟随宿主 |
| 10 | **说话像真人** | 150 字内、允许分点的规整写法 | 评论 10–40 字 / 私信 30–120 字，禁 markdown、禁客套模板，每轮换口吻（`voiceStyle`），可追加自己的规矩（`voiceNote`） |
| 11 | **评论与 @** | 绑在一个开关上（填了 `mentionName` 才会评论） | 拆成两个开关：`autoComment` 管评论、`mentionOn` 管 @；`mentionOn` 关着时工具层会把正文里的 @ 剥掉 |
| 12 | **对话** | 只做单方面通知 | 「交流轮」单独跑：回评论楼中楼 + 回私信往来，带配额与去重（`converse-state.json`） |
| 13 | **从对话里学** | 无 | `learnOn`：交流轮里学到的事（称呼、忌讳、能接着聊的信息）记进 `learn-state.json`，之后每轮的说话规矩都会带上 |
| 14 | **自定义定时时段** | 只有峰谷两个窗口 | `customWindows`：`09:00-10:30, 15:00-17:00` 一天最多 8 段，`customRepeatMin` 可让每段隔几分钟再来一轮 |
| 15 | **发动态** | 无 | `dailyPostOn`：每天发一条第一人称动态总结今天（一天一条，`bili_post_dynamic`） |

## 装

**装成 GitHub 源（这样 dsh-market 里才有「更新」按钮）**

```bash
dsh plugin add github:ShingStars/dsh-bili-models
```

> 为什么强调 `github:`：市场判断「有没有新版」靠的是**从 lockfile 里读回已装的那个 commit，再和 HEAD 比**。
> `link:` / `file:` 装的没有这个 commit，市场只会当成本地开发版，不给你更新。
> 装成 `github:` 之后，仓库一有新提交（含每次发版），在市场「已安装」里点一下「更新」就拉到位 —— 不需要 npm 发布。

**从插件市场安装**：本插件正在申请收录进 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
精选列表（提交文件已就绪），收录后就能在市场的「发现」页里直接搜到、一键安装。
市场出于安全只允许安装**精选列表内**的来源，所以现在用上面的 `dsh plugin add github:...` 命令。

**本地开发：**

```bash
git clone https://github.com/ShingStars/dsh-bili-models.git
dsh plugin add file:C:/path/to/dsh-bili-models
```

装完重启 DSH，在「设置 → 刷B站」里能看到新 UI。

> ⭐ 别和原版 `dsh-bili-scroll` 同装：两个插件用同一个家目录，同时启用会互相干扰。从原版迁移请先卸载原版。
>
> ⚠️ **别在插件市场页里手动开关本插件**：市场的 toggle 会同时在 profile 的 `cordis.patch.yml` 里写一行
> `disabled: true`，一旦那次 enable 因为「loader 里还没有这条 entry」失败，它会维持关闭状态并且**不提示**，
> 表现成「插件没了 / 配置像被重置」。要装卸请在市场的「安装/卸载」里做，别用那个开关。

## 用

### 模型选择（「模型」页）

| 项 | 说明 |
| --- | --- |
| **provider（哪家）** | 当前 DSH 真实注册的 provider。留空 = 跟随 DSH 默认 |
| **model** | 跟着 provider 联动，列它下面能用的模型 |
| **推理强度** | 可不填；填了就写进那一轮 |
| **提供方插件**（`bridgePlugins`） | 逗号分隔的包名，默认 `dsh-our-free-model` |

选好之后会显示「这一轮会用：provider / model · effort」。

**和 Our Free Model 一起用**：先装 `dsh-our-free-model`（本插件不内嵌它），provider 选 `our-free-model` 再挑免费模型即可。headless 模式下本插件会在 overlay 里用 `file://` 精确指向它的 `index.js` 把它挂进子进程；没装也不报错，自动跳过。

### 宿主内运行（「定时」页）

`runMode: in-host`（默认）时，跑一轮 = 在 DSH 宿主里用 `ctx.agents` 驱动**同一条固定会话**：

- `sessionId` 留空自动生成并记住（存在家目录 `state.json`），想换新会话就清掉它；
- 每一轮是这条会话里的新一轮对话，历史上下文连续、不再新开子进程；
- 权限档位可选（`read-only` / `workspace-write` / `danger-full-access`），无人值守审批自动钉成 `never`；
- 也可切回 `headless`（原版方式：`dsh --profile headless --patch <overlay> "<prompt>"`），`GET /api/bili-duty/overlay` 可看当前生成的 overlay。

### 私信 / @ 多人（「发言」页）

- `mentionNames`（评论区 @ 谁）与 `dmUids`（私信发给谁）：逗号 / 分号 / 空格分隔均可，最多各 20 人；
- 兼容原版单数字段：留多人字段为空时沿用 `mentionName` / `dmUid`；
- 私信正文仍受 B 站 500 字符限制（`code 21007`），每个收件人各发一条。

### 特别关注 UP 主（「关注」页）

- `watchUids`：最多 50 个 UP 主 UID；
- `watchNotify`：`off` / `dm`（私信通知）/ `comment`（评论区 @）/ `both`；
- `watchEveryMin`：检查间隔（分钟，默认 15；后台定时器自动节流）；
- 首次见某个 UP 只建基线不补发，之后有**新发布**才通知（每 UP 每轮最多 3 条，按时间升序）；
- 设置页可看「已在盯」列表（UP 名 + 上次见到的视频）并「立刻检查一遍」（工具 `bili_watch_check` 同理）。

## 数据

家目录 `~/.dsh/bili-duty/`（与上游一致）：

```
config.json          设置
state.json           运行状态（含 dutySessionId / 特别关注基线在 watch-state.json）
duty.md              给那一轮的简报
seen.md              判重表
out/YYYY-MM-DD.md    日报
duty.log             运行日志
.venv/               主依赖（设置页里「装主依赖」会建）
bili_credential.json 扫码登录后的 Cookie
headless-overlay.yml headless 模式每轮前重写
```

## 已知限制

- **B 站账号等级**：新号发不出公开评论（`-107 账号未转正`）、私信可能 `21016 等级不够`。不是插件的问题，报告里会如实记录。
- **模型调不通**：`/api/bili-duty/models` 能看到某个 provider，不代表它的账号可用；失败时看 `duty.log`。
- **桥接解析**（headless 模式）：桥接用的是本插件所在的那棵 `node_modules`，「提供方插件」要装在同一份 DSH 里。
- 本插件不自己拉代码更新：**从插件市场以 `github:` 源安装的，在市场的「更新」里点一下就能拉到最新 commit**；
  `file:` 本地装的请 `git pull` 后重装。
- **插件市场开关**：不要在第三方插件市场页里切换本插件的开关 —— 它的启用状态走 profile 配置（`cordis.patch.yml` + `dsh.profile.bundles`），市场页的切换会和它打架（已知会误关）。

## 开发

```bash
node --check bili/index.js
node --check bili/client.js
node bili/selfcheck.mjs        # 在插件目录里跑
node tools/client-smoke.mjs    # 假 loader + 假 React，跑一遍 client
```

## 历史与致谢

- 本仓库是 [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll)（MIT, © 2026 c1overzz）的 fork，`bili/` 下绝大部分代码来自上游，详见 [NOTICE.md](NOTICE.md)。
- v1.x 时代曾以 `dsh-bili-free-scroll` 的名字做过「两个插件合并成一个包」的方案，已废弃；其历史保留在本仓库 git 历史中（tag `v1.0.0` / `v1.0.1`），旧仓库 [ShingStars/dsh-bili-free-scroll](https://github.com/ShingStars/dsh-bili-free-scroll) 已归档，仅作历史参考。

## 许可

MIT。
