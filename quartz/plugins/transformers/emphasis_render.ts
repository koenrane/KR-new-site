import { QuartzTransformerPlugin } from "../types"
import markdownit from "markdown-it"
// @ts-expect-error
import emphasis_alt from "./emphasis-alt"

const md = markdownit("zero").use(emphasis_alt)
md.enable("emphasis") // Enable emphasis and strong

function getBothSubstringsAfterDashes(str: string) {
  const parts = str.split("---")
  if (parts.length >= 3) {
    return [parts[1], parts.slice(2).join("---")] // Return [first substring, second substring]
  }
  return ["", str]
}

const BULLET_PLACEHOLDER = "BULLET_PLACEHOLDER"
export const emphasisRenderHelper = (src: string) => {
  let [yaml, text] = getBothSubstringsAfterDashes(src)
  const dashText = text.replaceAll(/\*   /g, BULLET_PLACEHOLDER)
  let renderedText = md.renderInline(dashText)
  renderedText = renderedText.replace(/&gt;/g, ">") // Replace escaped '>' characters
  renderedText = renderedText.replace(BULLET_PLACEHOLDER, "*   ")

  if (yaml) {
    yaml = "---" + yaml + "---"
  }
  const returnObj = yaml + renderedText
  return returnObj
}
export const EmphasisRender = () => {
  return {
    name: "emphasisRender",
    textTransform(_ctx: any, src: string | Buffer) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return emphasisRenderHelper(src)
    },
  }
}
