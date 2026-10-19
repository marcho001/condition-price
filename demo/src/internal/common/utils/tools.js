/**
 * @intro 文本框校验整数位数保留两位小数
 * @param obj 数据对象
 * @param key 对象的key
 * @param length 长度
 */
export const inputMoney = (obj, key, length) => {
  obj[key] = obj[key]
    .replace(/[^\d.]/g, '') // 清除"数字"和"."以外的字符
    .replace(/^\./g, '') // 验证第一个字符是数字
    .replace(/\.{2,}/g, '.') // 只保留第一个, 清除多余的
    .replace('.', '$#$')
    .replace(/\./g, '')
    .replace('$#$', '.')
    .replace(/^(\/-)*(\d+)\.(\d\d).*$/, '$1$2.$3'); // 只能输入两个小数
  obj[key] =
    obj[key].indexOf('.') > 0
      ? obj[key].split('.')[0].substring(0, length) + '.' + obj[key].split('.')[1]
      : obj[key].substring(0, length);
};

/**
 * @intro 判断是否为有效金额
 * @param {String} str
 * @returns {Boolean}
 */
export const isValidAmount = (str) => {
  const amountRegex = /^-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$|^-?\d+(?:\.\d{1,2})?$/;
  if (!amountRegex.test(str)) return false;

  const num = parseFloat(str.replace(/,/g, '')); // 移除千位分隔符
  return !isNaN(num) && isFinite(num); // 排除NaN和Infinity
};

/**
 * 计算两个日期之间的周岁年龄
 * @param {string | Date} birthDate - 出生日期（格式：YYYY-MM-DD 或 Date 对象）
 * @param {string | Date} [baseDate=new Date()] - 基准日期（默认当前日期）
 * @returns {number} 周岁年龄（向下取整）
 */
export function calculateAge(birthDate, baseDate = new Date()) {
  if (!birthDate) return null;

  // 标准化日期对象（兼容字符串/Date 类型入参）
  const birth = new Date(birthDate);
  const target = new Date(baseDate);

  // 校验日期合法性
  if (isNaN(birth.getTime()) || isNaN(target.getTime())) {
    // throw new Error('请传入合法的日期格式（YYYY-MM-DD）');
    return 0;
  }

  // 核心计算逻辑
  let age = target.getFullYear() - birth.getFullYear();
  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();
  const targetMonth = target.getMonth();
  const targetDay = target.getDate();

  // 若基准日期未到当年生日，年龄减1
  if (targetMonth < birthMonth || (targetMonth === birthMonth && targetDay < birthDay)) {
    age--;
  }

  // 处理出生日期晚于基准日期的异常场景
  return age < 0 ? 0 : age;
}

// 校验vin
export const getValidVinErrorCode = (value) => {
  const lenValid = /^[^\s]{6,17}$/.test(value);
  // const formatValid = /^(?!.*[IOQ])[^\s]*$/.test(value);
  // if (value && !lenValid && formatValid) return 1;
  // if (value && lenValid && !formatValid) return 2;
  // if (value && !lenValid && !formatValid) return 3;

  if (value && !lenValid) return 1;
  return '';
};

/**
 * @intro 金额千分位显示（日币，无小数）
 * @param {Number|String} value
 * @param {String} placeholder 无值时的占位
 * @returns {String}
 */
export const formatAmount = (value, placeholder = '-') => {
  if (value === null || value === undefined || value === '') return placeholder;
  const num = Number(value);
  if (isNaN(num)) return placeholder;
  return num.toLocaleString('en-US');
};

/**
 * @intro 空值统一占位
 * @param {*} value
 * @param {String} placeholder
 */
export const orDash = (value, placeholder = '-') => {
  if (value === null || value === undefined || value === '') return placeholder;
  return value;
};

/**
 * @intro 以 YYYY-MM-DD 返回相对今天偏移 n 天的日期（本地时区，portal 使用 JST）
 * @param {Number} offsetDay
 * @returns {String}
 */
export const dateFromToday = (offsetDay = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDay);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * @intro 初度登録年月只呈现年月
 * @param {String} value YYYY-MM-DD
 */
export const toYearMonth = (value) => {
  if (!value) return '';
  return String(value).slice(0, 7);
};

/**
 * @intro 由文件名或 fileId 取副档名（小写）
 * @param {String} name
 */
export const getFileExt = (name) => {
  if (!name) return '';
  const idx = String(name).lastIndexOf('.');
  return idx < 0
    ? ''
    : String(name)
        .slice(idx + 1)
        .toLowerCase();
};

/** 是否为图片附件 */
export const isImageFile = (name) => ['jpg', 'jpeg', 'png'].includes(getFileExt(name));

/** 是否为 pdf 附件 */
export const isPdfFile = (name) => getFileExt(name) === 'pdf';
