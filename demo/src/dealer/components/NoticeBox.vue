<script setup>
// 彈窗與頁面中「金額／件數＋說明」的淡色區塊（Figma：Your-Bid-Card）
// tone：brand 一般資訊、danger 取消與刪除、success 落札
defineProps({
  tone: { type: String, default: 'brand', validator: (v) => ['brand', 'danger', 'success'].includes(v) },
})
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border p-4" :class="`notice-box--${tone}`">
    <slot />
  </div>
</template>

<style scoped>
.notice-box--brand {
  background: rgb(5 104 255 / 0.04);
  border-color: rgb(5 104 255 / 0.08);
  --tone: var(--color-brand);
}
.notice-box--danger {
  background: rgb(168 7 26 / 0.04);
  border-color: rgb(168 7 26 / 0.04);
  --tone: var(--color-danger);
}
.notice-box--success {
  background: rgb(22 163 74 / 0.04);
  border-color: rgb(22 163 74 / 0.08);
  --tone: var(--color-success);
}
</style>
