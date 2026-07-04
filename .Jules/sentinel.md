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
## 2025-02-18 - [Arbitrary Code Execution via PDF.js in PDF Splitter]
**Vulnerability:** Arbitrary JavaScript execution (CVE-2024-4367) when processing untrusted PDFs during the PDF splitting process in `js/pdf-splitter.js`.
**Learning:** `pdfjsLib.getDocument()` was being called without `isEvalSupported: false` in `js/pdf-splitter.js`, which could lead to arbitrary code execution when processing malicious PDFs, even though it was correctly handled in `js/pdf-processor.js`.
**Prevention:** Always consistently apply `isEvalSupported: false` to all `pdfjsLib.getDocument()` calls across the entire codebase to ensure safe processing of untrusted files.
## 2025-02-18 - Missing Subresource Integrity (SRI) on dynamically injected script
**Vulnerability:** The application dynamically loads Tesseract.js from a CDN without SRI or crossorigin attributes (`script.src = '...';`).
**Learning:** Even when dynamically injecting scripts via `document.createElement('script')`, it is critical to verify the integrity of the fetched resource to prevent malicious code execution if the CDN is compromised.
**Prevention:** Always add `integrity` and `crossOrigin='anonymous'` attributes to dynamically injected scripts loading external resources.
## 2025-02-18 - Pin exact version when using Subresource Integrity (SRI)
**Vulnerability:** Calculating and applying an SRI hash to a mutable CDN URL (like `tesseract.js@5` which points to the latest 5.x.x version) introduces a time-bomb. When the package is updated, the hash will fail and the resource will be permanently blocked, breaking application functionality.
**Learning:** Subresource Integrity (SRI) relies on the exact contents of the file. If a CDN URL allows version floating (e.g., via major/minor tags instead of exact patch versions), the file contents can change, breaking the application.
**Prevention:** Always pin CDN URLs to exact, immutable versions (e.g., `@5.1.1` instead of `@5`) before calculating and applying SRI hashes.
## 2025-02-18 - Fail securely in UI error handling
**Vulnerability:** The application was passing the raw `err.message` exception property directly into a user-facing toast notification component (`mostrarToast`).
**Learning:** Even in purely client-side applications without a backend, leaking raw error messages to the user interface is an insecure pattern. It can inadvertently expose internal application state, implementation details, or stack traces if an unexpected edge-case exception is triggered.
**Prevention:** Always follow the "fail securely" principle. Log the raw error (`err`) to the developer console for debugging (`console.error`), but provide only a safe, generic, user-friendly message to the end-user via the UI component.
