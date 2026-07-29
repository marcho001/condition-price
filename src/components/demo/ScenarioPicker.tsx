import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import { DEALER_A_ID } from '@/data/users'
import { useStore } from '@/store/index'

export function ScenarioPicker() {
  const store = useStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Scenario | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  function apply(scenario: Scenario) {
    const now = useClock.getState().virtualNow()
    store.replaceAll(scenario.build(now))
    // 六組情境都以山田商事的視角設計
    store.login(DEALER_A_ID)
    navigate('/dealer/auctions')
    toast.success(`已載入情境：${scenario.label}`, { description: scenario.description })
    setPending(null)
  }

  return (
    <>
      <div className="space-y-1">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setPending(s)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-left transition hover:border-slate-400"
          >
            <span className="block text-xs font-medium">{s.label}</span>
            <span className="block text-xs leading-snug text-slate-500">{s.description}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full text-rose-700 hover:bg-rose-50"
        onClick={() => setResetOpen(true)}
      >
        <RotateCcw className="mr-1 size-3" /> 重置為初始資料
      </Button>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>載入情境「{pending?.label}」</DialogTitle>
            <DialogDescription>
              這會覆蓋目前所有拍賣、出價與通知資料，並切換為山田商事的視角。此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button onClick={() => pending && apply(pending)}>確認載入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置為初始資料</DialogTitle>
            <DialogDescription>
              會清掉所有出價、通知與變更，回到剛開站的乾淨狀態，並登出當前帳號。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                useClock.getState().resetToReal()
                store.reset(useClock.getState().virtualNow())
                setResetOpen(false)
                navigate('/login')
                toast.success('已重置為初始資料')
              }}
            >
              確認重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
