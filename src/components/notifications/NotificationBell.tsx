import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Task 22 補完
export function NotificationBell() {
  return (
    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
      <Bell className="size-4" />
    </Button>
  )
}
