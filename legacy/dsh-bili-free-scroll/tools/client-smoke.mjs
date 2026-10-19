/**
 * tools/client-smoke.mjs —— 不开浏览器，验证「薄壳 + 两个 chunk」这套结构能装能跑。
 * ============================================================================
 * 干四件事：
 *   1. 用假的 `window.__ModuleLoader__` 接住 client.js 的自注册；
 *   2. 调 factory + apply，断言两页设置（settings.section）都注册了、id 不重复；
 *   3. 逐个加载 client.bili.js / client.models.js chunk，断言导出 Panel + setCtx；
 *   4. 用假 ctx 绑上去、渲染一次面板，断言能出元素而不抛。
 *
 * 跑法：node tools/client-smoke.mjs   （退出码 0 = 通过）
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

let loaded = null
globalThis.window = {
  __ModuleLoader__: { load(def) { loaded = def } },
}

const listeners = []
const style = () => ({ setAttribute() {}, remove() {}, textContent: '', appendChild() {} })
globalThis.document = {
  head: { appendChild(el) { listeners.push(el) }, removeChild() {} },
  createElement() { return style() },
  createTextNode(t) { return { text: t } },
}
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'smoke' }, configurable: true }) } catch { /* Node 自带 navigator */ }
globalThis.fetch = async () => { throw new Error('smoke: 不应该发请求') }
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }

let hookSlot = 0
const react = {
  createElement(type, props, ...children) { return { type, props: props ?? {}, children, __el: true } },
  Fragment: 'Fragment',
  useState(init) { const i = hookSlot++; return [typeof init === 'function' ? init() : init, () => {}] },
  useEffect() { hookSlot++ },
  useMemo(fn) { hookSlot++; return fn() },
  useRef(v) { hookSlot++; return { current: v } },
  useCallback(fn) { hookSlot++; return fn },
  useLayoutEffect() { hookSlot++ },
  useReducer(_r, init) { hookSlot++; return [init, () => {}] },
  useContext() { hookSlot++; return {} },
  createContext(defaultValue) { return { Provider: 'Provider', _default: defaultValue } },
  memo: (c) => c,
  forwardRef: (c) => c,
  cloneElement: (e) => e,
  Children: { map: (c, f) => (Array.isArray(c) ? c.map(f) : []), toArray: (c) => (Array.isArray(c) ? c : []) },
}
const reactDom = { createPortal: (n) => n, render: () => {}, flushSync: (f) => f() }
const stubRequire = (id) => {
  if (id === 'react') return react
  if (id === 'react-dom') return reactDom
  if (id === 'react/jsx-runtime') return { jsx: react.createElement, jsxs: react.createElement, Fragment: 'Fragment' }
  throw new Error('smoke: 未知依赖 ' + id)
}

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1) }

// ---- 假 ctx：slots 收注册，别的按需兜底 ----
const registered = []
const sections = []
const slots = {
  inject(name, fn) { sections.push(name); fn() },
  register(spec, comp) { registered.push({ spec, comp }); return () => {} },
}
const effects = []
const ctx = {
  get: (k) => (k === 'slots' ? slots : undefined),
  slots,
  locale: { bind: () => (_key, args) => String(args?.default ?? _key), register: () => () => {}, locale: 'zh' },
  theme: { get: () => ({}), onChange: () => () => {} },
  effect(fn, label) { effects.push(label); try { const d = fn(); return typeof d === 'function' ? d : () => {} } catch { return () => {} } },
  on() { return () => {} },
  logger: () => ({ info() {}, warn() {}, error() {} }),
}

// ---- 1/2. 薄壳 ----
const shellSource = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
if (shellSource.length > 20_000) fail('client.js 太胖了（' + shellSource.length + 'B），启动自检有风险')
new Function('window', 'document', 'navigator', 'fetch', shellSource)(globalThis.window, globalThis.document, globalThis.navigator, globalThis.fetch)
if (!loaded) fail('client.js 没有调用 __ModuleLoader__.load')
if (loaded.id !== 'dsh-bili-free-scroll') fail('module id 不对：' + loaded.id)

const mod = loaded.factory(stubRequire)
if (!mod || typeof mod.apply !== 'function') fail('factory 没返回 apply')
mod.apply(ctx)

const names = registered.map((r) => r.spec.id)
if (!names.includes('bili-scroll')) fail('缺少「刷B站」设置页，只看到：' + names.join(','))
if (!names.includes('our-free-model')) fail('缺少「免费模型」设置页，只看到：' + names.join(','))
if (new Set(names).size !== names.length) fail('设置页 id 重复：' + names.join(','))

// ---- 3/4. 两个 chunk ----
const chunks = {}
for (const name of ['bili', 'models']) {
  loaded = null
  const source = fs.readFileSync(path.join(root, `client.${name}.js`), 'utf8')
  new Function('window', 'document', 'navigator', 'fetch', source)(globalThis.window, globalThis.document, globalThis.navigator, globalThis.fetch)
  if (!loaded) fail(`client.${name}.js 没有自注册`)
  if (loaded.id !== `dsh-bili-free-scroll/client.${name}.js`) fail(`chunk id 不对：${loaded.id}`)
  const chunkMod = loaded.factory(stubRequire)
  if (typeof chunkMod.Panel !== 'function') fail(`client.${name}.js 没导出 Panel`)
  if (typeof chunkMod.setCtx !== 'function') fail(`client.${name}.js 没导出 setCtx`)
  chunkMod.setCtx(ctx)
  hookSlot = 0
  let el
  try { el = chunkMod.Panel({}) } catch (e) { fail(`client.${name}.js 的 Panel 渲染抛了：${e && e.message}`) }
  if (el === null || el === undefined) fail(`client.${name}.js 的 Panel 渲染出空`)
  chunks[name] = { id: loaded.id, size: source.length }
}

console.log('✓ client bundle 装载成功（薄壳 + 两个按需 chunk）')
console.log('  module   :', 'dsh-bili-free-scroll')
console.log('  shell    :', shellSource.length, 'bytes')
console.log('  sections :', names.join(' / '))
console.log('  chunks   :', Object.entries(chunks).map(([n, c]) => `${n}=${c.size}B`).join(' / '))
console.log('  effects  :', effects.length)
