## 2025-02-18 - Prevent DOM-based XSS via insertAdjacentHTML
**Vulnerability:** The application was using `insertAdjacentHTML` to dynamically insert structural UI elements and static SVGs (`btnBaixarZip.insertAdjacentHTML('beforeend', ICON_DOWNLOAD);`).
**Learning:** Using `insertAdjacentHTML` with plain strings exposes the application to DOM-based XSS if the injected structure is ever influenced by external configurations or data.
**Prevention:** Replace `insertAdjacentHTML` usages with safer DOM APIs. Parse static SVGs securely using `new DOMParser().parseFromString(html, 'image/svg+xml')` and create textual elements directly via `document.createElement()` and `appendChild()`.
