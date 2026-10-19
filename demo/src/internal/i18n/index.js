import { createI18n } from 'vue-i18n';
import zhCnLocale from './zh.json';
import jaLocale from './ja.json';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import ja from 'element-plus/es/locale/lang/ja';
import { useLanguageStoreHook } from '@/store';
const languageStore = useLanguageStoreHook();
// 内部 portal 界面为中文、日文（规格 1.1 原则 11），不提供英文
const messages = {
  zhCn: {
    ...zhCn,
    ...zhCnLocale
  },
  ja: {
    ...ja,
    ...jaLocale
  }
};

// https://github.com/intlify/vue-i18n
// https://vue-i18n.intlify.dev/guide/advanced/composition
const i18n = createI18n({
  legacy: false, // to use Composition API
  locale: languageStore.language,
  messages,
  globalInjection: true
});

export { ja };
export default {
  install: (app, options) => {
    app.use(i18n);
  }
};
