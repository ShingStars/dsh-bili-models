- [Unreleased]
  - 仓库合并：旧仓库 `dsh-bili-free-scroll`（v1.x 合并版）的源码并入 `legacy/`，旧仓库归档并指向这里。

# Changelog

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
