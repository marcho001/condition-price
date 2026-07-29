import { Building2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { LOGINABLE_USERS } from '@/data/users'
import { useStore } from '@/store/index'

const BLURB: Record<string, string> = {
  staff: '管理車庫與拍賣，可查看底價與貸款餘額',
  dealer: '瀏覽拍賣、出價、設定自動出價與關注',
}

export default function Login() {
  const login = useStore((s) => s.login)
  const navigate = useNavigate()

  return (
    <div className="grid min-h-full place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">車輛拍賣平台</h1>
        <p className="mt-1 text-sm text-slate-500">
          這是純前端 Demo，所有資料皆為假資料。點選任一帳號即可進入，不需密碼。
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LOGINABLE_USERS.map((u) => (
            <Card
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                login(u.id)
                navigate(u.role === 'staff' ? '/admin/garage' : '/dealer/auctions')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.currentTarget.click()
                }
              }}
              className="cursor-pointer p-5 transition hover:border-slate-900 hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-white">
                {u.role === 'staff' ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <Building2 className="size-5" />
                )}
              </div>
              <p className="mt-3 font-medium">{u.company ?? u.name}</p>
              <p className="text-sm text-slate-500">{u.name}</p>
              <span className="mt-3 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {u.role === 'staff' ? '公司人員' : '二手車商'}
              </span>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{BLURB[u.role]}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
