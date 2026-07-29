import { Star } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { STATUS_ORDER, TYPE_LABEL } from '@/lib/auctionMeta'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { Button } from '@/components/ui/button'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import { filterAuctions, isWatched } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'
import type { AuctionStatus, AuctionType } from '@/types'

/** 車商看不到撤標原因，但仍需知道那台車已下架 */
const STATUSES: AuctionStatus[] = ['未開始', '進行中', '議價中', '已流標', '已成交', '已撤標']
const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']

type Query = {
  brands: string[]
  yearFrom: number
  yearTo: number
  orderNo: string
  types: string[]
  statuses: string[]
  watched: string
  mine: string
}

const SPEC = {
  brands: 'array',
  types: 'array',
  statuses: 'array',
  yearFrom: 'number',
  yearTo: 'number',
  orderNo: 'string',
  watched: 'string',
  mine: 'string',
} as const

const FIELDS: FilterField[] = [
  {
    kind: 'multi',
    key: 'brands',
    label: '廠牌',
    options: ALL_BRANDS.map((b) => ({ value: b, label: b })),
  },
  {
    kind: 'multi',
    key: 'types',
    label: '拍賣方式',
    options: TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
  },
  {
    kind: 'multi',
    key: 'statuses',
    label: '拍賣狀態',
    options: STATUSES.map((s) => ({ value: s, label: s })),
  },
  { kind: 'number', key: 'yearFrom', label: '年份起', placeholder: '2016' },
  { kind: 'number', key: 'yearTo', label: '年份迄', placeholder: '2023' },
  { kind: 'text', key: 'orderNo', label: '訂單號', placeholder: 'ORD-2026' },
  { kind: 'toggle', key: 'watched', label: '只看關注' },
  { kind: 'toggle', key: 'mine', label: '只看我出價過的' },
]

export default function DealerAuctionList() {
  const user = useCurrentUser()!
  const store = useStore()
  const [query, patch, clear] = useFilterParams<Query>(SPEC)

  const results = useMemo(() => {
    let onlyIds: string[] | undefined
    if (query.watched === '1') {
      onlyIds = store.watches.filter((w) => w.dealerId === user.id).map((w) => w.auctionId)
    }
    if (query.mine === '1') {
      const bidIds = [
        ...new Set(store.bids.filter((b) => b.dealerId === user.id).map((b) => b.auctionId)),
      ]
      onlyIds = onlyIds ? onlyIds.filter((x) => bidIds.includes(x)) : bidIds
    }

    const filtered = filterAuctions(store.auctions, store.vehicles, {
      brands: query.brands,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      orderNo: query.orderNo,
      types: query.types as AuctionType[] | undefined,
      statuses: query.statuses as AuctionStatus[] | undefined,
      onlyIds,
    })

    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.endAt - b.endAt,
    )
  }, [store.auctions, store.vehicles, store.watches, store.bids, query, user.id])

  return (
    <>
      <PageHeader
        title="拍賣列表"
        description="進行中的拍賣排在最前面。已成交會顯示結標金額，流標會標示流標原因。"
      />

      <FilterBar
        fields={FIELDS}
        value={query}
        onPatch={patch}
        onClear={clear}
        resultCount={results.length}
      />

      {results.length === 0 ? (
        <EmptyState
          title="沒有符合條件的拍賣"
          description="調整或清除篩選條件後再試一次。"
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選條件
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = store.vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
            const watched = isWatched(store, a.id, user.id)
            return (
              <AuctionCard
                key={a.id}
                auction={a}
                vehicle={vehicle}
                viewer={{ kind: 'dealer', dealerId: user.id }}
                to={`/dealer/auctions/${a.id}`}
                footer={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      store.toggleWatch({ auctionId: a.id, dealerId: user.id })
                      toast.success(watched ? '已取消關注' : '已加入關注，有新動態會通知您')
                    }}
                  >
                    <Star className={cn('mr-1 size-3', watched && 'fill-amber-400 text-amber-500')} />
                    {watched ? '取消關注' : '關注'}
                  </Button>
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
