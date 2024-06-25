document.addEventListener("DOMContentLoaded", () => {
  const toc = document.getElementById("table-of-contents")
  const content = document.getElementById("content-meta")

  console.log(toc)
  // Check if both ToC and content exist and have children
  if (toc && content && toc.children.length > 0 && content.children.length > 0) {
    let hr = document.createElement("hr")
    hr.className = "desktop-only"
    toc.after(hr) // Insert the <hr> after the ToC
  }
})
