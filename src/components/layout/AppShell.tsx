import { Outlet } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { DemoConsole } from '@/components/demo/DemoConsole'
import { EngineRunner } from './EngineRunner'
import { SideNav } from './SideNav'
import { ToastBridge } from './ToastBridge'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <EngineRunner />
      <ToastBridge />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
      <DemoConsole />
    </div>
  )
}
