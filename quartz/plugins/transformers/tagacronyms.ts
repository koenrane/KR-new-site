import { Node, Parent, Text, Element } from "hast"
import { Plugin } from "unified"
// skipcq: JS-0257
import { visitParents } from "unist-util-visit-parents"

import { QuartzTransformerPlugin } from "../types"
import { hasClass, isCode } from "./formatting_improvement_html"
import { replaceRegex } from "./utils"

export function isRomanNumeral(str: string): boolean {
  // Allow trailing punctuation marks
  const romanNumeralRegex =
    /(?<= |^)(?:(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(I{1,2}X|I{1,2}V|V?I{0,3})(?<=[A-Z]{3})|I{1,2}[XVCDM])(?=[\s.,!?;:]|$)/
  return romanNumeralRegex.test(str)
}

// Regex for acronyms and abbreviations
export const allowAcronyms = ["IF", "CCC", "IL", "TL;DR", "LLM", "MP4", "mp4"]
export const ignoreList = ["th", "hz", "st", "nd", "rd"]

// Escaped and joined allowAcronyms as an intermediate variable
const escapedAllowAcronyms = allowAcronyms
  .map((acronym) => acronym.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
  .join("|")

export const smallCapsSeparators = "-'’"
const smallCapsChars = "A-Z\\u00C0-\\u00DC"
const beforeWordBoundary = `(?<![${smallCapsChars}\\w])`
const afterWordBoundary = `(?![${smallCapsChars}\\w])`
// Lookbehind and lookahead required to allow accented uppercase characters to count as "word boundaries"; \b only matches against \w
export const REGEX_ACRONYM = new RegExp(
  `${beforeWordBoundary}(?<acronym>${escapedAllowAcronyms}|[${smallCapsChars}]{3,}(?:[${smallCapsSeparators}]?[${smallCapsChars}\\d]+)*)(?<suffix>[sx]?)${afterWordBoundary}`,
)

export const REGEX_ABBREVIATION = new RegExp(
  "(?<number>\\d+(\\.\\d+)?|\\.\\d+)(?<abbreviation>[A-Za-z]{2,}|[KkMmBbTGgWw])\\b",
)

// Lookahead to see that there are at least 3 contiguous uppercase characters in the phrase
export const validSmallCapsPhrase = `(?=[${smallCapsChars}\\-'’\\s]*[${smallCapsChars}]{3,})`
export const allCapsContinuation = `(?:[${smallCapsSeparators}\\d\\s]+[${smallCapsChars}]+)`
// Restricting to at least 2 words to avoid interfering with REGEX_ACRONYM
export const REGEX_ALL_CAPS_PHRASE = new RegExp(
  `${beforeWordBoundary}${validSmallCapsPhrase}(?<phrase>[${smallCapsChars}]+${allCapsContinuation}+)${afterWordBoundary}`,
)

const combinedRegex = new RegExp(
  `${REGEX_ALL_CAPS_PHRASE.source}|${REGEX_ACRONYM.source}|${REGEX_ABBREVIATION.source}`,
  "g",
)

export function skipSmallcaps(node: Node): boolean {
  if (node.type === "element") {
    return (
      hasClass(node as Element, "no-smallcaps") ||
      hasClass(node as Element, "no-formatting") ||
      hasClass(node as Element, "bad-handwriting")
    )
  }
  return false
}

function isElvish(node: Element): boolean {
  return hasClass(node, "elvish")
}

function isAbbreviation(node: Element): boolean {
  return node.tagName === "abbr"
}

export function ignoreAcronym(node: Text, ancestors: Parent[]): boolean {
  const parent = ancestors[ancestors.length - 1]

  // Check for no-smallcaps or no-formatting classes on any ancestor
  if (
    ancestors &&
    ancestors.some((ancestor) => ancestor.type === "element" && skipSmallcaps(ancestor))
  ) {
    return true
  }

  // Check if any ancestor is a code element
  if (
    ancestors &&
    ancestors.some((ancestor) => ancestor.type === "element" && isCode(ancestor as Element))
  ) {
    return true
  }

  // Check if parent is elvish or abbreviation
  if (
    parent &&
    parent.type === "element" &&
    (isElvish(parent as Element) || isAbbreviation(parent as Element))
  ) {
    return true
  }

  if (allowAcronyms.includes(node.value)) {
    return false
  }
  if (ignoreList.includes(node.value.toLowerCase())) {
    return true
  }

  return isRomanNumeral(node.value)
}

export function replaceSCInNode(node: Text, ancestors: Parent[]): void {
  const parent = ancestors[ancestors.length - 1]
  const index = parent?.children.indexOf(node)
  if (index === -1) {
    throw new Error("replaceSCInNode: node is not the child of its parent")
  }

  replaceRegex(
    node,
    index,
    parent,
    combinedRegex,
    (match: RegExpMatchArray) => {
      // Lower-case outputs because we're using small-caps
      const allCapsPhraseMatch = REGEX_ALL_CAPS_PHRASE.exec(match[0])
      if (allCapsPhraseMatch && allCapsPhraseMatch.groups) {
        const { phrase } = allCapsPhraseMatch.groups
        return { before: "", replacedMatch: phrase.toLowerCase(), after: "" }
      }

      const acronymMatch = REGEX_ACRONYM.exec(match[0])
      if (acronymMatch && acronymMatch.groups) {
        const { acronym, suffix } = acronymMatch.groups
        return { before: "", replacedMatch: acronym.toLowerCase(), after: suffix || "" }
      }

      const abbreviationMatch = REGEX_ABBREVIATION.exec(match[0])
      if (abbreviationMatch && abbreviationMatch.groups) {
        const { number, abbreviation } = abbreviationMatch.groups
        return { before: "", replacedMatch: number + abbreviation.toLowerCase(), after: "" }
      }

      throw new Error(
        `Regular expression logic is broken; one of the regexes should match for ${match}`,
      )
    },
    (nd: Text) => ignoreAcronym(nd, ancestors),
    "abbr.small-caps",
  )
}

export const rehypeTagAcronyms: Plugin = () => {
  return (tree: Node) => {
    visitParents(tree, "text", (node: Text, ancestors: Parent[]) => {
      replaceSCInNode(node, ancestors)
    })
  }
}

export const TagAcronyms: QuartzTransformerPlugin = () => {
  return {
    name: "TagAcronyms",
    htmlPlugins() {
      return [rehypeTagAcronyms]
    },
  }
}
