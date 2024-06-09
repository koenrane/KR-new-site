import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"

const p = new DOMParser()
async function mouseEnterHandler(
  this: HTMLLinkElement,
  { clientX, clientY }: { clientX: number; clientY: number },
) {
  const link = this
  if (link.dataset.noPopover === "true") {
    return
  }

  async function setPosition(popoverElement: HTMLElement) {
    const { x, y } = await computePosition(link, popoverElement, {
      middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
    })
    Object.assign(popoverElement.style, {
      left: `${x}px`,
      top: `${y}px`,
    })
  }

  const hasAlreadyBeenFetched = () =>
    [...link.children].some((child) => child.classList.contains("popover"))

  // dont refetch if there's already a popover
  if (hasAlreadyBeenFetched()) {
    return setPosition(link.lastChild as HTMLElement)
  }

  const thisUrl = new URL(document.location.href)
  thisUrl.hash = ""
  thisUrl.search = ""
  const targetUrl = new URL(link.href)
  let hash = targetUrl.hash
  targetUrl.hash = ""
  targetUrl.search = ""

  const response = await fetch(`${targetUrl}`).catch((err) => {
    console.error(err)
  })

  // bailout if another popover exists
  if (hasAlreadyBeenFetched()) {
    return
  }

  if (!response) return
  const [contentType] = response.headers.get("Content-Type")!.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  const popoverElement = document.createElement("div")
  popoverElement.classList.add("popover")
  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverElement.appendChild(popoverInner)

  popoverInner.dataset.contentType = contentType ?? undefined

  switch (contentTypeCategory) {
    case "image":
      const img = document.createElement("img")
      img.src = targetUrl.toString()
      img.alt = targetUrl.pathname

      popoverInner.appendChild(img)
      break
    case "application":
      switch (typeInfo) {
        case "pdf":
          const pdf = document.createElement("iframe")
          pdf.src = targetUrl.toString()
          popoverInner.appendChild(pdf)
          break
        default:
          break
      }
      break
    default:
      const contents = await response.text()
      const html = p.parseFromString(contents, "text/html")
      const appendToAttr = (element: Element, attrName: string, toAppend: string) => {
        const attr = element.getAttribute(attrName)
        if (attr) {
          element.setAttribute(attrName, `${attr}${toAppend}`)
        }
      }

      // Modify id attributes so they don't mess up anchor jumps
      html.querySelectorAll("body *").forEach((elt) => {
        const id = elt.getAttribute("id")
        if (!id) return
        const newId = /^[0-9]/.test(id) ? "_" + id : id
        elt.setAttribute("id", newId + "-popover")
      })
      // We want same page links clicked within the popover to move the popover window instead of the main window
      html.querySelectorAll("body a.same-page-link").forEach((link) => {
        link.href = escapeLeadingIdNumber(link.href)
        appendToAttr(link, "href", "-popover")
      })

      normalizeRelativeURLs(html, targetUrl)
      const elts = [...html.getElementsByClassName("popover-hint")]
      if (elts.length === 0) return

      elts.forEach((elt) => popoverInner.appendChild(elt))
  }
  wrappedParseTwemoji(popoverInner)

  setPosition(popoverElement)
  link.appendChild(popoverElement)

  if (hash !== "") {
    hash += "-popover"
    hash = escapeLeadingIdNumber(hash)
    const heading = popoverInner.querySelector(hash) as HTMLElement | null
    if (heading) {
      // leave ~12px of buffer when scrolling to a heading
      popoverInner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
    }
  }
}

// Not all IDs are valid - can't start with digit
function escapeLeadingIdNumber(headingText) {
  // Escape numbers at the start
  const escapedId = headingText.replace(/\#(\d+)/, "#_$1")

  return escapedId
}

document.addEventListener("nav", () => {
  const links = [...document.getElementsByClassName("internal")] as HTMLLinkElement[]
  for (const link of links) {
    link.addEventListener("mouseenter", mouseEnterHandler)
    window.addCleanup(() => link.removeEventListener("mouseenter", mouseEnterHandler))
  }
})
