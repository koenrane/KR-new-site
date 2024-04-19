import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    <article class="popover-hint">
      <div class="container" style="position:relative;">
        <h1 style="position:absolute;top:-.5em;left:4.3em">404</h1>
        <p style="top:2em;left:2em;" class="resize-text">
          That page doesn't exist. But don't leave! There are other fish in the pond. 🐟
          <a href="/posts">Go back home</a>
        </p>

        <img
          src="/static/images/turntrout-art-transparent.png"
          class="no-select"
          style="max-width:70%;position:absolute;right:0px"
        ></img>
      </div>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
