/**
 * dsh-bili-free-scroll —— 合并版插件（host 半端）
 * ============================================================================
 * 一个包，两个半身：
 *
 *   ./bili/    刷 B站（原 dsh-bili-scroll 0.1.11）：MCP 工具 / 谷时定时器 / 日报 / 设置页
 *   ./models/  免费模型（原 dsh-our-free-model 2.5.5 裁剪）：四个渠道的账号池、
 *              登录、额度、模型列表；只留 LobsterAI、Qoder 中国版、Cline、Raccoon。
 *
 * ⭐ 两个半身各自走**嵌套 inject**，谁也不等谁：
 *    bili  要 `webServer / tools / settings`；
 *    models 要 `llm / credentials / commands`（渠道包要这三个才挂）。
 *    这样在 headless 那种没有 webServer、或把 credentials 关掉的 composition 里，
 *    模型半边照样能注册 adapter（刷B站那一轮才跑得起来），bili 也照样能用。
 *    ⚠️ 千万别把两边的依赖合并进顶层 `inject` —— 少一个服务整条 fiber 都会待机，
 *       实测 headless：`bili-free-scroll: pending (waiting for service: webServer)`。
 *
 * 数据目录（都在 `$DSH_HOME/bili-free-scroll/` 下，绝不写进包目录）：
 *   bili/    config.json / duty.md / out/ / duty.log / bili_credential.json
 *   models/  settings.json / accounts.json / catalog.json / ...
 * ============================================================================
 */
import { apply as biliApply, Config as biliConfig } from './bili/index.js'
import { apply as modelApply } from './models/index.js'

export const name = 'bili-free-scroll'

/** 顶层不声明硬依赖；两条半边各自在 apply 里用嵌套 inject 等自己的服务。 */
export const inject = []

/** 配置 schema 由 bili 半边提供（模型半边的设置在自己的 settings.json 里，不占宿主 schema）。 */
export const Config = biliConfig

export function apply(ctx, config) {
  // bili 半边：webServer / tools / settings 齐了才挂
  ctx.inject(['webServer', 'tools', 'settings'], (scoped) => {
    try {
      biliApply(scoped, config)
    } catch (e) {
      try { scoped.logger?.('bili-free-scroll')?.error?.('刷B站半边未激活：' + (e?.message ?? e)) } catch { /* 收摊 */ }
    }
  })

  // 模型半边：llm / credentials / commands 齐了才挂；缺一个就安静地不挂，不影响 bili
  ctx.inject(['llm', 'credentials', 'commands'], (scoped) => {
    try {
      modelApply(scoped, config)
    } catch (e) {
      try { scoped.logger?.('bili-free-scroll')?.error?.('模型半边未激活：' + (e?.message ?? e)) } catch { /* 收摊 */ }
    }
  })
}
