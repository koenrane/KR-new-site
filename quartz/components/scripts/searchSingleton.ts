import FlexSearch from "flexsearch"
import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug } from "../../util/path"

interface Item {
  id: number
  slug: FullSlug
  title: string
  content: string
  tags: string[]
}
const CACHE_KEY = "quartz-search-index"
const CACHE_VERSION = "1" // Increment this when your index structure changes

type SearchType = "basic" | "tags"

export class SearchIndex {
  private static instance: SearchIndex
  private index: FlexSearch.Document<Item>
  private isInitialized: boolean = false
  private contentData: { [key: FullSlug]: ContentDetails } = {}

  private constructor() {
    this.index = new FlexSearch.Document<Item>({
      document: {
        id: "id",
        index: ["title", "content", "tags"],
      },
    })
    this.initialize()
  }

  public static getInstance(): SearchIndex {
    if (!SearchIndex.instance) {
      SearchIndex.instance = new SearchIndex()
    }
    return SearchIndex.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    const cachedData = sessionStorage.getItem(CACHE_KEY)
    const cachedVersion = sessionStorage.getItem(`${CACHE_KEY}-version`)

    let saveToStorage: boolean
    if (cachedData && cachedVersion === CACHE_VERSION) {
      console.log("Loading search data from cache")
      this.contentData = JSON.parse(cachedData)
      saveToStorage = false
    } else {
      console.log("Fetching and building the search data")
      this.contentData = await this.fetchContentIndex()
      saveToStorage = true
    }

    await this.buildIndex(saveToStorage)
    this.isInitialized = true
  }

  private async fetchContentIndex(): Promise<{ [key: FullSlug]: ContentDetails }> {
    const response = await fetch("/static/contentIndex.json")
    if (!response.ok) {
      throw new Error(`Failed to fetch content index: ${response.statusText}`)
    }
    return response.json()
  }

  private async buildIndex(saveToStorage: boolean = true): Promise<void> {
    this.index = new FlexSearch.Document<Item>({
      document: {
        id: "id",
        index: ["title", "content", "tags"],
      },
    })

    let id = 0
    for (const [slug, fileData] of Object.entries(this.contentData)) {
      await this.index.addAsync(id, {
        id: id,
        slug: slug as FullSlug,
        title: fileData.title,
        content: fileData.content,
        tags: fileData.tags,
      })
      id++
    }

    if (saveToStorage) {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(this.contentData))
        sessionStorage.setItem(`${CACHE_KEY}-version`, CACHE_VERSION)
      } catch (e) {
        console.warn("Failed to cache search data:", e)
      }
    }
  }

  public async search(
    query: string,
    type: SearchType,
  ): Promise<FlexSearch.SimpleDocumentSearchResultSetUnit[]> {
    if (type === "basic") {
      return this.index.searchAsync({
        query: query,
        limit: 500,
        index: ["title", "content"],
      })
    } else {
      // Implement tag-specific search if needed
      return this.index.searchAsync({
        query: query,
        limit: 500,
        index: ["tags"],
      })
    }
  }

  public getIndex(): FlexSearch.Document<Item> {
    return this.index
  }

  public getContentData(): { [key: FullSlug]: ContentDetails } {
    return this.contentData
  }
}

const searchInstance = SearchIndex.getInstance()
export default searchInstance
