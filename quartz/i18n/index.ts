import { type Translation, type AdmonitionTranslation } from "./locales/definition"
import en from "./locales/en-US"
import fr from "./locales/fr-FR"
import it from "./locales/it-IT"
import ja from "./locales/ja-JP"
import de from "./locales/de-DE"
import nl from "./locales/nl-NL"
import ro from "./locales/ro-RO"
import es from "./locales/es-ES"
import ar from "./locales/ar-SA"
import uk from "./locales/uk-UA"
import ru from "./locales/ru-RU"
import ko from "./locales/ko-KR"
import zh from "./locales/zh-CN"
import vi from "./locales/vi-VN"
import pt from "./locales/pt-BR"
import hu from "./locales/hu-HU"

export const TRANSLATIONS: Record<string, Translation> = {
  "en-US": en,
  "fr-FR": fr,
  "it-IT": it,
  "ja-JP": ja,
  "de-DE": de,
  "nl-NL": nl,
  "nl-BE": nl,
  "ro-RO": ro,
  "ro-MD": ro,
  "es-ES": es,
  "ar-SA": ar,
  "ar-AE": ar,
  "ar-QA": ar,
  "ar-BH": ar,
  "ar-KW": ar,
  "ar-OM": ar,
  "ar-YE": ar,
  "ar-IR": ar,
  "ar-SY": ar,
  "ar-IQ": ar,
  "ar-JO": ar,
  "ar-PL": ar,
  "ar-LB": ar,
  "ar-EG": ar,
  "ar-SD": ar,
  "ar-LY": ar,
  "ar-MA": ar,
  "ar-TN": ar,
  "ar-DZ": ar,
  "ar-MR": ar,
  "uk-UA": uk,
  "ru-RU": ru,
  "ko-KR": ko,
  "zh-CN": zh,
  "vi-VN": vi,
  "pt-BR": pt,
  "hu-HU": hu,
} as const

export const defaultTranslation = "en-US"
export const i18n = (locale: ValidLocale): Translation => TRANSLATIONS[locale ?? defaultTranslation]
export type ValidLocale = keyof typeof TRANSLATIONS
export type ValidAdmonition = keyof AdmonitionTranslation
