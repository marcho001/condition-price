<template>
  <section class="breadcrumb-box">
    <el-breadcrumb :separator-icon="ArrowRight">
      <template v-for="item in breadcrumbList" :key="item.text">
        <el-breadcrumb-item v-if="item.toRouter" :to="{ path: item.toRouter, query: item.query }">
          {{ $t(item.text) }}
        </el-breadcrumb-item>
        <el-breadcrumb-item v-else>{{ $t(item.text) }}</el-breadcrumb-item>
      </template>
    </el-breadcrumb>
    <slot></slot>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue';
const props = defineProps({
  breadcrumbList: {
    type: Array,
    default: () => []
  }
});
const breadcrumbList = computed(() => props.breadcrumbList);
</script>

<style lang="scss" scoped>
.breadcrumb-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 14px;
  font-size: 24px;
  color: var(--el-text-color-primary);
  line-height: 32px;
  font-weight: 400;
}
</style>
