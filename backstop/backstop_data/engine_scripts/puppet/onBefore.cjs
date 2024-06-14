module.exports = async (page, scenario, vp) => {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("theme", "light")
  })
}
