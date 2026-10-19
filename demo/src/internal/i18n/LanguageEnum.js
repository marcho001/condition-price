/**
 * 语言枚举
 * 内部 portal 界面为中文、日文（规格 1.1 原则 11）
 */

import zhCn from 'element-plus/es/locale/lang/zh-cn';
import ja from 'element-plus/es/locale/lang/ja';
import zhCnLocale from './zh.json';
import jaLocale from './ja.json';
export const LanguageEnum = {
  zhCn: {
    ...zhCn,
    ...zhCnLocale
  },
  ja: {
    ...ja,
    ...jaLocale
  }
};
