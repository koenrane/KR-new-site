// NOTE: The function documentation is AI-generated. Take with a grain of salt.
import FlexSearch, { ContextOptions } from "flexsearch"

import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { replaceEmojiConvertArrows } from "../../plugins/transformers/twemoji"
import { FullSlug, normalizeRelativeURLs, resolveRelative } from "../../util/path"
import { registerEscapeHandler, removeAllChildren, debounce } from "./util"

interface Item {
  id: number
  slug: FullSlug
  title: string
  content: string
  tags: string[]
  authors?: string
}

/**
 * Delay in milliseconds before triggering a search after user input
 */
export const debounceSearchDelay = 250

type SearchType = "basic" | "tags"
let searchType: SearchType = "basic"
let currentSearchTerm = ""

const index = new FlexSearch.Document<Item>({
  charset: "latin:advanced",
  tokenize: "strict",
  resolution: 1,
  context: {
    depth: 2,
    bidirectional: false,
  } as ContextOptions,
  document: {
    id: "id",
    tag: "tags",
    index: [
      {
        field: "title",
        tokenize: "forward",
        resolution: 9,
      },
      {
        field: "content",
        tokenize: "strict",
        resolution: 9,
      },
      {
        field: "tags",
        tokenize: "strict",
        resolution: 9,
      },
      {
        field: "slug",
        tokenize: "strict",
        resolution: 9,
      },
      {
        field: "aliases",
        tokenize: "strict",
        resolution: 9,
      },
      {
        field: "authors",
        tokenize: "strict",
        resolution: 9,
      },
    ],
  },
})

interface FetchResult {
  content: Element[]
  frontmatter: Element
}

const fetchContentCache = new Map<FullSlug, Promise<FetchResult>>()
const contextWindowWords = 30
const numSearchResults = 8
const numTagResults = 5

/**
 * Tokenizes a search term into individual words and their combinations
 * @param term - The search term to tokenize
 * @returns Array of tokens, sorted by length (longest first)
 * @example
 * tokenizeTerm("hello world") // returns ["hello world", "hello", "world"]
 */
const tokenizeTerm = (term: string) => {
  const tokens = term.split(/\s+/).filter((t) => t.trim() !== "")
  const tokenLen = tokens.length
  if (tokenLen > 1) {
    for (let i = 1; i < tokenLen; i++) {
      tokens.push(tokens.slice(0, i + 1).join(" "))
    }
  }

  return tokens.sort((a, b) => b.length - a.length) // always highlight longest terms first
}

/**
 * Highlights search terms within a text string
 * @param searchTerm - Term to highlight
 * @param text - Text to search within
 * @param trim - If true, returns a window of text around matches
 * @returns HTML string with highlighted terms wrapped in <span class="highlight">
 */
function highlight(searchTerm: string, text: string, trim?: boolean) {
  const tokenizedTerms = tokenizeTerm(searchTerm)
  let tokenizedText = text.split(/\s+/).filter((t) => t !== "")

  let startIndex = 0
  let endIndex = tokenizedText.length - 1
  if (trim) {
    const includesCheck = (tok: string) =>
      tokenizedTerms.some((term) => tok.toLowerCase().startsWith(term.toLowerCase()))
    const occurrencesIndices = tokenizedText.map(includesCheck)

    let bestSum = 0
    let bestIndex = 0
    for (let i = 0; i < Math.max(tokenizedText.length - contextWindowWords, 0); i++) {
      const window = occurrencesIndices.slice(i, i + contextWindowWords)
      const windowSum = window.reduce((total, cur) => total + (cur ? 1 : 0), 0)
      if (windowSum >= bestSum) {
        bestSum = windowSum
        bestIndex = i
      }
    }

    startIndex = Math.max(bestIndex - contextWindowWords, 0)
    endIndex = Math.min(startIndex + 2 * contextWindowWords, tokenizedText.length - 1)
    tokenizedText = tokenizedText.slice(startIndex, endIndex)
  }

  const slice = tokenizedText
    .map((tok: string): string => {
      // see if this tok is prefixed by any search terms
      for (const searchTok of tokenizedTerms) {
        if (tok.toLowerCase().includes(searchTok.toLowerCase())) {
          const sanitizedSearchTok = escapeRegExp(searchTok)
          const regex = new RegExp(sanitizedSearchTok.toLowerCase(), "gi")
          return tok.replace(regex, '<span class="highlight">$&</span>')
        }
      }
      return tok
    })
    .join(" ")

  return `${startIndex === 0 ? "" : "..."}${slice}${
    endIndex === tokenizedText.length - 1 ? "" : "..."
  }`
}

/**
 * Escapes special characters in a string for use in RegExp
 * @param text - String to escape
 */
function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const createHighlightSpan = (text: string) => {
  const span = document.createElement("span")
  span.className = "highlight"
  span.textContent = text
  return span
}

const highlightTextNodes = (node: Node, term: string) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const sanitizedTerm = escapeRegExp(term)
    const nodeText = node.nodeValue ?? ""
    const regex = new RegExp(sanitizedTerm.toLowerCase(), "gi")
    const matches = nodeText.match(regex)
    if (!matches || matches.length === 0) return
    const spanContainer = document.createElement("span")
    let lastIndex = 0
    for (const match of matches) {
      const matchIndex = nodeText.indexOf(match, lastIndex)
      spanContainer.appendChild(document.createTextNode(nodeText.slice(lastIndex, matchIndex)))
      spanContainer.appendChild(createHighlightSpan(match))
      lastIndex = matchIndex + match.length
    }
    spanContainer.appendChild(document.createTextNode(nodeText.slice(lastIndex)))
    node.parentNode?.replaceChild(spanContainer, node)
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if ((node as HTMLElement).classList.contains("highlight")) return
    Array.from(node.childNodes).forEach((child) => highlightTextNodes(child, term))
  }
}

/**
 * Highlights search terms within HTML content while preserving HTML structure
 * @param searchTerm - Term to highlight
 * @param el - HTML element to search within
 * @returns DOM node with highlighted terms
 */
function highlightHTML(searchTerm: string, el: HTMLElement) {
  const parser = new DOMParser()
  const tokenizedTerms = tokenizeTerm(searchTerm)
  const html = parser.parseFromString(el.innerHTML, "text/html")

  for (const term of tokenizedTerms) {
    highlightTextNodes(html.body, term)
  }

  return html.body
}

export const searchPlaceholderDesktop = "Toggle search by pressing /"
export const searchPlaceholderMobile = "Search"
export const desktopWidth = 1000
/**
 * Updates the search bar placeholder text based on screen width
 */
function updatePlaceholder() {
  const searchBar = document.getElementById("search-bar")
  if (window.innerWidth > desktopWidth) {
    // This is tablet width
    searchBar?.setAttribute("placeholder", searchPlaceholderDesktop)
  } else {
    searchBar?.setAttribute("placeholder", searchPlaceholderMobile)
  }
}

function showSearch(
  searchTypeNew: SearchType,
  container: HTMLElement | null,
  searchBar: HTMLInputElement | null,
) {
  if (!container || !searchBar) return
  searchType = searchTypeNew
  const navbar = document.getElementById("navbar")
  if (navbar) {
    navbar.style.zIndex = "1"
  }
  container?.classList.add("active")
  document.body.classList.add("no-mix-blend-mode") // Add class when search is opened
  searchBar?.focus()
  updatePlaceholder()
}

/**
 * Hides the search interface and resets its state
 */
function hideSearch() {
  const container = document.getElementById("search-container")
  const searchBar = document.getElementById("search-bar") as HTMLInputElement | null
  const results = document.getElementById("results-container")
  const preview = document.getElementById("preview-container")
  const searchLayout = document.getElementById("search-layout")

  container?.classList.remove("active")
  document.body.classList.remove("no-mix-blend-mode") // Remove class when search is closed
  if (searchBar) {
    searchBar.value = "" // clear the input when we dismiss the search
  }
  if (results) {
    removeAllChildren(results)
  }
  if (preview) {
    preview.style.display = "none"
  }
  if (searchLayout) {
    searchLayout.classList.remove("display-results")
  }

  searchType = "basic" // reset search type after closing
}

let searchLayout: HTMLElement | null = null
let data: { [key: FullSlug]: ContentDetails } | undefined
let results: HTMLElement
let preview: HTMLDivElement | undefined
let previewInner: HTMLElement | undefined
let currentHover: HTMLInputElement | null = null
let currentSlug: FullSlug

const appendLayout = (el: HTMLElement) => {
  if (searchLayout?.querySelector(`#${el.id}`) === null) {
    searchLayout?.appendChild(el)
  }
}

async function shortcutHandler(
  e: KeyboardEvent,
  container: HTMLElement | null,
  searchBar: HTMLInputElement | null,
) {
  if (e.key === "/") {
    e.preventDefault()
    const searchBarOpen = container?.classList.contains("active")
    if (searchBarOpen) {
      hideSearch()
    } else {
      showSearch("basic", container, searchBar)
    }
    return
  } else if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    // Hotkey to open tag search
    e.preventDefault()
    e.stopPropagation() // Add this line to stop event propagation
    const searchBarOpen = container?.classList.contains("active")
    void (searchBarOpen ? hideSearch() : showSearch("tags", container, searchBar))

    // add "#" prefix for tag search
    if (searchBar) searchBar.value = "#"
    return
  }

  if (currentHover) {
    currentHover.classList.remove("focus")
  }

  // If search is active, then we will render the first result and display accordingly
  if (!container?.classList.contains("active")) return
  if (e.key === "Enter") {
    // If result has focus, navigate to that one, otherwise pick first result
    if (results?.contains(document.activeElement)) {
      const active = document.activeElement as HTMLInputElement
      if (active.classList.contains("no-match")) return
      await displayPreview(active)
      active.click()
    } else {
      const anchor = document.getElementsByClassName("result-card")[0] as HTMLInputElement | null
      if (!anchor || anchor?.classList.contains("no-match")) return
      await displayPreview(anchor)
      anchor.click()
    }
  } else if (e.key === "ArrowUp" || (e.shiftKey && e.key === "Tab")) {
    e.preventDefault()
    if (results?.contains(document.activeElement)) {
      // If an element in results-container already has focus, focus previous one
      const currentResult = currentHover
        ? currentHover
        : (document.activeElement as HTMLInputElement | null)
      const prevResult = currentResult?.previousElementSibling as HTMLInputElement | null
      currentResult?.classList.remove("focus")
      prevResult?.focus()
      if (prevResult) currentHover = prevResult
      await displayPreview(prevResult)
    }
  } else if (e.key === "ArrowDown" || e.key === "Tab") {
    e.preventDefault()
    // The results should already been focused, so we need to find the next one.
    // The activeElement is the search bar, so we need to find the first result and focus it.
    if (document.activeElement === searchBar || currentHover !== null) {
      const firstResult = currentHover
        ? currentHover
        : (document.getElementsByClassName("result-card")[0] as HTMLInputElement | null)
      const secondResult = firstResult?.nextElementSibling as HTMLInputElement | null
      firstResult?.classList.remove("focus")
      secondResult?.focus()
      if (secondResult) currentHover = secondResult
      await displayPreview(secondResult)
    }
  }
}

/**
 * Handles navigation events by setting up search functionality
 * @param e - Navigation event
 */
async function onNav(e: CustomEventMap["nav"]) {
  // Clean up previous listeners if they exist
  if (cleanupListeners) {
    cleanupListeners()
  }

  currentSlug = e.detail.url
  data = await fetchData
  if (!data) return
  results = document.createElement("div")
  const container = document.getElementById("search-container")
  const searchIcon = document.getElementById("search-icon")
  const searchBar = document.getElementById("search-bar") as HTMLInputElement | null
  searchLayout = document.getElementById("search-layout")

  const enablePreview = searchLayout?.dataset?.preview === "true"
  results.id = "results-container"
  appendLayout(results)

  if (enablePreview) {
    preview = document.createElement("div")
    preview.id = "preview-container"
    appendLayout(preview)
  }

  const debouncedOnType = debounce(onType, debounceSearchDelay, false)

  // Store all event listener cleanup functions
  const listeners = new Set<() => void>()

  // Replace direct event listener assignments with addListener
  addListener(
    document,
    "keydown",
    (e: Event) => shortcutHandler(e as KeyboardEvent, container, searchBar),
    listeners,
  )
  addListener(searchIcon, "click", () => showSearch("basic", container, searchBar), listeners)
  addListener(searchBar, "input", debouncedOnType, listeners)

  // Create cleanup function
  cleanupListeners = () => {
    listeners.forEach((cleanup) => cleanup())
    listeners.clear()
  }

  registerEscapeHandler(container, hideSearch)
  await fillDocument(data)
}

/**
 * Fetches and caches content for a given slug
 * Note: This function's correctness depends on the HTML structure of your content
 * and should be verified with your specific setup
 * @param slug - Page slug to fetch
 */
async function fetchContent(slug: FullSlug): Promise<FetchResult> {
  if (!fetchContentCache.has(slug)) {
    const fetchPromise = await (async () => {
      const targetUrl = resolveUrl(slug, currentSlug).toString()
      const contents = await fetch(targetUrl)
        .then((res) => res.text())
        .then((contents) => {
          if (contents === undefined) {
            throw new Error(`Could not fetch ${targetUrl}`)
          }

          const parser = new DOMParser()
          const html = parser.parseFromString(contents ?? "", "text/html")
          normalizeRelativeURLs(html, targetUrl)

          // Extract frontmatter
          const frontmatterScript = html.querySelector('script[type="application/json"]')
          const frontmatter = frontmatterScript
            ? JSON.parse(frontmatterScript.textContent || "{}")
            : {}

          const contentElements = [...html.getElementsByClassName("popover-hint")]

          return { content: contentElements, frontmatter }
        })

      return contents
    })()

    fetchContentCache.set(slug, Promise.resolve(fetchPromise))
  }

  return fetchContentCache.get(slug) ?? ({} as FetchResult)
}

/**
 * Displays a preview of the selected search result
 * @param el - Selected result element
 */
async function displayPreview(el: HTMLElement | null) {
  const enablePreview = searchLayout?.dataset?.preview === "true"
  if (!searchLayout || !enablePreview || !el || !preview) return
  const slug = el.id as FullSlug

  try {
    const { content, frontmatter } = await fetchContent(slug)
    const useDropcap: boolean = !("no_dropcap" in frontmatter) || frontmatter.no_dropcap === "false"

    if (!previewInner) {
      previewInner = document.createElement("article")
      previewInner.classList.add("preview-inner")
      preview.appendChild(previewInner)

      // Add click event listener to navigate to the page
      preview.addEventListener("click", () => {
        window.location.href = resolveUrl(slug, currentSlug).toString()
      })
    }

    previewInner.setAttribute("data-use-dropcap", useDropcap.toString())

    // Clear existing content
    previewInner.innerHTML = ""

    // Immediately add and highlight content
    content.forEach((el) => {
      const highlightedContent = highlightHTML(currentSearchTerm, el as HTMLElement)

      if (previewInner) {
        // Extend previewInner with the children of highlightedContent
        previewInner.append(...Array.from(highlightedContent.childNodes))
      }
    })

    // Scroll to the first highlight
    const highlights = [...preview.querySelectorAll(".highlight")]
      .sort((a, b) => b.innerHTML.length - a.innerHTML.length)
      .filter((x) => (x as HTMLElement).offsetParent !== null) // Otherwise can't scroll to it / not in the DOM TODO test highlight function

    if (highlights.length > 0 && preview) {
      // Get the first highlight's position relative to the preview container
      const firstHighlight = highlights[0] as HTMLElement
      const offsetTop = getOffsetTopRelativeToContainer(firstHighlight, preview)

      // Scroll the preview container
      preview.scrollTop = offsetTop - 0.5 * preview.clientHeight // 50% padding from top
    }
  } catch (error) {
    console.error("Error loading preview:", error)
    if (previewInner) {
      previewInner.innerHTML =
        '<div class="preview-error" style="color: var(--red);">Error loading preview</div>'
    }
  }
}

let cleanupListeners: (() => void) | undefined

/**
 * Adds an event listener and tracks it for cleanup
 * @param element - Element to attach listener to
 * @param event - Event name
 * @param handler - Event handler
 * @param listeners - Set to track cleanup functions
 */
function addListener(
  element: Element | Document | null,
  event: string,
  handler: EventListener,
  listeners: Set<(listener: () => void) => void>,
) {
  if (!element) return
  element.addEventListener(event, handler)
  listeners.add(() => element.removeEventListener(event, handler))
}

/**
 * Retrieves IDs from search results based on a specific field
 * @param field - Field name to filter by
 * @param searchResults - Search results to filter
 * @returns Array of IDs
 */
const getByField = (
  field: string,
  searchResults: FlexSearch.SimpleDocumentSearchResultSetUnit[],
): number[] => {
  const results = searchResults.filter((x) => x.field === field)
  return results.length === 0 ? [] : ([...results[0].result] as number[])
}

const resultToHTML = ({ slug, title, content, tags }: Item, enablePreview: boolean) => {
  const htmlTags = tags.length > 0 ? `<ul class="tags">${tags.join("")}</ul>` : ""
  const itemTile = document.createElement("a")
  itemTile.classList.add("result-card")
  itemTile.id = slug
  itemTile.href = resolveUrl(slug, currentSlug).toString()

  content = replaceEmojiConvertArrows(content)
  itemTile.innerHTML = `<span class="h4">${title}</span><br/>${htmlTags}${
    enablePreview && window.innerWidth > 600 ? "" : `<p>${content}</p>`
  }`
  itemTile.addEventListener("click", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    hideSearch()
  })

  const handler = (event: MouseEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    hideSearch()
  }

  async function onMouseEnter(ev: MouseEvent) {
    if (!ev.target) return
    const target = ev.target as HTMLInputElement
    await displayPreview(target)
  }

  itemTile.addEventListener("mouseenter", onMouseEnter)
  itemTile.addEventListener("click", handler)

  return itemTile
}

/**
 * Formats search result data for display
 * @param term - Search term
 * @param id - Result ID
 * @param data - Content data
 * @param idDataMap - Mapping of IDs to slugs
 */
const formatForDisplay = (
  term: string,
  id: number,
  data: { [key: FullSlug]: ContentDetails },
  idDataMap: FullSlug[],
) => {
  const slug = idDataMap[id]
  return {
    id,
    slug,
    title: searchType === "tags" ? data[slug].title : highlight(term, data[slug].title ?? ""),
    content: highlight(term, data[slug].content ?? "", true),
    authors: data[slug].authors,
    tags: highlightTags(term.substring(1), data[slug].tags),
  }
}

/**
 * Displays search results in the UI
 * @param finalResults - Processed search results
 * @param results - Container element for results
 * @param enablePreview - Whether preview is enabled
 */
async function displayResults(finalResults: Item[], results: HTMLElement, enablePreview: boolean) {
  if (!results) return

  removeAllChildren(results)
  if (finalResults.length === 0) {
    results.innerHTML = `<a class="result-card no-match">
        <h3>No results.</h3>
        <p>Try another search term?</p>
    </a>`
  } else {
    results.append(...finalResults.map((result) => resultToHTML(result, enablePreview)))
  }

  if (finalResults.length === 0 && preview) {
    // no results, clear previous preview
    preview.style.display = "none"
  } else {
    // focus on first result, then also dispatch preview immediately
    const firstChild = results.firstElementChild as HTMLElement
    firstChild.classList.add("focus")
    currentHover = firstChild as HTMLInputElement

    await displayPreview(firstChild)
    if (preview) {
      preview.style.display = "block"
    } else {
      throw new Error("Preview element not found")
    }
  }
}

/**
 * Handles search input changes
 * @param e - Input event
 */
async function onType(e: HTMLElementEventMap["input"]) {
  if (!searchLayout || !index) return
  const enablePreview = searchLayout?.dataset?.preview === "true"
  currentSearchTerm = (e.target as HTMLInputElement).value
  searchLayout.classList.toggle("display-results", currentSearchTerm !== "")
  searchType = currentSearchTerm.startsWith("#") ? "tags" : "basic"

  let searchResults: FlexSearch.SimpleDocumentSearchResultSetUnit[]
  if (searchType === "tags") {
    currentSearchTerm = currentSearchTerm.substring(1).trim()
    const separatorIndex = currentSearchTerm.indexOf(" ")
    if (separatorIndex !== -1) {
      // search by title and content index and then filter by tag (implemented in flexsearch)
      const tag = currentSearchTerm.substring(0, separatorIndex)
      const query = currentSearchTerm.substring(separatorIndex + 1).trim()
      searchResults = await index.searchAsync({
        query,
        // return at least 10000 documents, so it is enough to filter them by tag (implemented in flexsearch)
        limit: Math.max(numSearchResults, 2000),
        index: ["title", "content"],
        tag,
      })
      for (const searchResult of searchResults) {
        searchResult.result = searchResult.result.slice(0, numSearchResults)
      }
      // set search type to basic and remove tag from term for proper highlighting and scroll
      searchType = "basic"
      currentSearchTerm = query
    } else {
      // default search by tags index
      searchResults = await index.searchAsync({
        query: currentSearchTerm,
        limit: numSearchResults,
        index: ["tags"],
      })
    }
  } else if (searchType === "basic") {
    searchResults = await index.searchAsync({
      query: currentSearchTerm,
      limit: numSearchResults,
      index: ["title", "content", "slug", "authors"],
      bool: "or", // Appears in any of the fields
      suggest: false,
    })
  } else {
    throw new Error("Invalid search type")
  }

  // Ordering affects search results, so we need to order them here
  const allIds: Set<number> = new Set([
    ...getByField("slug", searchResults),
    ...getByField("title", searchResults),
    ...getByField("authors", searchResults),
    ...getByField("content", searchResults),
  ])
  const idDataMap = Object.keys(data ?? {}) as FullSlug[]
  if (!data) return
  const finalResults = [...allIds].map((id) =>
    formatForDisplay(currentSearchTerm, id, data!, idDataMap),
  )
  await displayResults(finalResults, results, enablePreview)
}

/**
 * Highlights matching tags in search results
 * @param term - Search term
 * @param tags - Array of tags
 * @returns Array of HTML strings for tags
 */
function highlightTags(term: string, tags: string[]) {
  if (!tags || searchType !== "tags") {
    return []
  }

  return tags
    .map((tag) => {
      if (tag.toLowerCase().includes(term.toLowerCase())) {
        return `<li><p class="match-tag">#${tag}</p></li>`
      } else {
        return `<li><p>#${tag}</p></li>`
      }
    })
    .slice(0, numTagResults)
}

function resolveUrl(slug: FullSlug, currentSlug: FullSlug): URL {
  return new URL(resolveRelative(currentSlug, slug), location.toString())
}

/**
 * Initializes search functionality
 */
export function setupSearch() {
  document.addEventListener("nav", onNav)
}

/**
 * Fills flexsearch document with data
 * @param index index to fill
 * @param data data to fill index with
 */
async function fillDocument(data: { [key: FullSlug]: ContentDetails }) {
  let id = 0
  const promises: Array<Promise<unknown>> = []
  for (const [slug, fileData] of Object.entries<ContentDetails>(data)) {
    promises.push(
      index.addAsync(id++, {
        id,
        slug: slug as FullSlug,
        title: fileData.title,
        content: fileData.content,
        tags: fileData.tags,
        authors: fileData.authors,
      }),
    )
  }

  return await Promise.all(promises)
}

/*
 * Return all descendants with an ID
 */
export function descendantsWithId(rootNode: Element): HTMLElement[] {
  const elementsWithId: HTMLElement[] = []
  const children = rootNode.querySelectorAll<HTMLElement>("*")

  children.forEach((child) => {
    if (child.id && !child.id.startsWith("search-")) {
      elementsWithId.push(child)
    }
  })

  return elementsWithId
}

/*
 * Return all descendants with a same-page-link class
 */
export function descendantsSamePageLinks(rootNode: Element): HTMLAnchorElement[] {
  // Select all 'a' elements with 'href' starting with '#'
  const nodeListElements = rootNode.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
  return Array.from(nodeListElements)
}

function getOffsetTopRelativeToContainer(element: HTMLElement, container: HTMLElement): number {
  let offsetTop = 0
  let currentElement: HTMLElement | null = element

  // Traverse up the DOM tree until we reach the container
  while (currentElement && currentElement !== container) {
    offsetTop += currentElement.offsetTop
    currentElement = currentElement.offsetParent as HTMLElement | null
  }

  return offsetTop
}
