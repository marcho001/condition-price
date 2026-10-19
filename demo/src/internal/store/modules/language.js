import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import defaultSettings from '@packages/theme/settings';
// 导入 Element Plus 中英文语言包
import store from '@/store';
import { LanguageEnum } from '@/i18n/LanguageEnum';
export const useLanguageStore = defineStore(
  'app',
  () => {
    // 语言
    const language = ref(defaultSettings.language);

    /**
     * 根据语言标识读取对应的语言包
     */
    const locale = computed(() => {
      return LanguageEnum[language.value] || LanguageEnum.ja;
    });
    /**
     * 切换语言
     *
     * @param val
     */
    function changeLanguage(val) {
      language.value = val;
      sessionStorage.setItem('language', val);
    }
    return {
      language,
      locale,
      changeLanguage
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
export function useLanguageStoreHook() {
  return useLanguageStore(store);
}
