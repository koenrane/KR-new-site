import pluginJs from "@eslint/js"
import perfectionist from "eslint-plugin-perfectionist"
import pluginReact from "eslint-plugin-react"
import globals from "globals"
import tseslint from "typescript-eslint"

export default [
  {
    plugins: {
      perfectionist,
    },
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          order: "asc",
        },
      ],
    },
  },

  { files: ["quartz/**/*.{js,mjs,cjs,ts,jsx,tsx}", "quartz.{layout,config}.ts"] },

  {
    ignores: ["**/*!*", "quartz/.quartz-cache/", "**/*.min.js", "**/*.min.ts", "quartz/i18n/"],
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]
