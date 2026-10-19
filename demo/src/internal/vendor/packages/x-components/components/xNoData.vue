<template>
    <section class="noData-box">
      <div class="text-wrap">{{ noDataText }}</div>
    </section>
  </template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps({
  text: {
    type: String,
    default: ""
  }
});
const noDataText = computed(() => props.text || t("noData"));
</script>

  <style lang="scss" scoped>
  .noData-box {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    margin: 18px auto 6px;
    .text-wrap {
      @include pingfang-regular(14px, 24px, left,#999999);
      padding-left: 40px;
      background: url(..//assets/noData/no-data.png) no-repeat left center;
      background-size: 32px 24px;
    }
  }
  </style>
