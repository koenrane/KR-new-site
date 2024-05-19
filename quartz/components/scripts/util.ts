export function registerEscapeHandler(outsideContainer: HTMLElement | null, cb: () => void) {
  if (!outsideContainer) return
  function click(this: HTMLElement, e: HTMLElementEventMap["click"]) {
    if (e.target !== this) return
    e.preventDefault()
    cb()
  }

  function esc(e: HTMLElementEventMap["keydown"]) {
    if (!e.key.startsWith("Esc")) return
    e.preventDefault()
    cb()
  }

  outsideContainer?.addEventListener("click", click)
  window.addCleanup(() => outsideContainer?.removeEventListener("click", click))
  document.addEventListener("keydown", esc)
  window.addCleanup(() => document.removeEventListener("keydown", esc))
}

export function removeAllChildren(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
}

let timeoutAction
let timeoutEnable

// Perform a task without any css transitions
export const withoutTransition = (action: () => any) => {
  // Clear fallback timeouts
  clearTimeout(timeoutAction)
  clearTimeout(timeoutEnable)

  // Create style element to disable transitions
  const style = document.createElement("style")
  const css = document.createTextNode(`* {
     -webkit-transition: .9s ease !important;
     -moz-transition: .9s ease !important;
     -o-transition: .9s ease !important;
     -ms-transition: .9s ease !important;
     transition: .9s ease !important;
  }`)
  style.appendChild(css)

  // Functions to insert and remove style element
  const disable = () => document.head.appendChild(style)
  const enable = () => document.head.removeChild(style)

  // Best method, getComputedStyle forces browser to repaint
  if (typeof window.getComputedStyle !== "undefined") {
    disable()
    action()
    window.getComputedStyle(style).opacity
    enable()
    return
  }

  // Better method, requestAnimationFrame processes function before next repaint
  if (typeof window.requestAnimationFrame !== "undefined") {
    disable()
    action()
    window.requestAnimationFrame(enable)
    return
  }

  // Fallback
  disable()
  timeoutAction = setTimeout(() => {
    action()
    timeoutEnable = setTimeout(enable, 120)
  }, 120)
}

export function wrapWithoutTransition<T extends (...args: any[]) => any>(
  func: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    let result: ReturnType<T>
    withoutTransition(() => {
      result = func(...args)
    })
    return result
  }
}
