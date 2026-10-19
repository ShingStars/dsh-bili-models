# Changelog

## v1.0.1 — 2026-10-20

### 修复（严重：装好后 DSH 起不来）

- **`ReferenceError: hostDiff is not defined`** —— `bili/index.js` 的 `loadCfg()` 里
  `hostDiff` / `lastDiffSig` 两个变量从未声明，严格模式下给未声明变量赋值直接抛错。
  只要宿主 `settings.describe()` 能认出插件那一行（桌面 profile 一定认得出），
  host 半边的 `apply` 就当场抛异常、fiber 停在 `loading`，前端启动自检报
  `web boot: 1 entry did not activate` 并把整个桌面壳带崩。
  headless 下 `describe()` 没有那一行、走不到这段，所以此前所有验证都没暴露。
  **上游 dsh-bili-scroll 0.1.11 同样存在这个 bug**（同位置、同写法），本版一并修掉。
- 两条半边改成**嵌套 `ctx.inject` + 各自 try/catch**：任何一边挂不上只记日志，
  不再拖累另一条，也不会让 fiber 停在 loading 拖垮启动自检。
- 修好后 bili 设置页不再卡在「读设置中…」（此前是 apply 抛错、HTTP 路由根本没挂上）。

### 优化

- **启动路径去重**：client 从 535 KB 单文件拆成 3.2 KB 薄壳 + `client.bili.js`（43 KB）/
  `client.models.js`（495 KB）两个按需 chunk，设置页打开时才加载；`dsh.client.immediately`
  不再置 true。启动时不再需要物化 500 KB 的 factory bundle。

## v1.0.0 — 2026-10-19

首个版本：把 [dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll) 0.1.11 与
[dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model) 2.5.5 合并为一个包。

### 新增

- **一个包两个半边**：刷B站（`bili/`）与免费模型（`models/`）共用一个 loader 条目，
  由根 `index.js` 用嵌套 `ctx.inject` 分别激活 —— headless 里没有 `webServer` 时只有模型半边生效。
- **设置页两个区块**：「刷B站」（order 30）与「免费模型」（order 35），两个 `settings.section`
  由同一个 client bundle 注册。
- **模型选择**：刷B站那一轮用哪个 provider / model / 推理强度，可直接在设置页选；
  默认 `qodercn` / `qfmodel`（Qwen3.8-Flash，免费，1M 上下文）。新增 `GET /api/bili-duty/models`。
- **跨天自动签到**：上游只在启动后 30 秒跑一次，跨天不重启不会领；本版补齐重排
  （`build/patch-channel-pack.mjs` 对 `pack.js` 打幂等补丁）。

### 修复

- MCP 白名单补 `bili_send_message` 与 `bili_received_replies`（上游 0.1.11 仍缺）。
- 合并后 `bili/` 不再是包根，版本号改为读包根 `package.json`。
- 去掉自更新（避免上游 release 覆盖本合并版）。

### 裁剪

- 渠道只保留 LobsterAI / Qoder 中国版 / Cline / Raccoon（源码与 UI 裁掉其余九个；
  `pack.js` 保持原样，未保留渠道不注册、不显示、调不到）。
- 去掉对外网关（forward / chan-relay）与 LAN relay / egress，并关闭渠道包自带的本机 OpenAI 网关（`127.0.0.1:8326`）。
- 去掉赞助位、推荐项目页、公告中心、Star 解锁页、网关页。

### 已知限制

- B站公开评论 / 私信受账号等级限制（`-107` / `21016`），插件如实记录、不重试。
- 免费渠道的额度与风控由各家决定，可能要求重新登录。
- 本仓库不提供自更新，升级请拉新版本。
