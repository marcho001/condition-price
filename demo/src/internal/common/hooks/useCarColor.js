import { ref } from 'vue';
import { isBizSuccess } from '@packages/x-axios';
import { getCarColor } from '@/api/common';

/** 颜色清单全模块共用，只取一次 */
const colorList = ref([]);
let loadPromise = null;

const loadCarColor = () => {
  if (!loadPromise) {
    loadPromise = getCarColor()
      .then((res) => {
        if (!isBizSuccess(res?.code)) {
          loadPromise = null;
          return;
        }
        colorList.value = (res.data || []).map((m) => ({
          dictValue: m.colorName,
          dictKey: m.colorId
        }));
      })
      .catch(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
};

/**
 * 车辆颜色（车辆管理列表、车辆详细弹窗共用）
 *
 * 颜色不在字典内，改由 /service-manager/api/ucp/getCarColor 取 colorId ↔ colorName
 */
export function useCarColor() {
  loadCarColor();

  /** 匹配车辆颜色名称，空值显示 placeholder，未匹配到时显示原始代码 */
  const colorName = (code, placeholder = '-') => {
    if (code === null || code === undefined || code === '') return placeholder;
    const color = colorList.value.find((c) => String(c.dictKey) === String(code));
    return color ? color.dictValue : String(code);
  };

  return { colorList, colorName };
}
