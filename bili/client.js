/**
 * dsh-bili-models —— 浏览器半端（「设置」里的一页）
 * ============================================================================
 * ⭐ client bundle 不是 ESM，是自注册脚本（官方约定）：
 *
 *     window.__ModuleLoader__.load({
 *       id: '<包名>',                       // 必须等于 package.json 的 name
 *       factory: (require) => { ... return { inject: [...], apply(ctx) {...} } },
 *     })
 *
 * ⭐ 进「设置」：
 *
 *     const slots = ctx.get('slots')
 *     slots.inject('settings.section', () => slots.register(
 *       { name: 'settings.section', id: 'bili-scroll', order: 30, label: '刷B站' },
 *       () => h(Panel),
 *     ))
 *
 * ── 2.2.0 布局重做 ───────────────────────────────────────────────────────────
 * 老版本是「一条长滚动 + 若干 <details> 折叠」，问题：要改的东西散在七八屏里，
 * 顶部状态条又和正文抢注意力。这一版换成：
 *   · **顶部一张概览卡**：今天挑了几条 / 配额进度条 / 三个状态胶囊 / 一键跑一轮
 *   · **胶囊式分页**（概览 · 定时 · 发言 · 关注 · 模型 · 环境）：一次只渲染一屏，
 *     每屏只有 3–6 个字段，字段一律「左边标签 · 右边控件」的栅格
 *   · 危险/啰嗦的说明收进 `note`，只在该开关打开时才出现
 * 视觉上全部走 DSH 自己的设计变量（--dsw-alias-* / --dsw-radius-*），
 * 不写死颜色，深浅色主题跟着宿主走。
 * ============================================================================
 */
window.__ModuleLoader__.load({
  id: 'dsh-bili-models',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const API = '/api/bili-duty'
    const asJson = async (res) => {
      if (res.ok) return res.json()
      const why = res.status === 401 ? '（未登录 / 没权限）' : res.status === 403 ? '（被宿主拦了）' : ''
      throw new Error('HTTP ' + res.status + why)
    }
    const jget = async (p) => asJson(await fetch(API + p, { credentials: 'same-origin' }))
    const jpost = async (p, body) => asJson(await fetch(API + p, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    }))

    /* ────────────────────────────── 样式 ──────────────────────────────
     * 全部用 [data-bd-*] 作用域，避免和宿主/其它插件的 class 打架。
     * 颜色一律取宿主变量，只保留 #fff 这种纯中性值。 */
    const CSS = `
[data-bd-root]{display:flex;flex-direction:column;gap:14px;padding:2px 2px 10px;max-width:720px;
  font-family:var(--dsw-font-family,inherit);}

/* 概览卡 */
[data-bd-hero]{display:flex;flex-direction:column;gap:12px;padding:16px 18px;
  border-radius:var(--dsw-radius-lg,12px);
  border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.22));
  background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));}
[data-bd-heroTop]{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;}
[data-bd-big]{display:flex;align-items:baseline;gap:6px;flex:none;}
[data-bd-big] b{font-size:30px;line-height:1;font-weight:650;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-primary,inherit);}
[data-bd-big] span{font-size:12px;color:var(--dsw-alias-label-tertiary,#9aa0a6);}
[data-bd-chips]{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto;}

/* 进度条 */
[data-bd-bar]{height:6px;border-radius:3px;overflow:hidden;
  background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.28));}
[data-bd-bar] i{display:block;height:100%;border-radius:3px;transition:width .25s;
  background:var(--dsw-alias-brand-primary,#3b82f6);}

/* 胶囊徽标 */
[data-bd-chip]{display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:18px;
  padding:2px 9px;border-radius:999px;white-space:nowrap;
  border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.24));
  color:var(--dsw-alias-label-secondary,#c9ccd1);}
[data-bd-chip][data-tone=good]{color:var(--dsw-alias-state-success-primary,#22c55e);
  border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 40%,transparent);}
[data-bd-chip][data-tone=warn]{color:var(--dsw-alias-state-warn-primary,#f59e0b);
  border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 40%,transparent);}
[data-bd-chip][data-tone=bad]{color:var(--dsw-alias-state-error-primary,#ef4444);
  border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 40%,transparent);}
[data-bd-chip][data-tone=brand]{color:var(--dsw-alias-brand-primary,#3b82f6);
  border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 40%,transparent);}

/* 胶囊分页 */
[data-bd-tabs]{display:flex;gap:2px;padding:3px;border-radius:10px;flex-wrap:wrap;
  background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.16));}
[data-bd-tab]{flex:1 1 auto;min-width:62px;padding:6px 10px;border:0;border-radius:8px;cursor:pointer;
  font:inherit;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary,#c9ccd1);
  background:none;transition:background .12s,color .12s;}
[data-bd-tab]:hover{color:var(--dsw-alias-label-primary,inherit);}
[data-bd-tab][data-on]{background:var(--dsw-alias-bg-base,#1b1d21);color:var(--dsw-alias-label-primary,inherit);
  box-shadow:0 1px 2px rgba(0,0,0,.12);}

/* 卡片 */
[data-bd-card]{display:flex;flex-direction:column;gap:14px;padding:14px 16px;border-radius:var(--dsw-radius-lg,12px);
  border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.22));
  background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.03));}
[data-bd-cardHd]{display:flex;align-items:center;gap:8px;}
[data-bd-cardHd] h3{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,inherit);}
[data-bd-cardHd] p{margin:0;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary,#9aa0a6);}
/* 卡片里再嵌一块（例如开关打开后才出现的细则）：降一级，别和主卡片抢注意力 */
[data-bd-sub]{display:flex;flex-direction:column;gap:12px;padding:11px 12px;
  border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.07));}

/* 字段栅格：左标签 / 右控件 */
[data-bd-field]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px 16px;}
[data-bd-field][data-wide]{grid-template-columns:1fr;}
[data-bd-field] label{display:flex;flex-direction:column;gap:3px;min-width:0;}
[data-bd-field] label b{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary,inherit);}
[data-bd-field] label i{font-style:normal;font-size:11px;line-height:15px;
  color:var(--dsw-alias-label-tertiary,#9aa0a6);}

/* 控件 */
[data-bd-input]{box-sizing:border-box;width:100%;padding:7px 10px;border-radius:var(--dsw-radius-sm,8px);
  font-family:inherit;font-size:12px;line-height:16px;
  border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.26));
  background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit);}
select[data-bd-input]{cursor:pointer;}
[data-bd-input]:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#3b82f6);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 22%,transparent);}
[data-bd-num]{width:84px;text-align:center;font-variant-numeric:tabular-nums;}

/* 按钮 */
[data-bd-btn]{padding:7px 13px;border-radius:var(--dsw-radius-sm,8px);font:inherit;font-size:12px;
  cursor:pointer;white-space:nowrap;color:var(--dsw-alias-label-primary,inherit);
  border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.28));
  background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.08));transition:background .12s;}
[data-bd-btn]:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.2));}
[data-bd-btn][data-primary]{background:var(--dsw-alias-brand-primary,#3b82f6);border-color:transparent;
  color:var(--dsw-alias-label-primary-foreground,#fff);}
[data-bd-btn][data-primary]:hover{filter:brightness(1.06);}
[data-bd-btn][data-quiet]{background:none;}
[data-bd-btn][disabled]{opacity:.45;cursor:default;}
[data-bd-actions]{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}

/* 开关 */
[data-bd-sw]{flex:none;position:relative;width:40px;height:23px;padding:0;border:0;border-radius:999px;
  cursor:pointer;transition:background .15s;
  background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.4));}
[data-bd-sw][data-on]{background:var(--dsw-alias-brand-primary,#3b82f6);}
[data-bd-sw] i{position:absolute;top:3px;left:3px;display:block;width:17px;height:17px;border-radius:50%;
  background:var(--dsw-alias-switch-thumb,#fff);transition:left .15s;}
[data-bd-sw][data-on] i{left:20px;}
[data-bd-sw][disabled]{opacity:.4;cursor:default;}

/* 分段选择 */
[data-bd-seg]{display:inline-flex;gap:2px;padding:2px;border-radius:8px;
  background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.16));}
[data-bd-seg] button{padding:4px 11px;border:0;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;
  background:none;color:var(--dsw-alias-label-secondary,#c9ccd1);white-space:nowrap;}
[data-bd-seg] button[data-on]{background:var(--dsw-alias-bg-base,#1b1d21);color:var(--dsw-alias-label-primary,inherit);}

/* 提示 / 日志 */
[data-bd-note]{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#9aa0a6);}
[data-bd-msg]{font-size:11.5px;line-height:17px;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);
  word-break:break-word;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.1));
  color:var(--dsw-alias-label-secondary,#c9ccd1);}
[data-bd-msg][data-tone=good]{color:var(--dsw-alias-state-success-primary,#22c55e);}
[data-bd-msg][data-tone=warn]{color:var(--dsw-alias-state-warn-primary,#f59e0b);}
[data-bd-msg][data-tone=bad]{color:var(--dsw-alias-state-error-primary,#ef4444);}
[data-bd-pre]{margin:0;padding:9px 10px;border-radius:var(--dsw-radius-sm,8px);max-height:180px;overflow:auto;
  font-size:11px;line-height:15px;white-space:pre-wrap;word-break:break-word;
  font-family:var(--dsw-font-markdown-code-font-family,ui-monospace,monospace);
  background:var(--dsw-alias-markdown-code-block,rgba(0,0,0,.2));
  color:var(--dsw-alias-label-secondary,#c9ccd1);}
[data-bd-kv]{display:flex;flex-direction:column;gap:4px;font-size:11.5px;line-height:16px;
  color:var(--dsw-alias-label-tertiary,#9aa0a6);word-break:break-all;}
[data-bd-kv] b{font-weight:500;color:var(--dsw-alias-label-secondary,#c9ccd1);}
[data-bd-list]{display:flex;flex-direction:column;gap:6px;}
[data-bd-item]{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--dsw-radius-sm,8px);
  background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.07));font-size:11.5px;}
[data-bd-item] span{color:var(--dsw-alias-label-tertiary,#9aa0a6);}
[data-bd-qr]{display:flex;gap:16px;align-items:flex-start;}
[data-bd-qr] img{width:152px;height:152px;padding:6px;border-radius:10px;background:#fff;}
[data-bd-hr]{height:1px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.2));margin:2px 0;}
`

    // ⚠️ 与 lib/state.mjs 的 WINDOWS 保持一致
    const DEFAULT_WINDOWS = {
      noon: { label: '中午谷时', start: '12:00', end: '14:00' },
      night: { label: '晚间谷时', start: '18:00', end: '09:00' },
    }

    /* ─────────────────────────── 小组件 ─────────────────────────── */

    function Switch({ on, onChange, disabled }) {
      return h('button', {
        'data-bd-sw': '', 'data-on': on ? '' : undefined,
        disabled: Boolean(disabled), title: on ? '已开' : '已关',
        onClick: () => { if (!disabled) onChange(!on) },
      }, h('i'))
    }

    /** 左标签 + 右控件的一行（wide = 控件独占下一行） */
    function Field({ label, note, children, wide }) {
      return h('div', { 'data-bd-field': '', 'data-wide': wide ? '' : undefined },
        h('label', null,
          h('b', null, label),
          note ? h('i', null, note) : null),
        wide ? null : children,
        wide ? h('div', null, children) : null)
    }

    function Card({ title, desc, children }) {
      return h('section', { 'data-bd-card': '' },
        (title || desc)
          ? h('div', { 'data-bd-cardHd': '' },
            title ? h('h3', null, title) : null,
            desc ? h('p', null, desc) : null)
          : null,
        children)
    }

    function Chip({ tone, children }) {
      return h('span', { 'data-bd-chip': '', 'data-tone': tone || undefined }, children)
    }

    /** 二/三选一的分段控件 */
    function Segment({ value, options, onChange }) {
      return h('div', { 'data-bd-seg': '' },
        ...options.map((o) => h('button', {
          key: o.value, type: 'button',
          'data-on': value === o.value ? '' : undefined,
          onClick: () => onChange(o.value),
        }, o.label)))
    }

    function Bar({ value, max }) {
      const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
      return h('div', { 'data-bd-bar': '' }, h('i', { style: { width: pct + '%' } }))
    }

    function useStatus(intervalMs) {
      const [st, setSt] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        const tick = async () => {
          try {
            const d = await jget('/status')
            if (alive && d?.ok) setSt(d)
          } catch { /* 网络抖动就下次再问 */ }
        }
        tick()
        const t = setInterval(tick, intervalMs || 5000)
        return () => { alive = false; clearInterval(t) }
      }, [intervalMs])
      return [st, setSt]
    }

    const TABS = [
      { id: 'overview', label: '概览' },
      { id: 'schedule', label: '定时' },
      { id: 'speak', label: '发言' },
      { id: 'watch', label: '关注' },
      { id: 'model', label: '模型' },
      { id: 'system', label: '环境' },
    ]

    /* ─────────────────────────── 设置页正文 ─────────────────────────── */

    function Panel() {
      const [st, setSt] = useStatus(5000)
      const [tab, setTab] = React.useState('overview')
      const [busy, setBusy] = React.useState('')
      const [msg, setMsg] = React.useState('')
      const [msgTone, setMsgTone] = React.useState('')

      /* ⚠️ 输入框一律绑「本地草稿」：页面每 5 秒轮询 /status，直接绑 cfg 会把正在打的字冲掉 */
      const [kws, setKws] = React.useState(null)
      const [ws, setWs] = React.useState(null)
      const [rl, setRl] = React.useState(null)
      const [perDay, setPerDay] = React.useState(null)
      const [perRound, setPerRound] = React.useState(null)
      const [replyPer, setReplyPer] = React.useState(null)
      const [dmUid, setDmUid] = React.useState(null)
      const [dmMode, setDmMode] = React.useState(null)
      const [mention, setMention] = React.useState(null)
      const [login, setLogin] = React.useState(null)
      const [report, setReport] = React.useState(null)
      const [loginState, setLoginState] = React.useState('')
      const [loginTone, setLoginTone] = React.useState('')
      const [newVer, setNewVer] = React.useState('')

      /* 模型 */
      const [models, setModels] = React.useState(null)
      const [mp, setMp] = React.useState(null)
      const [mn, setMn] = React.useState(null)
      const [me, setMe] = React.useState(null)
      const [bp, setBp] = React.useState(null)

      /* 2.1.0：多人投递 / 特别关注 / 运行方式 */
      const [dmUids, setDmUids] = React.useState(null)
      const [mentionNames, setMentionNames] = React.useState(null)
      const [watchUids, setWatchUids] = React.useState(null)
      const [watchNotify, setWatchNotify] = React.useState(null)
      const [watchEvery, setWatchEvery] = React.useState(null)
      const [watchInfo, setWatchInfo] = React.useState(null)
      const [runMode, setRunMode] = React.useState(null)
      const [sessId, setSessId] = React.useState(null)

      /* 2.3.0：自定义时段 / 真人感 / 交流轮 */
      const [customOn, setCustomOn] = React.useState(null)
      const [customWin, setCustomWin] = React.useState(null)
      const [customRepeat, setCustomRepeat] = React.useState(null)
      const [humanize, setHumanize] = React.useState(null)
      const [voiceStyle, setVoiceStyle] = React.useState(null)
      const [voiceNote, setVoiceNote] = React.useState(null)
      const [converseOn, setConverseOn] = React.useState(null)
      const [converseEvery, setConverseEvery] = React.useState(null)
      const [converseComments, setConverseComments] = React.useState(null)
      const [converseDms, setConverseDms] = React.useState(null)
      const [converseDmUids, setConverseDmUids] = React.useState(null)
      const [converseAnyDm, setConverseAnyDm] = React.useState(null)
      const [converseInfo, setConverseInfo] = React.useState(null)

      /* 2.4.0：@ 单独开关 / 学到的 / 今天发过动态没有 */
      const [learnInfo, setLearnInfo] = React.useState(null)
      const [dynInfo, setDynInfo] = React.useState(null)

      /* 扫码轮询的 timer 必须能停：切走页面后跑到已卸载组件上 setState 会报警告 */
      const loginTimer = React.useRef(null)
      const alive = React.useRef(true)
      React.useEffect(() => () => {
        alive.current = false
        if (loginTimer.current) { clearInterval(loginTimer.current); loginTimer.current = null }
      }, [])

      const cfg = st?.config
      React.useEffect(() => {
        if (!cfg) return
        if (kws === null) setKws((cfg.keywords || []).join('\n'))
        if (ws === null) setWs(cfg.workspace || '')
        if (rl === null) setRl(cfg.reportLevel || 'full')
        if (perDay === null) setPerDay(String(cfg.perDay ?? 5))
        if (perRound === null) setPerRound(String(cfg.commentPerRound ?? 1))
        if (replyPer === null) setReplyPer(String(cfg.replyPerRound ?? 1))
        if (mention === null) setMention(cfg.mentionName || '')
        if (dmUid === null) setDmUid(cfg.dmUid ? String(cfg.dmUid) : '')
        if (dmMode === null) setDmMode(cfg.dmMode || 'off')
        if (mp === null) setMp(cfg.modelProvider || '')
        if (mn === null) setMn(cfg.modelName || '')
        if (me === null) setMe(cfg.modelEffort || '')
        if (bp === null) setBp(cfg.bridgePlugins || '')
        if (dmUids === null) setDmUids(cfg.dmUids || '')
        if (mentionNames === null) setMentionNames(cfg.mentionNames || '')
        if (watchUids === null) setWatchUids(cfg.watchUids || '')
        if (watchNotify === null) setWatchNotify(cfg.watchNotify || 'off')
        if (watchEvery === null) setWatchEvery(String(cfg.watchEveryMin ?? 15))
        if (runMode === null) setRunMode(cfg.runMode || 'in-host')
        if (sessId === null) setSessId(cfg.sessionId || '')
        if (customOn === null) setCustomOn(Boolean(cfg.customWindowsOn))
        if (customWin === null) setCustomWin(cfg.customWindows || '')
        if (customRepeat === null) setCustomRepeat(String(cfg.customRepeatMin ?? 0))
        if (humanize === null) setHumanize(cfg.humanize !== false)
        if (voiceStyle === null) setVoiceStyle(cfg.voiceStyle || 'auto')
        if (voiceNote === null) setVoiceNote(cfg.voiceNote || '')
        if (converseOn === null) setConverseOn(Boolean(cfg.converseOn))
        if (converseEvery === null) setConverseEvery(String(cfg.converseEveryMin ?? 30))
        if (converseComments === null) setConverseComments(String(cfg.converseCommentPerRound ?? 1))
        if (converseDms === null) setConverseDms(String(cfg.converseDmPerRound ?? 1))
        if (converseDmUids === null) setConverseDmUids(cfg.converseDmUids || '')
        if (converseAnyDm === null) setConverseAnyDm(Boolean(cfg.converseAnyDm))
      }, [cfg])

      const loadWatch = React.useCallback(() => {
        jget('/watch').then((r) => setWatchInfo(r || null)).catch(() => {})
      }, [])
      React.useEffect(() => { loadWatch() }, [])

      const loadConverse = React.useCallback(() => {
        jget('/converse').then((r) => setConverseInfo(r || null)).catch(() => {})
      }, [])
      React.useEffect(() => { loadConverse() }, [])

      const loadLearn = React.useCallback(() => {
        jget('/learn').then((r) => setLearnInfo(r || null)).catch(() => {})
      }, [])
      React.useEffect(() => { loadLearn() }, [])

      const loadDynamic = React.useCallback(() => {
        jget('/dynamic').then((r) => setDynInfo(r || null)).catch(() => {})
      }, [])
      React.useEffect(() => { loadDynamic() }, [])

      /* 模型清单只在进页面时拉一次（服务端有 30 秒缓存） */
      React.useEffect(() => {
        let alive2 = true
        jget('/models')
          .then((r) => { if (alive2) setModels(r || { ok: false, providers: [] }) })
          .catch(() => { if (alive2) setModels({ ok: false, providers: [], error: '拉不到模型清单' }) })
        return () => { alive2 = false }
      }, [])

      const win = { ...DEFAULT_WINDOWS, ...(st?.windows || {}) }
      const say = (text, tone) => { setMsg(text || ''); setMsgTone(tone || '') }

      const patch = async (p, what) => {
        setBusy(JSON.stringify(p))
        try {
          const r = await jpost('/config', p)
          if (r?.config) setSt((old) => ({ ...old, config: r.config }))
          if (r?.host && r.host.ok === false) {
            say(`${what || '设置'}：插件这份存了，但没同步进 DSH 设置页（${r.host.error}）；功能照这份走`, 'warn')
          } else say(what ? `${what}：已保存` : '已保存', 'good')
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }

      const onShowReport = async () => {
        if (report !== null) { setReport(null); return }
        setBusy('report')
        try {
          const r = await jget('/report')
          setReport(r && r.exists ? (r.text || '（报告是空的）') : '今天还没有报告 —— 跑一轮之后就有了')
        } catch (e) { setReport('读不到报告：' + String(e?.message ?? e)) } finally { setBusy('') }
      }

      const onVerify = async () => {
        setBusy('verify')
        try {
          const r = await jpost('/verify', {})
          if (!r || !r.ok) { say('复核没跑成：' + ((r && r.error) || '未知原因'), 'warn'); return }
          const n = (r.checked || []).length
          const vis = (r.checked || []).filter((c) => c.visible === true).length
          if (!n) say(r.text || '没有需要复核的记录', 'good')
          else say(`复核完 ${n} 条：公开可见 ${vis} 条，其余没查到（可能还在审核 —— 看不到不等于没发出去）`, vis ? 'good' : 'warn')
          if (r.report) setReport(null)
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      const copyText = async (text) => {
        const v = String(text || '')
        try {
          await navigator.clipboard.writeText(v)
          say('已复制：' + v, 'good')
        } catch {
          say('复制失败 —— 路径是：' + v)
        }
      }

      const onOpenFolder = async (what) => {
        try {
          const r = await jpost('/open', { what })
          if (r && r.ok) say('已请系统打开：' + (r.opened || ''), 'good')
          else say('打不开（' + ((r && r.error) || '未知原因') + '）—— 手动打开这个路径：' + ((r && r.dir) || ''), 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') }
      }

      const onUpgrade = async () => {
        setBusy('upgrade')
        try {
          const r = await jpost('/upgrade', {})
          say(((r && r.hint) || '正在升级') + ' —— 进度写在下面的依赖日志里；完成后重启一次 DSH 才生效', 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      const onCheckUpdate = async () => {
        setBusy('update')
        try {
          const r = await jget('/update')
          if (r && r.ok && r.latest) {
            if (r.hasNew) {
              setNewVer(r.latest)
              say(`有新版本 v${r.latest}（当前 v${r.current}）`, 'warn')
            } else say('已经是最新版 v' + r.current, 'good')
          } else say('查不到最新版（可能网络不通）—— 当前 v' + ((r && r.current) || '?'), 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      const onCheck = async () => {
        setBusy('check')
        say('')
        try {
          const r = await jpost('/check', {})
          if (r && r.ok) say('能用！' + (r.steps || []).join('、'), 'good')
          else say('还不能用：' + (r && r.error ? r.error : '没拿到结果'), 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      const onInstallAsr = async () => {
        setBusy('asr')
        say('')
        try {
          const r = await jpost('/install-asr', {})
          say(r?.started ? '开始装转写依赖 —— 进度显示在下面（要下模型，慢一点正常）' : (r?.hint || '没起来'),
            r?.started ? 'good' : 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      const onInstall = async () => {
        setBusy('install')
        say('')
        try {
          const r = await jpost('/install', {})
          say(r?.hint || '已经在后台开始装了', '')
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }

      const onRun = async () => {
        setBusy('run')
        try {
          const r = await jpost('/run', {})
          say(r?.started ? '已在后台开跑，报告会写进 out/' : '没起来，看 duty.log', r?.started ? 'good' : 'warn')
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }

      /* ⭐ 2.3.0：手动跑一次交流轮 */
      const onConverseRun = async () => {
        setBusy('converse')
        try {
          const r = await jpost('/converse', {})
          say(r?.started ? '交流轮已开跑（回完看 duty.log 那行「交流轮」）' : `没跑：${r?.reason || '未知原因'}`, r?.started ? 'good' : 'warn')
          loadConverse()
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }

      /* ⭐ 2.4.0：立刻发一条动态 / 清空学到的 */
      const onPostDynamic = async () => {
        setBusy('dynamic')
        try {
          const r = await jpost('/dynamic', {})
          say(r?.ok ? `已发：${r.text}` : `没发成：${r?.error || '未知原因'}`, r?.ok ? 'good' : 'warn')
          loadDynamic()
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }
      const onLearnClear = async () => {
        setBusy('learn')
        try {
          await jpost('/learn', { clear: true })
          say('学习笔记已清空', 'good')
          loadLearn()
        } catch (e) { say(String(e?.message ?? e), 'bad') }
        finally { setBusy('') }
      }

      const onLoginStart = async () => {
        setBusy('login')
        setLoginTone('')
        setLoginState('正在出码…')
        try {
          const r = await jpost('/login/start', {})
          if (!r?.ok) { setLoginTone('bad'); setLoginState(r?.error || '出码失败'); return }
          setLogin({ key: r.key, qr: r.qr })
          if (!r.qr) { setLoginTone('bad'); setLoginState('没画出二维码 —— 先点「重装主依赖」（venv 里要有 qrcode）') }
          else setLoginState('用手机 B站 扫这张码')
          if (loginTimer.current) { clearInterval(loginTimer.current); loginTimer.current = null }
          let n = 0
          const stop = () => { clearInterval(timer); if (loginTimer.current === timer) loginTimer.current = null }
          const timer = setInterval(async () => {
            if (!alive.current) { stop(); return }
            n += 1
            try {
              const p = await jpost('/login/poll', { key: r.key })
              if (p?.state === 'ok') {
                stop(); setLogin(null)
                setLoginTone('good'); setLoginState('登录成功')
                setSt((old) => ({ ...old, loggedIn: true }))
              } else if (p?.state === 'scanned') { setLoginTone(''); setLoginState('扫到了，请在手机上确认') }
              else if (p?.state === 'expired') { stop(); setLogin(null); setLoginTone('bad'); setLoginState('二维码过期了，再点一次「扫码登录」') }
              else if (p?.state === 'unknown') {
                stop(); setLogin(null); setLoginTone('bad')
                setLoginState('没登上：' + (p?.message || '响应里没有 SESSDATA —— 再点一次「扫码登录」'))
              } else { setLoginTone(''); setLoginState('等扫码…') }
            } catch { /* 抖动就下次再问 */ }
            if (n > 90) { stop(); setLogin(null); setLoginTone('bad'); setLoginState('超时了，再点一次「扫码登录」') }
          }, 2000)
          loginTimer.current = timer
        } catch (e) { setLoginTone('bad'); setLoginState(String(e?.message ?? e)) }
        finally { setBusy('') }
      }

      const onSaveText = async () => {
        const list = String(kws || '').split('\n').map((s) => s.trim()).filter(Boolean)
        await patch({ keywords: list, workspace: String(ws || '').trim() }, '关键词与工作区')
      }

      const onWatchCheck = async () => {
        setBusy('watch')
        try {
          const r = await jpost('/watch/check', {})
          const n = (r?.newVideos || []).length
          const errs = r?.errors || []
          if (n) say(`查到 ${n} 条新视频，已按设置通知`, 'good')
          else if (r?.ok) say('没有新视频（第一次添加的 UP 只记基线，不补发老视频）', 'good')
          else say('检查没跑成：' + (errs[0] || r?.error || '未知原因'), 'warn')
          if (errs.length) say(`有 ${errs.length} 处出错：${errs.slice(0, 2).join('；')}`, 'warn')
          loadWatch()
        } catch (e) { say(String(e?.message ?? e), 'bad') } finally { setBusy('') }
      }

      if (!cfg) {
        return h('div', { 'data-bd-root': '' }, h('div', { 'data-bd-note': '' }, '读设置中…'))
      }

      const on = (k) => Boolean(cfg[k])
      const picked = Number(st.pickedToday ?? st.ranToday ?? 0)
      const quota = Number(cfg.perDay ?? 0)

      /* 所有设置页共用的提示条（保存反馈 / 操作反馈） */
      const msgBar = msg
        ? h('div', { 'data-bd-msg': '', 'data-tone': msgTone || undefined }, msg)
        : null

      /* ────────────────────────── 概览 ────────────────────────── */
      const paneOverview = () => [
        h('div', { 'data-bd-hero': '', key: 'hero' },
          h('div', { 'data-bd-heroTop': '' },
            h('div', { 'data-bd-big': '' },
              h('b', null, String(picked)),
              h('span', null, `/ ${quota} 条`)),
            h('div', { 'data-bd-chips': '' },
              h(Chip, { tone: st.venvReady ? 'good' : 'warn' }, st.venvReady ? '环境就绪' : (st.installing ? '安装中' : '环境未装')),
              h(Chip, { tone: st.loggedIn ? 'good' : 'bad' }, st.loggedIn ? 'B站已登录' : 'B站未登录'),
              h(Chip, { tone: 'brand' }, String(cfg.runMode || 'in-host') === 'headless' ? '子进程模式' : '宿主内模式'),
              h(Chip, null, 'v' + (st.version || '?')))),
          h(Bar, { value: picked, max: quota }),
          h('div', { 'data-bd-actions': '' },
            h('button', { 'data-bd-btn': '', 'data-primary': '', disabled: busy === 'run', onClick: onRun }, '现在跑一轮'),
            h('button', { 'data-bd-btn': '', 'data-quiet': '', disabled: busy === 'report', onClick: onShowReport },
              report !== null ? '收起报告' : '看今天的报告'),
            st.lastRunAt
              ? h('div', { 'data-bd-note': '' }, `上次：${new Date(st.lastRunAt).toLocaleString('zh-CN')}（${st.lastWhy || '—'}）`)
              : null)),
        report !== null ? h(Card, { key: 'report' }, h('pre', { 'data-bd-pre': '' }, report)) : null,
        (Array.isArray(st.notSynced) && st.notSynced.length)
          ? h('div', { 'data-bd-msg': '', 'data-tone': 'warn', key: 'ns' },
            `有 ${st.notSynced.length} 项没能写进 DSH 原生设置（${st.notSynced.join('、')}）。插件以自己这份为准，功能不受影响。`)
          : null,
      ]

      /* ────────────────────────── 定时 ────────────────────────── */
      const paneSchedule = () => [
        h(Card, { key: 'when', title: '什么时候自己跑', desc: '只在谷时跑：工作日 12:00–14:00 与 18:00 之后；整个周末都算谷时' },
          h(Field, { label: '峰谷时段自动刷', note: '关掉后只能手动跑' },
            h(Switch, { on: on('peakValley'), onChange: (v) => patch({ peakValley: v }, '峰谷自动刷') })),
          on('peakValley') ? h('div', { 'data-bd-sub': '' },
            ...['noon', 'night'].map((k) => h(Field, {
              key: k, label: win[k].label, note: `${win[k].start} – ${win[k].end}`,
            }, h(Switch, { on: on(k), onChange: (v) => patch({ [k]: v }, win[k].label) })))
          ) : null),
        /* ⭐ 2.3.0：自定义时段（峰谷之外的日程） */
        h(Card, { key: 'custom', title: '自定义定时时段', desc: '除了峰谷，另开几段时间自动跑 —— 峰谷是省钱窗口，这里是日程表' },
          h(Field, { label: '启用自定义时段' },
            h(Switch, { on: Boolean(customOn), onChange: (v) => { setCustomOn(v); patch({ customWindowsOn: v }, '自定义时段') } })),
          (customOn) ? h('div', { 'data-bd-sub': '' },
            h(Field, { label: '时间段', note: '每行一段，格式 HH:MM-HH:MM；一天最多 8 段', wide: true },
              h('textarea', {
                'data-bd-input': '', rows: 3, value: customWin ?? '',
                placeholder: '例如：\n09:30-11:00\n15:00-17:30\n21:00-23:30',
                onChange: (e) => setCustomWin(e.target.value),
                onBlur: () => { const v = String(customWin || '').trim(); setCustomWin(v); patch({ customWindows: v }, '自定义时段') },
              })),
            h(Field, { label: '隔多久可以再来一轮', note: '0 = 这段时间一天只跑一轮；>0 = 每 N 分钟一次（受每天总量限制）' },
              h('input', {
                'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 0, max: 720,
                value: customRepeat ?? '',
                onChange: (e) => setCustomRepeat(e.target.value),
                onBlur: () => {
                  const n = Math.max(0, Math.min(Number(customRepeat) || 0, 720))
                  setCustomRepeat(String(n)); patch({ customRepeatMin: n }, '自定义时段间隔')
                },
              })),
            (Array.isArray(st.customWindows) && st.customWindows.length)
              ? h('div', { 'data-bd-note': '' }, '已识别：' + st.customWindows.map((w) => `${w.start}–${w.end}${w.inWindow ? '（现在就在里面）' : ''}`).join('、'))
              : h('div', { 'data-bd-note': '' }, '还没识别出时间段 —— 检查一下格式对不对')) : null),

        h(Card, { key: 'quota', title: '一轮挑几条' },          h(Field, { label: '每天最多挑几条', note: '填 0 = 不自动刷（仍可手动跑）' },
            h('input', {
              'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 0, max: 50,
              value: perDay ?? '',
              onChange: (e) => setPerDay(e.target.value),
              onBlur: () => {
                const n = Math.max(0, Math.min(Number(perDay) || 0, 50))
                setPerDay(String(n)); patch({ perDay: n }, '每天挑几条')
              },
            }))),
        h(Card, { key: 'mode', title: '怎么跑这一轮' },
          h(Field, { label: '运行方式' },
            h(Segment, {
              value: runMode ?? 'in-host',
              options: [
                { value: 'in-host', label: '宿主内' },
                { value: 'headless', label: '子进程' },
              ],
              onChange: (v) => { setRunMode(v); patch({ runMode: v }, '运行方式') },
            })),
          h('div', { 'data-bd-note': '' },
            (runMode ?? 'in-host') === 'headless'
              ? '子进程方式每次都是另一条会话；打开「上下文洞察」时，洞察面板会把正在跑的那条当冷会话回写投影 ⇒ 这一轮会被判中断、报错退出。'
              : '宿主内方式用同一条固定会话跑，会话对宿主是活的 ⇒ 打开「上下文洞察」不会打断它。推荐。'),
          h(Field, { label: '固定会话 id', note: '留空 = 自动生成一条并记住' },
            h('input', {
              'data-bd-input': '', value: sessId ?? '', placeholder: '留空最省事',
              onChange: (e) => setSessId(e.target.value),
              onBlur: () => { const v = String(sessId || '').trim(); setSessId(v); patch({ sessionId: v }, '固定会话') },
            })),
          h('div', { 'data-bd-note': '' },
            `当前会话：${st.dutySessionId || '（还没定）'} · 权限档位 workspace-write · 审批一律拒绝（无人值守）`)),
      ]

      /* ────────────────────────── 发言 ────────────────────────── */
      const paneSpeak = () => [
        h(Card, { key: 'comment', title: '自动评论', desc: '在挑中的视频下面留一条评论，并 @ 你填的人' },
          h(Field, { label: '自动评论并 @', note: '默认关' },
            h(Switch, { on: on('autoComment'), onChange: (v) => patch({ autoComment: v }, '自动评论') })),
          on('autoComment') ? h('div', { 'data-bd-sub': '' },
            h(Field, { label: '每轮最多发几条', note: '0 = 每条挑中的都评论（不设上限）' },
              h('input', {
                'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 0, max: 20,
                value: perRound ?? '',
                onChange: (e) => setPerRound(e.target.value),
                onBlur: () => {
                  const n = Math.max(0, Math.min(Number(perRound) || 0, 20))
                  setPerRound(String(n)); patch({ commentPerRound: n }, '每轮几条评论')
                },
              })),
            h(Field, { label: '评论里 @ 人', note: '和「评论」分开：关着就只发正文，不 @ 任何人' },
              h(Switch, { on: on('mentionOn'), onChange: (v) => patch({ mentionOn: v }, '@ 开关') })),
            on('mentionOn') ? h(Field, { label: '要 @ 谁', note: '可多人，逗号分隔', wide: true },
              h('input', {
                'data-bd-input': '', value: mentionNames ?? '',
                placeholder: '例如：小明, 小红（B站 昵称）',
                onChange: (e) => setMentionNames(e.target.value),
                onBlur: () => {
                  const v = String(mentionNames || '').trim()
                  const first = v.split(/[,，;；\s]+/).map((s) => s.trim()).filter(Boolean)[0] || ''
                  setMentionNames(v); setMention(first)
                  patch({ mentionNames: v, mentionName: first }, '要 @ 谁')
                },
              })) : null,
            on('mentionOn') && !String(mentionNames || '').trim()
              ? h('div', { 'data-bd-note': '' }, '这轮会想 @ 但名单还空着 —— 不会 @ 任何人（也不会自己编昵称）')
              : null) : null),
        /* ⭐ 2.4.0：每天发一条动态 */
        h(Card, { key: 'dynamic', title: '每天发一条动态', desc: '把今天刷到了什么、说了什么，用第一人称发一条 B站 动态（一天只发一条）' },
          h(Field, { label: '开启', note: '默认关；刷完那一轮末尾自己发' },
            h(Switch, { on: on('dailyPostOn'), onChange: (v) => patch({ dailyPostOn: v }, '每天发动态') })),
          on('dailyPostOn') ? h('div', { 'data-bd-sub': '' },
            h('div', { 'data-bd-actions': '' },
              h('button', { 'data-bd-btn': '', disabled: busy === 'dynamic' || Boolean(dynInfo?.postedToday), onClick: onPostDynamic },
                dynInfo?.postedToday ? '今天已发过' : '现在发一条'),
              h('button', { 'data-bd-btn': '', 'data-quiet': '', onClick: () => loadDynamic() }, '刷新')),
            h('div', { 'data-bd-note': '' },
              dynInfo?.postedToday
                ? `今天 ${dynInfo.postedDay} 已发过${dynInfo.postedAt ? `（${new Date(dynInfo.postedAt).toLocaleString('zh-CN')}）` : ''}`
                : '还没发。手点「现在发一条」= 用今天的报告拼一句人话，不花模型。')) : null),
        /* ⭐ 2.4.0：从对话里学 */
        h(Card, { key: 'learn', title: '从对话里学', desc: '聊出来的事（对方怎么称呼你、不爱听什么）会记下来，带进之后每一轮的说话规矩' },
          h(Field, { label: '开启', note: '默认开；交流轮里学，最多记 20 条' },
            h(Switch, { on: on('learnOn'), onChange: (v) => patch({ learnOn: v }, '从对话里学') })),
          on('learnOn') ? h('div', { 'data-bd-sub': '' },
            (learnInfo?.lessons || []).length
              ? h('div', { 'data-bd-list': '' },
                ...(learnInfo.lessons).slice(-8).reverse().map((l, i) => h('div', { key: 'l' + i, 'data-bd-item': '' },
                  h('b', null, l.note), h('span', null, l.src || ''))))
              : h('div', { 'data-bd-note': '' }, '还没学到什么 —— 交流轮聊几轮就有了'),
            h('div', { 'data-bd-actions': '' },
              h('button', { 'data-bd-btn': '', disabled: busy === 'learn' || !(learnInfo?.lessons || []).length, onClick: onLearnClear }, '清空'),
              h('button', { 'data-bd-btn': '', 'data-quiet': '', onClick: () => loadLearn() }, '刷新'))) : null),
        h(Card, { key: 'dm', title: '投递方式' },
          h(Field, { label: '评论 还是 私信' },
            h(Segment, {
              value: dmMode ?? 'off',
              options: [
                { value: 'off', label: '只评论' },
                { value: 'only', label: '只私信' },
                { value: 'both', label: '两者都要' },
              ],
              onChange: (v) => { setDmMode(v); patch({ dmMode: v }, '投递方式') },
            })),
          (dmMode && dmMode !== 'off') ? h(Field, { label: '私信发给谁', note: 'B站 UID，可多个，最多 20 个', wide: true },
            h('input', {
              'data-bd-input': '', value: dmUids ?? '',
              placeholder: '例如：1039568856, 3706946666367574',
              onChange: (e) => setDmUids(e.target.value),
              onBlur: () => {
                const v = String(dmUids || '').trim()
                const nums = v.split(/[,，;；\s]+/).map((s) => Number(s)).filter((n) => Number.isFinite(n) && n > 0)
                setDmUids(v); setDmUid(nums[0] ? String(nums[0]) : '')
                patch({ dmUids: v, dmUid: nums[0] || 0 }, '私信收件人')
              },
            })) : null,
          (dmMode && dmMode !== 'off')
            ? h('div', { 'data-bd-note': '' }, '每个收件人各发一条（不是一轮只发一条）。建议先互关 —— B站 对陌生人私信会限流。')
            : null),
        h(Card, { key: 'reply', title: '回复评论' },
          h(Field, { label: '回复楼中楼', note: '只回直接回复在你那条评论下面的人' },
            h(Switch, { on: on('replyToComments'), onChange: (v) => patch({ replyToComments: v }, '回复评论') })),
          on('replyToComments') ? h(Field, { label: '每轮最多回几条' },
            h('input', {
              'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 1, max: 10,
              value: replyPer ?? '',
              onChange: (e) => setReplyPer(e.target.value),
              onBlur: () => {
                const n = Math.max(1, Math.min(Number(replyPer) || 1, 10))
                setReplyPer(String(n)); patch({ replyPerRound: n }, '每轮几条回复')
              },
            })) : null),
        /* ⭐ 2.3.0：像真人一样说话 */
        h(Card, { key: 'voice', title: '像真人一样说话', desc: '把发言压短、去掉客套和模板腔 —— 短、具体、一次只说一件事' },
          h(Field, { label: '真人感', note: '默认开；关掉就回到"150 字内、可以分点"的写法' },
            h(Switch, { on: humanize !== false, onChange: (v) => { setHumanize(v); patch({ humanize: v }, '真人感') } })),
          (humanize !== false) ? h('div', { 'data-bd-sub': '' },
            h(Field, { label: '语气' },
              h(Segment, {
                value: voiceStyle ?? 'auto',
                options: [
                  { value: 'auto', label: '每轮换' },
                  { value: 'casual', label: '松弛' },
                  { value: 'witty', label: '机灵' },
                  { value: 'warm', label: '温和' },
                  { value: 'blunt', label: '直给' },
                ],
                onChange: (v) => { setVoiceStyle(v); patch({ voiceStyle: v }, '语气') },
              })),
            h(Field, { label: '额外要求', note: '写进每一轮的说话规矩里，可留空', wide: true },
              h('input', {
                'data-bd-input': '', value: voiceNote ?? '',
                placeholder: '例如：别用网络烂梗、别提自己是 AI',
                onChange: (e) => setVoiceNote(e.target.value),
                onBlur: () => { const v = String(voiceNote || '').trim(); setVoiceNote(v); patch({ voiceNote: v }, '说话要求') },
              })),
            h('div', { 'data-bd-note': '' }, `这一轮口吻：${(st.voice && st.voice.name) || '（自动）'}`)) : null),

        /* ⭐ 2.3.0：交流轮（评论楼中楼 + 私信往来） */
        h(Card, { key: 'converse', title: '交流轮（回评论 / 回私信）', desc: '单独一轮：看看谁回复了你、谁发了私信，按上下文回一句 —— 不刷视频、不写日报' },
          h(Field, { label: '开启交流轮', note: '默认关；和值班轮互不占用' },
            h(Switch, { on: Boolean(converseOn), onChange: (v) => { setConverseOn(v); patch({ converseOn: v }, '交流轮') } })),
          (converseOn) ? h('div', { 'data-bd-sub': '' },
            h(Field, { label: '多久看一次', note: '分钟；默认 30' },
              h('input', {
                'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 5, max: 1440,
                value: converseEvery ?? '',
                onChange: (e) => setConverseEvery(e.target.value),
                onBlur: () => {
                  const n = Math.max(5, Math.min(Number(converseEvery) || 30, 1440))
                  setConverseEvery(String(n)); patch({ converseEveryMin: n }, '交流轮间隔')
                },
              })),
            h(Field, { label: '每轮回几条评论', note: '0 = 不回评论' },
              h('input', {
                'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 0, max: 10,
                value: converseComments ?? '',
                onChange: (e) => setConverseComments(e.target.value),
                onBlur: () => {
                  const n = Math.max(0, Math.min(Number(converseComments) || 0, 10))
                  setConverseComments(String(n)); patch({ converseCommentPerRound: n }, '每轮回几条评论')
                },
              })),
            h(Field, { label: '每轮回几个人私信', note: '0 = 不回私信' },
              h('input', {
                'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 0, max: 10,
                value: converseDms ?? '',
                onChange: (e) => setConverseDms(e.target.value),
                onBlur: () => {
                  const n = Math.max(0, Math.min(Number(converseDms) || 0, 10))
                  setConverseDms(String(n)); patch({ converseDmPerRound: n }, '每轮回几个人私信')
                },
              })),
            h(Field, { label: '只回这些人的私信', note: 'B站 UID，逗号分隔；留空 = 谁都不回（除非允许陌生人）', wide: true },
              h('input', {
                'data-bd-input': '', value: converseDmUids ?? '',
                placeholder: '例如：1039568856',
                onChange: (e) => setConverseDmUids(e.target.value),
                onBlur: () => { const v = String(converseDmUids || '').trim(); setConverseDmUids(v); patch({ converseDmUids: v }, '私信名单') },
              })),
            h(Field, { label: '也回陌生人', note: '关着更安全：只回名单里的人' },
              h(Switch, { on: Boolean(converseAnyDm), onChange: (v) => { setConverseAnyDm(v); patch({ converseAnyDm: v }, '回陌生人') } })),
            h('div', { 'data-bd-actions': '' },
              h('button', { 'data-bd-btn': '', 'data-primary': '', disabled: busy === 'converse', onClick: onConverseRun }, '现在看一次'),
              h('button', { 'data-bd-btn': '', 'data-quiet': '', onClick: () => loadConverse() }, '刷新排队')),
            converseInfo
              ? h('div', { 'data-bd-note': '' },
                `${converseInfo.busy ? '正在回…' : '空闲'} · 已回过 ${converseInfo.repliedCount || 0} 条评论 / ${converseInfo.answeredCount || 0} 人私信`
                + (converseInfo.lastAt ? ` · 上次 ${new Date(converseInfo.lastAt).toLocaleString('zh-CN')}` : ''))
              : null) : null),

        h(Card, { key: 'asr', title: '本地转写', desc: '没字幕的视频在本机转写一遍（不花 API 钱）' },
          h(Field, { label: '转写没字幕的视频', note: '默认关' },
            h(Switch, { on: on('transcribe'), onChange: (v) => patch({ transcribe: v }, '本地转写') })),
          on('transcribe') ? h('div', { 'data-bd-sub': '' },
            h('div', { 'data-bd-actions': '' },
              h('button', { 'data-bd-btn': '', disabled: busy === 'asr', onClick: onInstallAsr },
                st.asrReady ? '重装转写依赖' : '装转写依赖'),
              h('div', { 'data-bd-note': '' },
                !st.asrReady ? '还没装：现在开着也没用，没字幕的视频会被跳过'
                  : (st.asrModelReady ? '环境和模型都好了' : '环境好了；模型会在第一次转写时自动下载'))),
            st.asrTail ? h('pre', { 'data-bd-pre': '' }, st.asrTail) : null) : null),
      ]

      /* ────────────────────────── 关注 ────────────────────────── */
      const paneWatch = () => [
        h(Card, { key: 'watch', title: '特别关注的 UP 主', desc: '他们一发新视频就通知你，不用等下一轮刷' },
          h(Field, { label: 'UP 主 UID', note: '可多个，逗号分隔，最多 50 个；留空 = 不盯人', wide: true },
            h('input', {
              'data-bd-input': '', value: watchUids ?? '',
              placeholder: '例如：123456, 987654（UP 主空间地址 /space.bilibili.com/<UID>）',
              onChange: (e) => setWatchUids(e.target.value),
              onBlur: () => { const v = String(watchUids || '').trim(); setWatchUids(v); patch({ watchUids: v }, '特别关注') },
            })),
          h(Field, { label: '有新视频怎么通知' },
            h(Segment, {
              value: watchNotify ?? 'off',
              options: [
                { value: 'off', label: '不通知' },
                { value: 'dm', label: '私信' },
                { value: 'comment', label: '评论 @' },
                { value: 'both', label: '都要' },
              ],
              onChange: (v) => { setWatchNotify(v); patch({ watchNotify: v }, '新视频通知') },
            })),
          h(Field, { label: '多久查一次', note: '分钟，1–1440' },
            h('input', {
              'data-bd-input': '', 'data-bd-num': '', type: 'number', min: 1, max: 1440,
              value: watchEvery ?? '',
              onChange: (e) => setWatchEvery(e.target.value),
              onBlur: () => {
                const n = Math.max(1, Math.min(Number(watchEvery) || 15, 1440))
                setWatchEvery(String(n)); patch({ watchEveryMin: n }, '检查间隔')
              },
            })),
          h('div', { 'data-bd-actions': '' },
            h('button', {
              'data-bd-btn': '', disabled: busy === 'watch' || !String(watchUids || '').trim(),
              onClick: onWatchCheck,
            }, '立刻检查一遍'),
            h('div', { 'data-bd-note': '' },
              watchInfo?.lastCheckAt
                ? `上次检查：${new Date(watchInfo.lastCheckAt).toLocaleString('zh-CN')}`
                : '还没查过')),
          (watchInfo?.ups || []).length
            ? h('div', { 'data-bd-list': '' },
              ...(watchInfo.ups || []).map((u) => h('div', { 'data-bd-item': '', key: String(u.uid) },
                h('b', { style: { fontWeight: 500 } }, u.name || '（名字待补）'),
                h('span', null, 'UID ' + u.uid),
                u.last ? h('span', { style: { marginLeft: 'auto' } }, new Date(u.last * 1000).toLocaleDateString('zh-CN')) : null)))
            : null,
          h('div', { 'data-bd-note': '' }, '第一次添加某个 UP 只记基线、不补发老视频；之后只对真正更新的那几条发通知（每个 UP 一次最多 3 条）。')),
        h(Card, { key: 'what', title: '关注什么', desc: '它按这些关键词在 B站 找值得看的' },
          h(Field, { label: '关键词', note: '一行一个；留空用内置那几组', wide: true },
            h('textarea', {
              'data-bd-input': '', rows: 5, placeholder: '一行一个关键词',
              value: kws ?? '', onChange: (e) => setKws(e.target.value),
            })),
          h(Field, { label: '工作区', note: '填你平时用的工作区路径，它按那里的 AGENTS.md 认设定', wide: true },
            h('input', {
              'data-bd-input': '', value: ws ?? '',
              placeholder: '留空 = 不读人设，按中性说话',
              onChange: (e) => setWs(e.target.value),
            })),
          h(Field, { label: '日报写多细' },
            h('select', {
              'data-bd-input': '', value: rl ?? 'full',
              onChange: (e) => { setRl(e.target.value); patch({ reportLevel: e.target.value }, '日报形态') },
            },
              h('option', { value: 'full' }, '完整'),
              h('option', { value: 'brief' }, '精简'),
              h('option', { value: 'off' }, '不写日报'))),
          h('div', { 'data-bd-actions': '' },
            h('button', { 'data-bd-btn': '', 'data-primary': '', disabled: Boolean(busy), onClick: onSaveText }, '保存关键词与工作区'))),
      ]

      /* ────────────────────────── 模型 ────────────────────────── */
      const paneModel = () => {
        const provs = models?.providers || []
        const cur = provs.find((p) => p.id === (mp || ''))
        const list = cur?.models || []
        return [
          h(Card, { key: 'pick', title: '用哪个模型干活', desc: '宿主内跑的时候按这里指定的来；留空 = 跟 DSH 当前的默认模型' },
            h(Field, { label: 'provider',
              note: (models && models.ok) ? `${provs.length} 个可用` : (models?.error || '拉不到清单') },
              (models && models.ok && provs.length)
                ? h('select', {
                  'data-bd-input': '', value: mp ?? '',
                  onChange: (e) => {
                    const v = e.target.value
                    setMp(v); setMn('')
                    patch({ modelProvider: v, modelName: '' }, '模型 provider')
                  },
                },
                  h('option', { value: '' }, '不指定（用默认）'),
                  ...provs.map((p) => h('option', { key: p.id, value: p.id },
                    `${p.name}${(p.models || []).length ? ` · ${p.models.length}` : ' · 无模型'}`)))
                : h('input', {
                  'data-bd-input': '', value: mp ?? '',
                  placeholder: '手填 provider id，例如 deepseek-account',
                  onChange: (e) => setMp(e.target.value),
                  onBlur: () => { const v = String(mp || '').trim(); setMp(v); patch({ modelProvider: v }, '模型 provider') },
                })),
            cur
              ? h(Field, { label: 'model', note: list.length ? `${list.length} 个` : '这家这会儿没列出模型' },
                list.length
                  ? h('select', {
                    'data-bd-input': '', value: mn ?? '',
                    onChange: (e) => { const v = e.target.value; setMn(v); patch({ modelName: v }, '模型') },
                  },
                    h('option', { value: '' }, '不指定'),
                    ...list.map((m) => h('option', { key: m.id, value: m.id }, m.name)))
                  : h('div', { 'data-bd-note': '' }, cur.error || '换个 provider 试试'))
              : null,
            h(Field, { label: '推理强度', note: '留空 = 模型默认；填错会让那一轮直接报错' },
              h('input', {
                'data-bd-input': '', value: me ?? '', placeholder: '如 high',
                onChange: (e) => setMe(e.target.value),
                onBlur: () => { const v = String(me || '').trim(); setMe(v); patch({ modelEffort: v }, '推理强度') },
              })),
            mp && mn ? h('div', { 'data-bd-msg': '', 'data-tone': 'good' }, `这一轮会用：${mp} / ${mn}${me ? ` · ${me}` : ''}`) : null),
          h(Card, { key: 'bridge', title: '提供方插件', desc: '子进程方式下那一轮是另一棵 node_modules，得把这些插件挂进去才看得见' },
            h(Field, { label: '包名', note: '逗号分隔；没装的会自动跳过', wide: true },
              h('input', {
                'data-bd-input': '', value: bp ?? '', placeholder: 'dsh-our-free-model',
                onChange: (e) => setBp(e.target.value),
                onBlur: () => { const v = String(bp || '').trim(); setBp(v); patch({ bridgePlugins: v }, '提供方插件') },
              })),
            h('div', { 'data-bd-note': '' }, '用到 Our Free Model 里的模型（our-free-model / lobsterai / qodercn / cline / raccoon）时，这里要能解析到它。')),
        ]
      }

      /* ────────────────────────── 环境 ────────────────────────── */
      const paneSystem = () => [
        h(Card, { key: 'env', title: '环境与账号' },
          h('div', { 'data-bd-actions': '' },
            h('button', { 'data-bd-btn': '', disabled: busy === 'install', onClick: onInstall },
              st.venvReady ? '重装主依赖' : '装主依赖'),
            h('button', { 'data-bd-btn': '', disabled: busy === 'check', onClick: onCheck }, '测一下'),
            h('button', { 'data-bd-btn': '', disabled: busy === 'login', onClick: onLoginStart }, '扫码登录')),
          h('div', { 'data-bd-note': '' },
            !st.venvReady ? (st.installFailed ? '上次没装成 —— 看下面的日志' : '还没装 —— 先点「装主依赖」')
              : (st.loggedIn ? '环境就绪，也已登录' : '环境好了 —— 点「扫码登录」')),
          loginState ? h('div', { 'data-bd-msg': '', 'data-tone': loginTone || undefined }, loginState) : null,
          login?.qr ? h('div', { 'data-bd-qr': '' },
            h('img', { src: login.qr, alt: 'B站登录二维码' }),
            h('div', { 'data-bd-note': '' }, '手机 B站 → 我的 → 扫一扫。确认时选「记住我 / 长期」那张。')) : null,
          st.installTail ? h('div', null,
            h('div', { 'data-bd-note': '', style: { marginBottom: '6px' } },
              st.installing ? '正在装主依赖：' : '主依赖日志（末尾）：'),
            h('pre', { 'data-bd-pre': '' }, st.installTail)) : null),
        h(Card, { key: 'ver', title: '版本' },
          h('div', { 'data-bd-actions': '' },
            h('button', { 'data-bd-btn': '', disabled: busy === 'update', onClick: onCheckUpdate }, '检查更新'),
            newVer ? h('button', { 'data-bd-btn': '', 'data-primary': '', disabled: busy === 'upgrade', onClick: onUpgrade }, '升级到 v' + newVer) : null,
            h(Chip, null, 'v' + (st.version || '?')))),
        h(Card, { key: 'path', title: '它的地盘' },
          h('div', { 'data-bd-kv': '' },
            h('div', null, h('b', null, '家目录 '), st.home),
            h('div', null, h('b', null, '今天的报告 '), st.report)),
          h('div', { 'data-bd-actions': '' },
            h('button', { 'data-bd-btn': '', onClick: () => onOpenFolder('out') }, '打开报告文件夹'),
            h('button', { 'data-bd-btn': '', onClick: () => onOpenFolder('home') }, '打开家目录'),
            h('button', { 'data-bd-btn': '', disabled: busy === 'verify', onClick: onVerify }, '复核评论'),
            h('button', { 'data-bd-btn': '', 'data-quiet': '', onClick: () => copyText(st.report) }, '复制报告路径')),
          h('div', { 'data-bd-hr': '' }),
          h(Field, { label: '权限档位', note: '宿主内那一轮用的档位；审批一律拒绝' },
            h('select', {
              'data-bd-input': '', value: cfg.permissionPreset || 'workspace-write',
              onChange: (e) => patch({ permissionPreset: e.target.value }, '权限档位'),
            },
              h('option', { value: 'read-only' }, 'read-only'),
              h('option', { value: 'workspace-write' }, 'workspace-write'),
              h('option', { value: 'danger-full-access' }, 'danger-full-access')))),
      ]

      const PANES = {
        overview: paneOverview,
        schedule: paneSchedule,
        speak: paneSpeak,
        watch: paneWatch,
        model: paneModel,
        system: paneSystem,
      }
      const body = (PANES[tab] || paneOverview)()

      return h('div', { 'data-bd-root': '' },
        h('div', { 'data-bd-tabs': '' },
          ...TABS.map((t) => h('button', {
            key: t.id, type: 'button', 'data-bd-tab': '',
            'data-on': tab === t.id ? '' : undefined,
            onClick: () => setTab(t.id),
          }, t.label))),
        msgBar,
        ...body)
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const style = document.createElement('style')
        style.setAttribute('data-plugin-css', 'dsh-bili-models')
        style.textContent = CSS
        document.head.appendChild(style)
        ctx.effect(() => () => style.remove(), 'dsh-bili-models: 设置页样式')

        const slots = (typeof ctx.get === 'function' ? ctx.get('slots') : undefined) || ctx.slots
        if (!slots) return
        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'bili-scroll', order: 30, label: '刷B站' },
          () => h(Panel),
        ))
      },
    }
  },
})
