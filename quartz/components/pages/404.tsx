import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    <article class="popover-hint">
      <div class="container" style="position:relative;">
        <div class="container" style="position:absolute;top:0.6em;left:12%;">
          <h1 style="margin-bottom:0px;line-height:.1em;text-align:right">404</h1>
          <p style="font-size:1em;text-align:right">
            {" "}
            That page doesn't exist. <br />
            But don't leave! <br />
            There are other fish in the pond.
          </p>
        </div>

        <img
          src="/static/images/turntrout-art-transparent.png"
          class="no-select"
          style="max-width:70%;position:absolute;right:-10px"
        ></img>
      </div>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
