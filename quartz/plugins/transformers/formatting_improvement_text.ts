/**
 * This module provides text formatting improvements for Quartz.
 * It includes various functions to enhance the formatting of markdown content.
 */

import { QuartzTransformerPlugin } from "../types"
import { numberRegex, mdLinkRegex } from "./utils"

// Regular expression for footnotes not followed by a colon (definition) or opening parenthesis (md URL)
const footnoteRegex = /(\S) (\[\^.*?\])(?![:\(]) ?/g
const footnoteReplacement = "$1$2 "

/**
 * Adjusts the spacing around footnotes at the end of sentences.
 * @param text - The input text to process.
 * @returns The text with improved footnote spacing.
 */
const footnoteEndOfSentence = (text: string) => {
  let tighterText = text.replace(footnoteRegex, footnoteReplacement)
  return tighterText
}

// Regular expression for edit/note patterns
const editPattern =
  /^\s*(?<emph1>[\*_]*)(edit|eta|note),?\s*\(?(?<date>\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\)?(?<emph2>[\*_]*:[\*_]*) (?<text>.*)/gim
const editAdmonitionPattern = "> [!info] Edited on $<date>\n> $<text>"

/**
 * Converts edit/note patterns to admonition blocks.
 * @param text - The input text to process.
 * @returns The text with edit/note patterns converted to admonitions.
 */
export function editAdmonition(text: string): string {
  text = text.replaceAll(editPattern, editAdmonitionPattern)
  return text
}

// Regular expression for note patterns
const notePattern = /^\s*(?<emph1>[\*_]*)note: (?<text>.*)(?<emph2>[\*_]*)/gim

/**
 * Converts note patterns to admonition blocks.
 * @param text - The input text to process.
 * @returns The text with note patterns converted to admonitions.
 */
export function noteAdmonition(text: string): string {
  text = text.replaceAll(notePattern, "\n> [!note]\n>\n> $1$2$3")
  return text
}

/**
 * Concentrates emphasis around links by moving asterisks or underscores inside the link brackets.
 * @param text - The input text to process.
 * @returns The text with emphasis concentrated around links.
 */
const concentrateEmphasisAroundLinks = (text: string): string => {
  const emphRegex = new RegExp(
    `(?<emph>[*_]+)(?<whitespace1>\\s*)(?<url>${mdLinkRegex.source})(?<whitespace2>\\s*)(\\k<emph>)`,
    "gm",
  )
  return text.replace(emphRegex, "$<whitespace1>$<emph>$<url>$<emph>$<whitespace2>")
}

/**
 * Applies various formatting improvements to the input text.
 * @param text - The input text to process.
 * @returns The text with all formatting improvements applied.
 */
export const formattingImprovement = (text: string) => {
  const yamlHeaderMatch = text.match(/^\s*---\n(.*?)\n---\n/s)
  let yamlHeader = ""
  let content = text

  if (yamlHeaderMatch) {
    yamlHeader = yamlHeaderMatch[0]
    content = text.substring(yamlHeader.length)
  }

  // Format the content (non-YAML part)
  let newContent = content.replaceAll(/(\u00A0|&nbsp;)/g, " ") // Remove NBSP

  newContent = footnoteEndOfSentence(newContent)
  newContent = newContent.replace(new RegExp(`(${numberRegex.source})[x\\*]\\b`, "g"), "$1×") // Pretty multiplication
  newContent = concentrateEmphasisAroundLinks(newContent)
  newContent = newContent.replace(/ *\,/g, ",") // Remove space before commas
  newContent = editAdmonition(newContent)
  newContent = noteAdmonition(newContent)

  return yamlHeader + newContent // Concatenate YAML header and formatted content
}

/**
 * Quartz transformer plugin for text formatting improvements.
 * @returns An object with the plugin name and text transform function.
 */
export const TextFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "textFormattingImprovement",
    textTransform(_ctx, src) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return formattingImprovement(src)
    },
  }
}
