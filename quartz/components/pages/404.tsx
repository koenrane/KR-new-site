import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
// import PageTitle from "../PageTitle"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    // TODO learn React and include PageTitle here
    <article class="popover-hint">
      <h1>404</h1>
      <p>{i18n(cfg.locale).pages.error.notFound}</p>
      <img src="/static/pond.gif" class="no-select"></img>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
