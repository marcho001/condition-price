<script setup>
// 全站彈窗的共用外框（Figma：modal-dialog-card，PC 寬 560、手機寬 335）
defineProps({
  title: { type: String, required: true },
  width: { type: String, default: 'min(560px, calc(100vw - 40px))' },
})
const visible = defineModel({ type: Boolean, default: false })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    class="app-dialog"
    :width="width"
    align-center
    append-to-body
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <div class="flex gap-4">
        <slot name="footer" />
      </div>
    </template>
  </el-dialog>
</template>

<style>
/* el-dialog 會被移到 body 底下，因此不使用 scoped */
.app-dialog.el-dialog {
  padding: 0;
  border-radius: 16px;
}
.app-dialog .el-dialog__header {
  padding: 24px 24px 0;
}
.app-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}
.app-dialog .el-dialog__headerbtn {
  top: 12px;
  right: 12px;
}
.app-dialog .el-dialog__body {
  padding: 24px;
}
.app-dialog .el-dialog__footer {
  padding: 0 24px 24px;
}
.app-dialog .el-dialog__footer .el-button {
  flex: 1;
  height: 48px;
  margin: 0;
  font-size: 16px;
}
</style>
