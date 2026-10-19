/**
 * dsh-bili-free-scroll —— 浏览器半端（薄壳）
 * ============================================================================
 * 这里只做一件事：把两个设置页注册进「设置」，组件是懒加载包装。
 *
 * 为什么不把界面直接写在这里：
 *   插件的 client 条目会被 DSH 前端的启动自检审计（状态不是 active 就
 *   抛 `web boot: N entries did not activate` 并让整个 Web 启动失败）。
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
