import { Mutex } from "async-mutex"
import chalk from "chalk"
import * as cheerio from "cheerio"
import { load as cheerioLoad } from "cheerio"
import chokidar from "chokidar"
import CleanCSS from "clean-css"
// @ts-expect-error no critical types
import { generate } from "critical"
import { randomUUID } from "crypto"
import { context, build as esBuild, analyzeMetafile } from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import fs, { promises as fsPromises } from "fs"
import glob from "glob-promise"
import http from "http"
import { Context } from "node:vm"
import path from "path"
import prettyBytes from "pretty-bytes"
import serveHandler from "serve-handler"
import { WebSocketServer, WebSocket } from "ws"

import {
  version,
  fp,
  cacheFile, // @ts-expect-error Importing from a JS file, no types
} from "./constants.js"

let cachedCriticalCSS: string = ""

/**
 * Handles `npx quartz build`
 * @param argv - Arguments for the build command
 */
export async function handleBuild(argv: BuildArguments): Promise<void> {
  console.log(chalk.bgGreen.black(`\n turntrout.com v${version} \n`))
  const ctx: Context = await context({
    entryPoints: [fp],
    outfile: cacheFile,
    bundle: true,
    keepNames: true,
    minifyWhitespace: true,
    minifySyntax: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "preact",
    packages: "external",
    metafile: true,
    sourcemap: false,
    sourcesContent: false,
    plugins: [
      sassPlugin({
        type: "css-text",
        cssImports: true,
      }),
      {
        name: "inline-script-loader",
        setup(build) {
          build.onLoad({ filter: /\.inline\.(ts|js)$/ }, async (args) => {
            let pathText: string = await fsPromises.readFile(args.path, "utf8")

            // Remove default exports that we manually inserted
            pathText = pathText.replace("export default", "")
            pathText = pathText.replace("export", "")

            const sourcefile: string = path.relative(path.resolve("."), args.path)
            const resolveDir: string = path.dirname(sourcefile)
            const transpiled = await esBuild({
              stdin: {
                contents: pathText,
                loader: "ts",
                resolveDir,
                sourcefile,
              },
              write: false,
              bundle: true,
              minify: true,
              platform: "browser",
              format: "esm",
            })
            const rawMod: string = transpiled.outputFiles![0].text
            return {
              contents: rawMod,
              loader: "text",
            }
          })
        },
      },
    ],
  })

  const buildMutex = new Mutex()
  let lastBuildMs: number = 0
  let cleanupBuild: (() => Promise<void>) | null = null

  const build = async (clientRefresh: () => void): Promise<void> => {
    const buildStart = Date.now()
    lastBuildMs = buildStart
    const release = await buildMutex.acquire()
    if (lastBuildMs > buildStart) {
      release()
      return
    }

    if (cleanupBuild) {
      await cleanupBuild()
      console.log(chalk.yellow("Detected a source code change, doing a hard rebuild..."))
    }

    const result = await ctx.rebuild().catch((err: Error) => {
      throw new Error(`Couldn't parse turntrout.com configuration: ${fp}\nReason: ${err}`)
    })
    release()

    if (argv.bundleInfo) {
      const outputFileName: string = "quartz/.quartz-cache/transpiled-build.mjs"
      const meta = result.metafile!.outputs[outputFileName]
      console.log(
        `Successfully transpiled ${Object.keys(meta.inputs).length} files (${prettyBytes(
          meta.bytes,
        )})`,
      )
      console.log(await analyzeMetafile(result.metafile, { color: true }))
    }

    // Construct the module path dynamically
    const modulePath: string = `../../${cacheFile}?update=${randomUUID()}`

    // Use the dynamically constructed path in the import statement
    const { default: buildQuartz } = await import(modulePath)

    cleanupBuild = await buildQuartz(argv, buildMutex, clientRefresh)

    clientRefresh()
  }

  if (!argv.serve) {
    await build(() => {
      // Callback placeholder
    })
    await ctx.dispose()

    const allHtmlFiles: string[] = await glob(`${argv.output}/**/*.html`, {
      recursive: true,
      posix: true,
    })

    // Ensure critical CSS is generated and injected before emitting files
    await injectCriticalCSSIntoHTMLFiles(allHtmlFiles, argv.output)

    return
  }

  const connections: WebSocket[] = []
  const clientRefresh = async (): Promise<void> => {
    connections.forEach((conn) => conn.send("rebuild"))

    // Inline the critical CSS
    const allHtmlFiles: string[] = await glob(`${argv.output}/**/*.html`, {
      recursive: true,
      posix: true,
    })

    await injectCriticalCSSIntoHTMLFiles(allHtmlFiles, argv.output)
  }

  if (argv.baseDir !== "" && !argv.baseDir.startsWith("/")) {
    argv.baseDir = `/${argv.baseDir}`
  }

  await build(clientRefresh)

  const server = http.createServer((req, res) => {
    if (argv.baseDir && !req.url?.startsWith(argv.baseDir)) {
      console.log(
        chalk.red(`[404] ${req.url} (warning: link outside of site, this is likely a Quartz bug)`),
      )
      res.writeHead(404)
      res.end()
      return
    }

    // Strip baseDir prefix
    req.url = req.url?.slice(argv.baseDir.length)

    const serve = async () => {
      const release = await buildMutex.acquire()
      await serveHandler(req, res, {
        public: argv.output,
        directoryListing: false,
        headers: [
          {
            source: "**/*.*",
            headers: [{ key: "Content-Disposition", value: "inline" }],
          },
        ],
      })
      const status: number = res.statusCode
      const statusString: string =
        status >= 200 && status < 300 ? chalk.green(`[${status}]`) : chalk.red(`[${status}]`)
      console.log(statusString + chalk.grey(` ${argv.baseDir}${req.url}`))
      release()
    }

    const redirect = (newFp: string) => {
      newFp = argv.baseDir + newFp
      res.writeHead(302, {
        Location: newFp,
      })
      console.log(chalk.yellow("[302]") + chalk.grey(` ${argv.baseDir}${req.url} -> ${newFp}`))
      res.end()
    }

    const filepath: string = req.url?.split("?")[0] ?? "/"

    // Handle redirects
    if (filepath.endsWith("/")) {
      // /trailing/
      // Does /trailing/index.html exist? If so, serve it
      const indexFp: string = path.posix.join(filepath, "index.html")
      if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
        req.url = filepath
        return serve()
      }

      // Does /trailing.html exist? If so, redirect to /trailing
      let base: string = filepath.slice(0, -1)
      if (path.extname(base) === "") {
        base += ".html"
      }
      if (fs.existsSync(path.posix.join(argv.output, base))) {
        return redirect(filepath.slice(0, -1))
      }
    } else {
      // /regular
      // Does /regular.html exist? If so, serve it
      let base: string = filepath
      if (path.extname(base) === "") {
        base += ".html"
      }
      if (fs.existsSync(path.posix.join(argv.output, base))) {
        req.url = filepath
        return serve()
      }

      // Does /regular/index.html exist? If so, redirect to /regular/
      const indexFp: string = path.posix.join(filepath, "index.html")
      if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
        return redirect(`${filepath}/`)
      }
    }

    return serve()
  })

  server.listen(argv.port)
  const wss = new WebSocketServer({ port: argv.wsPort })
  wss.on("connection", (ws: WebSocket) => connections.push(ws))
  console.log(
    chalk.cyan(
      `Started a turntrout.com server listening at http://localhost:${argv.port}${argv.baseDir}`,
    ),
  )
  console.log("Hint: exit with Ctrl+C")

  chokidar
    .watch(["**/*.ts", "**/*.tsx", "**/*.scss", "package.json"], {
      ignoreInitial: true,
      ignored: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    })
    .on("all", async () => {
      await build(clientRefresh)
    })
}

/**
 * Handles critical CSS injection into HTML files
 * Prevents emitting files until critical CSS is successfully generated
 * @param htmlFiles - Array of HTML file paths
 * @param outputDir - Output directory path
 */
export async function injectCriticalCSSIntoHTMLFiles(
  htmlFiles: string[],
  outputDir: string,
): Promise<void> {
  await maybeGenerateCriticalCSS(outputDir)

  if (!cachedCriticalCSS) {
    throw new Error("Critical CSS generation failed. Build aborted.")
  }

  let processedCount: number = 0
  for (const file of htmlFiles) {
    try {
      const htmlContent: string = await fsPromises.readFile(file, "utf-8")
      const querier = cheerioLoad(htmlContent)

      // Remove existing critical CSS
      querier("style#critical-css").remove()

      // Insert the new critical CSS at the end of the head
      const styleTag: string = `<style id="critical-css">${cachedCriticalCSS}</style>`
      querier("head").append(styleTag)

      // Reorder the head elements if needed
      const updatedHTML: string = reorderHead(querier.html())

      await fsPromises.writeFile(file, updatedHTML)
      processedCount++
    } catch (err) {
      console.warn(`Warning: Could not process ${file}: ${err}`)
      continue
    }
  }

  console.log(`Injected critical CSS into ${processedCount} files`)
}

/**
 * Generates and caches critical CSS if not already cached
 * Throws an error if generation fails
 * @param outputDir - Output directory path
 */
async function maybeGenerateCriticalCSS(outputDir: string): Promise<void> {
  if (cachedCriticalCSS !== "") {
    return
  }
  console.log("Computing and caching critical CSS...")
  try {
    const { css } = await generate({
      inline: false,
      base: outputDir,
      src: "index.html",
      width: 1700,
      height: 900,
      css: [
        path.join(outputDir, "index.css"),
        path.join(outputDir, "static", "styles", "katex.min.css"),
      ],
      penthouse: {
        timeout: 120000,
        blockJSRequests: false,
        waitForStatus: "networkidle0",
        renderWaitTime: 2000,
        puppeteer: {
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
          ],
        },
      },
    })

    // Append essential theme variables
    const themeCSS: string = `
      a {
        color: var(--color-link);
      }
      a:visited {
        color: color-mix(in srgb,currentcolor 50%,var(--color-link));
      }
      article[data-use-dropcap="true"] {
        --dropcap-vertical-offset: 0.15rem;
        --dropcap-font-size: 3.95rem;

            & > p:first-of-type {
              position: relative;
              min-height: 4.2rem;
            }

            & > p:first-of-type::before {
          content: attr(data-first-letter);
          text-transform: uppercase;
          position: absolute;
          top: var(--dropcap-vertical-offset);
          left: 0;
          font-size: var(--dropcap-font-size);
          line-height: 1;
          padding-right: 0.1em;
          font-family: "EBGaramondInitialsF2", serif;
        }

        & > p:first-of-type::first-letter {
          padding-top: var(--dropcap-vertical-offset);
          text-transform: uppercase;
          font-style: normal !important;
          float: left;
          color: var(--lightgray);
          font-size: var(--dropcap-font-size);
          line-height: 1;
          padding-right: 0.1em;
          font-family: "EBGaramondInitialsF1", serif;
          font-weight: 500 !important;
        }
      }

      :root[saved-theme="dark"],
      .dark-mode {
        --light: #303446;
        --dark: #c6d0f5;
        --red: #de585a;
        --green: #a6d189;
        --blue: #8caaee;
      }
      :root[saved-theme="light"],
      .light-mode {
        --light: #eff1f5;
        --dark: #4c4f69;
        --red: #be415c;
        --green: #40a02b;
        --blue: #406ecc;
      }
      `
    const minifiedCSS: string = new CleanCSS().minify(css + themeCSS).styles
    if (new CleanCSS().minify(css + themeCSS).errors.length > 0) {
      throw new Error("Critical CSS minification failed.")
    }
    cachedCriticalCSS = minifiedCSS
    console.log("Cached critical CSS with theme variables")
  } catch (error) {
    console.error("Error generating critical CSS:", error)
    cachedCriticalCSS = ""
    throw new Error("Critical CSS generation failed.")
  }
}

/**
 * Sorts <head> contents to optimize metadata and CSS loading
 * @param htmlContent - Original HTML content
 * @returns Updated HTML content with reordered <head> elements
 */
function reorderHead(htmlContent: string): string {
  const querier = cheerioLoad(htmlContent)
  const head = querier("head")
  const originalChildCount = head.children().length

  // Group <head> children by type
  const headChildren = head.children()

  // Dark mode detection script
  const isDarkModeScript = (_i: number, el: cheerio.Element): el is cheerio.TagElement =>
    el.type === "tag" && el.tagName === "script" && el.attribs.id === "detect-dark-mode"
  const darkModeScript = headChildren.filter(isDarkModeScript)

  // Meta and title tags
  const metaAndTitle = headChildren.filter(
    (_i: number, el: cheerio.Element): el is cheerio.TagElement =>
      el.type === "tag" && (el.tagName === "meta" || el.tagName === "title"),
  )

  const isCriticalCSS = (_i: number, el: cheerio.Element): el is cheerio.TagElement =>
    el.type === "tag" && el.tagName === "style" && el.attribs.id === "critical-css"
  const criticalCSS = headChildren.filter(isCriticalCSS)

  // Links cause Firefox FOUC, so we need to move them before scripts
  const isLink = (_i: number, el: cheerio.Element): el is cheerio.TagElement =>
    el.type === "tag" && el.tagName === "link"
  const links = headChildren.filter(isLink)

  // Anything else (scripts, etc.)
  const otherElements = headChildren.filter(
    (_i: number, el: cheerio.Element): el is cheerio.TagElement =>
      el.type === "tag" &&
      el.tagName !== "meta" &&
      el.tagName !== "title" &&
      !isCriticalCSS(_i, el) &&
      !isLink(_i, el) &&
      !isDarkModeScript(_i, el),
  )

  // Clear the head, then re-append in the JS "ground truth" order
  head.empty()

  // 1. Dark mode script first
  head.append(darkModeScript)
  // 2. Meta/title tags
  head.append(metaAndTitle)
  // 3. Critical CSS
  head.append(criticalCSS)
  // 4. Link tags
  head.append(links)
  // 5. Everything else
  head.append(otherElements)

  // Ensure we haven't lost or gained any child elements
  const finalChildCount = head.children().length
  if (originalChildCount !== finalChildCount) {
    throw new Error(
      `Head reordering changed number of elements: ${originalChildCount} -> ${finalChildCount}`,
    )
  }

  return querier.html()
}

// Define interfaces for better type safety
interface BuildArguments {
  serve?: boolean
  bundleInfo?: boolean
  output: string
  baseDir: string
  port: number
  wsPort: number
}
