import type { StepMode } from '@/types'

const AUTO_STEPS: ReadonlyArray<{ under: number; step: number }> = [
  { under: 500_000, step: 5_000 },
  { under: 2_000_000, step: 10_000 },
  { under: Number.POSITIVE_INFINITY, step: 50_000 },
]

export function formatJPY(n: number): string {
  return `¥${Math.round(n).toLocaleString('en-US')}`
}

export function bidStepFor(currentPrice: number, stepMode: StepMode, fixedStep?: number): number {
  if (stepMode === 'fixed' && fixedStep && fixedStep > 0) return fixedStep
  return AUTO_STEPS.find((s) => currentPrice < s.under)!.step
}

type StepInput = { startPrice: number; stepMode: StepMode; fixedStep?: number }

export function nextValidBid(input: StepInput, currentPrice: number | null): number {
  if (currentPrice === null) return input.startPrice
  return currentPrice + bidStepFor(currentPrice, input.stepMode, input.fixedStep)
}

export function validateBidAmount(
  input: StepInput,
  currentPrice: number | null,
  amount: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, reason: '請輸入正整數金額' }
  }
  const min = nextValidBid(input, currentPrice)
  if (amount < min) {
    return { ok: false, reason: `至少需出 ${formatJPY(min)}` }
  }
  // 以起標價為基準判斷級距，這樣起標價不是級距整數倍時規則仍然一致
  const step = bidStepFor(currentPrice ?? input.startPrice, input.stepMode, input.fixedStep)
  if ((amount - input.startPrice) % step !== 0) {
    return { ok: false, reason: `金額必須是 ${formatJPY(step)} 的整數倍` }
  }
  return { ok: true }
}

export function priceGapRatio(reservePrice: number, highest: number): number {
  if (reservePrice <= 0) return 0
  return (reservePrice - highest) / reservePrice
}
