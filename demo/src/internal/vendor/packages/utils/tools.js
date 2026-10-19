// /**
//  * @intro 验证输入的字符是否为纯汉字
//  * @param str 输入的字符
//  */
// export const isChineseCharacters = (str) => {
//   if (/^[\u4e00-\u9fa5]+$/i.test(str)) {
//     return true;
//   } else {
//     return false;
//   }
// };

/**
 * @intro 验证手机号格式
 * @param str 输入的字符
 */
export const isPhone = (str) => {
  return !!/^[3,6,7,8,9]\d{7}$/.test(str);
};

/**
 * @intro 验证邮箱格式
 * @param str 输入的字符
 */
export const isEmail = (str) => {
  const RegEmail =
    /^$|^([a-z0-9A-Z]+[-|\\.]?)+[a-z0-9A-Z]@([a-z0-9A-Z]+(-[a-z0-9A-Z]+)?\.)+[a-zA-Z]{2,}$/;
  return !!RegEmail.test(str);
};

/**
 * @intro 中国标准时间格式化为yyyy-MM-dd HH:mm:ss
 * @param str 中国标准时间
 */
export const dateFormat = (str) => {
  const p = (s) => {
    return s < 10 ? '0' + s : s;
  };
  const time = new Date(str);
  const resDate = time.getFullYear() + '-' + p(time.getMonth() + 1) + '-' + p(time.getDate());
  const resTime = p(time.getHours()) + ':' + p(time.getMinutes()) + ':' + p(time.getSeconds());
  return resDate + ' ' + resTime;
};

/**
 * @intro 金额添加千位符
 * @param num 金额
 */
export const moneyFormat = (num, tofixed2 = true, defaultVal = '') => {
  // if (Number(num).toString() !== "NaN") {
  if (num === 0 || Boolean(num)) {
    // 当num为0、null、 false、''时可以准确判断
    // 添加千分符
    // eslint-disable-next-line no-underscore-dangle
    let _n = Number(num).toLocaleString();
    if (tofixed2) {
      if (_n.indexOf('.') !== -1) {
        _n = _n + '00';
      } else {
        _n = _n + '.00';
      }
      // 因为有千分符所以，返回数据为字符串格式，无法做运算操作，适合做直接显示使用
      return _n.substring(0, _n.indexOf('.') + 3);
    } else {
      return _n;
    }
  } else {
    return defaultVal || '';
  }
};

/**
 * @intro 保留小数位
 * @param {Number} num
 * @param {Number} decimals
 * @returns
 */
export const numberFixed = (num, decimals = 2) => {
  if (isNaN(Number(num))) {
    num = 0;
  }

  return Number(num).toFixed(decimals);
};

/**
 * @intro window.open 修改页面名
 * @param url 路径
 * @param title title
 */
export const openWindow = function (url, title) {
  const win = window.open('about:blank');
  win.document.title = title;
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '100vh';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.style.overflow = 'hidden';
  iframe.style.border = 'none';
  win.document.body.style.margin = '0';
  win.document.body.appendChild(iframe);
};

/**
 * @intro 数字去掉千位符
 * @param {String} num
 * @returns 转换之后的数字
 */
export const numFormat = (num) => {
  // 替换千位符
  if (typeof num === 'string') {
    num = Number(num.replace(new RegExp(',', 'g'), ''));
  }

  if (isNaN(Number(num))) {
    num = 0;
  }

  return num;
};

/**
 * 通过已有值找到字典值中目标值
 * @param {key} 单独的key或者数组
 * @param {dictionary} 目标字典
 * @param {existingKey} 已有值的key
 * @param {targetKey} 目标值的key
 * @returns
 */
export function getDictionaryValueByKey(
  key,
  dictionary = [],
  existingKey = 'value',
  targetKey = 'label'
) {
  if (typeof key === 'undefined' || key == null) {
    return '';
  }
  let value;
  if (typeof key === 'boolean' || typeof key === 'string' || typeof key === 'number') {
    for (let i = 0; i < dictionary.length; i++) {
      if (dictionary[i][existingKey] === key) {
        value = dictionary[i][targetKey];
      }
    }
  } else {
    value = [];
    for (let i = 0; i < dictionary.length; i++) {
      for (let j = 0; j < key.length; j++) {
        if (dictionary[i][existingKey] === key[j]) {
          value.push(dictionary[i][targetKey]);
        }
      }
    }
  }
  return value;
}
/**
 * 根据key获取到value
 * @param {String} key
 * @param {Array} data
 * @param {String} valueKey
 * @param {String} keyKey
 * @returns {String} 返回获取到的key
 */
export const getValueForKey = (key, data, valueKey = 'value', keyKey = 'label') => {
  let value = '';
  data &&
    data.forEach((item) => {
      if (key === item[valueKey]) {
        value = item[keyKey];
      }
    });
  return value || '--';
};

/**
 * @intro 文本框仅允许输入整数
 * @param obj 数据对象
 * @param key 对象的key
 * @param length 最大整数位数
 */
export const inputInteger = (obj, key, length = 8) => {
  obj[key] = String(obj[key] ?? '')
    .replace(/\D/g, '')
    .slice(0, length);
};

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
 * @intro 自动补齐两位小数
 * @param obj 数据对象
 * @param key 对象的key
 * @param maxOrMin 需要限制最大值还是最小值
 * @param value 限制的值
 */
export const toDecimal = (obj, key, defaultValue = true, maxOrMin, value) => {
  if (obj[key] !== '' && obj[key] !== null) {
    !/\./.test(obj[key]) && (obj[key] += '.00');
    const dotList = obj[key].toString().split('.');
    if (dotList[1].length < 1) {
      obj[key] += '00';
      return;
    }
    dotList[1].length < 2 && (obj[key] += '0');
  } else {
    defaultValue && (obj[key] = '0.00');
  }
  switch (maxOrMin) {
    case 'max':
      parseFloat(obj[key]) > parseFloat(value) && (obj[key] = '');
      break;
    case 'min':
      parseFloat(obj[key]) < parseFloat(value) && (obj[key] = '');
      break;
    default:
      break;
  }
};
/**
 * @intro 字符串只保留字母和数字 并支持转大些
 */
export const keepAlphanumeric = (str, toUpper = true) => {
  console.log(str, toUpper);
  str = (str || '').replace(/[^a-zA-Z0-9]/g, '');
  if (toUpper) {
    str = str.toLocaleUpperCase();
  }
  return str;
};

/**
 * 是否是pdf
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isPdf = (name) => name?.split('.')?.[1]?.toLowerCase() === 'pdf';
/**
 * 是否是doc
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isDoc = (name) => {
  return name?.split('.')?.[1]?.toLowerCase() === 'doc';
};
/**
 * 是否是docx
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isDocx = (name) => {
  return name?.split('.')?.[1]?.toLowerCase() === 'docx';
};
/**
 * 是否是xls
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isXls = (name) => {
  return name?.split('.')?.[1]?.toLowerCase() === 'xls';
};
/**
 * 是否是xlsx
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isXlsx = (name) => {
  return name?.split('.')?.[1]?.toLowerCase() === 'xlsx';
};
export const isImage = (name) => {
  const result = name?.match(/[^.]+$/);
  return result?.[0] && ['png', 'jpg', 'jpeg'].includes(result[0]?.toLowerCase());
};
/**
 * 是否是视频
 * @param { String } name 文件名
 * @returns { Boolean }
 */
export const isVideo = (name) => {
  const result = name?.match(/[^.]+$/);
  return result?.[0] && ['mp4', 'mov', 'webm'].includes(result[0]?.toLowerCase());
};
// blob转文件下载
export const hanldeDownloadFromBlob = (blobData, fileName) => {
  const fileReader = new FileReader();
  fileReader.readAsText(blobData.data);
  let name = '';
  const msg = blobData?.headers?.['content-disposition'];
  if (msg) {
    if (msg.includes('utf-8')) {
      name = decodeURIComponent(
        blobData.headers['content-disposition'].split("filename*=utf-8''")[1]
      );
    } else {
      name = decodeURIComponent(blobData.headers['content-disposition'].split('filename=')[1]);
    }
  }
  fileName = fileName || name;
  fileReader.onload = (e) => {
    const eleLink = document.createElement('a');
    eleLink.style.display = 'none';
    // 字符内容转变成blob地址
    const blob = new Blob([blobData.data], {
      type: 'application/force-download;charset=UTF-8'
    });
    eleLink.download = fileName;
    eleLink.href = URL.createObjectURL(blob);
    document.body.appendChild(eleLink);
    eleLink.click();
    document.body.removeChild(eleLink);
  };
};
/**
 * 下载压缩包文件
 * @param {blob} fileArrayBuffer 文件流
 * @param {String} filename 文件名称
 * @param {String} fileType 文件格式
 */
export const downloadZip = (res, filename) => {
  const { data, headers } = res;
  let name = '';
  const msg = headers['content-disposition'];
  if (msg.includes('utf-8')) {
    name = decodeURIComponent(headers['content-disposition'].split("filename*=utf-8''")[1]);
  } else {
    name = decodeURIComponent(headers['content-disposition'].split('filename=')[1]);
  }
  filename = filename || name;
  let blob = new Blob([data], { type: headers['content-type'] });
  if ('msSaveOrOpenBlob' in navigator) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const dom = document.createElement('a');
    const downUrl = window.URL.createObjectURL(blob);
    dom.href = downUrl;
    dom.download = filename;
    dom.style.display = 'none';
    document.body.appendChild(dom);
    dom.click();
    dom.parentNode.removeChild(dom);
    window.URL.revokeObjectURL(downUrl);
  }
};
/**
 * @intro 判断值是否有值或为0
 * @param value 任意类型
 */
export const hasValueOrIsZero = (value) => {
  return value === 0 || Boolean(value);
};
/**
 * 统一分页参数转换
 * @param {Object} params - 组件内部使用的标准分页参数
 * @param {Object} mapping - 字段映射关系
 * @returns {Object} - 转换后的分页参数
 */
export const convertPaginationParams = (params = {}, mapping = {}) => {
  const defaultMapping = {
    pageSize: 'pageSize',
    pageNo: 'pageNo'
  };

  const finalMapping = Object.assign({}, defaultMapping, mapping);

  return Object.entries(finalMapping).reduce((result, [key, targetKey]) => {
    if (params[key] !== undefined) {
      result[targetKey] = params[key];
    }
    return result;
  }, {});
};
/**
 * 四舍五入保留一位小数
 */
export const keepOneDecimalAfterRound = (num) => {
  if (typeof num !== 'number' && typeof num !== 'string') {
    return;
  }
  return (Math.round(parseFloat(num) * 10) / 10).toString().match(/^\d+(?:\.\d{0,1})?/)?.[0];
};

/**
 * @intro 全角转半角
 * @param str 需要转换的字符串
 */
export const toHalfWidth = (str) => {
  return str
    .replace(/[\uFF01-\uFF5E]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
    })
    .replace(/[\u3000-\u303F]/g, ' '); // 处理全角空格
};

/**
 * @intro 导出
 * @param res 导出接口返回的结果
 */
export const blob2File = (res) => {
  const fileReader = new FileReader();
  fileReader.readAsText(res.data);
  fileReader.onload = (e) => {
    const eleLink = document.createElement('a');
    let name = '';
    const msg = res.headers['content-disposition'];
    if (msg.includes('utf-8')) {
      name = decodeURIComponent(msg.split("filename*=utf-8''")[1]);
    } else {
      name = decodeURIComponent(msg.split('filename=')[1]);
    }
    eleLink.download = name;
    eleLink.style.display = 'none';
    // 字符内容转变成blob地址
    const blob = new Blob([res.data], {
      type: 'application/force-download'
    });
    eleLink.href = URL.createObjectURL(blob);
    document.body.appendChild(eleLink);
    eleLink.click();
    document.body.removeChild(eleLink);
  };
};

/**
 * 将Blob对象转换为字符串
 * @param {Blob} blob - 需要转换的Blob对象
 * @returns {Promise<string>} 返回一个Promise，解析为转换后的字符串
 * @example
 */
export function blobToString(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob); // 对于文本数据
    // 如果是二进制数据，可以使用readAsArrayBuffer或readAsDataURL
  });
}

/**
 * @intro 简单的深拷贝，不考虑函数、正则、日期等特殊对象
 * @param obj 数据对象
 * @returns {Object} 深拷贝后的对象
 */
export const simpleDeepClone = (obj, cache = new WeakMap()) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (cache.has(obj)) return cache.get(obj);

  const clone = Array.isArray(obj) ? [] : {};
  cache.set(obj, clone);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = simpleDeepClone(obj[key], cache);
    }
  }
  return clone;
};

/**
 * 检查状态对象是否有效（非空且包含属性）
 * @param {Object} state - 要检查的状态对象
 * @returns {boolean} 如果状态有效返回true，否则返回false
 */
export const hasValidState = (state) => {
  return (
    state && typeof state === 'object' && !Array.isArray(state) && Object.keys(state).length > 0
  );
};
//
/**
 * @intro 金额添加千位符
 * @param num 金额
 */
export const toThousandth = (num) => {
  return num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
/**
 * 过滤字符串，只保留符合最长位数限制的数字和小数点，同时支持金额格式化（不自动补0）
 * @param {String} num 需要过滤的字符串
 * @param {Number} integerLength 整数部分长度--默认10
 * @param {Number} decimalLength 小数部分长度--默认2。0则不保留小数
 * @param {Boolean} needMoneyFormat 需要金额格式化
 * @returns 过滤之后的字符串
 */
export const filterNumeric = (
  num,
  integerLength = 10,
  decimalLength = 2,
  needMoneyFormat = false
) => {
  if (!num) return num;

  integerLength = Number(integerLength);
  decimalLength = Number(decimalLength);

  if (isNaN(integerLength) || isNaN(decimalLength)) {
    console.warn('参数类型错误');

    return num;
  }

  const reg = /[^\d.]/g;

  num = num.toString().replace(reg, '');

  // 输入的全是无效文本，则返回空
  if (!num) {
    return '';
  } else if (decimalLength > 0 && num === '.') {
    // 输入只有一个.则返回0.
    return '0.';
  }

  const parts = num.split('.');
  let integerPart = parts[0].slice(0, integerLength);

  // 添加判断逻辑：处理前导零
  if (integerPart.startsWith('0') && integerPart.length > 1) {
    // 删除前导零
    integerPart = integerPart.replace(/^0+(?=\d)/, '');
    // 如果删除前导零后变为空字符串，则设置为"0"
    if (integerPart === '') {
      integerPart = '0';
    }
  }

  if (needMoneyFormat) {
    // integerPart = Number(integerPart).toLocaleString(); // 不同地区的数字千分位表示法不一致，此处使用浏览器默认行为可能导致错误
    integerPart = Number(integerPart).toLocaleString('en-US'); // FIXME 临时使用英语的数字千分位表示法
    // integerPart = Number(integerPart).toLocaleString("es-MX"); // 某些地区的西班牙语可能使用`.`作为千分位分隔符
  }

  if (num.includes('.') && decimalLength > 0) {
    const decimalPart = parts[1]?.slice(0, decimalLength) || '';

    num = integerPart + '.' + decimalPart;
  } else {
    num = integerPart;
  }

  return num;
};
/**
 * 提取并解码Content-Disposition头中的文件名
 * @param {*} contentDisposition
 * @returns
 */
export const extractAndDecodeFilename = (contentDisposition) => {
  // 使用正则表达式匹配 filename* 部分
  const match = contentDisposition.match(/filename=([^;]+)/i);

  if (match && match[1]) {
    // 解码URL编码的文件名
    const encodedFileName = match[1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    return decodedFileName;
  } else {
    throw new Error('无法从Content-Disposition头中提取文件名');
  }
};

/**
 * 邮箱格式校验
 * @param {string} value 邮箱字符串
 * @return {boolean} 是否校验通过
 */
export function checkEmail(value) {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(value);
}

/**
 * 日本电话号码格式校验
 * @param {string} value 手机号字符串
 * @return {boolean} 是否校验通过
 */
export function checkJapaneseTelePhone(value) {
  return /^0\d{9}$/.test(value);
}

/**
 * 日本手机号码格式校验
 * @param {string} value 手机号字符串，支持 10 位 11 位数字
 * @return {boolean} 是否校验通过
 */
export function checkJapaneseMobilePhone(value) {
  return /^0[6789]0\d{7,8}$/.test(value);
}

/**
 * 日本电话/手机号码格式校验
 * @param {string} value 手机号字符串
 * @return {boolean} 是否校验通过
 */
export function checkJapanesePhone(value) {
  return /^0\d{9,10}$/.test(value);
}
/**
 * Validates if the string contains only Katakana characters
 * @param katakanaValue The string to validate
 * @param allowSpaces Whether to allow spaces in the string (default: true)
 * @param allowSpecialChars Whether to allow special characters like ー、・ (default: true)
 * @returns boolean indicating if the string contains only valid Katakana
 */
export const isKatakana = (katakanaValue, allowSpaces = true, allowSpecialChars = true) => {
  // Return false for empty strings
  if (!katakanaValue.trim()) {
    return false;
  }

  // Basic Katakana Unicode range: U+30A0 to U+30FF
  const katakanaRegex = /^[\u30A0-\u30FF]+$/;

  // If we allow spaces and special characters, we need a more complex regex
  let regex = katakanaRegex;

  if (allowSpaces && allowSpecialChars) {
    // Allow spaces, long vowel mark (ー), Japanese comma (、), Japanese period (。), middle dot (・)
    regex = /^[\u30A0-\u30FF\s\u30FC\u3001\u3002\u30FB]+$/;
  } else if (allowSpaces) {
    regex = /^[\u30A0-\u30FF\s]+$/;
  } else if (allowSpecialChars) {
    regex = /^[\u30A0-\u30FF\u30FC\u3001\u3002\u30FB]+$/;
  }

  return regex.test(katakanaValue);
};
// 获取日本时间 日/月/年
export const getJapanIntlDate = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return formatter.format(new Date());
};
// 获取日本时间 年/月/日
export const transferJapanIntlDate = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  const day = parts.find((part) => part.type === 'day').value;
  return `${year}/${month}/${day}`;
};
