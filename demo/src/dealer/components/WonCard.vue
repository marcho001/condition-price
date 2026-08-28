<template>
  <RouterLink class="wc card" :to="{ name: 'detail', params: { roundId: award.roundId } }">
    <div class="ph">
      <img :src="photo" :alt="`${view.makeName} ${view.seriesName}`" loading="lazy" />
      <span class="seal fig">{{ t('won.seal') }}</span>
    </div>
    <div class="body">
      <h3>{{ view.makeName }} {{ view.seriesName }}</h3>
      <p class="grade">{{ view.modelName }}</p>
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
import { carPhoto, placeholderPhoto } from '@/shared/photos.js'
import { yenJa, fmtDate } from '@/shared/format.js'

const props = defineProps({
  award: { type: Object, required: true },
  vehicle: { type: Object, required: true }
})

const { t } = useI18n()
const view = computed(() => vehicleView(props.vehicle))
const photo = computed(() => {
  const first = props.vehicle.attachments.find((a) => a.category === 'CAR_PHOTO')
  return first ? first.dataUrl || carPhoto(first.kind, view.value) : placeholderPhoto()
})
</script>

<style scoped>
.wc { display: block; transition: transform 0.16s ease; }
.wc:hover { transform: translateY(-2px); }

.ph { position: relative; aspect-ratio: 16 / 10; background: var(--sheet-2); }
.ph img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* 朱肉の落款を模した落札スタンプ */
.seal {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 54px;
  height: 54px;
  border: 2.5px solid var(--seal);
  border-radius: 50%;
  color: var(--seal);
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  letter-spacing: 0.04em;
  transform: rotate(-9deg);
  font-family: var(--font-body);
  font-weight: 600;
}

.body { padding: 13px 15px 15px; }
h3 { margin: 0; font-size: 16px; font-weight: 600; }
.grade { margin: 2px 0 11px; font-size: 12.5px; color: var(--ink-3); }

.lines { margin: 0; border-top: 1px solid var(--rule-soft); }
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
