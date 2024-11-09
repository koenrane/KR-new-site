// This file implements a client-side router for Single Page Applications (SPA)
// It handles navigation between pages without full page reloads

import micromorph from "micromorph"

import { FullSlug, RelativeURL, getFullSlug, normalizeRelativeURLs } from "../../util/path"

// adapted from `micromorph`
// https://github.com/natemoo-re/micromorph
const NODE_TYPE_ELEMENT = 1
const announcer = document.createElement("route-announcer")

// Override browser's native scroll restoration
// This allows the page to restore the previous scroll position on refresh
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual" // Take control of scroll restoration

  // Restore scroll position immediately
  const savedScroll = sessionStorage.getItem("scrollPos")
  if (savedScroll && !window.location.hash) {
    window.scrollTo({ top: parseInt(savedScroll), behavior: "instant" })
  }

  // Store position before refresh
  window.addEventListener("beforeunload", () => {
    const scrollPos = window.scrollY
    sessionStorage.setItem("scrollPos", scrollPos.toString())
  })

  // Clean up storage after successful restoration
  window.addEventListener("load", () => {
    if (!window.location.hash) {
      sessionStorage.removeItem("scrollPos")
    }
  })
}

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

/**
 * Handles scrolling to specific elements when hash is present in URL
 */
function scrollToHash(hash: string) {
  if (!hash) return
  try {
    const el = document.getElementById(decodeURIComponent(hash.substring(1)))
    if (!el) return
    el.scrollIntoView({ behavior: "instant" })
  } catch {
    // Ignore malformed URI
  }
}

/**
 * Saves the current scroll position to session storage
 */
function saveScrollPosition(url: string): void {
  const scrollPos = window.scrollY
  const key = `scrollPos:${url}`
  sessionStorage.setItem(key, scrollPos.toString())
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

  // Save current scroll position before navigation
  saveScrollPosition(window.location.toString())
  history.pushState({}, "", url)

  if (url.hash) {
    // AKA the anchor
    scrollToHash(url.hash)
  }

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
  micromorph(document.body, html.body)

  // Smooth scroll for anchors; else jump instantly
  const isSamePageNavigation = url.pathname === window.location.pathname
  if (isSamePageNavigation && url.hash) {
    const el = document.getElementById(decodeURIComponent(url.hash.substring(1)))
    el?.scrollIntoView({ behavior: "smooth" })
  } else {
    // Restore scroll position on back navigation
    const key = `scrollPos:${url.toString()}`
    const savedScroll = sessionStorage.getItem(key)
    // Go to 0 if no scroll position is saved
    window.scrollTo({
      top: savedScroll ? parseInt(savedScroll) : 0,
      behavior: "instant",
    })
  }

  // Patch head
  const elementsToRemove = document.head.querySelectorAll(":not([spa-preserve])")
  elementsToRemove.forEach((el) => el.remove())
  const elementsToAdd = html.head.querySelectorAll(":not([spa-preserve])")
  elementsToAdd.forEach((el) => document.head.appendChild(el.cloneNode(true)))

  // Comment out the critical styles removal
  // function removeCriticalStyles() {
  //   const criticalStyles = document.querySelectorAll("head style")

  //   if (criticalStyles.length > 1) {
  //     console.warn("More than one style tag found in head")
  //   }

  //   criticalStyles[0].remove()
  //   console.info("Removed critical styles from spa.inline.ts")
  // }

  notifyNav(getFullSlug(window))
  delete announcer.dataset.persist
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
        navigate(url)
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

// Keep existing hash handler
if (window.location.hash) {
  window.addEventListener("load", () => {
    scrollToHash(window.location.hash)
  })
}
