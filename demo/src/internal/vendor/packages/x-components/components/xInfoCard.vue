<template>
  <section class="info-section">
    <div class="info-title" v-if="title">
      {{ title }}
      <slot name="title-right"></slot>
    </div>
    <div class="info-card" :class="data.length ? 'mb--24' : ''">
      <template v-for="tile in rowNum" :key="`row--${tile}`">
        <el-row :gutter="32" v-if="!inline">
          <template v-for="(item, index) in data" :key="`${index}-${item.label}`">
            <el-col :span="span" class="info-item" v-if="Math.ceil((index + 1) / cols) === tile">
              <div class="u-value" :style="item.color ? { color: item.color } : {}">
                <!-- 自定义展示插槽（仅默认展示，不含编辑态） -->
                <template v-if="item.displaySlot">
                  <slot :name="item.displaySlot" :item="item" />
                </template>
                <!-- 输入框型 -->
                <template v-else-if="item.editShow && item.editType === 'input'">
                  <el-input
                    v-show="isEditingRow(item)"
                    v-model="editFormData[item.field]"
                    :ref="(el) => (inputRefs[index] = el)"
                    :type="item.inputType"
                    :maxlength="item.inputMaxlength"
                    :minlength="item.inputMinlength || 0"
                    :style="{ width: `${item.inputWidth || '100%'}` }"
                    :class="[
                      'input_wrapper',
                      (!item.inputWidth || !item.inputWidth.endsWith('px')) && 'auto_width'
                    ]"
                    placeholder=""
                    @blur="onBlur(item)"
                  />
                  <span v-if="!isEditingRow(item)" :style="{ opacity: isEditingRow(item) ? 0 : 1 }">
                    {{ getInputDisplayValue(item) }}{{ getInputDisplayUnit(item) }}
                  </span>
                </template>

                <!-- 选择框型 -->
                <template v-else-if="item.editShow && item.editType === 'select'">
                  <el-select
                    v-if="isEditingRow(item)"
                    v-model="editFormData[item.field]"
                    :ref="(el) => (inputRefs[index] = el)"
                    :style="{ width: `${item.inputWidth || '100%'}` }"
                    :class="[
                      'input_wrapper',
                      (!item.inputWidth || !item.inputWidth.endsWith('px')) && 'auto_width'
                    ]"
                    placeholder=""
                    @change="(value) => onChange(item, value)"
                    @blur="onBlur(item)"
                  >
                    <el-option
                      v-for="(dict, di) in item.options || getDictItemList(item.dictName, 'ja')"
                      :key="di"
                      :label="dict.dictValue"
                      :value="dict.dictKey"
                      :disabled="dict.disabled"
                    />
                  </el-select>
                  <span :style="{ opacity: isEditingRow(item) ? 0 : 1 }">
                    <template v-if="item.dictName">
                      {{
                        getJaDictValue(
                          editFormData[item.field] || editFormData[item.field] || '',
                          item.dictName
                        )
                      }}
                    </template>
                    <template v-else-if="item.options">
                      {{
                        item.formatDisplayValue
                          ? item.formatDisplayValue(
                              getDictionaryValueByKey(
                                editFormData[item.field] || '',
                                item.options,
                                'dictKey',
                                'dictValue'
                              ) ||
                                item.valueName ||
                                editFormData[item.field]
                            )
                          : getDictionaryValueByKey(
                              editFormData[item.field] || '',
                              item.options,
                              'dictKey',
                              'dictValue'
                            ) ||
                            item.valueName ||
                            editFormData[item.field]
                      }}
                    </template>
                    <template v-else>
                      {{
                        item.formatDisplayValue
                          ? item.formatDisplayValue(editFormData[item.field])
                          : editFormData[item.field]
                      }}
                    </template>
                  </span>
                </template>

                <!-- 级联选择框型 -->
                <template v-else-if="item.editShow && item.editType === 'cascader'">
                  <template v-if="isEditingRow(item)">
                    <el-cascader
                      :ref="(el) => (inputRefs[index] = el)"
                      v-model="editFormData[item.field]"
                      :options="item.options"
                      @change="(value) => onChange(item, value)"
                      :separator="item.separator || ''"
                      @blur="onBlur(item)"
                      @visible-change="(show) => !show && closeEdit(item)"
                    />
                  </template>
                  <span :style="{ opacity: isEditingRow(item) ? 0 : 1 }">
                    {{
                      item.valueName ||
                      (item.value &&
                      Array.isArray(item.value) &&
                      item.value.some((v) => v !== null && v !== undefined)
                        ? item.value.join('')
                        : '')
                    }}
                  </span>
                </template>

                <!-- 日期框型 -->
                <template
                  v-else-if="
                    item.editShow && (item.editType === 'date' || item.editType === 'month')
                  "
                >
                  <span
                    v-if="isEditingRow(item)"
                    :class="[
                      'input_wrapper',
                      (!item.inputWidth || !item.inputWidth.endsWith('px')) && 'auto_width'
                    ]"
                    :style="{ width: `${item.inputWidth || '100%'}` }"
                  >
                    <el-date-picker
                      v-model="editFormData[item.field]"
                      :ref="(el) => (inputRefs[index] = el)"
                      :type="item.editType"
                      placeholder=""
                      :format="item.dateFormat || 'YYYY年MM月DD日'"
                      :value-format="item.dateValueFormat || 'YYYY年MM月DD日'"
                      :default-value="
                        editFormData[item.field]
                          ? new Date(editFormData[item.field])
                          : item.defaultDate || new Date()
                      "
                      :clearable="false"
                      :editable="false"
                      @blur="onBlur(item)"
                      @change="closeEdit(item)"
                      @visible-change="(visibility) => visibleChangeDate(visibility, item)"
                    />
                  </span>
                  <span :style="{ opacity: isEditingRow(item) ? 0 : 1 }">
                    {{
                      (() => {
                        if (item.value) return item.value;
                        const value = editFormData[item.field];
                        if (!value) return '';
                        const parseFormat =
                          item.dateValueFormat || item.dateFormat || 'YYYY年MM月DD日';
                        const displayFormat = item.dateFormat || 'YYYY年MM月DD日';
                        const date = dayjs(value, parseFormat);
                        return date.isValid() ? date.format(displayFormat) : value;
                      })()
                    }}
                  </span>
                </template>

                <!-- 父级插槽渲染（如邮编联想） -->
                <template v-else-if="item.editShow && item.editType === 'slot'">
                  <template v-if="isEditingRow(item)">
                    <div
                      :class="[
                        'input_wrapper',
                        (!item.inputWidth || !item.inputWidth.endsWith('px')) && 'auto_width'
                      ]"
                      :style="{ width: `${item.inputWidth || '100%'}` }"
                    >
                      <slot
                        name="value-slot"
                        :item="item"
                        :model="editFormData"
                        :notify-change="() => emit('change', item)"
                        :finish-edit="() => closeEdit(item)"
                      ></slot>
                    </div>
                  </template>
                  <span v-if="!isEditingRow(item)" :style="{ opacity: isEditingRow(item) ? 0 : 1 }">
                    {{
                      item.formatDisplayValue
                        ? item.formatDisplayValue(editFormData[item.field] ?? item.value)
                        : (editFormData[item.field] ?? item.value)
                    }}{{ item.unit }}
                  </span>
                </template>

                <template v-else-if="item.editShow && item.editType === 'custom'">
                  {{
                    item.formatDisplayValue
                      ? item.formatDisplayValue(editFormData[item.field])
                      : editFormData[item.field]
                  }}
                </template>

                <template v-else>
                  <template v-if="item.dictName">
                    {{ getJaDictValue(item.value || '', item.dictName) || item.value
                    }}{{ item.unit }}
                  </template>
                  <template v-else-if="item.options">
                    {{
                      getDictionaryValueByKey(
                        item.value || '',
                        item.options,
                        'dictKey',
                        'dictValue'
                      ) ||
                      item.valueName ||
                      editFormData?.[item.field]
                    }}{{ item.unit }}
                  </template>
                  <template v-else>
                    {{
                      (() => {
                        const model = editFormData;
                        const raw =
                          model != null &&
                          item.field != null &&
                          item.field !== '' &&
                          typeof model === 'object' &&
                          item.field in model
                            ? model[item.field]
                            : item.value;
                        return item.formatDisplayValue
                          ? item.formatDisplayValue(raw)
                          : raw || defauleValue;
                      })()
                    }}{{ item.unit }}
                  </template>
                </template>

                <i
                  v-if="item.editShow && item.editType === 'custom'"
                  class="edit_icon"
                  @click="emit('toEdit', item)"
                />

                <el-icon
                  v-else-if="item.editShow && item.editType === 'slot' && !isEditingRow(item)"
                  class="edit_icon"
                  @click="openSlotEdit(item)"
                >
                  <EditPen />
                </el-icon>

                <el-icon
                  v-else-if="item.editShow && item.editType && !isEditingRow(item)"
                  class="edit_icon"
                  @click="toEdit(item, index)"
                />
              </div>
            </el-col>
          </template>
        </el-row>
        <el-row :gutter="32">
          <template v-for="(item, index) in data" :key="`${index}-${item.label}`">
            <el-col
              :span="span"
              class="info-item info-item-label"
              :class="inline ? 'flex-start' : ''"
              v-if="Math.ceil((index + 1) / cols) === tile"
            >
              <div class="u-label">
                {{ item.label }}
                <slot name="label-right" :item="item"></slot>
              </div>
              <div class="u-value" v-if="inline">{{ item.value }}</div>
            </el-col>
          </template>
        </el-row>
      </template>
      <xNoData v-if="title && !data.length"></xNoData>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import xNoData from './xNoData.vue';
import { useDictStore } from '@/store';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { getDictionaryValueByKey } from '../../utils/tools';
import { dayjs } from 'element-plus';

const { getDictItemList, getJaDictValue } = useDictStore();
const { t } = useI18n();
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  data: {
    type: Array,
    default: () => []
  },
  cols: {
    type: Number,
    default: 3
  },
  defauleValue: {
    type: String,
    default: ''
  },
  inline: {
    type: Boolean,
    default: false
  }
});
const editFormData = defineModel();
const emit = defineEmits(['toEdit', 'change']);

/** 编辑中的字段名（勿写在 props.data 行对象上：父级 computed 每次会换新对象导致 isEditing 丢失、输入框失焦） */
const editingField = ref(null);
const isEditingRow = (item) => editingField.value === item.field;
const title = computed(() => props.title);
const data = computed(() =>
  props.data.map((item) => {
    if (
      ['input', 'select', 'date', 'month', 'custom', 'cascader', 'slot'].includes(item.editType)
    ) {
      item.required = item.hasOwnProperty('required') ? item.required : true; // 字段默认都是必填的，可通过配置项更改为非必填
      // 仅在 overwrite 对象尚未包含该字段时初始化，避免把用户主动清空的值写回原始值
      // 对于 cascader，value 是数组，需要特殊处理：即使数组元素是 null，数组本身也应该被设置
      if (item.editType === 'cascader') {
        const currentValue = editFormData.value[item.field];
        // 如果字段不存在、为 undefined、为 null，或者不是数组，则初始化
        // 如果 currentValue 是数组但元素都是 null，且 item.value 有有效值，也要更新
        const shouldInit =
          !(item.field in editFormData.value) ||
          currentValue === undefined ||
          currentValue === null ||
          !Array.isArray(currentValue) ||
          (Array.isArray(currentValue) &&
            Array.isArray(item.value) &&
            currentValue.every((v) => v === null || v === undefined) &&
            item.value.some((v) => v !== null && v !== undefined));
        if (shouldInit) {
          // 如果 item.value 是数组，直接使用；否则设置为 null
          editFormData.value[item.field] = Array.isArray(item.value) ? [...item.value] : null;
        }
      } else if (!(item.field in editFormData.value)) {
        editFormData.value[item.field] = item.value ?? null;
      }
    }
    return item;
  })
);
const span = computed(() => 24 / props.cols);
const rowNum = computed(() => Math.ceil((props.data?.length || 0) / props.cols));

const inputRefs = ref([]);
data.value.forEach((item) => {
  if (['input', 'select', 'date', 'month', 'cascader'].includes(item.editType)) {
    inputRefs.value.push(null);
  }
});
const openSlotEdit = (item) => {
  editingField.value = item.field;
};
// 开始编辑
const toEdit = (item, index) => {
  editingField.value = item.field;
  nextTick(() => {
    if (['input', 'date', 'month'].includes(item.editType)) {
      inputRefs.value[index].focus();
    } else if (['select', 'cascader'].includes(item.editType)) {
      inputRefs.value[index]?.focus?.();
      inputRefs.value[index]?.toggleMenu?.();
      inputRefs.value[index]?.togglePopperVisible?.();
    } else if (['date', 'month'].includes(item.editType)) {
      inputRefs.value[index].focus();
    }
  });
};
const isEmptyEditValue = (val) => {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val)) return val.every((v) => v === null || v === undefined || v === '');
  return false;
};
const getInputDisplayValue = (item) => {
  const raw = editFormData.value[item.field];
  if (item.formatDisplayValue) {
    return item.formatDisplayValue(isEmptyEditValue(raw) ? '' : raw);
  }
  if (isEmptyEditValue(raw)) return '';
  return item.valueName || raw;
};
const getInputDisplayUnit = (item) => {
  if (isEmptyEditValue(editFormData.value[item.field])) return '';
  return item.unit || '';
};
// 编辑后失焦
const onBlur = (item) => {
  closeEdit(item);
  const currentVal = editFormData.value[item.field];
  const isEmpty = isEmptyEditValue(currentVal);
  // 必填校验
  if (item.required && isEmpty) {
    editFormData.value[item.field] = item.value;
    ElMessage.error(t('application.emptyTip'));
    return;
  }
  // 非必填允许清空，写入空字符串避免被原始值回填
  if (isEmpty) {
    editFormData.value[item.field] = '';
    return;
  }
  // 自定义输入规则校验
  if (item.inputRegExp && !item.inputRegExp.test(currentVal)) {
    editFormData.value[item.field] = item.value;
    ElMessage.error(item.errorTip || t('application.errorTip'));
    return;
  }

  // 校验沒問題後，可以透過 valueFormatter 來對 value 做處理, 例如 00100 轉成 100 之類的
  if (item.valueFormatter) {
    editFormData.value[item.field] = item.valueFormatter(editFormData.value[item.field]);
  }
};
const onChange = (item, value) => {
  item.value = value;
  closeEdit(item, true);
};
// 关闭编辑状态
const closeEdit = (item, isChange = false) => {
  if (editingField.value === item.field) {
    editingField.value = null;
  }
  if (isChange) emit('change', item);
};
// 日期选择框关闭时关闭编辑状态
const visibleChangeDate = (visibility, item) => {
  if (!visibility) closeEdit(item);
};
</script>

<style lang="scss" scoped>
.info-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
  .info-title {
    @include pingfang-bold(16px, 24px);
    margin-bottom: 16px;
  }
}
.info-card {
  &.mb--24 {
    margin-bottom: -24px;
  }
  .info-item {
    @include flex-equally-divide;
    display: flex;
    height: 100%;
    flex-direction: column;
    justify-content: space-between;
    align-self: flex-end;
    &.info-item-label {
      margin-bottom: 24px;
    }
    &.flex-start {
      justify-content: flex-start;
      flex-direction: row;
      align-items: center;
      .u-label {
        margin-right: 12px;
        margin-top: 0;
      }
    }
    .u-value {
      @include pingfang-regular(14px, 22px);
      word-break: break-word;
      min-height: 22px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .u-label {
      @include pingfang-regular(14px, 22px, left, #999999);
      margin-top: 2px;
    }
  }
}
.edit_icon {
  margin-left: 10px;
  color: #999;
  cursor: pointer;
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url(../assets/edit_icon.png);
}
.input_wrapper {
  width: 100%;
  position: absolute;
  left: 0;
  top: -12px;
  &.auto_width {
    @media screen and (max-width: 1300px) {
      width: 100% !important;
    }
  }
}
</style>
