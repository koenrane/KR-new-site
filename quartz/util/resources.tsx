/* eslint-disable react/no-unknown-property */
// (For the spa-preserve attribute)

import { randomUUID } from "crypto"
import { JSX } from "preact/jsx-runtime"
import React from "react"

export type JSResource = {
  loadTime: "beforeDOMReady" | "afterDOMReady"
  moduleType?: "module"
  spaPreserve?: boolean
} & (
  | {
      src: string
      contentType: "external"
    }
  | {
      script: string
      contentType: "inline"
    }
)

export function JSResourceToScriptElement(resource: JSResource): JSX.Element {
  const scriptType = resource.moduleType ?? "application/javascript"
  const toDefer = resource.loadTime === "afterDOMReady"

  if (resource.contentType === "external") {
    return (
      <script
        spa-preserve
        key={resource.src}
        src={resource.src}
        type={scriptType}
        defer={toDefer}
      />
    )
  } else {
    const content = resource.script
    return (
      <script
        key={randomUUID()}
        type={scriptType}
        spa-preserve
        defer={toDefer}
        dangerouslySetInnerHTML={{ __html: content }}
      ></script>
    )
  }
}

export interface StaticResources {
  css: string[]
  js: JSResource[]
}
