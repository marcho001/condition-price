// 下拉选项的枚举字典key
// 车辆详细的 fuelType / vehicleUsageType 后端一律回代码，显示名由前端查字典
// 车身颜色不在字典内，见 @common/hooks/useCarColor
const keys = [
  'fuelType', // 燃料类型
  'vehicleUsageType' // 自用・营业用性质
];
const computedKeys = (keys) => {
  const tmpKeys = [];
  keys.forEach((item) => {
    tmpKeys.push(item + 'zh-CN');
    tmpKeys.push(item + 'ja-JP');
  });
  return tmpKeys;
};
export default computedKeys(keys);
