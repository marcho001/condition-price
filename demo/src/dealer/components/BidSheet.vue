<template>
  <teleport to="body">
    <div v-if="open" class="bs-backdrop" @click.self="close">
      <section class="bs" role="dialog" aria-modal="true" :aria-label="title">
        <header class="bs-head">
          <h2>{{ title }}</h2>
          <button class="x" type="button" :aria-label="t('common.close')" @click="close">✕</button>
        </header>

        <!-- Step 1：金額入力 -->
        <div v-if="step === 1" class="bs-body">
          <p class="floor">{{ floorText }}</p>
          <p v-if="current" class="current">{{ t('bid.current', { amount: yenJa(current.amount) }) }}</p>

          <label class="amount-label" for="bid-amount">{{ t('bid.amount') }}</label>
          <div class="amount-input">
            <input
              id="bid-amount"
              ref="inputEl"
              v-model="display"
              class="fig"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :placeholder="t('bid.placeholder')"
              @input="onInput"
            />
            <span class="yen">円</span>
          </div>

          <p class="quick-label eyebrow">{{ t('bid.quick') }}</p>
          <div class="quick">
            <button v-for="q in quickAdds" :key="q" type="button" @click="add(q)">
              +{{ (q / 10000).toLocaleString('ja-JP') }}万
            </button>
          </div>

          <p v-if="error" class="err">{{ error }}</p>
        </div>

        <!-- Step 2：二次確認 -->
        <div v-else class="bs-body confirm">
          <p class="c-lead">{{ t('bid.confirmTitle') }}</p>
          <p class="c-amount fig">{{ yen(amount) }}<span>円</span></p>
          <p class="c-car">{{ carLabel }}</p>
          <p class="c-hint">{{ t('bid.confirmHint') }}</p>
        </div>

        <footer class="bs-foot">
          <template v-if="step === 1">
            <button class="btn btn-ghost" type="button" @click="close">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" type="button" @click="toConfirm">{{ t('bid.next') }}</button>
          </template>
          <template v-else>
            <button class="btn btn-ghost" type="button" @click="step = 1">{{ t('bid.backEdit') }}</button>
            <button class="btn btn-primary" type="button" @click="submit">{{ t('bid.submit') }}</button>
          </template>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { bidFloor, placeBid, bidOf, roundRemaining } from '@/shared/engine.js'
import { db } from '@/shared/store.js'
import { yen, yenJa, toAmount, groupAmountInput } from '@/shared/format.js'
import { toast } from '../toast.js'

const props = defineProps({
  open: Boolean,
  round: { type: Object, required: true },
  carLabel: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const { t } = useI18n()
const step = ref(1)
const display = ref('')
const error = ref('')
const inputEl = ref(null)

const quickAdds = [100000, 500000, 1000000]

const current = computed(() => bidOf(props.round.id, db.dealerSession))
const amount = computed(() => toAmount(display.value) ?? 0)
const title = computed(() => (current.value ? t('bid.editTitle') : t('bid.title')))
const floorText = computed(() =>
  props.round.round === 1
    ? t('bid.floorFirst')
    : t('bid.floorExtra', { price: yenJa(props.round.startPrice) })
)

watch(
  () => props.open,
  async (v) => {
    if (!v) return
    step.value = 1
    error.value = ''
    display.value = current.value ? groupAmountInput(current.value.amount) : ''
    await nextTick()
    inputEl.value?.focus()
  }
)

function onInput() {
  display.value = groupAmountInput(display.value)
}

function add(n) {
  display.value = groupAmountInput(String(amount.value + n))
  error.value = ''
}

function close() {
  emit('close')
}

function toConfirm() {
  error.value = ''
  const v = toAmount(display.value)
  if (v === null) {
    error.value = t('bid.errRequired')
    return
  }
  if (roundRemaining(props.round) <= 0) {
    error.value = t('bid.errClosed')
    return
  }
  const floor = bidFloor(props.round)
  if (v < floor) {
    error.value = props.round.round === 1 ? t('bid.errZero') : t('bid.errFloor')
    return
  }
  step.value = 2
}

function submit() {
  const wasBid = !!current.value
  const res = placeBid(props.round.id, db.dealerSession, amount.value)
  if (!res.ok) {
    const map = {
      CLOSED: t('bid.errClosed'),
      NOT_ELIGIBLE: t('bid.errNotEligible'),
      BELOW_FLOOR: t('bid.errFloor'),
      INVALID: t('bid.errRequired')
    }
    error.value = map[res.error] || t('bid.errRequired')
    step.value = 1
    return
  }
  toast(wasBid ? t('bid.updated') : t('bid.success'))
  close()
}
</script>

<style scoped>
.bs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 75;
  background: rgba(18, 21, 26, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
@media (min-width: 720px) { .bs-backdrop { align-items: center; } }

.bs {
  width: 100%;
  max-width: 480px;
  background: var(--card);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}
@media (min-width: 720px) { .bs { border-radius: var(--r-lg); } }

.bs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--rule-soft);
}
.bs-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
.x { border: none; background: none; font-size: 16px; cursor: pointer; color: var(--ink-3); padding: 4px 6px; }

.bs-body { padding: 18px; overflow: auto; }

.floor { margin: 0 0 6px; font-size: 12.5px; line-height: 1.8; color: var(--ink-3); }
.current { margin: 0 0 14px; font-size: 13px; color: var(--bid); }

.amount-label { display: block; font-size: 12.5px; color: var(--ink-3); margin-bottom: 6px; }

.amount-input {
  display: flex;
  align-items: baseline;
  gap: 8px;
  border-bottom: 2px solid var(--ink);
  padding: 4px 2px 8px;
}
.amount-input input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink);
  text-align: right;
}
.amount-input .yen { font-size: 15px; color: var(--ink-3); flex: none; }

.quick-label { display: block; margin: 18px 0 8px; }
.quick { display: flex; gap: 8px; }
.quick button {
  flex: 1;
  border: 1px solid var(--rule);
  background: var(--card);
  border-radius: var(--r-md);
  padding: 10px 6px;
  font-size: 13px;
  cursor: pointer;
}
.quick button:hover { border-color: var(--bid); color: var(--bid); }

.err { margin: 14px 0 0; font-size: 13px; color: var(--seal); }

/* 二次確認 */
.confirm { text-align: center; padding: 26px 18px 22px; }
.c-lead { margin: 0 0 14px; font-size: 13px; color: var(--ink-3); }
.c-amount {
  margin: 0;
  font-size: 44px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.1;
}
.c-amount span { font-size: 17px; margin-left: 6px; color: var(--ink-3); font-family: var(--font-body); }
.c-car { margin: 12px 0 0; font-size: 14px; color: var(--ink-2); }
.c-hint {
  margin: 18px 0 0;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--ink-3);
  background: var(--sheet);
  border-radius: var(--r-md);
  padding: 12px 14px;
  text-align: left;
}

.bs-foot {
  display: flex;
  gap: 10px;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--rule-soft);
}
.bs-foot .btn { flex: 1; }
</style>
