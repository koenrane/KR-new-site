import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import { variables } from "./variables"

// Get current file's directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Convert camelCase to kebab-case
const toKebabCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

// Generate SCSS content
const generateScssContent = (): string => {
  let scss = "// This file is auto-generated. Do not edit directly.\n\n"

  Object.entries(variables).forEach(([key, value]) => {
    const scssVarName = toKebabCase(key)
    // Don't append 'px' to font weights or values that already have units
    const shouldAppendPx = typeof value === "number" && !key.toLowerCase().includes("weight")
    scss += `$${scssVarName}: ${value}${shouldAppendPx ? "px" : ""};\n`
  })

  return scss
}

// Export the main function that generates and writes SCSS
export function generateScss(): void {
  try {
    const outputPath = path.join(__dirname, "variables.scss")
    const scss = generateScssContent()
    fs.writeFileSync(outputPath, scss)
  } catch (error) {
    console.error("Error generating SCSS variables:", error)
    throw error
  }
}

// Run generation if this is the main module
try {
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    generateScss()
    console.log("SCSS variables generated successfully!")
  }
} catch {
  // Ignore any errors in the execution check
  // This allows the module to be imported without issues
}
