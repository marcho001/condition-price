import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
// 导入 Element Plus 中英文语言包
import store from '@/store';
export const useDictStore = defineStore(
  'dict',
  () => {
    const dictData = useStorage('auction-management_DICT_DATA', {}, sessionStorage);
    const dictDataMap = computed(() => {
      return Object.keys(dictData.value).reduce((acc, dictKey) => {
        acc[dictKey] = Object.fromEntries(
          (dictData.value[dictKey] || []).map((item) => [item.dictKey, item.dictValue])
        );
        return acc;
      }, {});
    });
    const validateDict = (keyArr) => {
      return keyArr.every((item) => dictDataMap.value[item]);
    };
    const getDictItemList = (dictKey, lang) => {
      if (lang === 'ja' || (!lang && sessionStorage.getItem('language') === 'ja')) {
        dictKey += 'ja-JP';
      } else {
        dictKey += 'zh-CN';
      }
      return dictData.value?.[dictKey] || [];
    };
    const getJaDictItemList = (dictKey) => {
      dictKey += 'ja-JP';
      return dictData.value?.[dictKey] || [];
    };
    const getDictValue = (key, dictKey, defaultCode = '') => {
      dictKey += sessionStorage.getItem('language') === 'zhCn' ? 'zh-CN' : 'ja-JP';
      if (!(dictDataMap.value[dictKey] && dictDataMap.value[dictKey][key])) {
        return defaultCode;
      }
      return dictDataMap.value[dictKey][key];
    };
    const getJaDictValue = (key, dictKey, defaultCode = '') => {
      dictKey += 'ja-JP';
      if (!(dictDataMap.value[dictKey] && dictDataMap.value[dictKey][key])) {
        return defaultCode;
      }
      return dictDataMap.value[dictKey][key];
    };
    const setDict = (dataList) => {
      dictData.value = Object.assign(dictData.value, dataList);
    };

    return {
      validateDict,
      getDictItemList,
      getJaDictItemList,
      getDictValue,
      getJaDictValue,
      setDict
    };
  },
  {
    persist: {
      storage: sessionStorage
    }
  }
);

/**
 * 用于在组件外部（如在Pinia Store 中）使用 Pinia 提供的 store 实例。
 * 官方文档解释了如何在组件外部使用 Pinia Store：
 * https://pinia.vuejs.org/core-concepts/outside-component-usage.html#using-a-store-outside-of-a-component
 */
export function useDictStoreHook() {
  return useDictStore(store);
}
