import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { replaceRegex } from "./utils"
import { Node, Parent, Text } from "hast"

import { visit } from "unist-util-visit"

function isRomanNumeral(str: string): boolean {
  const romanNumeralRegex = /^(M{0,4})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i
  return romanNumeralRegex.test(str)
}

// Regex for acronyms and abbreviations
export const allowAcronyms = ["IF", "CCC", "IL", "TL;DR", "LLM"]

// Escaped and joined allowAcronyms as an intermediate variable
const escapedAllowAcronyms = allowAcronyms
  .map((acronym) => acronym.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
  .join("|")

// Properly construct the regex using escapedAllowAcronyms without the 'g' flag
const smallCapsChars = new RegExp(`A-Z\\u00C0-\\u00DC`, "g")
const REGEX_ACRONYM = new RegExp(
  `(?:\\b|^)(?<acronym>${escapedAllowAcronyms}|[${smallCapsChars.source}]{3,}(?:[-'’]?[${smallCapsChars.source}\\d]+)*)(?<suffix>[sx]?)\\b`,
)

const REGEX_ABBREVIATION = /(?<number>[\d,]*\.?\d+)(?<abbreviation>[A-Zk]{1,})/

const REGEX_ALL_CAPS_PHRASE =
  /\b(?=[A-Z\u00C0-\u00DC \-\d]*\b[A-Z\u00C0-\u00DC]{3,}\b)(?<phrase>[A-Z\u00C0-\u00DC \-\d]+)\b/g

const combinedRegex = new RegExp(`${REGEX_ACRONYM.source}|${REGEX_ABBREVIATION.source}`, "g")

// Whitelist the allowAcronyms to override the roman numeral check
const ignoreAcronym = (node: Text, _index: number, parent: Parent): boolean => {
  if (allowAcronyms.includes(node.value)) {
    return false
  }

  const noSmallCaps =
    "properties" in parent &&
    parent.properties &&
    typeof parent.properties === "object" &&
    "className" in parent.properties &&
    Array.isArray(parent.properties.className) &&
    parent.properties.className.includes("no-smallcaps")

  if (isRomanNumeral(node.value)) {
    return true
  }

  return (noSmallCaps ||
    ("tagName" in parent && (parent.tagName === "abbr" || parent.tagName === "code"))) as boolean
}

export function replaceSCInNode(node: Text, index: number, parent: Parent): void {
  replaceRegex(
    node,
    index,
    parent,
    combinedRegex,
    (match: RegExpMatchArray) => {
      // Use non-global regex to extract groups
      const acronymMatch = REGEX_ACRONYM.exec(match[0])
      if (acronymMatch && acronymMatch.groups) {
        const { acronym, suffix } = acronymMatch.groups
        return { before: "", replacedMatch: acronym, after: suffix || "" }
      }

      const abbreviationMatch = REGEX_ABBREVIATION.exec(match[0])
      if (abbreviationMatch && abbreviationMatch.groups) {
        const { number, abbreviation } = abbreviationMatch.groups
        return { before: "", replacedMatch: number + abbreviation.toUpperCase(), after: "" }
      }

      // // Check if it's an all-caps phrase match
      // const phraseMatch = REGEX_ALL_CAPS_PHRASE.exec(match[0])
      // if (phraseMatch && phraseMatch.groups) {
      //   const { phrase } = phraseMatch.groups
      //   return { before: "", replacedMatch: phrase, after: "" }
      // }

      throw new Error(
        `Regular expression logic is broken; one of the regexes should match for ${match[0]}`,
      )
    },
    (node, index, parent) => ignoreAcronym(node, index, parent),
    "abbr.small-caps",
  )
}

export const rehypeTagAcronyms: Plugin = () => {
  return (tree: Node) => {
    visit(tree, "text", replaceSCInNode)
  }
}

// The main Quartz plugin export
export const TagAcronyms: QuartzTransformerPlugin = () => {
  return {
    name: "TagAcronyms",
    htmlPlugins() {
      return [rehypeTagAcronyms]
    },
  }
}
