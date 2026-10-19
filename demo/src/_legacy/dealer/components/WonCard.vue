<template>
  <RouterLink class="wc card" :to="{ name: 'detail', params: { roundId: award.roundId } }">
    <div class="body">
      <!-- カードに写真は載せない（写真は車両詳細ページのみ） -->
      <div class="title-row">
        <div class="tt">
          <h3>{{ view.makeName }} {{ view.seriesName }}</h3>
          <p class="grade">{{ view.modelName }}</p>
        </div>
        <span class="seal fig">{{ t('won.seal') }}</span>
      </div>

      <dl class="specs">
        <div><dt>年式</dt><dd class="fig">{{ view.carYear }}</dd></div>
        <div><dt>走行</dt><dd class="fig">{{ km(view.mileage) }}</dd></div>
        <div><dt>色</dt><dd>{{ view.color }}</dd></div>
      </dl>

      <dl class="lines">
        <div>
          <dt>{{ t('won.amount') }}</dt>
          <dd class="fig big">{{ yenJa(award.amount) }}</dd>
        </div>
        <div>
          <dt>{{ t('won.wonAt') }}</dt>
          <dd class="fig">{{ fmtDate(award.at) }}</dd>
        </div>
      </dl>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { vehicleView } from '@/shared/engine.js'
import { yenJa, fmtDate, km } from '@/shared/format.js'

const props = defineProps({
  award: { type: Object, required: true },
  vehicle: { type: Object, required: true }
})

const { t } = useI18n()
const view = computed(() => vehicleView(props.vehicle))
</script>

<style scoped>
.wc { display: block; transition: transform 0.16s ease; }
.wc:hover { transform: translateY(-2px); }

.body { padding: 15px; }

.title-row { display: flex; align-items: flex-start; gap: 12px; }
.tt { flex: 1; min-width: 0; }
h3 { margin: 0; font-size: 16px; font-weight: 600; }
.grade { margin: 2px 0 0; font-size: 12.5px; color: var(--ink-3); }

/* 朱肉の落款を模した落札スタンプ */
.seal {
  flex: none;
  width: 50px;
  height: 50px;
  border: 2.5px solid var(--seal);
  border-radius: 50%;
  color: var(--seal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  letter-spacing: 0.04em;
  transform: rotate(-9deg);
  font-family: var(--font-body);
  font-weight: 600;
}

.specs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 12px 0 0;
  border-top: 1px solid var(--rule-soft);
  border-bottom: 1px solid var(--rule-soft);
}
.specs > div { padding: 8px 0; }
.specs > div + div { border-left: 1px solid var(--rule-soft); padding-left: 10px; }
.specs dt { font-size: 10.5px; color: var(--ink-3); letter-spacing: 0.08em; }
.specs dd { margin: 1px 0 0; font-size: 13px; }

.lines { margin: 0; }
.lines > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule-soft);
}
.lines dt { font-size: 12px; color: var(--ink-3); }
.lines dd { margin: 0; font-size: 13.5px; }
.lines dd.big { font-size: 18px; font-weight: 600; color: var(--seal); }
</style>
