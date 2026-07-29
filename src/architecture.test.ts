import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname)

function filesUnder(dir: string, filter = (f: string) => /\.tsx?$/.test(f)): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, filter))
    else if (filter(entry) && !entry.includes('.test.')) out.push(full)
  }
  return out
}

const read = (f: string) => readFileSync(f, 'utf8')
const rel = (f: string) => f.slice(SRC.length + 1)

/** 掃描實際程式碼時要先去掉註解，否則「說明為何不這樣做」的註解也會被誤判 */
const readCode = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

/**
 * 底價、貸款餘額、代理上限是三項機密資料。
 * 這組測試在原始碼層面把它們鎖在公司人員端，避免日後改版時不小心洩漏。
 */
describe('底價與機密資料的隔離', () => {
  const dealerFiles = filesUnder(join(SRC, 'pages', 'dealer'))

  it('車商頁面存在且不只一個檔案', () => {
    expect(dealerFiles.length).toBeGreaterThanOrEqual(4)
  })

  it('車商頁面不得引用 reservePrice', () => {
    const offenders = dealerFiles.filter((f) => readCode(f).includes('reservePrice')).map(rel)
    expect(offenders).toEqual([])
  })

  it('車商頁面不得引用 loanBalance', () => {
    const offenders = dealerFiles.filter((f) => readCode(f).includes('loanBalance')).map(rel)
    expect(offenders).toEqual([])
  })

  it('車商頁面不得使用 ReserveHint 元件', () => {
    const offenders = dealerFiles.filter((f) => readCode(f).includes('ReserveHint')).map(rel)
    expect(offenders).toEqual([])
  })

  it('車商頁面一律以 showInternal={false} 呈現規格表', () => {
    for (const f of dealerFiles) {
      const src = read(f)
      if (!src.includes('SpecTable')) continue
      expect(src, rel(f)).toContain('showInternal={false}')
    }
  })

  it('出價紀錄不得顯示代理出價上限', () => {
    expect(readCode(join(SRC, 'components', 'auction', 'BidHistory.tsx'))).not.toContain('maxAmount')
  })

  it('底價提示只在 viewer 為 staff 時渲染', () => {
    const src = read(join(SRC, 'components', 'auction', 'AuctionCard.tsx'))
    const line = src.split('\n').find((l) => l.includes('<ReserveHint'))
    expect(line).toBeDefined()
    // ReserveHint 前一個條件必須是 staff 判斷
    const idx = src.indexOf('<ReserveHint')
    const before = src.slice(Math.max(0, idx - 200), idx)
    expect(before).toContain("viewer.kind === 'staff'")
  })

  it('代理出價上限只在車商自己的面板出現', () => {
    const usingMaxAmount = filesUnder(join(SRC, 'components'))
      .filter((f) => readCode(f).includes('maxAmount'))
      .map(rel)
    expect(usingMaxAmount).toEqual(['components/auction/ProxyBidPanel.tsx'])
  })
})

/**
 * 引擎必須是純函式：不讀真實時間、不讀 store、不做 I/O。
 * 時間與 id 產生器一律由參數傳入，否則測試無法確定，快轉也會失準。
 */
describe('引擎的純度', () => {
  const engineFiles = filesUnder(join(SRC, 'engine')).filter(
    (f) => !f.endsWith('testFixtures.ts'),
  )

  it('引擎檔案存在', () => {
    expect(engineFiles.length).toBeGreaterThanOrEqual(6)
  })

  it('引擎不得呼叫 Date.now()', () => {
    const offenders = engineFiles.filter((f) => readCode(f).includes('Date.now(')).map(rel)
    expect(offenders).toEqual([])
  })

  it('引擎不得使用 Math.random()', () => {
    const offenders = engineFiles.filter((f) => readCode(f).includes('Math.random(')).map(rel)
    expect(offenders).toEqual([])
  })

  it('引擎不得 import store 或 clock', () => {
    const offenders = engineFiles
      .filter((f) => /from '@\/(store|clock)/.test(readCode(f)))
      .map(rel)
    expect(offenders).toEqual([])
  })

  it('引擎不得 import React', () => {
    const offenders = engineFiles.filter((f) => /from 'react'/.test(readCode(f))).map(rel)
    expect(offenders).toEqual([])
  })
})

/** Demo 控制台不得改變頁面 layout（規格 9.1） */
describe('Demo 控制台的 overlay 約束', () => {
  const consoleSrc = read(join(SRC, 'components', 'demo', 'DemoConsole.tsx'))

  it('三段收合都用 fixed 定位', () => {
    const fixedCount = consoleSrc.match(/'fixed z-50/g)?.length ?? 0
    expect(fixedCount).toBe(3)
  })

  it('不使用會推擠內容的相對定位或 flex 佔位', () => {
    expect(consoleSrc).not.toContain('relative shrink-0')
    expect(consoleSrc).not.toContain('w-90 shrink-0')
  })

  it('AppShell 把控制台放在 main 之外，不影響內容寬度', () => {
    const shell = read(join(SRC, 'components', 'layout', 'AppShell.tsx'))
    const mainEnd = shell.indexOf('</main>')
    const consoleIdx = shell.indexOf('<DemoConsole')
    expect(consoleIdx).toBeGreaterThan(mainEnd)
  })
})

/** 不呼叫已 deprecated 的 faker helper（v11 會移除） */
describe('外部依賴的使用', () => {
  it('不使用 faker.image.urlLoremFlickr()', () => {
    const offenders = filesUnder(SRC)
      .filter((f) => readCode(f).includes('urlLoremFlickr'))
      .map(rel)
    expect(offenders).toEqual([])
  })

  it('照片 URL 由 images.ts 集中管理', () => {
    const offenders = filesUnder(SRC)
      .filter((f) => !f.endsWith('data/images.ts') && readCode(f).includes('loremflickr'))
      .map(rel)
    expect(offenders).toEqual([])
  })
})
