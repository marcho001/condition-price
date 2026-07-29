import { Star } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function Watchlist() {
  const user = useCurrentUser()!
  const store = useStore()

  const results = useMemo(() => {
    const ids = store.watches.filter((w) => w.dealerId === user.id).map((w) => w.auctionId)
    return store.auctions.filter((a) => ids.includes(a.id)).sort((a, b) => a.endAt - b.endAt)
  }, [store.watches, store.auctions, user.id])

  return (
    <>
      <PageHeader
        title="關注清單"
        description="關注的拍賣有新出價、開標、延長或下架時，您都會收到通知。"
      />

      {results.length === 0 ? (
        <EmptyState
          title="還沒有關注任何拍賣"
          description="在拍賣列表或詳細頁點星號即可加入關注。"
          action={<ButtonLink to="/dealer/auctions">前往拍賣列表</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = store.vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
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
                      toast.success('已取消關注')
                    }}
                  >
                    <Star className="mr-1 size-3 fill-amber-400 text-amber-500" /> 取消關注
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
