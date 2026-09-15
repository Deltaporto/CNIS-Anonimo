## 2024-03-24 - DOM-based XSS during State Restoration
**Vulnerability:** Cached `.innerHTML` strings were restored dynamically, introducing DOM-based XSS risks.
**Learning:** Storing stringified HTML structure (e.g. `element.dataset.original = element.innerHTML`) and re-injecting it exposes UI components to state-restoration injection.
**Prevention:** Avoid caching raw HTML strings. Clone child nodes via `Array.from(element.childNodes).map(n => n.cloneNode(true))` and restore them securely with `.replaceChildren(...)`.
