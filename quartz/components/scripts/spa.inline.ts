// This file implements a client-side router for Single Page Applications (SPA)
// It handles navigation between pages without full page reloads

import micromorph from "micromorph"

import { FullSlug, RelativeURL, getFullSlug, normalizeRelativeURLs } from "../../util/path"

declare global {
  interface Window {
    __hasRemovedCriticalCSS?: boolean
  }
}

// adapted from `micromorph`
// https://github.com/natemoo-re/micromorph
const NODE_TYPE_ELEMENT = 1
const announcer = document.createElement("route-announcer")

/**
 * Type guard to check if a target is an Element
 */
const isElement = (target: EventTarget | null): target is Element =>
  (target as Node)?.nodeType === NODE_TYPE_ELEMENT

/**
 * Checks if a URL is local (same origin as current window)
 */
const isLocalUrl = (href: string) => {
  try {
    const url = new URL(href)
    if (window.location.origin === url.origin) {
      return true
    }
  } catch {
    // ignore
  }
  console.info("isLocalUrl", href, false)
  return false
}

/**
 * Extracts navigation options from a click event
 * Returns URL and scroll behavior settings
 */
const getOpts = ({ target }: Event): { url: URL; scroll?: boolean } | undefined => {
  if (!isElement(target)) return
  if (target.attributes.getNamedItem("target")?.value === "_blank") return
  const a = target.closest("a")
  if (!a) return
  if ("routerIgnore" in a.dataset) return
  const { href } = a
  if (!isLocalUrl(href)) return
  return { url: new URL(href), scroll: "routerNoscroll" in a.dataset ? false : undefined }
}

/**
 * Dispatches a custom navigation event
 */
function notifyNav(url: FullSlug) {
  const event: CustomEventMap["nav"] = new CustomEvent("nav", { detail: { url } })
  document.dispatchEvent(event)
}

let p: DOMParser
/**
 * Core navigation function that:
 * 1. Fetches new page content
 * 2. Updates the DOM using micromorph
 * 3. Handles scroll position
 * 4. Updates browser history
 * 5. Manages page title and announcements
 */
async function navigate(url: URL) {
  p = p || new DOMParser()

  // Clean up any existing popovers
  const existingPopovers = document.querySelectorAll(".popover")
  existingPopovers.forEach((popover) => popover.remove())

  history.pushState({}, "", url)

  let contents: string | undefined

  try {
    const res = await fetch(url.toString())
    const contentType = res.headers.get("content-type")
    if (contentType?.startsWith("text/html")) {
      contents = await res.text()
    } else {
      window.location.href = url.toString()
      return
    }
  } catch {
    window.location.href = url.toString()
    return
  }

  if (!contents) return

  const html = p.parseFromString(contents, "text/html")
  normalizeRelativeURLs(html, url)

  let title = html.querySelector("title")?.textContent
  if (title) {
    document.title = title
  } else {
    const h1 = document.querySelector("h1")
    title = h1?.innerText ?? h1?.textContent ?? url.pathname
  }
  if (announcer.textContent !== title) {
    announcer.textContent = title
  }
  announcer.dataset.persist = ""
  html.body.appendChild(announcer)

  // Morph body
  await micromorph(document.body, html.body)

  // Patch head
  const elementsToRemove = document.head.querySelectorAll(":not([spa-preserve])")
  elementsToRemove.forEach((el) => el.remove())
  const elementsToAdd = html.head.querySelectorAll(":not([spa-preserve])")
  elementsToAdd.forEach((el: Element) => document.head.appendChild(el.cloneNode(true)))

  notifyNav(getFullSlug(window))
  delete announcer.dataset.persist

  window.__hasRemovedCriticalCSS = false
}

window.spaNavigate = navigate
/**
 * Creates and configures the router instance
 * - Sets up click event listeners for link interception
 * - Handles browser back/forward navigation
 * - Provides programmatic navigation methods (go, back, forward)
 */
function createRouter() {
  if (typeof window !== "undefined") {
    document.addEventListener("click", async (event) => {
      const { url } = getOpts(event) ?? {}

      // dont hijack behaviour, just let browser act normally
      if (!url || (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey) return

      event.preventDefault()

      try {
        await navigate(url)
      } catch {
        window.location.assign(url)
      }
    })

    window.addEventListener("popstate", () => {
      try {
        console.info("popstate", window.location.toString())
        navigate(new URL(window.location.toString()))
      } catch (error) {
        console.error("Navigation error:", error)
        window.location.reload()
      }
    })
  }

  return new (class Router {
    go(pathname: RelativeURL) {
      const url = new URL(pathname, window.location.toString())
      return navigate(url)
    }

    back() {
      return window.history.back()
    }

    forward() {
      return window.history.forward()
    }
  })()
}

createRouter()
notifyNav(getFullSlug(window))

/**
 * Registers the RouteAnnouncer custom element if not already defined
 * Sets up necessary ARIA attributes and styling for accessibility
 */
if (!customElements.get("route-announcer")) {
  const attrs = {
    "aria-live": "assertive",
    "aria-atomic": "true",
    style:
      "position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px",
  }

  customElements.define(
    "route-announcer",
    class RouteAnnouncer extends HTMLElement {
      constructor() {
        super()
      }
      connectedCallback() {
        for (const [key, value] of Object.entries(attrs)) {
          this.setAttribute(key, value)
        }
      }
    },
  )
}
