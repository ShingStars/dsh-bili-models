// 一次性手术脚本：把 models/client.js 里不该随仓库走的自宣/公告/网关/九渠道 UI 摘掉。
// 不是构建步骤（构建是 merge-client.mjs）；改完 models/client.js 应保持可运行，再跑一遍确认。
import fs from 'node:fs'

const file = process.argv[2]
if (!file) throw new Error('usage: node trim-client.mjs <client.js>')

let s = fs.readFileSync(file, 'utf8')
const before = s.length
const cut = []
function between(startMark, endMark, label) {
  const a = s.indexOf(startMark)
  if (a < 0) throw new Error('找不到起点: ' + label)
  const b = s.indexOf(endMark, a)
  if (b < 0) throw new Error('找不到终点: ' + label)
  cut.push(`${label} ${s.slice(a, b).length}B`)
  s = s.slice(0, a) + s.slice(b)
}
function replaceOnce(from, to, label) {
  const a = s.indexOf(from)
  if (a < 0) throw new Error('找不到片段: ' + label)
  if (s.indexOf(from, a + 1) >= 0) throw new Error('片段不唯一: ' + label)
  s = s.slice(0, a) + to + s.slice(a + from.length)
}
function replaceBlock(startMark, endMark, block, label) {
  const a = s.indexOf(startMark)
  if (a < 0) throw new Error('找不到起点: ' + label)
  const b = s.indexOf(endMark, a + startMark.length)
  if (b < 0) throw new Error('找不到终点: ' + label)
  cut.push(`${label} ${b + endMark.length - a}B`)
  s = s.slice(0, a) + block + s.slice(b + endMark.length)
}

// 1) 赞助广告整块（生成块）
between('// BEGIN GENERATED SPONSOR', '// END GENERATED SPONSOR\n', 'sponsor module')
// 2) 推荐项目页（PicksPage / RecoCard）
between('    // ── 推荐项目页 ─', '    // ── 白嫖模型接入页 ─', 'picks page')
// 3) 公告中心（Announcement center 面板）
between('    // ── announcement center ─', '    // ── in-app upgrade ─', 'announcement center')
// 4) 公告渲染组件
between('    // ── announcement ─', '    // ── registration ─', 'announcement component')
// 5) StarButton（OFM 仓库拉星）
between('    function StarButton(props) {', '    // ── EAC 渠道授权', 'StarButton')
// 6) 网关设置页
between('    function GatewayPage(props) {', '    // ── ', 'GatewayPage')

// 7) 首屏公告注册 + Gate
replaceOnce(`      ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
        name: 'settings.onboarding',
        id: 'our-free-model-announcement',
        order: -50,
        locale: NS,
      }, props => h(AnnouncementGate, { ...props, t: Object.assign(x => t(x), { locale: localeTag(ctx) }) })))
`, '', 'onboarding registration')
between('    /**\n     * Owns the announcement\'s readiness.', '    exports.apply = apply', 'AnnouncementGate')

// 8) 标签页清单 / 渲染分支
replaceOnce("const TABS = ['free', 'eac', 'channels', 'aggregate', 'saver', 'routing', 'ledger', 'logs', 'gateway', 'upgrade', 'picks', 'sponsor']",
  "const TABS = ['free', 'eac', 'channels', 'aggregate', 'saver', 'routing', 'ledger', 'logs', 'upgrade']", 'TABS')
replaceOnce(`        ['gateway', t('nav.tab.gateway'), null],
        ['upgrade', t('nav.tab.upgrade'), null],
        ['picks', t('nav.tab.picks'), null],
        ['sponsor', SPONSOR.title, null],
`, `        ['upgrade', t('nav.tab.upgrade'), null],
`, 'tabs array')
replaceOnce(`      const page = tab === 'sponsor'
        ? h(SponsorPage)
        : tab === 'channels'`, `      const page = tab === 'channels'`, 'render head')
replaceOnce(`                  : tab === 'gateway'
                    ? h(GatewayPage, { t, ctx })
                    : tab === 'upgrade'`, `                  : tab === 'upgrade'`, 'render gateway')
replaceOnce(`                    : tab === 'picks'
                      ? h(PicksPage, { t })
                    : tab === 'eac'`, `                    : tab === 'eac'`, 'render picks')
replaceOnce(`        h('span', { className: 'ofm_navspacer' }),
        h(StarButton, { t }))`, `        h('span', { className: 'ofm_navspacer' }))`, 'nav StarButton')

// 9) 十三渠道 → 四渠道
replaceBlock('    const CHANNEL_PROVIDERS = [', '    ]\n', `    const CHANNEL_PROVIDERS = [
      { id: 'lobsterai', name: 'LobsterAI', org: '有道', accent: '#FF6A00', note: '龙虾 · 每日签到积分', login: 'browser' },
      { id: 'qodercn', name: 'Qoder 中国版', org: '阿里系', accent: '#7A6CF0', note: '中国版端点与模型池 · 每日签到', login: 'browser' },
      { id: 'cline', name: 'Cline', org: 'Cline', accent: '#5B5BD6', note: 'Cline 账号免费额度', login: 'browser' },
      { id: 'raccoon', name: 'Raccoon', org: '商汤', accent: '#00A6A6', note: '手机号登录', login: 'browser' },
    ]
`, 'channel providers')
replaceBlock('    const CHANNEL_CREDITS = {', '    }\n', `    const CHANNEL_CREDITS = {
      lobsterai: { claim: true },
      qodercn: { claim: true },
      cline: { unit: 'dollars' },
      raccoon: {},
    }
`, 'channel credits')

// 10) 测试导出面
replaceOnce(", PicksPage, RecoCard, DICT, useChannelRpc, SponsorPage, SponsorNotice, Shell, CSS }", ", DICT, useChannelRpc, Shell, CSS }", 'exports.__test')

fs.writeFileSync(file, s)
console.log(`trimmed ${before} -> ${s.length} bytes (-${before - s.length})`)
for (const c of cut) console.log('  cut', c)
