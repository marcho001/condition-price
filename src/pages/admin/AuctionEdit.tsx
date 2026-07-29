import { AlertTriangle, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { TYPE_HINT, TYPE_LABEL } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { useClock } from '@/clock/clockStore'
import { newId } from '@/lib/id'
import { bidStepFor, formatJPY } from '@/lib/money'
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import type { Auction, AuctionType, StepMode } from '@/types'

const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']
const HOUR = 3_600_000
const DAY = 86_400_000
const LIVE_WINDOW_MS = 90_000

const STEP_TABLE = [
  ['未滿 ¥500,000', '¥5,000'],
  ['¥500,000 – 未滿 ¥2,000,000', '¥10,000'],
  ['¥2,000,000 以上', '¥50,000'],
]

export default function AuctionEdit() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const auctions = useStore((s) => s.auctions)
  const vehicles = useStore((s) => s.vehicles)
  const saveAuction = useStore((s) => s.saveAuction)

  const existing = id ? auctions.find((a) => a.id === id) : undefined
  const readOnly = existing !== undefined && existing.status !== '未開始'

  const [form, setForm] = useState<Auction>(() => {
    if (existing) return existing
    const now = useClock.getState().virtualNow()
    const startAt = now + HOUR
    const endAt = startAt + 4 * DAY
    return {
      id: newId('a'),
      vehicleId: search.get('vehicleId') ?? '',
      type: 'SCHEDULED',
      status: '未開始',
      startAt,
      endAt,
      originalEndAt: endAt,
      startPrice: 500_000,
      reservePrice: 900_000,
      stepMode: 'auto',
      extendedMs: 0,
      emittedKeys: [],
      createdAt: now,
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  /** 可選車輛：在庫的，加上本筆拍賣已綁定的那台（狀態為已排拍） */
  const selectable = useMemo(
    () => vehicles.filter((v) => v.status === '在庫' || v.id === form.vehicleId),
    [vehicles, form.vehicleId],
  )
  const selected = vehicles.find((v) => v.id === form.vehicleId)

  const set = <K extends keyof Auction>(key: K, value: Auction[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function changeType(type: AuctionType) {
    setForm((f) => {
      const endAt = type === 'LIVE' ? f.startAt + LIVE_WINDOW_MS : f.startAt + 4 * DAY
      return {
        ...f,
        type,
        endAt,
        originalEndAt: endAt,
        // 立即成交價只有密封投標可設，切換方式時清掉
        buyNowPrice: type === 'SEALED' ? f.buyNowPrice : undefined,
      }
    })
  }

  function submit() {
    const next: Record<string, string> = {}
    if (!form.vehicleId) next.vehicleId = '請選擇車輛'
    if (form.endAt <= form.startAt) next.endAt = '結標時間必須晚於開始時間'
    if (form.startPrice <= 0) next.startPrice = '起標價必須大於 0'
    if (form.reservePrice < form.startPrice) next.reservePrice = '底價不得低於起標價'
    if (form.stepMode === 'fixed' && (!form.fixedStep || form.fixedStep <= 0)) {
      next.fixedStep = '請填寫固定喊價單位'
    }
    if (form.buyNowPrice !== undefined && form.buyNowPrice <= form.reservePrice) {
      next.buyNowPrice = '立即成交價必須高於底價'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const result = saveAuction({ ...form, originalEndAt: form.endAt })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(existing ? '拍賣已更新' : '拍賣已建立')
    navigate('/admin/auctions')
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={existing ? '編輯拍賣' : '新增拍賣'}
        description="底價與立即成交價都不會顯示給車商。"
        backTo="/admin/auctions"
      />

      {readOnly && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              此拍賣目前為「{existing.status}」，無法編輯
            </p>
            <p className="mt-0.5 text-amber-800">
              只有狀態為「未開始」的拍賣可以修改設定。
              <Link to={`/admin/auctions/${existing.id}`} className="ml-1 underline">
                前往監控頁
              </Link>
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={readOnly} className={cn('space-y-4', readOnly && 'opacity-60')}>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">選擇車輛</h2>
          {selectable.length === 0 ? (
            <p className="text-sm text-slate-500">目前沒有狀態為「在庫」的車輛可以排拍。</p>
          ) : (
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {selectable.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={form.vehicleId === v.id}
                  onClick={() => set('vehicleId', v.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2 text-left transition',
                    form.vehicleId === v.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400',
                  )}
                >
                  <VehiclePhoto
                    seed={v.photoSeeds[0]}
                    alt={v.model}
                    className="size-14 shrink-0 rounded"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">
                      {v.brand} {v.model}{' '}
                      <span className="tabular-nums text-slate-500">{v.year}</span>
                    </span>
                    <span className="block font-mono text-xs text-slate-400">{v.orderNo}</span>
                    {v.status === '已排拍' && (
                      <span className="block text-xs text-sky-700">目前綁定於本拍賣</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          {errors.vehicleId && <p className="mt-2 text-xs text-rose-600">{errors.vehicleId}</p>}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">拍賣方式</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={form.type === t}
                onClick={() => changeType(t)}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  form.type === t
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400',
                )}
              >
                <span className="block text-sm font-medium">{TYPE_LABEL[t]}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {TYPE_HINT[t]}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">時間</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startAt" className="mb-1.5 block text-sm">
                開始時間
              </Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={toDateTimeLocal(form.startAt)}
                onChange={(e) => {
                  const startAt = fromDateTimeLocal(e.target.value)
                  const span = form.endAt - form.startAt
                  setForm((f) => ({
                    ...f,
                    startAt,
                    endAt: startAt + span,
                    originalEndAt: startAt + span,
                  }))
                }}
              />
            </div>
            <div>
              <Label htmlFor="endAt" className="mb-1.5 block text-sm">
                結標時間
              </Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={toDateTimeLocal(form.endAt)}
                onChange={(e) => set('endAt', fromDateTimeLocal(e.target.value))}
              />
              {errors.endAt && <p className="mt-1 text-xs text-rose-600">{errors.endAt}</p>}
              {form.type === 'LIVE' && (
                <p className="mt-1 text-xs text-slate-500">
                  即時同步拍建議 60–120 秒。目前設定為{' '}
                  {Math.round((form.endAt - form.startAt) / 1000)} 秒。
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">價格</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startPrice" className="mb-1.5 block text-sm">
                起標價
              </Label>
              <Input
                id="startPrice"
                type="number"
                step={1000}
                value={form.startPrice}
                onChange={(e) => set('startPrice', Number(e.target.value))}
              />
              {errors.startPrice && <p className="mt-1 text-xs text-rose-600">{errors.startPrice}</p>}
            </div>
            <div>
              <Label htmlFor="reservePrice" className="mb-1.5 flex items-center gap-1 text-sm">
                底價 <Lock className="size-3 text-slate-400" />
                <span className="text-xs font-normal text-slate-500">車商看不到</span>
              </Label>
              <Input
                id="reservePrice"
                type="number"
                step={10_000}
                value={form.reservePrice}
                onChange={(e) => set('reservePrice', Number(e.target.value))}
              />
              {errors.reservePrice && (
                <p className="mt-1 text-xs text-rose-600">{errors.reservePrice}</p>
              )}
              {selected && (
                <p className="mt-1 text-xs text-slate-500">
                  參考：貸款餘額 {formatJPY(selected.loanBalance)}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">每次喊價最小單位</h2>
          <div className="flex flex-wrap gap-2">
            {(['auto', 'fixed'] as StepMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={form.stepMode === mode}
                onClick={() => set('stepMode', mode)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition',
                  form.stepMode === mode
                    ? 'border-slate-900 bg-slate-50 font-medium'
                    : 'border-slate-200 hover:border-slate-400',
                )}
              >
                {mode === 'auto' ? '依價格自動分級' : '固定金額'}
              </button>
            ))}
          </div>

          {form.stepMode === 'auto' ? (
            <table className="mt-3 text-sm">
              <tbody className="divide-y divide-slate-100">
                {STEP_TABLE.map(([range, step]) => (
                  <tr key={range}>
                    <td className="py-1.5 pr-6 text-slate-500">{range}</td>
                    <td className="py-1.5 font-medium tabular-nums">{step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3 max-w-48">
              <Label htmlFor="fixedStep" className="mb-1.5 block text-sm">
                固定喊價單位
              </Label>
              <Input
                id="fixedStep"
                type="number"
                step={1000}
                value={form.fixedStep ?? ''}
                placeholder="20000"
                onChange={(e) => set('fixedStep', Number(e.target.value) || undefined)}
              />
              {errors.fixedStep && <p className="mt-1 text-xs text-rose-600">{errors.fixedStep}</p>}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            以目前起標價 {formatJPY(form.startPrice)} 計算，第一次加價單位為{' '}
            <span className="font-medium tabular-nums">
              {formatJPY(bidStepFor(form.startPrice, form.stepMode, form.fixedStep))}
            </span>
            。
          </p>
        </Card>

        {form.type === 'SEALED' && (
          <Card className="p-4">
            <h2 className="mb-1 flex items-center gap-1 text-sm font-semibold">
              立即成交價 <Lock className="size-3 text-slate-400" />
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              僅密封投標可設定。有車商投到這個金額時立刻結標成交，不等結標時間。留空表示不設定。
            </p>
            <div className="max-w-48">
              <Label htmlFor="buyNowPrice" className="mb-1.5 block text-sm">
                立即成交價
              </Label>
              <Input
                id="buyNowPrice"
                type="number"
                step={10_000}
                value={form.buyNowPrice ?? ''}
                placeholder="留空表示不設定"
                onChange={(e) => set('buyNowPrice', Number(e.target.value) || undefined)}
              />
              {errors.buyNowPrice && (
                <p className="mt-1 text-xs text-rose-600">{errors.buyNowPrice}</p>
              )}
            </div>
          </Card>
        )}
      </fieldset>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/admin/auctions')}>
          {readOnly ? '返回' : '取消'}
        </Button>
        {!readOnly && <Button onClick={submit}>{existing ? '儲存變更' : '建立拍賣'}</Button>}
      </div>
    </div>
  )
}
