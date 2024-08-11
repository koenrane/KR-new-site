const turnDown = require("turndown")
let turnDownPluginGfm = require("turndown-plugin-gfm")
let gfm = turnDownPluginGfm.gfm

let turndownService = new turnDown({ headingStyle: "atx", emDelimiter: "_" }).use([gfm])
turndownService.addRule("subscript", {
  filter: ["sub"],
  replacement: function (content) {
    return "<sub>" + content + "</sub>"
  },
})

// Retain captions for figures
turndownService.addRule("figure", {
  filter: "figure",
  replacement: function (content, node) {
    // Extract the image (if present) and caption
    const img = node.querySelector("img")
    const figcaption = node.querySelector("figcaption")

    let markdown = ""

    // Process the image
    if (img) {
      const src = img.getAttribute("src") || ""
      const alt = img.getAttribute("alt") || ""
      markdown += `![${alt}](${src})\n`
    }

    // Process the caption
    if (figcaption) {
      const captionHTML = figcaption.innerHTML
      let captionText = turndownService.turndown(captionHTML)
      captionText = captionText.replace(/\\n\\n/g, "\n")

      markdown += `Figure: ${captionText}\n`
    }

    // If there's no image or caption, just return the content
    if (!markdown) {
      return content
    }

    return markdown.trim()
  },
})

function table_caption_replace(content, node) {
  // Extract the image (if present) and caption
  const img = node.querySelector("table")
  const figcaption = node.querySelector("figcaption")

  let markdown = ""

  // Process the image
  if (img) {
    const src = img.getAttribute("src") || ""
    const alt = img.getAttribute("alt") || ""
    markdown += `![${alt}](${src})\n`
  }

  // Process the caption
  if (figcaption) {
    const captionHTML = figcaption.innerHTML
    let captionText = turndownService.turndown(captionHTML)
    captionText = captionText.replace(/\\n\\n/g, "\n")

    markdown += `Table: ${captionText}\n`
  }

  // If there's no image or caption, just return the content
  if (!markdown) {
    return content
  }

  return markdown.trim()
}

// By default, newlines break table rows. Replace with <br>
turndownService.addRule("table linebreak", {
  filter: ["table"],
  replacement: function (content, node) {
    // content = table_caption_replace(content, node)

    const newlinePattern = /(?<=\|)(?: (?:\n)?\n)(.*?)(?:\n\n )(?=\|)/g
    content = content.replaceAll(newlinePattern, "$1")
    content = content.replaceAll(/(?<![s|])\n{2}/g, "<br/><br/>")
    content = content.replaceAll(/(?<![s|])\n/g, "<br/>")

    // No <br/> at the start
    if (content.startsWith("<br/>")) {
      content = content.substring(5)
    }

    // Some tables have 1 column for a "header", and then the real columns.
    // Detect if there is an imbalance, and make a different kind of title.
    const headerRow = content.split("\n")[0]
    const headerColumns = headerRow.split("|").length

    if (headerColumns === 3) {
      let rows = content.split("\n")
      for (let i = 1; i < rows.length; i++) {
        const rowColumns = rows[i].split("|").length
        if (rowColumns > headerColumns) {
          // Get rid of the header row
          rows = rows.slice(i)
          break
        }
      }

      const headerContent = headerRow.split("|")[1]
      content = "\n\n" + rows.join("\n") + "\n" + `Table: ${headerContent}.`
    }

    return content
  },
})

turndownService = turndownService.addRule("math", {
  filter: function (node) {
    return node.getAttribute("class")?.includes("mjx") || node.nodeName === "STYLE"
  },
  replacement: function (content, node) {
    const className = node.getAttribute("class")
    if (className?.includes("mjx-chtml")) {
      let openDelimiter = "$"
      let closeDelimiter = "$"
      // See if the math is block-level
      if (className.includes("MJXc-display")) {
        openDelimiter = "$$\n" // Quartz requires newlines for block equations
        closeDelimiter = "\n$$"
      }

      return openDelimiter + node.firstChild.getAttribute("aria-label") + closeDelimiter
    } else {
      return ""
    }
  },
})

const fs = require("fs")

const filePath = "/Users/turntrout/Documents/response-new.json"

fs.readFile(filePath, "utf-8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err)
    return
  }

  let jsonData
  try {
    jsonData = JSON.parse(data)
    let dataObj = jsonData.data.posts.results
    for (let dataIndex in dataObj) {
      let datum = dataObj[dataIndex]
      if (datum.contents?.html) {
        datum.contents.markdown = turndownService.turndown(datum.contents.html)
      }
    }
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr)
    return
  }

  fs.writeFile("/tmp/all_posts_md.json", JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err)
    }
  })
})
