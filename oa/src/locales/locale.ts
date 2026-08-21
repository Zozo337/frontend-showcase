import zhCN from './langs/zh-tw';
import enUS from './langs/en-us';

const locales: Record<App.I18n.LangType, App.I18n.Schema> = {
  'zh-TW': zhCN,
  'en-US': enUS
};

export default locales;
