<template>
  <div class="generic-list-table">
    <el-table
      ref="xListTableRef"
      v-bind="$attrs"
      :data="tableData"
      :stripe="stripe"
      :height="height"
      :max-height="maxHeight"
      :border="border"
      :row-key="rowKey"
      :highlight-current-row="highlightCurrentRow"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      @select="handleSelectRow"
      @select-all="handleSelectAll"
      :class="tableClass"
    >
      <template #empty v-if="emptyText">{{ emptyText }}</template>
      <!-- 选择列 -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        width="55"
        align="center"
        fixed="left"
        :selectable="selectable"
      />

      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        type="index"
        :label="indexLabel"
        width="60"
        align="center"
      />

      <!-- 动态列 -->
      <template v-for="(column, columnIndex) in normalizedColumns" :key="columnIndex">
        <el-table-column
          v-if="visibleColumns(column)"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :align="column.align || 'left'"
          :fixed="column.fixed"
          :sortable="column.sortable"
          :show-overflow-tooltip="getTooltipConfig(column)"
          :class-name="column.className"
        >
          <!--非操作列-->
          <template #default="scope" v-if="column.prop !== 'action'">
            <!-- 如果提供了插槽名称且插槽存在，则使用插槽渲染 -->
            <slot
              v-if="column.slot"
              :name="column.slot"
              :row="scope.row"
              :index="scope.$index"
              :column="column"
            ></slot>

            <!-- 渲染组件 -->
            <component
              v-else-if="column.component"
              :is="column.component"
              v-bind="getComponentProps(column, scope.row)"
              @update:modelValue="(v) => handleComponentUpdate(v, scope.row, column)"
            />

            <!-- 如果提供了formatter函数，则使用formatter渲染 -->
            <template v-else-if="column.formatter">
              {{ column.formatter(scope.row, column, scope.row[column.prop], scope.$index) }}
            </template>

            <!-- 默认渲染方式 有值或为0展示，否则展示默认值，没有默认值展示'-' -->
            <template v-else>
              {{
                hasValueOrIsZero(scope.row[column.prop])
                  ? scope.row[column.prop]
                  : column.defaultValue || '-'
              }}
            </template>
          </template>
          <!--操作列-->
          <template #default="scope" v-if="column.prop === 'action'">
            <div class="action-buttons">
              <template
                v-for="(action, actionIndex) in visibleActions(column, scope.row)"
                :key="actionIndex"
              >
                <el-link
                  href="javascript:;"
                  underline="never"
                  :type="action.type || 'primary'"
                  :disabled="action.disabled && action.disabled(scope.row, scope.$index)"
                  :class="[action.class || '']"
                  @click.stop="() => handleAction(action, scope.row, scope.$index)"
                >
                  {{ typeof action.label === 'function' ? action.label(scope.row) : action.label }}
                </el-link>
              </template>
            </div>
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- 分页组件 -->
    <div class="pagination-container" v-if="showPagination">
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :page-sizes="paginationSizes"
        :background="paginationBackground"
        :layout="paginationLayout"
        :total="total"
        :disabled="paginationDisabled"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        :small="small"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { hasValueOrIsZero } from './../../utils';
const props = defineProps({
  columns: {
    type: Array,
    required: true
    /*
      columns的格式应为：
      [
        {
          prop: 'fieldName', // 数据字段名
          label: '显示名称', // 表头显示名称
          width: '180', // 可选，列宽度
          minWidth: '180', // 可选，列最小宽度
          showOverflowTooltip: false, // 可选，是否使用tooltip
          fixed: false, // 可选，是否固定列
          align: 'left', // 可选，对齐方式
          slot: 'customSlot', // 可选，使用自定义插槽
          formatter: (row, column, cellValue, index) => {} // 可选，格式化函数
        },
        {
          prop: 'action', // 操作列必填action
          label: '',
          fixed: 'right',
          actions: [ // 操作列必填 点击的交互和配置
            {
              label: '显示名称',
              confirm: {
                title: '确认操作',
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
              },
              refreshAfter: false, // 点击完成后，是否刷新表格数据
              handler: handleGoDetail, // 点击方法
              class: '', // 可选，按钮样式
              show: (row) => {} // 可选，控制按钮是否显示
            }
          ],
        }
      ]
    */
  },

  // 表格样式相关
  autoFetchDataByFilter: { type: Boolean, default: false },
  stripe: { type: Boolean, default: false },
  border: { type: Boolean, default: false },
  height: { type: [String, Number], default: null },
  maxHeight: { type: [String, Number], default: null },
  tableClass: { type: [String, Object, Array], default: '' },
  highlightCurrentRow: { type: Boolean, default: false },
  rowKey: { type: [Function, String], default: null },

  // 数据源控制
  apiHandler: { type: Function, default: null },
  queryParams: { type: Object, default: () => ({}) },
  useProvidedData: { type: Boolean, default: false },
  data: { type: Array, default: () => [] },
  autoLoad: { type: Boolean, default: true },

  // 是否显示分页
  showPagination: {
    type: Boolean,
    default: true
  },
  // 分页配置
  pagination: {
    type: Object,
    default: () => ({
      pageNo: 1,
      pageSize: 10,
      total: 0
    })
  },
  // 分页的接口传参
  paginationMap: {
    type: Object,
    default: () => ({
      pageNo: 'pageNo',
      pageSize: 'pageSize'
    })
  },
  paginationSizes: { type: Array, default: () => [10, 20, 50, 100] },
  paginationLayout: { type: String, default: 'total, sizes, prev, pager, next' },
  paginationBackground: { type: Boolean, default: true },
  paginationDisabled: { type: Boolean, default: false },
  small: { type: Boolean, default: false },

  // 空数据配置
  emptyText: { type: String, default: '' },

  // 选择功能
  showSelection: { type: Boolean, default: false },
  selectable: { type: Function, default: undefined }, // 可选：控制某行复选框是否可勾选
  isSelectAllPage: { type: Boolean, default: false }, // 是否支持多页选择
  uniqueKey: { type: String, default: 'orderNo' },

  // 序号列
  showIndex: { type: Boolean, default: false },
  indexLabel: { type: String, default: '序号' },

  // 确认操作配置
  confirmConfig: {
    type: Object,
    default: () => ({
      title: '确认操作',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  }
});

/**
 * 事件定义
 */
const emit = defineEmits([
  'update:pagination',
  'fetch-success',
  'fetch-error',
  'row-click',
  'action-click',
  'selection-change',
  'update:data',
  'before-fetch',
  'component-change'
]);

/**
 * 内部状态
 */
const localData = ref([]);
const pageNo = ref(props.pagination.pageNo);
const pageSize = ref(props.pagination.pageSize);
const total = ref(props.pagination.total);
const selectedRows = ref([]);
const selectMap = ref(new Map()); // 选择行的映射表，key为uniqueKey，value为行数据

/**
 * 计算属性
 */
// 表格数据源
const tableData = computed(() => {
  return props.useProvidedData ? props.data : localData.value;
});
// 标准化列配置
const normalizedColumns = computed(() => {
  return props.columns.map((column) => ({
    align: 'left',
    showOverflowTooltip: column?.prop === 'action' ? false : true,
    sortable: false,
    ...column
  }));
});

/**
 * 获取组件属性对象
 */
const getComponentProps = (column, row) => {
  const baseProps =
    typeof column.componentProps === 'function'
      ? column.componentProps(row)
      : column.componentProps || {};

  return {
    ...baseProps,
    modelValue: row[column.prop]
  };
};

/**
 * 处理组件值更新
 */
const handleComponentUpdate = (value, row, column) => {
  row[column.prop] = value;
  emit('component-change', { row, prop: column.prop, value });
};

/**
 * 根据条件过滤显示的操作按钮
 */
const visibleActions = (column, row) => {
  const actions = typeof column.actions === 'function' ? column.actions(row) : column.actions;

  if (!Array.isArray(actions)) return [];

  return actions.filter((action) => {
    if (typeof action.show === 'function') return action.show(row);
    return action.show !== false; // 默认情况下（undefined 或 true）返回 true
  });
};
const visibleColumns = (column) => {
  return typeof column.show === 'function'
    ? column.show()
    : typeof column.show === 'boolean'
      ? column.show
      : true;
};

/**
 * 获取 Tooltip 配置
 * Element Plus 的 show-overflow-tooltip 可以接受布尔值或配置对象
 */
const getTooltipConfig = (column) => {
  // 如果 showOverflowTooltip 为 false，直接返回 false
  if (!column.showOverflowTooltip) {
    return false;
  }

  // 如果 showOverflowTooltip 是对象，直接返回（允许自定义配置）
  if (typeof column.showOverflowTooltip === 'object') {
    return column.showOverflowTooltip;
  }

  // 如果 showOverflowTooltip 是 true，检查是否有 tooltipConfig 配置
  if (column.tooltipConfig) {
    return column.tooltipConfig;
  }

  // 如果没有配置，返回 true（使用默认 tooltip 行为）
  return true;
};

/**
 * 处理操作按钮点击
 */
const handleAction = async (action, row, index) => {
  if (action.disabled && action.disabled(row, index)) {
    return;
  }

  // 处理需要确认的操作
  if (action.confirm) {
    try {
      const confirmOptions =
        typeof action.confirm === 'object' ? action.confirm : props.confirmConfig;

      await ElMessageBox.confirm(
        confirmOptions.message || '¿Desea confirmar la asignación de este pedido?',
        confirmOptions.title || '',
        {
          confirmButtonText: confirmOptions.confirmButtonText || 'Confirmar',
          cancelButtonText: confirmOptions.cancelButtonText || 'Cancelar',
          type: confirmOptions.type || 'warning'
        }
      );
    } catch (e) {
      return; // 用户取消，不执行后续操作
    }
  }

  // 触发操作事件
  emit('action-click', { action, row, index });

  // 执行操作回调
  if (action.handler) {
    try {
      await action.handler(row, index);
      // 如果配置了操作后自动刷新，则重新加载数据
      if (action.refreshAfter) {
        nextTick(() => {
          fetchData();
        });
      }
    } catch (error) {
      if (action.showError !== false) {
        ElMessage.error(error.message || '操作失败');
      }
      console.error('Action error:', error);
    }
  }
};

/**
 * 处理行点击
 */
const handleRowClick = (row, column, event) => {
  emit('row-click', { row, column, event });
};

/**
 * 处理单行选择(多页选择)
 */
const handleSelectRow = (selection, row) => {
  row.selected = !row.selected;
  if (row.selected) {
    selectMap.value.set(row[props.uniqueKey], row);
  } else {
    selectMap.value.delete(row[props.uniqueKey]);
  }
};

/**
 * 处理单页全选
 */
const handleSelectAll = (selection) => {
  if (selection.length) {
    // 全选
    tableData.value.forEach((item) => {
      item.selected = true;
      selectMap.value.set(item[props.uniqueKey], item);
    });
  } else {
    // 取消全选
    tableData.value.forEach((item) => {
      item.selected = false;
      selectMap.value.delete(item[props.uniqueKey]);
    });
  }
};

// 重置选择行
const resetSelection = () => {
  selectMap.value.clear();
};

/**
 * 处理选择变化
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection;
  emit('selection-change', selection);
};

/**
 * 分页相关处理
 */
const handlePageChange = (page) => {
  pageNo.value = page;
  updatePagination({ pageNo: page });
  fetchData();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  pageNo.value = 1;
  updatePagination({ pageSize: size, pageNo: pageNo.value });
  fetchData();
};

const updatePagination = (newPartial) => {
  const newPagination = { ...props.pagination, ...newPartial };
  emit('update:pagination', newPagination);
};

/**
 * 数据加载
 */
const fetchData = async () => {
  if (props.useProvidedData || !props.apiHandler) return;

  emit('before-fetch');

  try {
    // 构建请求参数
    const params = {
      ...props.queryParams
    };
    if (props.showPagination) {
      Object.assign(params, {
        [props.paginationMap.pageNo]: pageNo.value,
        [props.paginationMap.pageSize]: pageSize.value
      });
    }
    // 调用API处理函数
    const response = await props.apiHandler(params);

    // 处理响应数据
    const responseData = response.data || response;
    const records =
      responseData.data?.records ||
      responseData.records ||
      responseData.list ||
      responseData.items ||
      [];
    const totalBackVal = responseData.data?.total || responseData.total || 0;
    total.value = totalBackVal;

    // 更新数据
    localData.value = records;

    // 分页勾选处理
    if (props.isSelectAllPage) {
      nextTick(() => {
        tableData.value.forEach((item) => {
          const selected = selectMap.value.has(item[props.uniqueKey]);
          item.selected = selected;
          xListTableRef.value?.toggleRowSelection(item, selected);
        });
      });
    }

    updatePagination({ total: totalBackVal });

    emit('fetch-success', { data: records, response });
  } catch (error) {
    console.error('数据加载失败:', error);
    emit('fetch-error', error);
  } finally {
    console.log('数据加载完成');
  }
};
/**
 * 防抖函数
 */
const debounce = (fn, delay) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
const debouncedFetch = debounce(() => {
  handleSizeChange(pageSize.value);
}, 500);
/**
 * 监听属性变化
 */
// 监听筛选参数变化后请求数据
watch(
  () => props.queryParams,
  (newVal) => {
    if (props.autoFetchDataByFilter) {
      debouncedFetch();
    }
  },
  { deep: true }
);

// 监听分页参数变化
watch(
  () => props.pagination,
  (newVal) => {
    pageNo.value = newVal.pageNo;
    pageSize.value = newVal.pageSize;
  },
  { deep: true }
);

// 监听外部数据变化
watch(
  () => props.data,
  (newData) => {
    if (props.useProvidedData) {
      emit('update:data', newData);
    }
  },
  { deep: true }
);

/**
 * 生命周期钩子
 */
onMounted(() => {
  if (props.autoLoad && !props.useProvidedData && props.apiHandler) {
    fetchData();
  }
});

/**
 * 公开方法
 */
const refresh = () => {
  resetSelection();
  fetchData();
};

const resetPage = () => {
  pageNo.value = 1;
  updatePagination({ pageNo: 1 });
  return fetchData();
};

const xListTableRef = ref();
const clearTable = () => {
  localData.value = [];
  total.value = 0;
  selectedRows.value = [];
  xListTableRef.value.setScrollLeft(0);
};

const setSelection = (rows) => {
  // 实现选择特定行的功能，需要在组件实例上使用ref调用
};

// 获取当前选中的订单数组
const selectArr = computed(() => {
  return Array.from(selectMap.value.keys());
});

defineExpose({
  fetchData,
  refresh,
  resetPage,
  clearTable,
  setSelection,
  selectedRows,
  tableData,
  pageNo,
  pageSize,
  handleSizeChange,
  selectMap,
  selectArr
});
</script>

<style scoped lang="scss">
.generic-list-table {
  width: 100%;

  &__pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  :deep(.el-table) {
    // 表头样式
    .el-table__header {
      thead tr {
        .cell {
          font-size: 14px;
          color: #222222;
          font-weight: 500;
        }

        th {
          background: #f8f8f8;

          &:first-child {
            border-radius: 8px 0 0 0;
          }

          &:last-child {
            border-radius: 0 8px 0 0;
          }
        }
      }
    }

    // 表体样式
    .el-table__row {
      .el-table__cell {
        &:first-child {
          border-radius: 0 0 0 8px;
        }

        &:last-child {
          border-radius: 0 8px 0 0;
        }
      }
    }

    // 去除底部边框
    td.el-table__cell,
    th.el-table__cell.is-leaf {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    // 固定列样式
    &.is-scrolling-right th.el-table-fixed-column--right {
      background: #f8f8f8;
    }
  }

  // 操作按钮间距
  .action-buttons {
    display: flex;
    justify-content: left;
    color: var(--el-color-primary);
    flex-wrap: wrap;

    & > :not(:last-child) {
      margin-right: 12px;
    }
  }
}
</style>
