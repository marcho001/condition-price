<template>
  <RouterLink class="ac card" :to="{ name: 'detail', params: { roundId: round.id } }">
    <!-- 締切看板は写真がなくなってもカードの要 —— カード上端に横帯として残す -->
    <CountdownBoard class="board-top" :round="round" />

    <div class="body">
      <div class="title-row">
        <h3>{{ view.makeName }} {{ view.seriesName }}</h3>
        <!-- 追加ラウンドのみ標記（第何ラウンドかは表示しない）。初回ラウンドは無標記 -->
        <span v-if="isExtraRound" class="round-tag">{{ t('card.extraRound') }}</span>
      </div>
      <p class="grade">{{ view.modelName }}</p>

      <!-- カードに写真は載せない（写真は車両詳細ページのみ）。文字情報で車両を識別する -->
      <dl class="specs">
        <div><dt>年式</dt><dd class="fig">{{ view.carYear }}</dd></div>
        <div><dt>走行</dt><dd class="fig">{{ km(view.mileage) }}</dd></div>
        <div><dt>色</dt><dd>{{ view.color }}</dd></div>
      </dl>

      <div class="foot">
        <div class="pair">
          <span>{{ t('card.period') }}</span>
          <b class="fig period">{{ fmtDate(round.startDate) }} 〜 {{ fmtDate(round.endDate) }}</b>
        </div>
        <!-- 第一輪は開始価格を提示しない（追加ラウンドのみ表示） -->
        <div v-if="isExtraRound" class="pair">
          <span>{{ t('card.startPrice') }}</span>
          <b class="fig">{{ yenJa(round.startPrice) }}</b>
        </div>
        <div class="pair mine" :class="{ on: myBid }">
          <span>{{ t('card.myBid') }}</span>
          <b v-if="myBid" class="fig">{{ yenJa(myBid.amount) }}</b>
          <b v-else class="none">{{ t('card.notBidYet') }}</b>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CountdownBoard from './CountdownBoard.vue'
import { vehicleView, bidOf } from '@/shared/engine.js'
import { km, yenJa, fmtDate } from '@/shared/format.js'
import { db } from '@/shared/store.js'

const props = defineProps({
  round: { type: Object, required: true },
  vehicle: { type: Object, required: true }
})

const { t } = useI18n()
const view = computed(() => vehicleView(props.vehicle))
const myBid = computed(() => bidOf(props.round.id, db.dealerSession))
const isExtraRound = computed(() => props.round.round > 1)
</script>

<style scoped>
.ac {
  display: block;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.ac:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(18,21,26,.05), 0 14px 30px rgba(18,21,26,.10); }

.board-top { display: block; }

.body { padding: 13px 15px 15px; }

.title-row { display: flex; align-items: baseline; gap: 8px; }
h3 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.01em; flex: 1; min-width: 0; }

.round-tag {
  flex: none;
  background: var(--seal);
  color: #fff;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: 4px;
}

.grade {
  margin: 2px 0 11px;
  font-size: 12.5px;
  color: var(--ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 出品票の罫線グリッド */
.specs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  border-top: 1px solid var(--rule-soft);
  border-bottom: 1px solid var(--rule-soft);
}
.specs > div { padding: 8px 0; }
.specs > div + div { border-left: 1px solid var(--rule-soft); padding-left: 10px; }
.specs dt { font-size: 10.5px; color: var(--ink-3); letter-spacing: 0.08em; }
.specs dd { margin: 1px 0 0; font-size: 13px; }

.foot { margin-top: 11px; display: flex; flex-direction: column; gap: 5px; }
.pair { display: flex; align-items: baseline; justify-content: space-between; font-size: 12px; color: var(--ink-3); }
.pair b { font-size: 15px; color: var(--ink); }
.pair.mine b { color: var(--bid); }
.pair.mine b.none { color: var(--ink-3); font-size: 12.5px; font-weight: 500; }
.pair b.period { font-size: 12.5px; font-weight: 500; letter-spacing: 0.02em; }
</style>
