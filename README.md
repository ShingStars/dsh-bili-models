# dsh-bili-models

刷 B 站（[dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll)）＋ **「这一轮用哪个模型」**。

上游那份插件跑一轮的方式是另起一个 `dsh` 子进程，用的是 profile 里写死的默认模型；没配 API key 就整个失败。这个 fork 在它的设置页里加了一段模型选择：**列的是当前 DSH 里真实注册的模型**，包括你自己配的、以及其它插件提供的（比如 [Our Free Model](https://github.com/Ebony-Vinyl/dsh-our-free-model)）。选哪个，跑一轮就用哪个。

---

## 装

```bash
git clone https://github.com/ShingStars/dsh-bili-models.git
dsh plugin add file:C:/path/to/dsh-bili-models
```

装完重启 DSH，在「设置 → 刷B站」里能看到新加的「用哪个模型干活」。

## 用

设置页最上面是上游原本的一堆开关（额度、峰谷、私信、转写、日报……），最下面是这一段：

| 项 | 说明 |
| --- | --- |
| **provider（哪家）** | 当前 DSH 真实注册的 provider。留空 = 用那个 profile 自己的默认 |
| **model** | 跟着 provider 联动，列它下面能用的模型 |
| **推理强度** | 可不填；填了就写进那一轮 |
| **提供方插件** | 逗号分隔的包名，默认 `dsh-our-free-model` |

选好之后会显示「这一轮会用：provider / model · effort」。点「保存」生效。

### 和 Our Free Model 一起用

1. 先装 `dsh-our-free-model`（本插件不内嵌它，也不复制它的代码）；
2. 「提供方插件」保持默认 `dsh-our-free-model`；
3. provider 选 `our-free-model`，model 选清单里的某个免费模型。

跑那一轮时，本插件会生成一份 headless overlay，把 Our Free Model 作为一条条目挂进子进程（用 `file://` 指向它的 `index.js`），同时把 `agent-default-model` 覆盖成你选的模型。**不装 Our Free Model 也没关系**：填了没装的包会自动跳过，模型清单里也不会出现它。

## 它怎么工作

`dsh-bili-scroll` 跑一轮不是在本进程里跑，而是：

```
dsh --profile headless --patch <家目录>/headless-overlay.yml "<prompt>"
```

overlay 里除了上游本来就有的 MCP server 条目、credentials / authorization 等几条，本插件还追加了：

```yaml
- insert:
    - id: bili-bridge-dsh-our-free-model
      name: 'file:///.../node_modules/dsh-our-free-model/index.js'
      config: {}

- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: 'our-free-model'
    model: 'deepseek-ai/deepseek-v4.1-flash'
```

为什么用 `file://` 而不是包名：headless 是另一棵 `node_modules`，按包名解析不到；目录 URL 会 `ERR_UNSUPPORTED_DIR_IMPORT`，所以要精确指到 `index.js`。

`GET /api/bili-duty/overlay` 可以看当前生成的那份 overlay（排查用）。`GET /api/bili-duty/models` 返回 provider / 模型清单 / 已解析到的桥接插件。

## 数据

家目录 `~/.dsh/bili-duty/`（与上游一致，可以直接沿用旧配置）：

```
config.json          设置
duty.md              给那一轮的简报
seen.md              判重表
out/YYYY-MM-DD.md    日报
duty.log             运行日志
.venv/               主依赖（设置页里「装主依赖」会建）
bili_credential.json 扫码登录后的 Cookie
headless-overlay.yml 每次跑一轮前重写
```

## 已知限制

- **B 站账号等级**：新号发不出公开评论（`-107 账号未转正`）、私信可能 `21016 等级不够`。这不是插件的问题，报告里会如实记录。
- **模型调不通**：`/api/bili-duty/models` 能看到某个 provider，不代表它的账号可用；跑一轮失败时看 `duty.log`。
- **headless 的模型解析**：桥接用的是**本插件所在的那棵** `node_modules`，所以「提供方插件」必须装在同一份 DSH 里（装在本插件旁边）。
- 本插件不提供自更新，更新请直接 `git pull` 后重装。

## 相比上游改了什么

1. **新增模型选择**：4 个配置键（`modelProvider` / `modelName` / `modelEffort` / `bridgePlugins`）、`GET /models`、`GET /overlay`、设置页那一块 UI；
2. **修上游的崩溃 bug**：`bili/index.js` 的 `loadCfg()` 用了两个从未声明的变量（`hostDiff` / `lastDiffSig`），只要走到「宿主里有这行设置」的分支就抛 `ReferenceError`，host 半边起不来、设置页永远是「读设置中」。上游 0.1.11 同样存在；
3. **补 MCP 白名单**：`bili_send_message`（配了私信时）、`bili_received_replies`（开了复核评论时）原本不在白名单里，导致这两个功能在子进程里根本看不到工具；
4. **client 不抢占启动关键路径**：不写 `immediately: true`（上游也没有）。

## 开发

```bash
node --check bili/index.js
node --check bili/client.js
node bili/selfcheck.mjs        # 在插件目录里跑
node tools/client-smoke.mjs    # 假 loader + 假 React，跑一遍 client
```

## 来源与许可

MIT。本仓库是 [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll)（MIT, © 2026 c1overzz）的 fork，`bili/` 下绝大部分代码来自上游；新增的模型选择与上面那条崩溃修复是本仓库的改动。详见 [NOTICE.md](NOTICE.md)。
