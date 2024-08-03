import { visit } from "unist-util-visit"
import { twemoji } from "./modules/twemoji.min"
import { h } from "hastscript"
import { Plugin } from "unified"
import { Node, Parent } from "unist"
import { Element, Text } from "hast"

export const PLACEHOLDER = "__EMOJI_PLACEHOLDER__"
export const EMOJI_REPLACEMENT = "⤴"
export const TWEMOJI_BASE_URL = "https://assets.turntrout.com/twemoji/"
export const EMOJIS_TO_REPLACE = ["1fabf"]

export interface TwemojiOptions {
  folder: string
  ext: string
  callback: (icon: string, options: TwemojiOptions) => string
}

export function createTwemojiCallback(icon: string, options: TwemojiOptions): string {
  return `${TWEMOJI_BASE_URL}${icon}${options.ext}`
}

export function parseAttributes(imgTag: string): Record<string, string> {
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

export function replaceEmoji(content: string): string {
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

export function createNodes(parsed: string): (Text | Element)[] {
  const newNodes: (Text | Element)[] = []
  const parts = parsed.split(/<img.*?>/g)
  const matches = parsed.match(/<img.*?>/g) || []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const match = matches[i]

    if (part) {
      newNodes.push({ type: "text", value: part } as Text)
    }

    if (match) {
      const properties = parseAttributes(match)
      newNodes.push(h("img", properties))
    }
  }

  return newNodes
}

export function processTree(tree: Node): Node {
  visit(tree, "text", (node: Text) => {
    node.value = node.value.replaceAll(/↩/g, PLACEHOLDER)
  })

  visit(tree, "text", (node: Text, _index: number, parent: any) => {
    const content = node.value
    const parsed = replaceEmoji(content)

    if (parsed !== content) {
      const nodes = createNodes(parsed)
      parent.children = [
        ...parent.children.slice(0, _index),
        ...nodes,
        ...parent.children.slice(_index + 1),
      ]
    }
  })

  visit(tree, "text", (node: Text) => {
    node.value = node.value.replaceAll(new RegExp(PLACEHOLDER, "g"), EMOJI_REPLACEMENT)
  })

  return tree
}

export const Twemoji = (): {
  name: string
  htmlPlugins: () => Plugin[]
} => {
  return {
    name: "Twemoji",
    htmlPlugins() {
      return [() => processTree]
    },
  }
}
