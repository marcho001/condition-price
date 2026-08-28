<template>
  <div v-if="round && vehicle" class="detail">
    <RouterLink class="crumb" :to="{ name: 'list' }">← {{ t('detail.backToList') }}</RouterLink>

    <div class="head">
      <div>
        <p v-if="round.round > 1" class="round-flag">{{ t('card.roundN', { n: round.round }) }}・{{ t('card.extraRound') }}</p>
        <h1>{{ view.makeName }} {{ view.seriesName }}</h1>
        <p class="grade">{{ view.modelName }}</p>
      </div>
    </div>

    <div class="cols">
      <div class="main-col">
        <section class="block">
          <h2 class="sec">{{ t('detail.photos') }}</h2>
          <PhotoGallery :photos="photos" />
        </section>

        <section class="block">
          <h2 class="sec">{{ t('detail.spec') }}</h2>
          <div class="card pad">
            <VehicleSpecSheet :vehicle="vehicle" />
          </div>
        </section>

        <section v-if="remark" class="block">
          <h2 class="sec">{{ t('detail.remark') }}</h2>
          <div class="card pad remark">{{ remark }}</div>
        </section>

        <section v-if="files.length" class="block">
          <h2 class="sec">{{ t('detail.attachments') }}</h2>
          <div class="card pad">
            <FilePreviewGrid :files="files" />
          </div>
        </section>
      </div>

      <aside class="side-col">
        <div class="card side-card">
          <div v-if="myAward" class="won-panel">
            <span class="won-seal">{{ t('won.seal') }}</span>
            <p class="won-label">{{ t('won.amount') }}</p>
            <p class="won-amount fig">{{ yenJa(myAward.amount) }}</p>
            <p class="won-date fig">{{ t('won.wonAt') }} {{ fmtDate(myAward.at) }}</p>
            <p class="note">{{ t('won.flowNote') }}</p>
          </div>
          <CountdownBoard v-else :round="round" size="lg" />
          <dl class="side-spec">
            <div>
              <dt>{{ t('detail.round') }}</dt>
              <dd>{{ t('card.roundN', { n: round.round }) }}</dd>
            </div>
            <div>
              <dt>{{ t('detail.period') }}</dt>
              <dd class="fig">{{ fmtDate(round.startDate) }} 〜 {{ fmtDate(round.endDate) }}</dd>
            </div>
            <div>
              <dt>{{ t('detail.startPrice') }}</dt>
              <dd class="fig strong">{{ yenJa(round.startPrice) }}</dd>
            </div>
          </dl>

          <p v-if="closed && !myAward" class="note closed-note">{{ t('detail.closedNote') }}</p>
          <p v-else-if="round.round > 1 && !myAward" class="note">{{ t('detail.extraNote') }}</p>

          <div v-if="!myAward" class="mybid" :class="{ on: myBid }">
            <span>{{ t('detail.myBid') }}</span>
            <template v-if="myBid">
              <b class="fig">{{ yenJa(myBid.amount) }}</b>
              <small class="fig">{{ t('detail.bidAt') }} {{ fmtDateTime(myBid.at) }}</small>
            </template>
            <b v-else class="none">{{ t('card.notBidYet') }}</b>
          </div>

          <button v-if="isDesktop && !myAward" class="btn btn-primary btn-block" :disabled="closed" @click="bidOpen = true">
            {{ closed ? t('detail.closedBtn') : myBid ? t('detail.editBid') : t('detail.bid') }}
          </button>
        </div>
      </aside>
    </div>

    <!-- モバイルの固定入札バー -->
    <div v-if="!isDesktop && !myAward" class="sticky-bar">
      <div class="sb-info">
        <span>{{ myBid ? t('detail.myBid') : t('detail.startPrice') }}</span>
        <b class="fig">{{ myBid ? yenJa(myBid.amount) : yenJa(round.startPrice) }}</b>
      </div>
      <button class="btn btn-primary" :disabled="closed" @click="bidOpen = true">
        {{ closed ? t('detail.closedBtn') : myBid ? t('detail.editBid') : t('detail.bid') }}
      </button>
    </div>

    <BidSheet :open="bidOpen" :round="round" :car-label="carLabel" @close="bidOpen = false" />
  </div>

  <EmptyState v-else :title="t('list.empty')" :desc="t('list.emptyDesc')" />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PhotoGallery from '../components/PhotoGallery.vue'
import VehicleSpecSheet from '../components/VehicleSpecSheet.vue'
import FilePreviewGrid from '../components/FilePreviewGrid.vue'
import CountdownBoard from '../components/CountdownBoard.vue'
import BidSheet from '../components/BidSheet.vue'
import EmptyState from '../components/EmptyState.vue'
import { db } from '@/shared/store.js'
import { roundById, vehicleById, vehicleView, bidOf, roundRemaining, awardOf } from '@/shared/engine.js'
import { carPhoto } from '@/shared/photos.js'
import { fmtDate, fmtDateTime, yenJa } from '@/shared/format.js'

const { t } = useI18n()
const route = useRoute()

const bidOpen = ref(false)
const isDesktop = ref(window.matchMedia('(min-width: 980px)').matches)
const mq = window.matchMedia('(min-width: 980px)')
const onMq = (e) => (isDesktop.value = e.matches)
onMounted(() => mq.addEventListener('change', onMq))
onUnmounted(() => mq.removeEventListener('change', onMq))

const round = computed(() => roundById(route.params.roundId))
const vehicle = computed(() => (round.value ? vehicleById(round.value.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))
const myBid = computed(() => (round.value ? bidOf(round.value.id, db.dealerSession) : null))
const closed = computed(() => !round.value || roundRemaining(round.value) <= 0)
// 自分が落札した車両では入札 UI を出さず、成約金額を表示する
const myAward = computed(() => {
  const a = vehicle.value ? awardOf(vehicle.value.id) : null
  return a && a.dealerId === db.dealerSession ? a : null
})
const remark = computed(() => view.value.remark)
const carLabel = computed(() => `${view.value.makeName} ${view.value.seriesName} ${view.value.modelName}`)

const GALLERY = ['CAR_PHOTO', 'CHECK_SHEET', 'METER', 'PART']

const photos = computed(() =>
  (vehicle.value?.attachments || [])
    .filter((a) => GALLERY.includes(a.category))
    .map((a) => ({ id: a.id, name: a.name, src: a.dataUrl || carPhoto(a.kind, view.value) }))
)

const files = computed(() =>
  (vehicle.value?.attachments || [])
    .filter((a) => !GALLERY.includes(a.category))
    .map((a) => ({
      id: a.id,
      name: a.name,
      mime: a.mime,
      src: a.dataUrl || carPhoto(a.kind, view.value)
    }))
)
</script>

<style scoped>
.crumb { font-size: 13px; color: var(--ink-3); }
.crumb:hover { color: var(--bid); }

.head { margin: 12px 0 18px; }
.round-flag {
  margin: 0 0 6px;
  display: inline-block;
  background: var(--seal);
  color: #fff;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: 4px;
}
h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.01em; line-height: 1.4; }
.grade { margin: 3px 0 0; font-size: 13.5px; color: var(--ink-3); }

.cols { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 980px) { .cols { grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; } }

.block { margin-bottom: 22px; }

.sec {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.16em;
  color: var(--ink-3);
  font-weight: 600;
}

.card.pad { padding: 4px 16px 12px; }
.remark {
  padding: 15px 16px;
  font-size: 14px;
  line-height: 1.95;
  color: var(--ink-2);
  white-space: pre-wrap;
  border-left: 3px solid var(--amber);
}

.side-col { order: -1; }
@media (min-width: 980px) { .side-col { order: 0; } }

.side-card { padding: 14px; position: static; }
@media (min-width: 980px) { .side-card { position: sticky; top: 82px; } }

.side-spec { margin: 14px 0 0; }
.side-spec > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--rule-soft);
}
.side-spec dt { font-size: 12.5px; color: var(--ink-3); }
.side-spec dd { margin: 0; font-size: 13.5px; text-align: right; }
.side-spec dd.strong { font-size: 16px; font-weight: 600; }

.note {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.85;
  color: var(--amber);
  background: #fdf7ec;
  border-radius: var(--r-sm);
  padding: 9px 11px;
}

.mybid {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--sheet);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mybid span { font-size: 11.5px; color: var(--ink-3); letter-spacing: 0.08em; }
.mybid b { font-size: 20px; font-weight: 600; }
.mybid b.none { font-size: 14px; font-weight: 500; color: var(--ink-3); }
.mybid small { font-size: 11px; color: var(--ink-3); }
.mybid.on { background: var(--bid-soft); }
.mybid.on b { color: var(--bid); }

.side-card .btn { margin-top: 14px; }

.note.closed-note { color: var(--ink-3); background: var(--sheet); }

.won-panel { text-align: center; padding: 6px 4px 2px; position: relative; }
.won-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border: 2.5px solid var(--seal);
  border-radius: 50%;
  color: var(--seal);
  font-size: 18px;
  font-weight: 600;
  transform: rotate(-9deg);
  margin-bottom: 12px;
}
.won-label { margin: 0; font-size: 11.5px; letter-spacing: 0.1em; color: var(--ink-3); }
.won-amount { margin: 2px 0 0; font-size: 28px; font-weight: 600; color: var(--seal); }
.won-date { margin: 4px 0 0; font-size: 12px; color: var(--ink-3); }

.sticky-bar {
  position: fixed;
  left: 0; right: 0;
  bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
  z-index: 50;
  background: var(--card);
  border-top: 1px solid var(--rule);
  box-shadow: var(--shadow-bar);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sb-info { display: flex; flex-direction: column; line-height: 1.3; }
.sb-info span { font-size: 10.5px; color: var(--ink-3); letter-spacing: 0.08em; }
.sb-info b { font-size: 17px; font-weight: 600; }
.sticky-bar .btn { flex: 1; }
</style>
