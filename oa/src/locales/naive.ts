import { dateEnUS, dateZhCN, enUS, zhCN } from 'naive-ui';
import type { NDateLocale, NLocale } from 'naive-ui';

export const naiveLocales: Record<App.I18n.LangType, NLocale> = {
  'zh-TW': zhCN,
  'en-US': enUS
};

export const naiveDateLocales: Record<App.I18n.LangType, NDateLocale> = {
  'zh-TW': dateZhCN,
  'en-US': dateEnUS
};
