## 2025-02-18 - Prevent DOM-based XSS via innerHTML injection
**Vulnerability:** The application was injecting configuration strings (`config.uploadSub`) directly into the DOM using `innerHTML` (`uploadSubEl.innerHTML = config.uploadSub;`). This pattern exposes the application to DOM-based XSS if configuration values are ever influenced by user input or external sources.
**Learning:** Using `innerHTML` for displaying structural configuration strings is an insecure pattern. It's safer to keep configuration as plain text and apply visual formatting (like `<strong>` tags) programmatically in the UI layer.
**Prevention:** Use `textContent` for plain text data and construct required DOM structures using `document.createElement()` and `appendChild()`. Keep UI state configurations as plain text rather than pre-formatted HTML strings.
## 2024-05-24 - [Arbitrary Code Execution via PDF.js]
**Vulnerability:** Arbitrary JavaScript execution (CVE-2024-4367) when processing untrusted PDFs.
**Learning:** By default, older versions of pdfjs-dist execute JS embedded in PDFs.
**Prevention:** Always set `isEvalSupported: false` when calling `pdfjsLib.getDocument()` on untrusted files.
## 2025-02-18 - Fix Modulo Bias in random number generator
**Vulnerability:** Weak random number generator for fake data.
**Learning:** `crypto.getRandomValues(new Uint32Array(1))[0] % max` introduced modulo bias where smaller numbers would occur slightly more often than larger numbers, because `4294967296` is not divisible by the provided `max` value.
**Prevention:** Implement rejection sampling by ignoring any random value generated that's above the highest possible unbiased multiple of `max`.
