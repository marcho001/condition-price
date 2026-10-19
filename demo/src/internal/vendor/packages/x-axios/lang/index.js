import en from "./en.json";
import ja from "./ja.json";
import zh from "./zh.json";

const messages = {
  en,
  ja,
  "zhCn": zh
};

class I18n {
  locale = "ja";
  fallbackLocale = "en";

  translate(key) {
    return key.split(".").reduce((o, i) => {
      if (o) return o[i];

      return "";
    }, messages[this.locale] || messages[this.fallbackLocale]);
  }
}

function createI18n() {
  const i18n = new I18n();
  return { i18n, translate: i18n.translate.bind(i18n) };
}

export { en, ja, zh, createI18n };
export default messages;
