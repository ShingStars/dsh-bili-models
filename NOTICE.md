# NOTICE

This repository is a fork of **dsh-bili-scroll** and derives almost all of its
`bili/` directory from it.

## Upstream

- **dsh-bili-scroll** — © 2026 c1overzz — MIT
  https://github.com/c1overzz/dsh-bili-scroll
  Base: upstream `0.1.11`. Files kept verbatim where possible:
  `bili/lib/*`, `bili/prompts/*`, `bili/vendor/bilibili-mcp/*`,
  `bili/tools/host-resolver.mjs`, `bili/tools/register.mjs`, and the bulk of
  `bili/index.js` / `bili/client.js`.

## This repository's changes

- New "which model for this round" section in the settings panel
  (`bili/client.js`) plus its config keys, `GET /api/bili-duty/models` and
  `GET /api/bili-duty/overlay` (`bili/index.js`).
- `loadCfg()` crash fix: two never-declared variables (`hostDiff`,
  `lastDiffSig`) made the host half throw `ReferenceError` whenever the
  "host has this settings row" branch was taken. The same bug exists in
  upstream 0.1.11.
- MCP tool allow-list now includes `bili_send_message` and
  `bili_received_replies`, which upstream omitted.
- `package.json` / `cordis.patch.yml` / docs adapted for this fork
  (entry id `bili-models`).

## Not included

No code from **dsh-our-free-model** is bundled or copied into this repository.
When the user installs that plugin separately, this plugin only writes a
`file://` reference to it into the generated headless overlay. Its license and
copyright remain with its author (MIT, © 2026 Ebony-Vinyl,
https://github.com/Ebony-Vinyl/dsh-our-free-model).
