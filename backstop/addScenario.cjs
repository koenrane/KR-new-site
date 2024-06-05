// addScenario.cjs
const fs = require("fs")
const path = require("path")

const scenarios = require("./scenarios.cjs")

const newScenario = {
  label: process.argv[2],
  url: process.argv[3],
  referenceUrl: "",
  delay: 500,
  misMatchThreshold: 0.01,
  requireSameDimensions: true,
}

scenarios.push(newScenario)

const filePath = path.join(__dirname, "scenarios.cjs")
const data = `module.exports = ${JSON.stringify(scenarios, null, 2)};\n`

fs.writeFile(filePath, data, "utf8", (err) => {
  if (err) throw err
  console.log("New scenario added!")
})
