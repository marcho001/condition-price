import { watch, ref } from 'vue';
import { defineStore } from 'pinia';
import store from '@/store';
import { generateThemeColors, applyTheme } from '@packages/theme';
import defaultSettings from '@packages/theme/settings';

export const useThemeStore = defineStore(
  'setting',
  () => {
    // 主题
    const themeColor = ref(defaultSettings.themeColor);
    // 监听主题变化
    watch(
      themeColor,
      (newThemeColor) => {
        const colors = generateThemeColors(newThemeColor);
        applyTheme(colors);
      },
      { immediate: true }
    );
    function changeThemeColor(color) {
      themeColor.value = color;
      sessionStorage.setItem('themeColor', color);
    }
    return {
      themeColor,
      changeThemeColor
    };
  },
  {
    persist: {
      storage: sessionStorage
    }
  }
);
export function useThemeStoreHook() {
  return useThemeStore(store);
}
