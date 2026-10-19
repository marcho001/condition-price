<script setup>
// Demo 專用：登入頁下方的一鍵帶入帳號清單（正式站沒有）。
// 列出全部廠商與目前狀態，停用、鎖定中的帳號也列出，用來確認登入被拒的行為
import { computed } from 'vue'
import { db } from '../../shared/store.js'

const emit = defineEmits(['fill'])

const dealers = computed(() =>
  db.dealers.map((d) => ({
    ...d,
    state: d.locked ? 'ロック中' : d.status !== 'ACTIVE' ? '停用' : null,
  })),
)
</script>

<template>
  <section class="flex flex-col gap-3 rounded-lg border border-dashed border-brand/40 bg-brand/5 p-4">
    <div class="flex flex-col gap-1">
      <p class="text-xs font-bold tracking-widest text-brand">DEMO ACCOUNTS</p>
      <p class="text-xs text-ink-regular">クリックで Email・パスワードを入力します（Demo 専用。本番画面にはありません）。</p>
    </div>
    <div class="flex flex-col gap-2">
      <button
        v-for="(dealer, i) in dealers"
        :key="dealer.id"
        type="button"
        class="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-left hover:border-brand"
        @click="emit('fill', { email: dealer.email, password: dealer.password })"
      >
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold text-ink">
            {{ dealer.name }}
            <span v-if="i === 0" class="ml-1 text-xs font-bold text-brand">おすすめ</span>
          </span>
          <span class="truncate text-xs text-ink-hint">{{ dealer.email }}</span>
        </span>
        <span v-if="dealer.state" class="shrink-0 rounded bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
          {{ dealer.state }}
        </span>
      </button>
    </div>
  </section>
</template>
