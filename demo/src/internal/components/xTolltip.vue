<template>
  <el-tooltip :content="content" :placement="placement" :disabled="disabled">
    <slot :on-mouseenter="onMouseenter"></slot>
  </el-tooltip>
</template>

<script setup>
import { computed, ref } from 'vue';
const disabled = ref(true);
const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  placement: {
    type: String,
    default: 'top-start'
  }
});
const content = computed(() => props.content);
const placement = computed(() => props.placement);
const onMouseenter = (e) => {
  // 内容可见宽度小于实际宽度 显示tooltip
  if (e.target.clientWidth < e.target.scrollWidth) {
    disabled.value = false;
  } else {
    disabled.value = true;
  }
};
</script>

<style lang="scss" scoped></style>
