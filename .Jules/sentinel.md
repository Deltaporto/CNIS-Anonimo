## 2024-05-24 - PDF.js CVE-2024-4367 (Arbitrary JS Execution)
**Vulnerability:** Arbitrary JavaScript execution (XSS) via `eval()` when processing malicious PDFs using pdfjs-dist versions < 4.2.67.
**Learning:** The legacy/older versions of pdfjs-dist default to supporting `eval()` for executing PDF-embedded scripts. If a user uploads a crafted PDF, this can trigger DOM-based XSS or arbitrary JS execution in the browser.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when using client-side PDF processing with older versions of pdfjs-dist.
