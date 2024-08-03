import { visit } from "unist-util-visit"
import { twemoji } from "./modules/twemoji.min"
import { h } from "hastscript"
import { Plugin } from "unified"
import { Node, Parent } from "unist"
import { Element, Text } from "hast"

const PLACEHOLDER = "__EMOJI_PLACEHOLDER__"
const EMOJI_REPLACEMENT = "⤴"
const TWEMOJI_BASE_URL = "https://assets.turntrout.com/twemoji/"
const EMOJIS_TO_REPLACE = ["1fabf"]

interface TwemojiOptions {
  folder: string
  ext: string
  callback: (icon: string, options: TwemojiOptions) => string
}

function createTwemojiCallback(icon: string, options: TwemojiOptions): string {
  return `${TWEMOJI_BASE_URL}${icon}${options.ext}`
}

function parseAttributes(imgTag: string): Record<string, string> {
  const attrs = imgTag.match(/(\w+)="([^"]*)"?/g) || []
  return attrs.reduce(
    (acc, attr) => {
      const [key, value] = attr.split("=")
      acc[key] = value.replace(/"/g, "")
      return acc
    },
    {} as Record<string, string>,
  )
}

function replaceEmojis(content: string): string {
  let parsed = twemoji.parse(content, {
    folder: "svg",
    ext: ".svg",
    callback: createTwemojiCallback,
  } as TwemojiOptions)

  EMOJIS_TO_REPLACE.forEach((emoji) => {
    parsed = parsed.replace(`twemoji/${emoji}.svg`, `twemoji/replacements/${emoji}.svg`)
  })

  return parsed
}

function createNodes(parsed: string): (Text | Element)[] {
  const newNodes: (Text | Element)[] = []
  const parts = parsed.split(/<img.*?>/g)
  const matches = parsed.match(/<img.*?>/g) || []

  parts.forEach((part, i) => {
    if (part) {
      newNodes.push({ type: "text", value: part.replace(PLACEHOLDER, EMOJI_REPLACEMENT) })
    }
    if (matches[i]) {
      const properties = parseAttributes(matches[i])
      newNodes.push(h("img", properties))
    }
  })

  return newNodes
}

export const Twemoji = (): {
  name: string
  htmlPlugins: () => Plugin[]
} => {
  return {
    name: "Twemoji",
    htmlPlugins() {
      return [
        () => (tree: Node) => {
          visit(tree, "text", (node: Text, index: number, parent: Parent) => {
            const content = node.value.replace(/↩/g, PLACEHOLDER)
            const parsed = replaceEmojis(content)

            if (parsed !== content) {
              const newNodes = createNodes(parsed)
              parent.children.splice(index, 1, ...newNodes)
            }
          })
        },
      ]
    },
  }
}
