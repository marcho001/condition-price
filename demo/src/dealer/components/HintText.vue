<script setup>
import { InfoFilled } from '@element-plus/icons-vue'
</script>

<template>
  <p class="flex items-start gap-1 text-xs leading-[18px] text-ink-hint">
    <el-icon class="mt-0.5 shrink-0" :size="14"><InfoFilled /></el-icon>
    <span><slot /></span>
  </p>
</template>
