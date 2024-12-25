export function throttle(func: () => void, delay: number) {
  let timeout: number | null = null
  return () => {
    if (!timeout) {
      func()
      timeout = window.setTimeout(() => {
        timeout = null
      }, delay)
    }
  }
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * Allows immediate execution on the first call if `immediate` is true.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @param immediate If true, trigger the function on the leading edge.
 * @returns A debounced version of the passed function.
 */
export function debounce<F extends (...args: [KeyboardEvent]) => void>(
  func: F,
  wait: number,
  immediate = false,
): F {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return function (this: Window, ...args: [KeyboardEvent]) {
    const later = () => {
      timeoutId = null
      if (!immediate) {
        func.apply(this, args)
      }
    }

    const callNow = immediate && timeoutId === null

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(later, wait)

    if (callNow) {
      func.apply(this, args)
    }
  } as F
}

export function registerEscapeHandler(outsideContainer: HTMLElement | null, cb: () => void) {
  if (!outsideContainer) return

  function click(e: MouseEvent) {
    if (e.target !== outsideContainer) return
    e.preventDefault()
    cb()
  }

  function esc(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault()
      cb()
    }
  }

  outsideContainer.addEventListener("click", click)
  window.addEventListener("keydown", esc)
}

export function removeAllChildren(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
}

let timeoutAction: number
let timeoutEnable: number

export const withoutTransition = (action: () => void) => {
  clearTimeout(timeoutAction)
  clearTimeout(timeoutEnable)

  const style = document.createElement("style")
  style.textContent = `body * {
     -webkit-transition: none !important;
     -moz-transition: none !important;
     -o-transition: none !important;
     -ms-transition: none !important;   
      transition: none !important;
    }
  `

  const disableTransitions = () => document.head.appendChild(style)
  const enableTransitions = () => document.head.removeChild(style)

  if (typeof window.getComputedStyle !== "undefined") {
    disableTransitions()
    action()

    void window.getComputedStyle(style).opacity // Force reflow
    enableTransitions()
    return
  }

  if (typeof window.requestAnimationFrame !== "undefined") {
    disableTransitions()
    action()
    window.requestAnimationFrame(enableTransitions)
    return
  }

  disableTransitions()
  timeoutAction = window.setTimeout(() => {
    action()
    timeoutEnable = window.setTimeout(enableTransitions, 120)
  }, 120)
}

export function wrapWithoutTransition<T extends (...args: never[]) => ReturnType<T>>(
  func: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    let result: ReturnType<T> | undefined
    document.documentElement.classList.add("temporary-transition")

    withoutTransition(() => {
      result = func(...args)
    })
    setTimeout(() => {
      document.documentElement.classList.remove("temporary-transition")
    }, 1000)
    if (result === undefined) {
      throw new Error("Function returned undefined")
    }
    return result
  }
}
