# English README

A DSH (DeepSeek Harness) plugin that puts two things in one package:

1. **Bilibili duty** — every day during off-peak hours it runs a session that searches recent
   videos, reads subtitles, picks a few for you, and writes a daily report (optionally mentioning
   you, sending a DM, or commenting).
2. **Free model lanes** — login / account pool / quota / daily check-in for four account-based
   channels: **LobsterAI**, **Qoder China**, **Cline**, **Raccoon**. Log in once and the Bilibili
   session can use their free models instead of an API key.

> Default model: `qodercn` / `qfmodel` (Qwen3.8-Flash — free, 1M context). Log into Qoder China
> and it works out of the box.

---

## Why

The Bilibili session is spawned as a **separate `dsh` process** (the `headless` profile). That
profile hard-codes `deepseek-official`, so without `DEEPSEEK_API_KEY` every run fails with:

```
llm-deepseek: no API key for provider route "deepseek-official"
```

This plugin ships the model lane and the Bilibili lane in one package: the headless run loads the
plugin, the plugin registers adapters for the four channels and rewrites that run's default model
to the one you picked — no API key needed.

---

## Install

```bash
dsh plugin add dsh-bili-free-scroll
```

Two settings sections appear in DSH:

- **刷B站 / Bilibili** (`order=30`) — switches, videos per run, off-peak windows, mentions, DMs,
  report level, model selection.
- **免费模型 / Free models** (`order=35`) — login, account pool, quota, daily check-in, model list
  for each channel.

| Channel | Login | Daily check-in | Notes |
| --- | --- | --- | --- |
| LobsterAI | browser | ✅ | daily points |
| Qoder China | browser | ✅ (refreshes 10:00 UTC+8) | default model source |
| Cline | browser | ❌ | free tier only |
| Raccoon | phone | ❌ (one-off login reward) | quota granted server-side |

Check-in runs 30 s after start-up, and **re-arms every 30 minutes** so a long-running process can
claim on the next day (upstream only ran once).

---

## Data directory

Everything lives under `$DSH_HOME/bili-free-scroll/` (never inside the package):

```
bili-free-scroll/
  bili/    config.json  duty.md  out/YYYY-MM-DD.md  duty.log  bili_credential.json
  models/  settings.json  catalog.json  session-map.json  ...
```

The first run creates a uv virtualenv under `bili/` with `mcp`, `qrcode`, `pyyaml`.

---

## Known limitations

- **Bilibili account level**: public comments require a verified account, DMs require a minimum
  level. The API answers `-107` / `21016`; the plugin records it in the report and does not retry.
- **Upstream rate limits / re-login** on the free channels are up to the vendors.
- **No self-update**: the upstream updater would replace this merged plugin with
  `dsh-our-free-model` itself, so it is disabled. Update from this repository instead.
- The Bilibili host side does not activate in `headless` (there is no `webServer` there); only the
  model side does. The desktop app activates both.

---

## Credits & license

Merged and trimmed from two MIT projects:

- [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll) (0.1.11)
- [Ebony-Vinyl/dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model) (2.5.5)
- channel pack originally from [gitee.com/iJetLi/dsh-deepseek-harness-codearts](https://gitee.com/iJetLi/dsh-deepseek-harness-codearts)

See [NOTICE.md](./NOTICE.md). This repository is MIT licensed.
