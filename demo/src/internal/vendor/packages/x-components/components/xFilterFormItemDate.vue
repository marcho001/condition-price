<!-- FormItem.vue -->
<template>
  <el-form-item :label="label" :prop="prop" :rules="rules">
    <template v-if="type === 'input'">
      <el-input
        v-model="localValue"
        v-bind="bindAttrs"
        v-on="bindEvents"
        @input="emits('update:modelValue', $event)"
      />
    </template>
    <el-select
      v-if="type === 'select'"
      v-model="localValue"
      v-bind="bindAttrs"
      v-on="bindEvents"
      clearable
      @change="emits('update:modelValue', $event)"
    >
      <el-option
        v-for="option in selectionOptions"
        :key="option?.[optionsKeyMap.value]"
        :label="`${option?.[optionsKeyMap.label]}`"
        :value="option?.[optionsKeyMap.value]"
      />
    </el-select>
    <template v-else-if="type === 'date'">
      <el-date-picker
        v-model="localValue"
        type="date"
        v-bind="bindAttrs"
        v-on="bindEvents"
        @change="emits('update:modelValue', $event)"
        style="width: 100%"
        :teleported="false"
      />
    </template>
    <template v-else-if="type === 'datetime'">
      <el-date-picker
        v-model="localValue"
        type="datetime"
        v-bind="bindAttrs"
        v-on="bindEvents"
        @change="emits('update:modelValue', $event)"
        style="width: 100%"
        :teleported="false"
      />
    </template>
    <template v-else-if="type === 'daterange'">
      <el-date-picker
        v-model="localValue"
        ref="datePickerRef"
        type="daterange"
        v-bind="bindAttrs"
        v-on="bindEvents"
        @change="($event) => handlerDatePickerChange($event)"
        style="width: 100%"
        :teleported="false"
      />
    </template>
    <template v-else-if="type === 'datetimerange'">
      <el-date-picker
        v-model="localValue"
        ref="datePickerRef"
        type="datetimerange"
        v-bind="bindAttrs"
        v-on="bindEvents"
        @change="handleChange"
        style="width: 100%"
        :teleported="false"
      />
    </template>
  </el-form-item>
</template>

<script setup>
import { ElDatePicker } from 'element-plus';
import { computed, ref, watch } from 'vue';
import 'element-plus/theme-chalk/el-date-picker.css';
const emits = defineEmits(['update:modelValue']);
const props = defineProps({
  label: {
    type: String,
    required: true
  },
  prop: {
    type: String,
    required: true
  },
  rules: {
    type: Array,
    default: () => []
  },
  otherConfig: {
    type: Object,
    default: () => ({})
  },
  events: {
    type: Object,
    default: () => ({})
  },
  modelValue: {
    type: [String, Number, Date, Object, Array],
    default: () => ''
  },
  type: {
    type: String,
    required: true,
    validator: (value) =>
      ['input', 'select', 'date', 'datetime', 'daterange', 'datetimerange'].includes(value)
  },
  // 日历控件其他属性
  ...Object.keys(ElDatePicker.props).reduce((obj, key) => {
    obj[key] = null;
    return obj;
  }, {})
});
const datePickerRef = ref(null);
const localValue = ref(null);
const attrs = ref({ ...props });
// input的默认失去焦点事件
const _inputBlur = (e) => {
  localValue.value = e.target.value?.trim();
  handleChange(localValue.value);
};
// 绑定事件 并处理默认绑定
const bindEvents = computed(() => {
  // 如果是输入框，自动过滤前后空格
  if (props.type === 'input') {
    if (!props.events?.blur) {
      props.events.blur = _inputBlur;
    }
  }
  return props.events;
});

// select 选项列表数据
const selectionOptions = ref([]);
// 处理select选项列表数据value label
const optionsKeyMap = computed(() => {
  if (props.otherConfig?.optionsKeyMap) {
    return props.otherConfig?.optionsKeyMap;
  }
  return {
    value: 'dictKey',
    label: 'dictValue'
  };
});
// 初始化select 选项列表数据 - 直接传输局过来
watch(
  () => props.otherConfig?.options,
  (val) => {
    if (props.type === 'select') {
      selectionOptions.value = val || [];
    }
  },
  {
    immediate: true
  }
);
// 初始化select 选项列表数据 - 通过接口请求获取数据
watch(
  () => props.otherConfig?.apiHandler,
  (val) => {
    if (val && props.type === 'select') {
      val().then((res) => {
        if (res.code === '0000') {
          selectionOptions.value = res.data || [];
        }
      });
    }
  },
  {
    immediate: true
  }
);

// vmodel
watch(
  () => props.modelValue,
  (val) => {
    localValue.value = val;
  },
  {
    immediate: true
  }
);

// 处理每个表单项绑定属性
const bindAttrs = computed(() => {
  delete attrs.value.label;
  delete attrs.value.prop;
  delete attrs.value.rules;
  delete attrs.value.type;
  delete attrs.value.modelValue;
  delete attrs.value.otherConfig;
  // delete attrs.value.events;
  attrs.value.placeholder = props.placeholder || '';
  return attrs.value;
});
const handlerDatePickerChange = (val) => {
  emits('update:modelValue', val);
  datePickerRef.value?.blur();
};
// 值变更事件
const handleChange = (val) => {
  emits('update:modelValue', val);
};
</script>
<style lang="scss">
.el-popper {
  .el-select__selection {
    max-width: 200px !important;
    .el-select__selected-item {
      width: 100%;
      .el-tag {
        max-width: 100%;
        .el-tag_content {
          display: block;
        }
      }
    }
  }
}
</style>
