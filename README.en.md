# dsh-bili-models

Bilibili "duty scroll" ([dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll)) **plus a per-run model picker**.

Upstream runs each round in a separate `dsh` child process and uses whatever default model the profile has hard-coded — if that provider has no API key, the whole round fails. This fork adds a model section to the settings page: it lists the models **actually registered in the running DSH**, including your own and those provided by other plugins (e.g. [Our Free Model](https://github.com/Ebony-Vinyl/dsh-our-free-model)). Whatever you pick is what that round uses.

## What's in this repository

| Path | Contents |
| --- | --- |
| root | The main line: `dsh-bili-models` (what this document describes) |
| `bili/` | The plugin itself, based on upstream `dsh-bili-scroll` 0.1.11 |
| `legacy/dsh-bili-free-scroll/` | The abandoned v1.x "merge both plugins into one package" attempt, kept for reference only — do not install (see [LEGACY.md](LEGACY.md)) |

---

## Install

```bash
git clone https://github.com/ShingStars/dsh-bili-models.git
dsh plugin add file:C:/path/to/dsh-bili-models
```

Restart DSH, then open **Settings → 刷B站**.

## Use

The top of the panel is upstream's usual switches (quota, peak/valley, DM, transcription, digest…). At the bottom:

| Field | Meaning |
| --- | --- |
| **provider** | Providers actually registered in this DSH. Empty = keep the profile default |
| **model** | Follows the chosen provider |
| **reasoning effort** | Optional; written into that round when set |
| **bridge plugins** | Comma-separated package names, defaults to `dsh-our-free-model` |

The line "这一轮会用：provider / model · effort" shows the effective choice. Hit **保存**.

### With Our Free Model

1. Install `dsh-our-free-model` separately (this plugin neither bundles nor copies it);
2. Leave **bridge plugins** at `dsh-our-free-model`;
3. Pick provider `our-free-model` and any free model from the list.

For each round this plugin regenerates the headless overlay, inserting Our Free Model as an entry (via `file://` to its `index.js`) and overriding `agent-default-model`. If the plugin isn't installed it is silently skipped and simply won't appear in the model list.

## How it works

A round is:

```
dsh --profile headless --patch <home>/headless-overlay.yml "<prompt>"
```

On top of upstream's entries (MCP server, credentials, authorization…) this plugin appends:

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

`file://` instead of a package name because headless resolves from a different `node_modules` tree; a bare directory URL fails with `ERR_UNSUPPORTED_DIR_IMPORT`, so the entry must point at `index.js`.

`GET /api/bili-duty/overlay` dumps the generated overlay; `GET /api/bili-duty/models` returns providers, models and resolved bridges.

## Data

Home is `~/.dsh/bili-duty/` (same as upstream, so an existing config carries over):

```
config.json          settings
duty.md              the brief handed to that round
seen.md              dedupe table
out/YYYY-MM-DD.md    daily digest
duty.log             run log
.venv/               main dependencies (created by the panel button)
bili_credential.json cookies after QR login
headless-overlay.yml rewritten before each round
```

## Known limits

- **Bilibili account level**: new accounts cannot post public comments (`-107`) and DMs may fail with `21016`. Not a plugin bug; the digest records it truthfully.
- **A listed provider is not a working account**: check `duty.log` when a round fails.
- **Bridge resolution** uses the `node_modules` tree this plugin lives in, so bridge plugins must be installed in the same DSH.
- No self-update: `git pull` and reinstall.

## Changes vs upstream

1. **Per-run model picker**: four config keys (`modelProvider` / `modelName` / `modelEffort` / `bridgePlugins`), `GET /models`, `GET /overlay`, and the panel section.
2. **Fixed a crash in upstream**: `loadCfg()` referenced two never-declared variables (`hostDiff` / `lastDiffSig`); whenever the "host has this settings row" branch ran it threw `ReferenceError`, so the host half never mounted and the panel stayed on "loading settings". Upstream 0.1.11 has the same bug.
3. **MCP allow-list**: added `bili_send_message` (when DM is on) and `bili_received_replies` (when reply review is on), which were missing entirely.
4. **Client stays off the boot critical path**: no `immediately: true` (upstream doesn't set it either).

## Development

```bash
node --check bili/index.js
node --check bili/client.js
node bili/selfcheck.mjs        # run inside the plugin dir
node tools/client-smoke.mjs    # fake loader + fake React
```

## License and provenance

MIT. A fork of [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll) (MIT, © 2026 c1overzz); most of `bili/` is upstream code. The model picker and the crash fix above are this repository's changes. See [NOTICE.md](NOTICE.md).
