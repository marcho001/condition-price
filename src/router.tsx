import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireRole } from '@/components/layout/RequireRole'
import Login from '@/pages/Login'
import AdminAuctionEdit from '@/pages/admin/AuctionEdit'
import AdminAuctionList from '@/pages/admin/AuctionList'
import AdminAuctionMonitor from '@/pages/admin/AuctionMonitor'
import AdminGarageEdit from '@/pages/admin/GarageEdit'
import AdminGarageList from '@/pages/admin/GarageList'
import DealerAuctionDetail from '@/pages/dealer/AuctionDetail'
import DealerAuctionList from '@/pages/dealer/AuctionList'
import DealerNotifications from '@/pages/dealer/Notifications'
import DealerWatchlist from '@/pages/dealer/Watchlist'
import { useCurrentUser } from '@/store/useCurrentUser'

function Home() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'staff' ? '/admin/garage' : '/dealer/auctions'} replace />
}

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route element={<RequireRole role="staff" />}>
          <Route path="/admin/garage" element={<AdminGarageList />} />
          <Route path="/admin/garage/new" element={<AdminGarageEdit />} />
          <Route path="/admin/garage/:id/edit" element={<AdminGarageEdit />} />
        </Route>

        {/* 拍賣設定只有拍賣營運能碰（Phase 1 §1.1） */}
        <Route element={<RequireRole role="staff" staffRoles={['operator']} />}>
          <Route path="/admin/auctions" element={<AdminAuctionList />} />
          <Route path="/admin/auctions/new" element={<AdminAuctionEdit />} />
          <Route path="/admin/auctions/:id" element={<AdminAuctionMonitor />} />
          <Route path="/admin/auctions/:id/edit" element={<AdminAuctionEdit />} />
        </Route>

        <Route element={<RequireRole role="dealer" />}>
          <Route path="/dealer/auctions" element={<DealerAuctionList />} />
          <Route path="/dealer/auctions/:id" element={<DealerAuctionDetail />} />
          <Route path="/dealer/watchlist" element={<DealerWatchlist />} />
          <Route path="/dealer/notifications" element={<DealerNotifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
