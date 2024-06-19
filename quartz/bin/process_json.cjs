const turnDown = require("turndown")
var turnDownPluginGfm = require("turndown-plugin-gfm")
var gfm = turnDownPluginGfm.gfm

var turndownService = new turnDown({ headingStyle: "atx", emDelimiter: "_" })
turndownService = turndownService.use([gfm])
turndownService.addRule("subscript", {
  filter: ["sub"],
  replacement: function (content) {
    return "<sub>" + content + "</sub>"
  },
})

turndownService.addRule("removeMath", {
  filter: ["span"],
  replacement: function (content, node) {
    if (node.nodeName.toLowerCase() === "style" && node.getAttribute("class").includes("mjx")) {
      // Remove the span content
      return ""
    }
    return content
  },
})

turndownService = turndownService.addRule("math", {
  filter: function (node) {
    return node.nodeName === "SPAN" && node.getAttribute("class")?.includes("mjx-chtml")
  },
  replacement: function (content, node) {
    let delimiter = "$"
    if (node.getAttribute("class").includes("MJXc-display")) {
      delimiter = "$$"
    }

    const firstChild = node?.firstChild
    if (firstChild?.getAttribute("class").includes("mjx-math")) {
      return delimiter + firstChild.getAttribute("aria-label") + delimiter
    }
  },
})

const fs = require("fs")
const { delimiter } = require("path")

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
        fs.writeFile(
          "/tmp/testcontents.html",
          JSON.stringify(datum.contents.html, null, 2),
          (err) => {
            if (err) {
              console.error("Error writing file:", err)
            } else {
              console.log("HTML file updated successfully!")
            }
          },
        )
        // console.log(datum.contents.html)
        datum.contents.markdown = turndownService.turndown(datum.contents.html)
        // console.log(datum.contents.markdown)
      }
    }
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr)
    return
  }

  fs.writeFile("/tmp/all_posts_md.json", JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err)
    } else {
      console.log("JSON file updated successfully!")
    }
  })
})
