import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import store from '@/store';

/**
 * 车辆管理列表的批次勾选状态
 *
 * 规格 4.5.1：
 * - 取消「排定拍卖」弹窗时不清空——回到列表后勾选内容原封不动
 * - 切换分页、变更每页笔数、套用或变更筛选、重新整理后一律清空
 * - 列表上方「取消勾选」按钮可一次清空，至少勾选 1 台时才出现
 *
 * 不做持久化：重新整理后一律清空。
 */
export const useVehicleSelectionStore = defineStore('vehicleSelection', () => {
  /** Map<vehicleId, row> —— 保留整行资料，供排定拍卖弹窗的车辆清单 table 使用 */
  const selectedMap = ref(new Map());

  const selectedList = computed(() => Array.from(selectedMap.value.values()));
  const selectedCount = computed(() => selectedMap.value.size);
  const selectedOrderNos = computed(() => selectedList.value.map((item) => item.orderNo));

  const isSelected = (id) => selectedMap.value.has(id);

  /** 勾选／取消勾选单行 */
  const toggle = (row, selected) => {
    const map = new Map(selectedMap.value);
    if (selected) {
      map.set(row.id, row);
    } else {
      map.delete(row.id);
    }
    selectedMap.value = map;
  };

  /** 当前页全选／全不选 */
  const toggleRows = (rows, selected) => {
    const map = new Map(selectedMap.value);
    rows.forEach((row) => {
      if (selected) {
        map.set(row.id, row);
      } else {
        map.delete(row.id);
      }
    });
    selectedMap.value = map;
  };

  /** 以最新一次列表资料更新已勾选车辆的内容，避免排定拍卖弹窗显示过期资料 */
  const syncRows = (rows) => {
    if (!selectedMap.value.size) return;
    const map = new Map(selectedMap.value);
    rows.forEach((row) => {
      if (map.has(row.id)) {
        map.set(row.id, row);
      }
    });
    selectedMap.value = map;
  };

  /** 清空全部勾选（含其他分页上已勾选的） */
  const clear = () => {
    selectedMap.value = new Map();
  };

  return {
    selectedMap,
    selectedList,
    selectedCount,
    selectedOrderNos,
    isSelected,
    toggle,
    toggleRows,
    syncRows,
    clear
  };
});

export function useVehicleSelectionStoreHook() {
  return useVehicleSelectionStore(store);
}
