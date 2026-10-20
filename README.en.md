# dsh-bili-models

A community fork of [dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll): keeps everything the original "scroll Bilibili for me every day" plugin does, and adds a **per-round model picker**, **in-host fixed-session runs**, **multi-recipient DMs / mentions**, **watched-uploader notifications**, and a redesigned settings page.

> The original `dsh-bili-scroll` (by [c1overzz](https://github.com/c1overzz), MIT) automatically scrolls Bilibili each day: searches keywords → reads subtitles to pick what's worth watching → writes a daily report → @-mentions / DMs you about the good ones. This fork evolved from upstream 0.1.11; the home directory (`~/.dsh/bili-duty/`) is fully compatible — you can migrate from the original directly and keep your config, dedup table, reports, and scanned-login credentials.

## Differences from the original dsh-bili-scroll

| # | Capability | Original dsh-bili-scroll | This fork dsh-bili-models |
| --- | --- | --- | --- |
| 1 | **Model per round** | Spawns a `dsh --profile headless` child using whatever default model the profile hard-codes; no API key ⇒ the whole round fails | Pick **any model actually registered in your DSH** (including free models from other plugins, e.g. [Our Free Model](https://github.com/Ebony-Vinyl/dsh-our-free-model)); `GET /api/bili-duty/models` lists them live |
| 2 | **How a round runs** | A new child process every time = a brand-new session | Default is an **in-host fixed session** (`ctx.agents`; each round is a new turn on the same session), no child process, no new sessions; `runMode: headless` switches back |
| 3 | **Context-insights clash** | The child-process session is unknown to the host's sessions table, so opening the Context Insights panel treats it as a cold session, rewrites projections, and kills the running round | The in-host session is live for the host — the clash is gone by construction |
| 4 | **DM / @ recipients** | One each (`dmUid` / `mentionName`) | Multiple: comma-separated `dmUids` / `mentionNames`, up to 20 each, one message per recipient |
| 5 | **Watched uploaders** | — | Watch up to 50 UP masters (`watchUids`); get a DM / comment @ when they post (`watchNotify`), configurable check interval, manual "check now" |
| 6 | **Crash bug** | `loadCfg()` references undeclared variables (`hostDiff` / `lastDiffSig`) — a `ReferenceError` whenever the host has settings for the plugin | Fixed (since v1.0.1) |
| 7 | **MCP tool whitelist** | Missing `bili_send_message` / `bili_received_replies`, so DMs and reply-review saw no tools in the child | Whitelist completed |
| 8 | **v4 session format** | — | In-host messages carry a producer-owned `source.kind` (`'bili-duty'`) that passes v4 session-persistence validation (fixed in v2.2.0) |
| 9 | **Settings UI** | One long page of switches | Capsule tabs (Overview / Schedule / Speak / Watch / Model / System), hero card + quota progress bar, DSH design tokens, follows the host theme |
| 10 | **Talking like a person** | Up to 150 chars, bullet points allowed | Comments 10–40 chars / DMs 30–120 chars, no markdown, no canned filler, rotating voice per round (`voiceStyle`), plus your own rules (`voiceNote`) |
| 11 | **Comments vs @** | One switch for both (comment only when `mentionName` set) | Two switches: `autoComment` for commenting, `mentionOn` for mentioning; with `mentionOn` off the tool strips `@` from the text |
| 12 | **Conversation** | One-way notifications only | A separate "conversation round": replies in comment threads and answers DMs, with quotas and dedup (`converse-state.json`) |
| 13 | **Learning from talk** | — | `learnOn`: facts learned during conversation rounds (forms of address, pet peeves, follow-up material) go to `learn-state.json` and are folded into every later round's voice rules |
| 14 | **Custom time windows** | Only the two peak/valley windows | `customWindows`: up to 8 ranges a day like `09:00-10:30, 15:00-17:00`; `customRepeatMin` lets a range re-run every N minutes |
| 15 | **Daily dynamic post** | — | `dailyPostOn`: one first-person dynamic per day summarising what it did (`bili_post_dynamic`) |

## Install

**Recommended: install from the plugin market (one-click updates to the latest commit)**

```text
dsh-market → "Install from Git repository" → github:ShingStars/dsh-bili-models
```

The market remembers this GitHub source; once the repo gets new commits you can pull the latest from
its "Update" action — **no npm publishing and no manual `git pull` needed**. A full URL also works:
`https://github.com/ShingStars/dsh-bili-models`.

**Local development:**

```bash
git clone https://github.com/ShingStars/dsh-bili-models.git
dsh plugin add file:C:/path/to/dsh-bili-models
```

Restart DSH afterwards; look for the new UI under "Settings → 刷B站".

> ⭐ Don't install alongside the original `dsh-bili-scroll`: both use the same home directory and will interfere. Uninstall the original first when migrating.
>
> ⚠️ **Don't flip this plugin's switch on the market page**: that toggle also appends `disabled: true`
> to the profile's `cordis.patch.yml`, and if the enable step fails ("no loader entry matched") it silently
> stays disabled — which looks like "the plugin disappeared / my config was reset". Install and uninstall
> from the market's install action instead.

## Usage

### Model picker ("Model" tab)

| Field | Meaning |
| --- | --- |
| **provider** | Any provider actually registered in the running DSH. Empty = follow the DSH default |
| **model** | Linked to the provider; lists its models |
| **reasoning effort** | Optional; written into that round |
| **bridge plugins** (`bridgePlugins`) | Comma-separated package names, default `dsh-our-free-model` |

After choosing, it shows "this round will use: provider / model · effort".

**With Our Free Model**: install `dsh-our-free-model` (not bundled here), pick the `our-free-model` provider, and choose a free model. In headless mode the overlay mounts it via a `file://` URL pointing at its `index.js`; if it's absent it's skipped silently.

### In-host runs ("Schedule" tab)

With `runMode: in-host` (default), a round drives **one fixed session** inside the DSH host via `ctx.agents`:

- `sessionId` is auto-generated and remembered (in the home `state.json`); clear it to start fresh;
- each round is a new turn on the same session — continuous context, no child processes;
- permission preset is selectable (`read-only` / `workspace-write` / `danger-full-access`); unattended approvals are pinned to `never`;
- `headless` mode (the original way) remains available; `GET /api/bili-duty/overlay` shows the current overlay.

### Multi-recipient DMs / mentions ("Speak" tab)

- `mentionNames` (who to @ in comments) and `dmUids` (who to DM): comma / semicolon / space separated, up to 20 each;
- single-value legacy fields still work when the list fields are empty;
- DM body still limited to 500 characters by Bilibili (`code 21007`); one message per recipient.

### Watched uploaders ("Watch" tab)

- `watchUids`: up to 50 UP-master UIDs;
- `watchNotify`: `off` / `dm` / `comment` / `both`;
- `watchEveryMin`: check interval in minutes (default 15; the background timer throttles itself);
- the first sighting of an uploader only records a baseline (no backlog); only **new** videos after that trigger notifications (max 3 per uploader per check, oldest first);
- the tab shows the watched list (names + last-seen video) and a "check now" button (the `bili_watch_check` tool does the same).

## Data

Home directory `~/.dsh/bili-duty/` (same as upstream):

```
config.json          settings
state.json           run state (incl. dutySessionId; watch baselines in watch-state.json)
duty.md              the briefing for each round
seen.md              dedup table
out/YYYY-MM-DD.md    daily reports
duty.log             run log
.venv/               main dependencies (built by "install deps" in settings)
bili_credential.json cookies from QR login
headless-overlay.yml rewritten before each headless round
```

## Known limitations

- **Account level**: fresh Bilibili accounts cannot post public comments (`-107`) and may fail DMs (`21016`). Not a plugin issue; reports record it honestly.
- **Models**: a provider appearing in `/api/bili-duty/models` doesn't guarantee its account works; see `duty.log` on failure.
- **Bridge resolution** (headless mode): bridges resolve against the plugin's own `node_modules` tree — keep bridge plugins in the same DSH install.
- No code self-update: **installed from the market via a `github:` source, use its "Update" action** to pull the latest commit;
  for `file:` installs, `git pull` and reinstall.
- **Market switch**: don't flip this plugin's switch on a third-party market page — its enabled state lives in the profile
  (`cordis.patch.yml` + `dsh.profile.bundles`), and that switch fights it (it has silently disabled the plugin before).
- **Market toggle**: don't flip this plugin's switch in third-party plugin markets — its enabled state lives in the profile config (`cordis.patch.yml` + `dsh.profile.bundles`), and market toggles fight it (known to mis-disable).

## Development

```bash
node --check bili/index.js
node --check bili/client.js
node bili/selfcheck.mjs        # run inside the plugin directory
node tools/client-smoke.mjs    # fake loader + fake React, exercises the client
```

## History & credits

- This repository is a fork of [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll) (MIT, © 2026 c1overzz); most of `bili/` comes from upstream — see [NOTICE.md](NOTICE.md).
- The v1.x era shipped as `dsh-bili-free-scroll` ("merge both plugins into one package"); it is retired. Its history lives in this repository's git history (tags `v1.0.0` / `v1.0.1`); the old repository [ShingStars/dsh-bili-free-scroll](https://github.com/ShingStars/dsh-bili-free-scroll) is archived for reference only.

## License

MIT.
