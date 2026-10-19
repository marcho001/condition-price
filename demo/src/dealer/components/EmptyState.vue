<script setup>
// 空狀態（Figma：车辆列表-空 等）。插圖暫用 Element Plus 預設圖，待設計提供 SVG 後替換
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-20 text-center">
    <el-empty :image-size="120" description=" " class="!p-0" />
    <div class="flex flex-col gap-2 px-4">
      <p class="text-base font-medium text-ink">{{ title }}</p>
      <p v-if="description" class="text-sm text-ink-hint">{{ description }}</p>
    </div>
  </div>
</template>
