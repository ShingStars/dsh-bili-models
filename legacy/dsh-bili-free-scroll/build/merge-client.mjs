/**
 * 一次性构建脚本：把两个插件的浏览器半身拆成「薄壳 + 两个按需 chunk」。
 * 跑法：node build/merge-client.mjs
 *
 * 为什么不是单个大 bundle：
 *   插件的 client 条目会跟着 DSH 前端启动一起被创建、并被启动自检审计
 *   （非 active 就抛 `web boot: 1 entry did not activate`）。500KB 的 bundle
 *   在慢盘机器上会让这个条目在审计时刻还停在 loading。薄壳只有几 KB，
 *   两页真正的界面改由 `require.async('./client.<half>.js')` 在打开设置页时才取。
 *
 * 产物：
 *   client.js          薄壳（注册两个 settings.section，组件是懒加载包装）
 *   client.bili.js     刷B站 的设置页
 *   client.models.js   免费模型 的设置页
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')

const bili = read('bili/client.js')
const ofm = read('models/client.js')

// ---- bili 半身：从 const h = ... 到 factory 结尾之前（含它自己的 return {...}）----
const bStart = bili.indexOf('    const h = React.createElement\n')
if (bStart < 0) throw new Error('bili: 找不到 const h 标记')
const bEnd = bili.lastIndexOf('\n  },\n})')
if (bEnd < 0) throw new Error('bili: 找不到 factory 结尾标记')
const biliBody = bili.slice(bStart, bEnd)

// ---- 模型半身：OFM factory 函数体（去掉最外层 wrapper 与最后的 return module.exports）----
const oStartMark = '  factory: require => {\n'
const oStart = ofm.indexOf(oStartMark)
if (oStart < 0) throw new Error('ofm: 找不到 factory 标记')
const oEndMark = '    return module.exports\n  },\n})'
const oEnd = ofm.lastIndexOf(oEndMark)
if (oEnd < 0) throw new Error('ofm: 找不到 factory 结尾标记')
const ofmBody = ofm.slice(oStart + oStartMark.length, oEnd)

const indent = (text, n) => text.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n')

/** 半边 chunk 的公共尾巴：把 apply 注册出来的渲染函数抓下来，交给 Panel 使用。 */
const binder = `
      // ── 把半边的 apply 跑在一个「只收 slots.register」的代理 ctx 上，抓它的渲染函数 ──
      let CTX = null
      let renderer = null
      const captured = []
      const slotsProxy = {
        inject(_name, fn) { try { fn() } catch (e) { console.error('[dsh-bili-free-scroll] slots.inject 失败', e) } return () => {} },
        register(_spec, render) { captured.push(render); return () => {} },
      }
      function bind(ctx) {
        if (renderer) return renderer
        CTX = ctx
        const proxy = new Proxy({}, {
          get(_t, key) {
            if (key === 'slots') return slotsProxy
            if (key === 'get') return (name) => (name === 'slots' ? slotsProxy : ctx.get(name))
            const value = ctx[key]
            return typeof value === 'function' ? value.bind(ctx) : value
          },
        })
        try { half.apply(proxy) } catch (e) { console.error('[dsh-bili-free-scroll] 半边初始化失败', e) }
        renderer = typeof captured[0] === 'function' ? captured[0] : null
        return renderer
      }
      exports.setCtx = (ctx) => { bind(ctx) }
      exports.Panel = function Panel(props) {
        if (!renderer && CTX) bind(CTX)
        if (!renderer) return null
        try { return renderer(props) } catch (e) {
          console.error('[dsh-bili-free-scroll] 设置页渲染失败', e)
          return null
        }
      }
      return module.exports
`

const chunk = (name, halfExpr) => `/**
 * dsh-bili-free-scroll —— 按需 chunk：${name}
 * 由 build/merge-client.mjs 生成，别手改。
 */
window.__ModuleLoader__.load({
  id: 'dsh-bili-free-scroll/client.${name}.js',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports

    const half = (() => {
${indent(halfExpr, 6)}
    })()
${binder}
  },
})
`

const biliHalfExpr = `const React = require('react')
${biliBody}`
const modelsHalfExpr = `${ofmBody}
      return module.exports`

const shell = `/**
 * dsh-bili-free-scroll —— 浏览器半端（薄壳）
 * ============================================================================
 * 这里只做一件事：把两个设置页注册进「设置」，组件是懒加载包装。
 *
 * 为什么不把界面直接写在这里：
 *   插件的 client 条目会被 DSH 前端的启动自检审计（状态不是 active 就
 *   抛 \`web boot: N entries did not activate\` 并让整个 Web 启动失败）。
 *   壳子只有几 KB、apply 同步返回，条目瞬间 active；真正的界面（合起来约
 *   500KB）由 require.async('./client.<half>.js') 在打开设置页时才加载。
 *
 * 两个 chunk：
 *   client.bili.js     「刷B站」设置页
 *   client.models.js   「免费模型」设置页（四渠道）
 * ============================================================================
 */
window.__ModuleLoader__.load({
  id: 'dsh-bili-free-scroll',
  factory: (require) => {
    const React = require('react')
    let ctxRef = null

    /** 造一个懒加载的设置页组件：挂载时才去取对应 chunk。 */
    function lazySection(name) {
      const cache = { Panel: null, error: null }
      return function LazySection(props) {
        const [state, setState] = React.useState(cache.Panel ? 1 : 0)
        React.useEffect(() => {
          if (cache.Panel) return undefined
          let alive = true
          Promise.resolve(require.async('./client.' + name + '.js')).then((mod) => {
            if (!mod || typeof mod.Panel !== 'function') throw new Error('chunk ' + name + ' 没有导出 Panel')
            if (typeof mod.setCtx === 'function' && ctxRef) {
              try { mod.setCtx(ctxRef) } catch (e) { console.error('[dsh-bili-free-scroll] chunk 初始化失败', e) }
            }
            cache.Panel = mod.Panel
            if (alive) setState(1)
          }).catch((e) => {
            cache.error = e
            console.error('[dsh-bili-free-scroll] 加载设置页失败：' + name, e)
            if (alive) setState(2)
          })
          return () => { alive = false }
        }, [])
        if (state === 1 && cache.Panel) return React.createElement(cache.Panel, props)
        const text = state === 2
          ? '设置页加载失败：' + String((cache.error && cache.error.message) || cache.error || '未知错误')
          : '正在加载设置页…'
        return React.createElement('div', { style: { padding: '24px', opacity: 0.7, fontSize: '13px' } }, text)
      }
    }

    const BiliSection = lazySection('bili')
    const ModelsSection = lazySection('models')

    function apply(ctx) {
      ctxRef = ctx
      const slots = (typeof ctx.get === 'function' ? ctx.get('slots') : undefined) || ctx.slots
      if (!slots) return
      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: 'bili-scroll', order: 30, label: '刷B站' },
        BiliSection,
      ))
      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: 'our-free-model', order: 35, label: '免费模型' },
        ModelsSection,
      ))
    }

    const exports = { apply, inject: ['slots'], name: 'bili-free-scroll' }
    return exports
  },
})
`

fs.writeFileSync(path.join(root, 'client.js'), shell, 'utf8')
fs.writeFileSync(path.join(root, 'client.bili.js'), chunk('bili', biliHalfExpr), 'utf8')
fs.writeFileSync(path.join(root, 'client.models.js'), chunk('models', modelsHalfExpr), 'utf8')
for (const f of ['client.js', 'client.bili.js', 'client.models.js']) {
  console.log(f, fs.statSync(path.join(root, f)).size, 'bytes')
}
