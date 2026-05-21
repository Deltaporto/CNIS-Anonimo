## 2025-02-18 - Prevent DOM-based XSS via innerHTML injection
**Vulnerability:** The application was injecting configuration strings (`config.uploadSub`) directly into the DOM using `innerHTML` (`uploadSubEl.innerHTML = config.uploadSub;`). This pattern exposes the application to DOM-based XSS if configuration values are ever influenced by user input or external sources.
**Learning:** Using `innerHTML` for displaying structural configuration strings is an insecure pattern. It's safer to keep configuration as plain text and apply visual formatting (like `<strong>` tags) programmatically in the UI layer.
**Prevention:** Use `textContent` for plain text data and construct required DOM structures using `document.createElement()` and `appendChild()`. Keep UI state configurations as plain text rather than pre-formatted HTML strings.
## 2024-05-24 - Fix CVE-2024-4367 in pdf.js
**Vulnerability:** Arbitrary JavaScript execution in pdf.js via the `isEvalSupported` flag.
**Learning:** When using `pdf.js` to parse untrusted PDFs, especially older versions like 3.11.174, malicious PDFs can leverage `isEvalSupported: true` (which is often the default) to run arbitrary JS code.
**Prevention:** Always explicitly set `isEvalSupported: false` in `pdfjsLib.getDocument()` configuration options when parsing external PDFs.
