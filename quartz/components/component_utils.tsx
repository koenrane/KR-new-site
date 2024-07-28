import { titleCase } from "title-case"
import { niceQuotes } from "../plugins/transformers/formatting_improvement_html"

// Replace single quotes with double quotes for consistency
// NOTE this is a bit of a hack, but probably fine
export function formatTitle(title: string): string {
  title = niceQuotes(title)
  if (title.includes("‘") && title.includes("’")) {
    title = title.replace(/(?<= |^)‘/g, "“").replace(/’(?<= |$)/g, "”")
  }
  // Convert title to title case
  title = titleCase(title, { locale: "en-US" })
  return title
}
