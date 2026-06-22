## 2024-05-24 - [PDF.js disable eval()]
**Vulnerability:** PDF.js evaluates JavaScript inside PDFs. Malicious PDFs can potentially execute arbitrary JS using `eval()`.
**Learning:** For client-side PDF processing with pdfjs-dist, it is necessary to disable `isEvalSupported` as a defense-in-depth measure.
**Prevention:** Initialize `getDocument` with `isEvalSupported: false` to prevent potential arbitrary JavaScript execution via `eval()` embedded in malicious PDFs.
