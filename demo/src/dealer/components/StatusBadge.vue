<script setup>
// 圖片左上角與通知列表的小標籤（Figma：Custom-Badge）
defineProps({
  tone: { type: String, default: 'brand', validator: (v) => ['brand', 'warning', 'success'].includes(v) },
})
const bgClass = { brand: 'bg-brand', warning: 'bg-warning', success: 'bg-success' }
</script>

<template>
  <span class="inline-flex h-6 items-center rounded px-2 text-sm font-medium whitespace-nowrap text-white" :class="bgClass[tone]">
    <slot />
  </span>
</template>
