import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    <article class="popover-hint">
      <div style="position:relative;">
        <div style="left:5%;">
          <h1 class="header-404">404</h1>
          <p style="max-width:32%;text-align-last:justify;font-size:1em;">
            That page doesn't exist. <br />
            But don't leave! There <br />
            are other fish in the pond.
          </p>
        </div>

        <img
          src="/static/images/turntrout-art-transparent.png"
          class="no-select"
          style="max-width:70%;right:10%;top:-50%;position:absolute"
        ></img>
      </div>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
