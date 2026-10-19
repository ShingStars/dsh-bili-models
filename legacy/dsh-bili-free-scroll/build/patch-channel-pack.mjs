/**
 * build/patch-channel-pack.mjs —— 给 vendored 的 channel-pack 打三处文本补丁
 * ============================================================================
 * 为什么是补丁而不是重新构建：
 *   pack.js 是上游 esbuild 产物（2.9 MB / 6.6 万行）。重新构建需要上游的
 *   完整工具链与未公开的依赖（jose / 打过补丁的 undici），本机离线做不到，
 *   也不该让使用者为了装插件去联网装构建依赖。所以这里只做**文本补丁**：
 *
 *   ① auto-checkin 的首次触发会把自己的 `pending` 清成 null，导致后续
 *      重复触发无法被 stop() 取消 —— 去掉这次清空；
 *   ② `defaultSchedule` 原本只 setTimeout 一次（启动后 30 秒、当天一次），
 *      进程跨天不重启就再也不签到了 —— 改成「首次照旧，之后每 30 分钟探一次」，
 *      runIfDue 内部有 `lastDate === today()` 的幂等闸，已领到就直接返回；
 *   ③ 剥掉 Gemini 渠道内联的 Google OAuth client id / secret。该渠道本包不保留，
 *      代码是死代码；留着会触发 GitHub push protection（Push cannot contain secrets）。
 *
 * 幂等：每一处各用自己的 MARK 判断，打过就跳过。
 * 跑法：node build/patch-channel-pack.mjs
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const file = path.join(root, 'models', 'vendor', 'channel-pack', 'pack.js')

const MARK1 = '/* [dsh-bili-free-scroll patch:cross-day-checkin] */'
const MARK3 = '/* [dsh-bili-free-scroll patch:strip-gemini-oauth] */'

let src = fs.readFileSync(file, 'utf8')
const original = src

// ① 保留 pending
if (!src.includes(MARK1)) {
  const before1 = `      const fire = () => {
        pending = null;
        void runIfDue();
      };`
  const after1 = `      const fire = () => {
        // ${MARK1} 保留 pending：否则 stop() 再也取消不掉后续的周期触发
        void runIfDue();
      };`
  const n1 = src.split(before1).length - 1
  if (n1 !== 1) throw new Error(`补丁①命中 ${n1} 次（应为 1）—— 上游换版本了，先看代码再改`)
  src = src.replace(before1, after1)
  console.log('applied ① keep-pending')
}

// ② 跨天重排
if (!src.includes('every = setInterval(fn, 30 * 60 * 1000)')) {
  const before2 = `function defaultSchedule(fn, ms) {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return { cancel: () => clearTimeout(timer) };
}`
  const after2 = `function defaultSchedule(fn, ms) {
  ${MARK1} schedule
  // 首次：按上游的 30 秒；之后：每 30 分钟探一次当天是否已签到（UTC+8 跨天即领）。
  // 两处 unref 都是必须的：否则待执行的定时器会拖住宿主进程退出。
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  const every = setInterval(fn, 30 * 60 * 1000);
  every.unref?.();
  return { cancel: () => { clearTimeout(timer); clearInterval(every); } };
}`
  const n2 = src.split(before2).length - 1
  if (n2 !== 1) throw new Error(`补丁②命中 ${n2} 次（应为 1）—— 上游换版本了，先看代码再改`)
  src = src.replace(before2, after2)
  console.log('applied ② cross-day schedule')
}

// ③ 剥掉 Gemini 的 Google OAuth 凭据（该渠道不保留）
// 这里刻意不写死那两个凭据：用正则匹配「变量名 + 任意字符串」，避免本脚本自己又变成泄漏源。
if (!src.includes(MARK3)) {
  const re3 = /var GEMINI_DEFAULT_CLIENT_ID = "[^"]*";\r?\nvar GEMINI_DEFAULT_CLIENT_SECRET = "[^"]*";/
  if (!re3.test(src)) throw new Error('补丁③没匹配到（应为 1）—— 上游换版本了，先看代码再改')
  src = src.replace(re3, `// ${MARK3} Gemini 渠道未保留，这里的内联凭据一并剥掉（避免 push protection 拦截）
var GEMINI_DEFAULT_CLIENT_ID = "";
var GEMINI_DEFAULT_CLIENT_SECRET = "";`)
  console.log('applied ③ strip gemini oauth')
}

if (src === original) {
  console.log('already patched, skip')
} else {
  fs.writeFileSync(file, src, 'utf8')
  console.log('patched:', file)
}
