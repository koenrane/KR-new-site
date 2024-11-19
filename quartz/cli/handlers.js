import { intro, outro, select, text } from "@clack/prompts"
import { Mutex } from "async-mutex"
import chalk from "chalk"
import * as cheerio from "cheerio"
import { execSync, spawnSync } from "child_process"
import chokidar from "chokidar"
import { generate } from "critical"
import { randomUUID } from "crypto"
import esbuild from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import fs, { promises } from "fs"
import glob from "glob-promise"
import http from "http"
import path from "path"
import prettyBytes from "pretty-bytes"
import { rimraf } from "rimraf"
import serveHandler from "serve-handler"
import { WebSocketServer } from "ws"

import {
  UPSTREAM_NAME,
  QUARTZ_SOURCE_BRANCH,
  ORIGIN_NAME,
  version,
  fp,
  cacheFile,
  cwd,
} from "./constants.js"
import {
  exitIfCancel,
  escapePath,
  gitPull,
  popContentFolder,
  stashContentFolder,
} from "./helpers.js"

/**
 * Handles `npx quartz create`
 * @param {*} argv arguments for `create`
 */
export async function handleCreate(argv) {
  console.log()
  intro(chalk.bgGreen.black(` Quartz v${version} `))
  const contentFolder = path.join(cwd, argv.directory)
  let setupStrategy = argv.strategy?.toLowerCase()
  let linkResolutionStrategy = argv.links?.toLowerCase()
  const sourceDirectory = argv.source

  // If all cmd arguments were provided, check if theyre valid
  if (setupStrategy && linkResolutionStrategy) {
    // If setup isn't, "new", source argument is required
    if (setupStrategy !== "new") {
      // Error handling
      if (!sourceDirectory) {
        throw new Error(
          "Setup strategies other than 'new' require content folder argument to be set",
        )
      } else {
        if (!fs.existsSync(sourceDirectory)) {
          throw new Error(
            `Input directory to copy/symlink 'content' from not found ('${sourceDirectory}')`,
          )
        } else if (!fs.lstatSync(sourceDirectory).isDirectory()) {
          throw new Error(
            `Source directory to copy/symlink 'content' from is not a directory (found file at '${sourceDirectory}')`,
          )
        }
      }
    }
  }

  // Use cli process if cmd args werent provided
  if (!setupStrategy) {
    setupStrategy = exitIfCancel(
      await select({
        message: `Choose how to initialize the content in \`${contentFolder}\``,
        options: [
          { value: "new", label: "Empty Quartz" },
          { value: "copy", label: "Copy an existing folder", hint: "overwrites `content`" },
          {
            value: "symlink",
            label: "Symlink an existing folder",
            hint: "don't select this unless you know what you are doing!",
          },
        ],
      }),
    )
  }

  async function rmContentFolder() {
    const contentStat = await fs.promises.lstat(contentFolder)
    if (contentStat.isSymbolicLink()) {
      await fs.promises.unlink(contentFolder)
    } else {
      await rimraf(contentFolder)
    }
  }

  const gitkeepPath = path.join(contentFolder, ".gitkeep")
  if (fs.existsSync(gitkeepPath)) {
    await fs.promises.unlink(gitkeepPath)
  }
  if (setupStrategy === "copy" || setupStrategy === "symlink") {
    let originalFolder = sourceDirectory

    // If input directory was not passed, use cli
    if (!sourceDirectory) {
      originalFolder = escapePath(
        exitIfCancel(
          await text({
            message: "Enter the full path to existing content folder",
            placeholder:
              "On most terminal emulators, you can drag and drop a folder into the window and it will paste the full path",
            validate(fp) {
              const fullPath = escapePath(fp)
              if (!fs.existsSync(fullPath)) {
                return "The given path doesn't exist"
              } else if (!fs.lstatSync(fullPath).isDirectory()) {
                return "The given path is not a folder"
              }
            },
          }),
        ),
      )
    }

    await rmContentFolder()
    if (setupStrategy === "copy") {
      await fs.promises.cp(originalFolder, contentFolder, {
        recursive: true,
        preserveTimestamps: true,
      })
    } else if (setupStrategy === "symlink") {
      await fs.promises.symlink(originalFolder, contentFolder, "dir")
    }
  } else if (setupStrategy === "new") {
    await fs.promises.writeFile(
      path.join(contentFolder, "index.md"),
      `---
title: Welcome to Quartz
---

This is a blank Quartz installation.
See the [documentation](https://quartz.jzhao.xyz) for how to get started.
`,
    )
  }

  // Use cli process if cmd args werent provided
  if (!linkResolutionStrategy) {
    // get a preferred link resolution strategy
    linkResolutionStrategy = exitIfCancel(
      await select({
        message:
          "Choose how Quartz should resolve links in your content. This should match Obsidian's link format. You can change this later in `quartz.config.ts`.",
        options: [
          {
            value: "shortest",
            label: "Treat links as shortest path",
            hint: "(default)",
          },
          {
            value: "absolute",
            label: "Treat links as absolute path",
          },
          {
            value: "relative",
            label: "Treat links as relative paths",
          },
        ],
      }),
    )
  }

  // now, do config changes
  const configFilePath = path.join(cwd, "quartz.config.ts")
  let configContent = await fs.promises.readFile(configFilePath, { encoding: "utf-8" })
  configContent = configContent.replace(
    /markdownLinkResolution: '(.+)'/,
    `markdownLinkResolution: '${linkResolutionStrategy}'`,
  )
  await fs.promises.writeFile(configFilePath, configContent)

  // setup remote
  execSync(
    "git remote show upstream || git remote add upstream https://github.com/jackyzha0/quartz.git",
    { stdio: "ignore" },
  )

  outro(`You're all set! Not sure what to do next? Try:
  • Customizing Quartz a bit more by editing \`quartz.config.ts\`
  • Running \`npx quartz build --serve\` to preview your Quartz locally
  • Hosting your Quartz online (see: https://quartz.jzhao.xyz/hosting)
`)
}

/**
 * Handles `npx quartz build`
 * @param {*} argv arguments for `build`
 */
export async function handleBuild(argv) {
  console.log(chalk.bgGreen.black(`\n Quartz v${version} \n`))
  const ctx = await esbuild.context({
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
            let text = await promises.readFile(args.path, "utf8")

            // remove default exports that we manually inserted
            text = text.replace("export default", "")
            text = text.replace("export", "")

            const sourcefile = path.relative(path.resolve("."), args.path)
            const resolveDir = path.dirname(sourcefile)
            const transpiled = await esbuild.build({
              stdin: {
                contents: text,
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
            const rawMod = transpiled.outputFiles[0].text
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
  let lastBuildMs = 0
  let cleanupBuild = null
  const build = async (clientRefresh) => {
    const buildStart = new Date().getTime()
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

    const result = await ctx.rebuild().catch((err) => {
      throw new Error(`Couldn't parse Quartz configuration: ${fp}\nReason: ${err}`)
    })
    release()

    if (argv.bundleInfo) {
      const outputFileName = "quartz/.quartz-cache/transpiled-build.mjs"
      const meta = result.metafile.outputs[outputFileName]
      console.log(
        `Successfully transpiled ${Object.keys(meta.inputs).length} files (${prettyBytes(
          meta.bytes,
        )})`,
      )
      console.log(await esbuild.analyzeMetafile(result.metafile, { color: true }))
    }

    // bypass module cache
    // https://github.com/nodejs/modules/issues/307
    const { default: buildQuartz } = await import(`../../${cacheFile}?update=${randomUUID()}`)
    // ^ this import is relative, so base "cacheFile" path can't be used

    cleanupBuild = await buildQuartz(argv, buildMutex, clientRefresh)

    // Inline critical CSS after each build
    await inlineCriticalCSS(argv.output)

    clientRefresh()
  }

  if (!argv.serve) {
    await build(() => {})
    await ctx.dispose()
    return
  }

  const connections = []
  const clientRefresh = async () => {
    // Don't regenerate critical CSS on every refresh
    connections.forEach((conn) => conn.send("rebuild"))
  }

  if (argv.baseDir !== "" && !argv.baseDir.startsWith("/")) {
    argv.baseDir = "/" + argv.baseDir
  }

  await build(clientRefresh)

  const server = http.createServer(async (req, res) => {
    if (argv.baseDir && !req.url?.startsWith(argv.baseDir)) {
      console.log(
        chalk.red(`[404] ${req.url} (warning: link outside of site, this is likely a Quartz bug)`),
      )
      res.writeHead(404)
      res.end()
      return
    }

    // strip baseDir prefix
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
      const status = res.statusCode
      const statusString =
        status >= 200 && status < 300 ? chalk.green(`[${status}]`) : chalk.red(`[${status}]`)
      console.log(statusString + chalk.grey(` ${argv.baseDir}${req.url}`))
      release()
    }

    const redirect = (newFp) => {
      newFp = argv.baseDir + newFp
      res.writeHead(302, {
        Location: newFp,
      })
      console.log(chalk.yellow("[302]") + chalk.grey(` ${argv.baseDir}${req.url} -> ${newFp}`))
      res.end()
    }

    let fp = req.url?.split("?")[0] ?? "/"

    // handle redirects
    if (fp.endsWith("/")) {
      // /trailing/
      // does /trailing/index.html exist? if so, serve it
      const indexFp = path.posix.join(fp, "index.html")
      if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
        req.url = fp
        return serve()
      }

      // does /trailing.html exist? if so, redirect to /trailing
      let base = fp.slice(0, -1)
      if (path.extname(base) === "") {
        base += ".html"
      }
      if (fs.existsSync(path.posix.join(argv.output, base))) {
        return redirect(fp.slice(0, -1))
      }
    } else {
      // /regular
      // does /regular.html exist? if so, serve it
      let base = fp
      if (path.extname(base) === "") {
        base += ".html"
      }
      if (fs.existsSync(path.posix.join(argv.output, base))) {
        req.url = fp
        return serve()
      }

      // does /regular/index.html exist? if so, redirect to /regular/
      let indexFp = path.posix.join(fp, "index.html")
      if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
        return redirect(fp + "/")
      }
    }

    return serve()
  })

  server.listen(argv.port)
  const wss = new WebSocketServer({ port: argv.wsPort })
  wss.on("connection", (ws) => connections.push(ws))
  console.log(
    chalk.cyan(`Started a Quartz server listening at http://localhost:${argv.port}${argv.baseDir}`),
  )
  console.log("hint: exit with ctrl+c")
  chokidar
    .watch(["**/*.ts", "**/*.tsx", "**/*.scss", "package.json"], {
      ignoreInitial: true,
    })
    .on("all", async () => {
      build(clientRefresh)
    })
}

// Modify the existing function to apply pre-computed CSS
async function inlineCriticalCSS(outputDir) {
  console.log("Computing and injecting critical CSS...")
  try {
    // Generate critical CSS from index page
    const { css } = await generate({
      inline: false,
      base: outputDir,
      src: "index.html",
      width: 1700,
      height: 900,
      penthouse: {
        unstableKeepBrowserAlive: false,
        puppeteer: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
        keepLargerMediaQueries: true,
      },
      css: [
        path.join(outputDir, "index.css"),
        path.join(outputDir, "static", "styles", "katex.min.css"),
      ],
    })

    const criticalCSS = `${css}\nhtml body { visibility: visible; }`
    const allFiles = await glob(`${outputDir}/**/*.html`, {
      recursive: true,
      posix: true,
    })

    for (const file of allFiles) {
      const htmlContent = await fs.promises.readFile(file, "utf-8")
      const styleTag = `<style id="critical-css">${criticalCSS}</style>`
      const htmlWithCriticalCSS = htmlContent.replace("</head>", `${styleTag}</head>`)
      const updatedHTML = reorderHead(htmlWithCriticalCSS)
      await fs.promises.writeFile(file, updatedHTML)
    }

    console.log(`Inlined critical CSS for ${allFiles.length} files`)
  } catch (error) {
    console.error("Error inlining critical CSS:", error)
  }
}

function styleWithId(id) {
  return (_i, el) => el.tagName === "style" && el.attribs["id"] === id
}

// Sort <head> contents so that Slack unfurls the page with the right info
function reorderHead(htmlContent) {
  const $ = cheerio.load(htmlContent)
  const head = $("head")
  const originalChildCount = head.children().length

  // Separate <meta>, <title>, and other tags
  const headChildren = head.children()
  const metaAndTitle = headChildren.filter(
    (_i, el) => el.tagName === "meta" || el.tagName === "title",
  )

  const isCriticalCSS = styleWithId("critical-css")
  const criticalCSS = headChildren.filter(isCriticalCSS)

  const isHideBody = styleWithId("hide-body")
  const hideBody = headChildren.filter(isHideBody)

  const otherElements = headChildren.filter(
    (_i, el) =>
      el.tagName !== "meta" &&
      el.tagName !== "title" &&
      !isCriticalCSS(_i, el) &&
      !isHideBody(_i, el),
  )

  // Clear the head and re-append elements in desired order
  head.empty()
  head.append(metaAndTitle)
  head.append(hideBody)
  head.append(criticalCSS)
  head.append(otherElements)

  const finalChildCount = head.children().length
  if (originalChildCount !== finalChildCount) {
    throw new Error(
      `Head reordering changed number of elements: ${originalChildCount} -> ${finalChildCount}`,
    )
  }

  return $.html()
}

/**
 * Handles `npx quartz update`
 * @param {*} argv arguments for `update`
 */
export async function handleUpdate(argv) {
  const contentFolder = path.join(cwd, argv.directory)
  console.log(chalk.bgGreen.black(`\n Quartz v${version} \n`))
  console.log("Backing up your content")
  execSync(
    "git remote show upstream || git remote add upstream https://github.com/jackyzha0/quartz.git",
  )
  await stashContentFolder(contentFolder)
  console.log(
    "Pulling updates... you may need to resolve some `git` conflicts if you've made changes to components or plugins.",
  )

  try {
    gitPull(UPSTREAM_NAME, QUARTZ_SOURCE_BRANCH)
  } catch {
    console.log(chalk.red("An error occurred above while pulling updates."))
    await popContentFolder(contentFolder)
    return
  }

  await popContentFolder(contentFolder)
  console.log("Ensuring dependencies are up to date")
  const res = spawnSync("npm", ["i"], { stdio: "inherit" })
  if (res.status === 0) {
    console.log(chalk.green("Done!"))
  } else {
    console.log(chalk.red("An error occurred above while installing dependencies."))
  }
}

/**
 * Handles `npx quartz restore`
 * @param {*} argv arguments for `restore`
 */
export async function handleRestore(argv) {
  const contentFolder = path.join(cwd, argv.directory)
  await popContentFolder(contentFolder)
}

/**
 * Handles `npx quartz sync`
 * @param {*} argv arguments for `sync`
 */
export async function handleSync(argv) {
  const contentFolder = path.join(cwd, argv.directory)
  console.log(chalk.bgGreen.black(`\n Quartz v${version} \n`))
  console.log("Backing up your content")

  if (argv.commit) {
    const contentStat = await fs.promises.lstat(contentFolder)
    if (contentStat.isSymbolicLink()) {
      const linkTarg = await fs.promises.readlink(contentFolder)
      console.log(chalk.yellow("Detected symlink, trying to dereference before committing"))

      // stash symlink file
      await stashContentFolder(contentFolder)

      // follow symlink and copy content
      await fs.promises.cp(linkTarg, contentFolder, {
        recursive: true,
        preserveTimestamps: true,
      })
    }

    const currentTimestamp = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    const commitMessage = argv.message ?? `Quartz sync: ${currentTimestamp}`
    spawnSync("git", ["add", "."], { stdio: "inherit" })
    spawnSync("git", ["commit", "-m", commitMessage], { stdio: "inherit" })

    if (contentStat.isSymbolicLink()) {
      // put symlink back
      await popContentFolder(contentFolder)
    }
  }

  await stashContentFolder(contentFolder)

  if (argv.pull) {
    console.log(
      "Pulling updates from your repository. You may need to resolve some `git` conflicts if you've made changes to components or plugins.",
    )
    try {
      gitPull(ORIGIN_NAME, QUARTZ_SOURCE_BRANCH)
    } catch {
      console.log(chalk.red("An error occurred above while pulling updates."))
      await popContentFolder(contentFolder)
      return
    }
  }

  await popContentFolder(contentFolder)
  if (argv.push) {
    console.log("Pushing your changes")
    const res = spawnSync("git", ["push", "-uf", ORIGIN_NAME, QUARTZ_SOURCE_BRANCH], {
      stdio: "inherit",
    })
    if (res.status !== 0) {
      console.log(chalk.red(`An error occurred above while pushing to remote ${ORIGIN_NAME}.`))
      return
    }
  }

  console.log(chalk.green("Done!"))
}
