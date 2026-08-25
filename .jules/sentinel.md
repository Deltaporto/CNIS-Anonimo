## 2026-08-25 - DOM-based XSS from state restoration via innerHTML
**Vulnerability:** The application was storing raw HTML from \`element.innerHTML\` and later restoring it by assigning the stored string back to \`.innerHTML\`.
**Learning:** Caching and restoring raw HTML strings using \`.innerHTML\` exposes the application to DOM-based XSS if the cached content can be manipulated, and causes unnecessary reparsing.
**Prevention:** Avoid storing and restoring raw HTML strings. Instead, cache the child nodes (e.g., \`const cachedNodes = Array.from(element.childNodes).map(n => n.cloneNode(true));\`) and restore them securely using \`.replaceChildren(...cachedNodes.map(n => n.cloneNode(true)))\` to rebuild the DOM state without reparsing HTML.
