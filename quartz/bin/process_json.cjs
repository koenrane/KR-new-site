const turnDown = require("turndown")
var turnDownPluginGfm = require("turndown-plugin-gfm")
var gfm = turnDownPluginGfm.gfm

var turndownService = new turnDown({ headingStyle: "atx", emDelimiter: "_" })
turndownService.use([gfm])
turndownService.addRule("subscript", {
  filter: ["sub"],
  replacement: function (content) {
    return "<sub>" + content + "</sub>"
  },
})

turndownService.addRule("math", {
  filter: function (node, options) {
    return node.nodeName === "span" && node.getAttribute("class").includes("mjx-math")
  },
  replacement: function (content, node) {
    console.log("$" + node.getAttribute("aria-label") + "$")
    return "$" + node.getAttribute("aria-label") + "$"
  },
})

turndownService.addRule("mathIgnoreStyling", {
  filter: function (node, options) {
    return (
      node.nodeName === "span" &&
      !node.getAttribute("class").includes("mjx-math") &&
      node.getAttribute("class").toLowerCase().includes("mjx")
    )
  },
  replacement: function () {
    return ""
  },
})

const fs = require("fs")

const filePath = "/tmp/response (1).json"

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
    } else {
      console.log("JSON file updated successfully!")
    }
  })
})
