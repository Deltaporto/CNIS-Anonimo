## 2026-04-17 - Disable PDF.js `eval` capability
**Vulnerability:** PDF.js default behavior allows for execution of embedded JavaScript via `eval()` when processing PDFs client-side, posing an XSS/arbitrary code execution risk if malicious PDFs are uploaded and parsed.
**Learning:** `pdfjsLib.getDocument()` is invoked with its default settings which leaves `isEvalSupported` to true (depending on browser environment, but effectively enabled), a known risk for un-sandboxed environments.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` as a defense-in-depth measure, unless `eval` is strictly required and heavily sandboxed.
