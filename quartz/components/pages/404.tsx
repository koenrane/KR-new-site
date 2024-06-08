import notFoundStyle from "../styles/404.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    <article class="popover-hint">
      <div id="not-found-div">
        <div>
          <h1>404</h1>
          <p>
            That page doesn't exist. <br />
            But don't leave! There <br />
            are other fish in the pond.
          </p>
        </div>

        <img
          src="/static/images/turntrout-art-transparent.png"
          id="trout-reading"
          class="no-select"
        ></img>
      </div>
    </article>
  )
}
NotFound.css = notFoundStyle

export default (() => NotFound) satisfies QuartzComponentConstructor
