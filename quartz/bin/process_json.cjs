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

turndownService = turndownService.addRule("math", {
  filter: function (node) {
    return (
      (node.nodeName === "SPAN" && node.getAttribute("class")?.includes("mjx")) ||
      node.nodeName === "STYLE"
    )
  },
  replacement: function (content, node) {
    const className = node.getAttribute("class")
    if (className?.includes("mjx-chtml")) {
      let delimiter = "$"
      // See if the math is block-level
      if (className.includes("MJXc-display")) {
        delimiter = "$$"
      }

      return delimiter + node.firstChild.getAttribute("aria-label") + delimiter
    } else {
      console.log(className)
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
