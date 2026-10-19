# NOTICE

本仓库（`dsh-bili-free-scroll`）是两份 MIT 许可上游项目的合并裁剪版，**不是**它们任意一份的官方发布。
下面逐项说明来源、许可与本仓库做的改动，以便追溯。

---

## 1. dsh-bili-scroll

- 上游：https://github.com/c1overzz/dsh-bili-scroll
- 版本：`0.1.11`（本仓库 `bili/` 目录的基线）
- 许可：MIT，Copyright (c) 2026 c1overzz
- 本仓库保留部分：`bili/index.js`、`bili/client.js`、`bili/lib/`、`bili/prompts/`、
  `bili/tools/`、`bili/vendor/bilibili-mcp/`（B站 MCP 子进程）。
- 本仓库的改动：
  1. `mcpWhitelist()` 补 `bili_send_message` / `bili_received_replies`（上游 0.1.11 仍缺，
     导致开了私信 / 回评论也调不到对应工具）；
  2. 数据目录由 `$DSH_HOME/bili-duty/` 改为 `$DSH_HOME/bili-free-scroll/bili/`；
  3. 设置页新增「用哪个模型干活」区块，并新增 `modelProvider` / `modelName` /
     `modelEffort` / `overlayModel` 四个配置键；
  4. 生成 headless overlay 时额外插入本包的「模型半边」入口，并覆盖
     `agent-default-model`（这样刷B站那一轮不再依赖 `deepseek-official` 的 API key）；
  5. 新增 `GET /api/bili-duty/models`，给设置页列出可选 provider / model；
  6. 版本号改为读包根的 `package.json`（合并后 `bili/` 不再是包根）。

---

## 2. dsh-our-free-model

- 上游：https://github.com/Ebony-Vinyl/dsh-our-free-model
- 版本：`2.5.5`（本仓库 `models/` 目录的基线）
- 许可：MIT，Copyright (c) 2026 Ebony-Vinyl
- 本仓库保留部分：`models/index.js`、`models/client.js`、`models/src/`、`models/adapter/`、
  `models/locale/`、`models/vendor/channel-pack/`（含 `pack.js` 与 `qoder-auth-wasm.wasm`）。
- 本仓库的改动：
  1. **只保留四个渠道**：LobsterAI（`lobsterai`）、Qoder 中国版（`qodercn`）、
     Cline（`cline`）、Raccoon（`raccoon`）。其余九个渠道（codearts / buddy / workbuddy /
     qoder / trae / loomy / minimax / zcode / gemini）从 UI 与 `src/` 中裁掉；
     `pack.js` 是上游 esbuild 产物，**保持逐字节原样**（离线无法重建，见 build/README），
     未保留渠道的代码仍在产物里但不会被注册、不会出现在界面、也调不到。
  2. 在 `pack.apply()` 之前包一层 `registerAdapter`，只放行上述四个 provider id；
  3. 关闭两个对外网关（`forward` 与 `chan-relay`）以及 LAN relay / egress；并把渠道包自带的`本机 OpenAI 网关`（`127.0.0.1:8326`，上游默认开启）写死为关闭（`channel-pack/state.json` 的 `gatewayEnabled: false`）；
  4. 关闭自更新（`PluginUpdater` 换成 stub）—— 否则上游 release 会把本合并版覆盖成
     `dsh-our-free-model` 本体；
  5. 数据目录由 `$DSH_HOME/our-free-model/` 改为 `$DSH_HOME/bili-free-scroll/models/`；
  6. client 去掉赞助位、推荐项目页（picks）、公告中心、Star 解锁（EAC）页面与网关页；
  7. `vendor/channel-pack/pack.js` 打两处文本补丁（与渠道无关，改的是自动签到调度）：
     `fire()` 不再清空 `pending`；`defaultSchedule` 由「只跑一次」改为「一次 + 每 30 分钟
     复查」，使签到能跨天触发。补丁脚本见 `build/patch-channel-pack.mjs`，幂等。

---

## 3. 渠道包（vendor/channel-pack）

- 出处：https://gitee.com/iJetLi/dsh-deepseek-harness-codearts （`dsh-codearts-auth`）
- 许可：MIT，Copyright (c) 2026 Jet
- 上游 NOTICE 原样保留在 `models/vendor/channel-pack/NOTICE.md` 与 `LICENSE`。

---

## 4. 本仓库自身

- 许可：MIT，Copyright (c) 2026 ShingStars（见 `LICENSE`）。
- 新增内容：根 `index.js`（两个半边的装配）、`client.js`（由两份 client 合并生成）、
  `cordis.patch.yml`、`build/` 下的合并与补丁脚本、`tools/client-smoke.mjs`、本文件与文档。

如果你要再分发，请同时保留本节提到的三份上游许可与版权声明。
