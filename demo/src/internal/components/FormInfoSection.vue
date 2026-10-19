<!--
  表单信息块容器 — 样式对齐 vehicle-transfer vehicleInfo.vue（info-section / info-card / card-title-regular）
-->
<template>
  <section class="form-info-section">
    <div class="info-card">
      <div class="card-title-regular flex-space-between form-info-section__head">
        <span class="form-info-section__title-text">{{ title }}</span>
        <slot name="titleExtra" />
      </div>
      <div class="form-info-section__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
});
</script>

<style lang="scss" scoped>
.form-info-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px 16px 0 16px;
  margin-top: 16px;

  &:first-child {
    margin-top: 0;
  }

  &__body {
    margin-top: 16px;
    padding-bottom: 16px;
  }

  :deep(.el-col) {
    position: relative;
  }
}
</style>
