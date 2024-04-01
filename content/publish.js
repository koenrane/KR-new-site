// EVENT LISTENERS 
// This function will load the Twemoji library and parse the emojis in the body
function loadAndParseTwemoji() {
    const script = document.createElement('script');
    script.src = "https://twemoji.maxcdn.com/v/latest/twemoji.min.js";
    script.crossOrigin = "anonymous";
    script.onload = function() {
        twemoji.parse(document.body);
    };
    document.head.appendChild(script);
}

// Tooltip listeners TODO fix
function tooltipOnHover() {
  const footnoteReferences = document.querySelectorAll('a.footnote-link');

  footnoteReferences.forEach(ref => {
    ref.addEventListener('mouseover', function(event) {
      // Extract the footnote ID from the href attribute
      const footnoteId = ref.getAttribute('href').substring(1); // remove the '#' at the beginning
      const footnote = document.getElementById(footnoteId);

      // If the footnote content exists on the page
      if (footnote) {
        const tooltip = document.createElement('div');
        tooltip.className = 'preview-tooltip';
        tooltip.innerHTML = footnote.innerHTML; // Use innerHTML to keep the formatting

        document.body.appendChild(tooltip);

        // Position the tooltip near the link
        const linkRect = ref.getBoundingClientRect();
        tooltip.style.left = `${linkRect.left + window.scrollX}px`;
        tooltip.style.top = `${linkRect.bottom + window.scrollY + 5}px`; // Add a little space below the link
        tooltip.style.display = 'block'; // Show the tooltip
      }
    });

    ref.addEventListener('mouseout', function() {
      // Remove the tooltip when not hovering
      document.querySelectorAll('.preview-tooltip').forEach(tooltip => {
        tooltip.remove();
      });
    });
  });
}

// Tags acronyms with the .small-caps class
const ignoreClasses = ['bad-handwriting', 'gold-script'];
function hasIgnoreClassInAncestors(element) {
    while (element = element.parentNode) {
        if (!element.classList) continue; // Skip nodes without classes (like text nodes
        if (ignoreClasses.some(className => element.classList.contains(className))) {
            return true; // Found an ancestor with an ignore class
        }
    }
    return false; // No ancestor has an ignore class
}

function tagAcronyms(rootNode) {
    const regex = /\b([A-Z]{2,})\b/g;
    let nodes = [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);

    let textNode;
    while (textNode = walker.nextNode()) {
        // Skip already tagged nodes
        const parent = textNode.parentNode;
        if (parent.nodeName === "ABBR") continue; 
        if (hasIgnoreClassInAncestors(textNode)) continue;

        nodes.push(textNode);
    }

    // Check all text nodes for acronyms
    nodes.forEach(textNode => {
        const matches = textNode.nodeValue.match(regex);
        if (!matches) return; // Skip nodes without acronyms

        // Create a new span element for each acronym, which will also contain
        //  the before/after text
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();

        matches.forEach(match => {
            console.log("Acronym match: ", match);
            const index = textNode.nodeValue.indexOf(match, lastIndex);
            if (index > lastIndex) {
                fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex, index)));
            }
            const abbr = document.createElement('abbr');
            abbr.className = 'small-caps';
            abbr.textContent = match;
            fragment.appendChild(abbr);

            // Note where the last acronym ended
            lastIndex = index + match.length;
        });

        // Add any remaining text after the last acronym
        if (lastIndex < textNode.nodeValue.length) {
            fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}
tagAcronyms(document.body);

// Detect whether user prefers dark mode 
function applyDarkMode() {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');

    let toggle = document.querySelector('.site-body-left-column-site-theme-toggle');
    toggle.classList.add('is-dark');

    // The switch which the user sees
    let checkbox = document.querySelector('.checkbox-container');
    checkbox.classList.add('is-enabled');
}
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyDarkMode();
}
        
// Call the functions when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndParseTwemoji);
    document.addEventListener('DOMContentLoaded', tooltipOnHover);
} else {
    loadAndParseTwemoji();
    tooltipOnHover();
}

// Handle favicons for external links
function addFavicon(link) {
    const url = new URL(link.href);
    const domain = url.hostname;
    const img = document.createElement('img');
    img.onerror = function() {
        console.error(`Failed to load favicon for ${domain}`);
        img.remove(); // Remove the image if it fails to loaded
    }


    // Fetch a 64x64 favicon
    img.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    img.classList.add('favicon');

    img.style.width = '12px';
    img.style.height = '12px';

    img.style.marginLeft = '1px'; 
    img.style.marginRight = '0.6px'; 
    img.style.verticalAlign = 'bottom'; // Make it into a superscript
    img.style.filter = 'saturate(50%)'; // Don't distract from text

    // Ensure link content and favicon are on the same line
    // Create a span that will contain the last word and the favicon
    const lastWordSpan = document.createElement('span');
    lastWordSpan.style.whiteSpace = 'nowrap';

    // Move the last word of the link text into the span
    const linkText = link.textContent.trim();
    const lastSpaceIndex = linkText.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
        link.textContent = linkText.slice(0, lastSpaceIndex); // Set the text without the last word
        lastWordSpan.textContent = linkText.slice(lastSpaceIndex); // Set the last word in the span
    } else {
        lastWordSpan.textContent = linkText; // If only one word, move it into the span
        link.textContent = ''; // Clear the original link text
    }

    // Append the favicon to the span
    lastWordSpan.appendChild(img);
    // Append the span to the link
    link.appendChild(lastWordSpan);
    // Set the link display to inline to allow wrapping
    link.style.display = 'inline';
}

const observerCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches('.external-link')) {
                    addFavicon(node);
                }
                node.querySelectorAll('.external-link').forEach(addFavicon);

                // Small-caps new acronyms
                if (!node.matches('abbr')) {
                    tagAcronyms(node);
                }
            }
        });
    }
};

// Options for the observer (which mutations to observe)
const config = { childList: true, subtree: true };

// Create an instance of the observer with the callback function
const observer = new MutationObserver(observerCallback);

// Start observing the target node for configured mutations
observer.observe(document.body, config);

// Log that the observer is running
console.log('MutationObserver is set up and running.');

// Process any existing .external-link elements
document.querySelectorAll('.external-link').forEach(addFavicon);
