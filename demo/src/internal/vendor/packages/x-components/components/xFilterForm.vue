<template>
  <section class="filter-box">
    <div class="card-title" v-if="title">{{ title }}</div>
    <el-form ref="formRef" label-position="top" :model="internalForm">
      <el-row :gutter="32" justify="space-between">
        <el-col
          v-for="(item, index) in formItemsVisible"
          v-show="formItemShow || index < defaultVisibleNum"
          :span="6"
          :key="index"
        >
          <el-form-item
            v-if="item.slotName"
            :label="item.label"
            :prop="item.prop"
            :rules="item.rules"
          >
            <slot :name="item.slotName"></slot>
          </el-form-item>
          <xFilterFormItemDate
            v-if="['date', 'datetime', 'daterange', 'datetimerange'].includes(item.type)"
            :label="item.label"
            :prop="item.prop"
            :type="item.type"
            :otherConfig="item?.otherConfig"
            :events="item.events"
            v-bind="item.attrs"
            :model-value="internalForm[item.prop]"
            @update:modelValue="($event) => updateFormValue(item, $event)"
          />
          <x-filter-form-item
            v-else
            :label="item.label"
            :prop="item.prop"
            :type="item.type"
            :otherConfig="item?.otherConfig"
            :events="item.events"
            v-bind="item.attrs"
            :model-value="internalForm[item.prop]"
            @update:modelValue="($event) => updateFormValue(item, $event)"
          />
        </el-col>
        <el-col
          :span="((4 - ((formItemsVisible?.length + 1) % 4)) % 4) * 6"
          v-show="formItemShow"
        ></el-col>
        <el-col
          :span="((4 - ((defaultVisibleNum + 1) % 4)) % 4) * 6"
          v-show="!formItemShow"
        ></el-col>
        <el-col :span="6">
          <el-form-item :label="'&nbsp;'">
            <div class="filter-btn-wrap">
              <!-- <el-button @click="handleReset">{{ $t('cancel') }}</el-button>
              <el-button @click="handleQuery" type="primary">{{ $t('query') }}</el-button>
              <el-button @click="handleExpand" v-if="formItemsVisible?.length > defaultVisibleNum">
                {{ formItemShow ? $t('collapse') : $t('expand') }}
              </el-button> -->
              <el-button
                v-for="(item, index) in actionConfig"
                :key="`${item.type}-${index}`"
                @click="item.handler"
                :type="item.buttonType || 'default'"
              >
                {{
                  item.type !== 'expand'
                    ? item.label
                    : formItemShow
                      ? item.labelArr?.[1]
                      : item.labelArr?.[0]
                }}
              </el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import xFilterFormItem from './xFilterFormItem.vue';
import xFilterFormItemDate from './xFilterFormItemDate.vue';
import { useI18n } from 'vue-i18n';
import { useEnterEvent } from '@packages/utils/hooks/useEnterEvent';
const { t } = useI18n();

const emits = defineEmits(['handleFilter', 'update:modelValue', 'update:expandState']);
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  initFilter: {
    type: Object,
    default: () => ({})
  },
  title: {
    type: String,
    default: ''
  },
  filterFormItems: {
    type: Array,
    default: () => []
  },
  defaultVisibleNum: {
    type: Number,
    default: 3
  },
  actionConfig: {
    type: Array,
    default: () => []
  },
  expandState: {
    type: Boolean,
    default: false
  },
  listenEnter: {
    type: Boolean,
    default: false
  }
});
const formRef = ref();
const formItemShow = ref(props.expandState); // 是否展开

// 可见的筛选项
const formItemsVisible = computed(() => {
  return props.filterFormItems.filter(
    (item) =>
      (item?.show !== false && typeof item.show !== 'function') ||
      (typeof item.show === 'function' && item.show() !== false)
  );
});
// 默认展示几个筛选项
const defaultVisibleNum = computed(() =>
  props.defaultVisibleNum <= formItemsVisible.value?.length || 0
    ? props.defaultVisibleNum
    : formItemsVisible.value?.length || 0
);
// 如果默认展示的筛选项等于总个数，展开收起按钮处理成展开，否则收起
watch(
  () => defaultVisibleNum.value - (formItemsVisible.value?.length || 0),
  (val) => {
    formItemShow.value = props.expandState || val === 0;
  },
  {
    immediate: true
  }
);
watch(
  () => formItemShow.value,
  (val) => {
    emits('update:expandState', val);
  },
  {
    immediate: true
  }
);
// 暂存表单默认值
const internalFormInit = computed(() => JSON.parse(JSON.stringify(props.initFilter)));
// 双向绑定的表单值
const internalForm = ref({});
watch(
  () => props.modelValue,
  (val) => {
    internalForm.value = val;
  },
  {
    immediate: true
  }
);
// 处理查询
const handleQuery = () => {
  emits('handleFilter', internalForm.value);
};
props.listenEnter && useEnterEvent(handleQuery);
// 处理重置
const handleReset = () => {
  formItemShow.value = false;
  formRef.value.resetFields();
  internalForm.value = JSON.parse(JSON.stringify(internalFormInit.value));
  formItemsVisible.value.forEach((item) => {
    if (['daterange', 'datetimerange'].includes(item.type)) {
      _hanleChangeDate(item, internalForm.value);
    }
  });
  emits('update:modelValue', internalForm.value);
  handleQuery();
};
const handleExpand = () => {
  formItemShow.value = !formItemShow.value;
};
// 变更表单数据
const updateFormValue = (item, val) => {
  internalForm.value[item.prop] = val;
  emits('update:modelValue', internalForm.value);
  if (['daterange', 'datetimerange'].includes(item.type)) {
    _hanleChangeDate(item, val);
  }
};
// 处理日历控件参数
const _hanleChangeDate = (item, val) => {
  const { start, end } = item?.otherConfig || {};
  if (!(start?.key && end?.key)) {
    throw new Error('请设置日历区间参数的名称');
  } else {
    console.log(val, '----');
    internalForm.value[start?.key] = val
      ? val[0]
        ? `${(val[0] + ' ' + (start?.defaultTime || '')).trimEnd()}`
        : ''
      : '';
    internalForm.value[end?.key] = val
      ? val[1]
        ? `${(val[1] + ' ' + (end?.defaultTime || '')).trimEnd()}`
        : ''
      : '';
    emits('update:modelValue', internalForm.value);
  }
};
const actionDefaultConfig = {
  reset: {
    label: t('cancel'),
    handler: handleReset
  },
  query: {
    label: t('query'),
    handler: handleQuery,
    buttonType: 'primary'
  },
  expand: {
    label: `${t('expand')}***${t('collapse')}`, // *** 前边为展开文案 后边为
    handler: handleExpand
  }
};
// 按钮数据初始化
const actionConfig = computed(() => {
  let tmpArr = [];
  if (!props.actionConfig || !props.actionConfig?.length) {
    tmpArr = [
      {
        type: 'reset',
        ...actionDefaultConfig.reset
      },
      {
        type: 'query',
        ...actionDefaultConfig.query
      },
      {
        type: 'expand',
        ...actionDefaultConfig.expand,
        labelArr: actionDefaultConfig.expand?.label?.split('***')
      }
    ];
  } else {
    tmpArr = props.actionConfig.map((item) => {
      item = { ...(actionDefaultConfig[item.type] || {}), ...item };
      if (item.type === 'expand') {
        item.labelArr = item.label?.split('***') || [];
      }
      item.handler = item.handler || (() => {});
      return item;
    });
  }

  if (formItemsVisible.value?.length <= defaultVisibleNum.value) {
    tmpArr.pop();
  }
  return tmpArr;
});
defineExpose({
  handleReset
});
</script>

<style lang="scss" scoped>
.card-title {
  @include pingfang-bold(16px, 24px);
  margin-bottom: 16px;
}
.filter-box {
  background-color: #ffffff;
  border-radius: 16px;
  .btn-list {
    margin-top: 24px;
  }
  .btn-m-l {
    margin-top: 24px;
    .el-button + .el-button {
      margin-left: 5px !important;
    }
  }
}
</style>
