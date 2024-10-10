import { normalizeRelativeURLs } from "../../util/path"

export interface PopoverOptions {
    parentElement: HTMLElement;
    targetUrl: URL;
    linkElement: HTMLLinkElement;
}

const parser = new DOMParser()

/**
 * Creates a popover element based on the provided options
 * @param options - The options for creating the popover
 * @returns A Promise that resolves to the created popover element
 */
export async function createPopover(options: PopoverOptions): Promise<HTMLElement> {
    const { targetUrl } = options;
    const popoverElement = document.createElement("div");
    popoverElement.classList.add("popover");
    const popoverInner = document.createElement("div");
    popoverInner.classList.add("popover-inner");
    popoverElement.appendChild(popoverInner);

    try {
        const response = await fetch(`${targetUrl}`);
        const contentType = response.headers.get("Content-Type");
        if (!contentType) throw new Error("No content type received");

        const [contentTypeCategory, typeInfo] = contentType.split("/");
        popoverInner.dataset.contentType = contentType;

        switch (contentTypeCategory) {
            case "image":
                const img = document.createElement("img");
                img.src = targetUrl.toString();
                img.alt = targetUrl.pathname;
                popoverInner.appendChild(img);
                break;
            case "application":
                if (typeInfo === "pdf") {
                    const pdf = document.createElement("iframe");
                    pdf.src = targetUrl.toString();
                    popoverInner.appendChild(pdf);
                }
                break;
            default:
                const contents = await response.text();
                const html = parser.parseFromString(contents, "text/html");
                normalizeRelativeURLs(html, targetUrl);
                const hintElements = html.getElementsByClassName("popover-hint");
                if (hintElements.length === 0) throw new Error("No popover hint elements found");
                Array.from(hintElements).forEach(elt => popoverInner.appendChild(elt));
        }
    } catch (error) {
        console.error("Error creating popover:", error);
        popoverInner.textContent = "Error loading content";
    }

    return popoverElement;
}

/**
 * Sets the position of the popover relative to the link element
 * @param popoverElement - The popover element to position
 * @param linkElement - The link element to position relative to
 */
export function setPopoverPosition(popoverElement: HTMLElement, linkElement: HTMLLinkElement): void {
    const padding = 5;
    const linkRect = linkElement.getBoundingClientRect();
    const popoverWidth = popoverElement.offsetWidth;

    // Position the popover's right edge 10px to the left of the link
    let left = linkRect.left - popoverWidth - padding;

    // Ensure the popover doesn't go off the left edge of the screen
    left = Math.max(padding, left);

    // Calculate top position to be 5px below the bottom of the link
    let top = .5 * (linkRect.top + linkRect.bottom) - .5 * popoverElement.offsetHeight + window.scrollY + padding;

    // Ensure the popover doesn't go above the top of the screen
    top = Math.max(window.scrollY + padding, top);

    Object.assign(popoverElement.style, {
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
    });

    console.log("Popover position:", { left, top, linkRect, popoverWidth });
}

/**
 * Attaches event listeners to the popover and link elements
 * @param popoverElement - The popover element
 * @param linkElement - The link element
 * @returns A cleanup function to remove the event listeners
 */
export function attachPopoverEventListeners(popoverElement: HTMLElement, linkElement: HTMLLinkElement): () => void {
    let isMouseOverLink = false;
    let isMouseOverPopover = false;

    const removePopover = () => {
        popoverElement.classList.remove("visible");
        setTimeout(() => {
            if (!isMouseOverLink && !isMouseOverPopover) {
                popoverElement.remove();
            }
        }, 300);
    };

    const showPopover = () => {
        popoverElement.classList.add("popover-visible");
    };

    linkElement.addEventListener("mouseenter", () => {
        isMouseOverLink = true;
        showPopover();
    });

    linkElement.addEventListener("mouseleave", () => {
        isMouseOverLink = false;
        removePopover();
    });

    popoverElement.addEventListener("mouseenter", () => {
        isMouseOverPopover = true;
    });

    popoverElement.addEventListener("mouseleave", () => {
        isMouseOverPopover = false;
        removePopover();
    });

    popoverElement.addEventListener("click", (e) => {
        const clickedLink = (e.target as HTMLElement).closest("a");
        if (clickedLink && clickedLink instanceof HTMLAnchorElement) {
            window.location.href = clickedLink.href;
        } else {
            window.location.href = linkElement.href;
        }
    });

    // Cleanup function
    return () => {
        linkElement.removeEventListener("mouseenter", showPopover);
        linkElement.removeEventListener("mouseleave", removePopover);
        popoverElement.removeEventListener("mouseenter", () => { isMouseOverPopover = true; });
        popoverElement.removeEventListener("mouseleave", () => {
            isMouseOverPopover = false;
            removePopover();
        });
        popoverElement.removeEventListener("click", () => { });
    };
}

/**
 * Escapes leading ID numbers in a string
 * @param text - The text to escape
 * @returns The escaped text
 */
export function escapeLeadingIdNumber(text: string): string {
    return text.replace(/#(\d+)/, "#_$1");
}