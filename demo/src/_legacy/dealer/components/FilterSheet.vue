<template>
  <teleport to="body">
    <div v-if="open" class="fs-backdrop" @click.self="$emit('close')">
      <section class="fs" role="dialog" aria-modal="true">
        <header class="fs-head">
          <h2>{{ t('list.filterTitle') }}</h2>
          <button class="x" type="button" :aria-label="t('common.close')" @click="$emit('close')">✕</button>
        </header>

        <div class="fs-body">
          <div class="field">
            <label for="f-maker">{{ t('list.maker') }}</label>
            <input id="f-maker" v-model.trim="local.keyword" class="input" :placeholder="t('list.makerPh')" />
          </div>

          <div class="field">
            <label for="f-year">{{ t('list.year') }}</label>
            <select id="f-year" v-model="local.year" class="input">
              <option value="">{{ t('list.all') }}</option>
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div class="field">
            <label for="f-mile">{{ t('list.mileage') }}</label>
            <select id="f-mile" v-model="local.mileage" class="input">
              <option value="">{{ t('list.mileageAny') }}</option>
              <option value="u3">{{ t('list.mileageUnder3') }}</option>
              <option value="3-6">{{ t('list.mileage3to6') }}</option>
              <option value="6-10">{{ t('list.mileage6to10') }}</option>
              <option value="o10">{{ t('list.mileageOver10') }}</option>
            </select>
          </div>

          <div class="field">
            <label for="f-color">{{ t('list.color') }}</label>
            <select id="f-color" v-model="local.color" class="input">
              <option value="">{{ t('list.all') }}</option>
              <option v-for="c in colors" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div v-if="showBidState" class="field">
            <label>{{ t('list.bidState') }}</label>
            <div class="seg">
              <button
                v-for="opt in bidStates"
                :key="opt.v"
                type="button"
                :class="{ on: local.bidState === opt.v }"
                @click="local.bidState = opt.v"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <footer class="fs-foot">
          <button class="btn btn-ghost" type="button" @click="clear">{{ t('common.clear') }}</button>
          <button class="btn btn-primary" type="button" @click="apply">{{ t('common.apply') }}</button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  open: Boolean,
  modelValue: { type: Object, required: true },
  years: { type: Array, default: () => [] },
  colors: { type: Array, default: () => [] },
  showBidState: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue', 'close'])

const { t } = useI18n()
const local = reactive({ ...props.modelValue })

watch(
  () => props.open,
  (v) => {
    if (v) Object.assign(local, props.modelValue)
  }
)

const bidStates = computed(() => [
  { v: '', label: t('list.all') },
  { v: 'no', label: t('list.notBid') },
  { v: 'yes', label: t('list.bidded') }
])

function apply() {
  emit('update:modelValue', { ...local })
  emit('close')
}
function clear() {
  Object.assign(local, { keyword: '', year: '', mileage: '', color: '', bidState: '' })
  apply()
}
</script>

<style scoped>
.fs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(18, 21, 26, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

@media (min-width: 720px) { .fs-backdrop { align-items: center; } }

.fs {
  width: 100%;
  max-width: 520px;
  background: var(--card);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}

@media (min-width: 720px) { .fs { border-radius: var(--r-lg); } }

.fs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--rule-soft);
}
.fs-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
.x { border: none; background: none; font-size: 16px; cursor: pointer; color: var(--ink-3); padding: 4px 6px; }

.fs-body { padding: 18px; overflow: auto; }

.seg { display: flex; border: 1px solid var(--rule); border-radius: var(--r-md); overflow: hidden; }
.seg button {
  flex: 1;
  border: none;
  background: var(--card);
  padding: 11px 6px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--ink-3);
}
.seg button + button { border-left: 1px solid var(--rule); }
.seg button.on { background: var(--bid); color: #fff; }

.fs-foot {
  display: flex;
  gap: 10px;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--rule-soft);
}
.fs-foot .btn { flex: 1; }
</style>
