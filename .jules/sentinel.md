## 2024-05-24 - Fix DOM-based XSS in button state restoration
**Vulnerability:** Caching and restoring button states using raw HTML strings via `.innerHTML`.
**Learning:** Storing generic states via `.innerHTML` bypasses DOM tree sanitization and can inadvertently execute malicious scripts if the HTML gets poisoned.
**Prevention:** Cache the child nodes (e.g., `const cachedNodes = Array.from(element.childNodes);`) and securely restore them using `.replaceChildren(...cachedNodes.map(n => n.cloneNode(true)))` to rebuild the DOM state without reparsing HTML.
