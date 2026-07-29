import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { STATUS_ORDER, TYPE_LABEL } from '@/lib/auctionMeta'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { filterAuctions } from '@/store/selectors'
import type { AuctionStatus, AuctionType } from '@/types'

const STATUSES: AuctionStatus[] = ['未開始', '進行中', '議價中', '已流標', '已成交', '已撤標']
const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']

type Query = { types: string[]; statuses: string[] }

const SPEC = { types: 'array', statuses: 'array' } as const

const FIELDS: FilterField[] = [
  {
    kind: 'multi',
    key: 'types',
    label: '拍賣方式',
    options: TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
  },
  {
    kind: 'multi',
    key: 'statuses',
    label: '狀態',
    options: STATUSES.map((s) => ({ value: s, label: s })),
  },
]

export default function AdminAuctionList() {
  const auctions = useStore((s) => s.auctions)
  const vehicles = useStore((s) => s.vehicles)
  const [query, patch, clear] = useFilterParams<Query>(SPEC)

  const results = useMemo(() => {
    const filtered = filterAuctions(auctions, vehicles, {
      types: query.types as AuctionType[] | undefined,
      statuses: query.statuses as AuctionStatus[] | undefined,
    })
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.endAt - b.endAt,
    )
  }, [auctions, vehicles, query])

  return (
    <>
      <PageHeader
        title="拍賣管理"
        description="進行中與議價中的拍賣排在最前面。點卡片進入監控頁。"
        actions={
          <ButtonLink to="/admin/auctions/new">
            <Plus className="mr-1 size-4" /> 新增拍賣
          </ButtonLink>
        }
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
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選條件
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
            return (
              <AuctionCard
                key={a.id}
                auction={a}
                vehicle={vehicle}
                viewer={{ kind: 'staff' }}
                to={`/admin/auctions/${a.id}`}
                footer={
                  <>
                    <ButtonLink
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      to={`/admin/auctions/${a.id}`}
                    >
                      監控
                    </ButtonLink>
                    {a.status === '未開始' ? (
                      <ButtonLink
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        to={`/admin/auctions/${a.id}/edit`}
                      >
                        編輯
                      </ButtonLink>
                    ) : (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        編輯
                      </Button>
                    )}
                  </>
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
