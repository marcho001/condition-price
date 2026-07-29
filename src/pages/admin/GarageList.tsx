import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Button } from '@/components/ui/button'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { useStore } from '@/store/index'
import { filterVehicles } from '@/store/selectors'
import type { VehicleStatus } from '@/types'

const STATUSES: VehicleStatus[] = ['在庫', '已排拍', '拍賣中', '已售出', '已下架']

type Query = {
  brands: string[]
  statuses: string[]
  yearFrom: number
  yearTo: number
  orderNo: string
  sort: string
}

const SPEC = {
  brands: 'array',
  statuses: 'array',
  yearFrom: 'number',
  yearTo: 'number',
  orderNo: 'string',
  sort: 'string',
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
    key: 'statuses',
    label: '狀態',
    options: STATUSES.map((s) => ({ value: s, label: s })),
  },
  { kind: 'number', key: 'yearFrom', label: '年份起', placeholder: '2016' },
  { kind: 'number', key: 'yearTo', label: '年份迄', placeholder: '2023' },
  { kind: 'text', key: 'orderNo', label: '訂單號', placeholder: 'ORD-2026' },
]

export default function GarageList() {
  const vehicles = useStore((s) => s.vehicles)
  const navigate = useNavigate()
  const [query, patch, clear] = useFilterParams<Query>(SPEC)

  const results = useMemo(() => {
    const filtered = filterVehicles(vehicles, {
      brands: query.brands,
      statuses: query.statuses as VehicleStatus[] | undefined,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      orderNo: query.orderNo,
    })
    const sorted = [...filtered]
    if (query.sort === 'year') sorted.sort((a, b) => b.year - a.year)
    else if (query.sort === 'mileage') sorted.sort((a, b) => a.mileage - b.mileage)
    else sorted.sort((a, b) => b.createdAt - a.createdAt)
    return sorted
  }, [vehicles, query])

  return (
    <>
      <PageHeader
        title="車庫管理"
        description="回收車輛的入庫清單。狀態為「在庫」的車輛才能排定拍賣。"
        actions={
          <>
            <label className="sr-only" htmlFor="garage-sort">
              排序
            </label>
            <select
              id="garage-sort"
              value={query.sort ?? 'newest'}
              onChange={(e) =>
                patch({ sort: e.target.value === 'newest' ? undefined : e.target.value })
              }
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="newest">最新入庫</option>
              <option value="year">年份由新到舊</option>
              <option value="mileage">里程由低到高</option>
            </select>
            <ButtonLink to="/admin/garage/new">
              <Plus className="mr-1 size-4" /> 新增車輛
            </ButtonLink>
          </>
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
          title="沒有符合條件的車輛"
          description="調整或清除篩選條件後再試一次。"
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選條件
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              actions={
                <>
                  <ButtonLink
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    to={`/admin/garage/${v.id}/edit`}
                  >
                    編輯
                  </ButtonLink>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={v.status !== '在庫'}
                    onClick={() => navigate(`/admin/auctions/new?vehicleId=${v.id}`)}
                  >
                    排拍
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
