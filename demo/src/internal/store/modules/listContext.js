import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useListContextStore = defineStore('listContext', () => {
  // 导航标记（是否从详情页返回）
  const toDetail = ref(false);
  // 标记是否从左侧menu进入
  const fromMenu = ref(false);
  // 筛选条件
  const filter = ref({});
  // 筛选项是否展开
  const expandState = ref(false);
  // 分页信息
  const pagination = ref({});

  const setListState = (newState) => {
    if (newState.toDetail !== undefined) {
      toDetail.value = newState.toDetail;
    }
    if (newState.fromMenu !== undefined) {
      fromMenu.value = newState.fromMenu;
    }
    if (newState.filter) {
      filter.value = newState.filter;
    }
    if (newState.expandState !== undefined) {
      expandState.value = newState.expandState;
    }
    if (newState.pagination) {
      pagination.value = newState.pagination;
    }
  };

  const resetListState = () => {
    fromMenu.value = false;
    toDetail.value = false;
    filter.value = {};
    expandState.value = false;
    pagination.value = {};
  };

  return {
    fromMenu,
    toDetail,
    filter,
    expandState,
    pagination,
    setListState,
    resetListState
  };
});
