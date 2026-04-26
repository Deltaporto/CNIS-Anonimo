## 2026-04-26 - Disable arbitrary JS execution in pdfjs-dist
**Vulnerability:** pdfjs-dist by default supports `eval()` execution. When processing malicious, untrusted PDF files client-side, this can lead to arbitrary JavaScript execution and XSS vulnerabilities.
**Learning:** `isEvalSupported` should explicitly be set to false as a defense-in-depth measure.
**Prevention:** Always initialize `pdfjsLib.getDocument` with `{ isEvalSupported: false }` to disable potential `eval()` calls.
