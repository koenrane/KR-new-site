import { rehype } from "rehype"
import { rehypeTagAcronyms } from "../tagacronyms" // Ensure this is an ES Module
import assert from "node:assert"
import { test } from "node:test"

// Test: Should wrap acronyms in <abbr> tags with class "small-caps"
const htmlIn = `<p>NASA launched a new satellite for NOAA to study GCRs.</p>`
const expectedOutput = `<p><abbr class="small-caps">NASA</abbr> launched a new satellite for <abbr class="small-caps">NOAA</abbr> to study <abbr class="small-caps">GCR</abbr>s.</p>`

function testTagAcronyms(inputHTML: any) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeTagAcronyms)
    .processSync(inputHTML)
    .toString()
}

test("Should wrap acronyms in <abbr> tags with class 'small-caps'", () => {
  const processedHtml = testTagAcronyms(htmlIn)
  assert.strictEqual(
    processedHtml,
    expectedOutput,
    'Acronyms should be wrapped in <abbr> with class "small-caps"',
  )
})
