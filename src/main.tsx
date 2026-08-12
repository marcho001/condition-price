import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useClock } from '@/clock/clockStore'
import { STORAGE_KEY, useStore } from '@/store/index'
import App from './App'
import './index.css'

// 第一次開站（localStorage 沒有資料）時用當前虛擬時間產生 seed
if (localStorage.getItem(STORAGE_KEY) === null) {
  useStore.getState().reset(useClock.getState().virtualNow())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
