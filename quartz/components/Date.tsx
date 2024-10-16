import { GlobalConfiguration } from "../cfg"
import { ValidLocale } from "../i18n"
import { QuartzPluginData } from "../plugins/vfile"
import React from "react"

interface Props {
  date: Date
  locale?: ValidLocale
}

export type ValidDateType = keyof Required<QuartzPluginData>["dates"]

export function getDate(cfg: GlobalConfiguration, data: QuartzPluginData): Date | undefined {
  if (!cfg.defaultDateType) {
    throw new Error(
      "Field 'defaultDateType' was not set in the configuration object of quartz.config.ts. See https://quartz.jzhao.xyz/configuration#general-configuration for more details.",
    )
  }
  return data.dates?.[cfg.defaultDateType]
}

/**
 * Returns the ordinal suffix for a given day.
 * For example, 1 -> "st", 2 -> "nd", 3 -> "rd", 4 -> "th", etc.
 * Handles special cases like 11th, 12th, and 13th.
 * @param day - The day of the month.
 * @returns The ordinal suffix as a string.
 */
export function getOrdinalSuffix(day: number): string {
  if (day > 31 || day < 1) {
    throw new Error("Day must be between 1 and 31")
  }

  if (day >= 11 && day <= 13) {
    return "th"
  }
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

/**
 * Formats a Date object into a localized string with an ordinal suffix for the day.
 * @param d - The Date object to format.
 * @param locale - The locale string (default is "en-US").
 * @param monthFormat - The format of the month ("long" or "short").
 * @returns The formatted date string, e.g., "August 1st".
 */
/**
 * Formats a Date object into a localized string with an ordinal suffix for the day and includes the year.
 * @param d - The Date object to format.
 * @param locale - The locale string (default is "en-US").
 * @param monthFormat - The format of the month ("long" or "short").
 * @returns The formatted date string, e.g., "August 1st, 2023".
 */
export function formatDate(
  d: Date,
  locale: ValidLocale = "en-US",
  monthFormat: "long" | "short" = "short",
): string {
  const day = d.getDate()
  const daySuffix = getOrdinalSuffix(day)
  const month = d.toLocaleDateString(locale, { month: monthFormat })
  const year = d.getFullYear()
  return `${month} ${day}${daySuffix}, ${year}`
}

export function Date({ date, locale }: Props) {
  return <>{formatDate(date, locale)}</>
}
