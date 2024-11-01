import React from "react"

import { classNames } from "../util/lang"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
function Spacer({ displayClass }: QuartzComponentProps) {
  return <div className={classNames(displayClass, "spacer")}></div>
}

export default (() => Spacer) satisfies QuartzComponentConstructor
