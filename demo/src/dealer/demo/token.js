// Demo 的登入 token：以「demo:廠商 id:帳密指紋」組成，mock 與 Demo 控制台共用。
// API 說明：停用、重設密碼、修改登入 Email 時該廠商的 token 立即失效，
// 因此把 Email＋密碼的指紋放進 token，內部一改就對不上而回 1108
import { dealerById } from '../../shared/engine.js'

function fingerprint(dealer) {
  let hash = 0
  for (const ch of `${dealer.email.toLowerCase()}|${dealer.password}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return (hash >>> 0).toString(36)
}

/** 產生廠商的登入 token */
export function tokenOf(dealer) {
  return `demo:${dealer.id}:${fingerprint(dealer)}`
}

/** 由 token 取回仍有效的廠商（停用、鎖定、帳密已變更時回 null） */
export function dealerOfToken(token) {
  const [prefix, dealerId] = String(token ?? '').split(':')
  if (prefix !== 'demo') return null
  const dealer = dealerById(dealerId)
  if (!dealer || dealer.status !== 'ACTIVE' || dealer.locked) return null
  return tokenOf(dealer) === token ? dealer : null
}
