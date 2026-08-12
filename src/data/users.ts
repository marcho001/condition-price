import type { User } from '@/types'

export const STAFF_ID = 'u-staff'
export const REGISTRAR_ID = 'u-registrar'
export const ADMIN_ID = 'u-admin'
export const DEALER_A_ID = 'd-yamada'
export const DEALER_B_ID = 'd-suzuki'

/**
 * Phase 1 §1.1 的三個內部角色。只有拍賣營運看得到底價——
 * 這是文件特別要求「從第一天就做好控制」的一件事。
 */
export const USERS: User[] = [
  {
    id: STAFF_ID,
    role: 'staff',
    staffRole: 'operator',
    name: '田中 健一',
    company: '拍賣營運',
    loginable: true,
    canSeeReserve: true,
  },
  {
    id: REGISTRAR_ID,
    role: 'staff',
    staffRole: 'registrar',
    name: '小林 美咲',
    company: '車輛登錄員',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: ADMIN_ID,
    role: 'staff',
    staffRole: 'admin',
    name: '中村 誠',
    company: '系統管理員',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: DEALER_A_ID,
    role: 'dealer',
    name: '山田 太郎',
    company: '山田商事',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: DEALER_B_ID,
    role: 'dealer',
    name: '鈴木 一郎',
    company: '鈴木自動車',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: 'd-sato',
    role: 'dealer',
    name: '佐藤 次郎',
    company: '佐藤モータース',
    loginable: false,
    canSeeReserve: false,
  },
  {
    id: 'd-ito',
    role: 'dealer',
    name: '伊藤 三郎',
    company: '伊藤オート',
    loginable: false,
    canSeeReserve: false,
  },
  {
    id: 'd-watanabe',
    role: 'dealer',
    name: '渡辺 四郎',
    company: '渡辺自販',
    loginable: false,
    canSeeReserve: false,
  },
]

export const LOGINABLE_USERS = USERS.filter((u) => u.loginable)
export const ALL_DEALER_IDS = USERS.filter((u) => u.role === 'dealer').map((u) => u.id)

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id)
}

/** 顯示名稱：公司名優先 */
export function dealerLabel(id: string): string {
  const u = userById(id)
  return u?.company ?? u?.name ?? id
}
