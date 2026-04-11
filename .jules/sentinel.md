## 2024-05-24 - Disable eval in pdfjs-dist
**Vulnerability:** Potential arbitrary JavaScript execution via `eval()` embedded in malicious PDFs processed client-side.
**Learning:** `pdfjs-dist` defaults `isEvalSupported` to true, which might execute unexpected JS if the PDF contains it.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when using `pdfjs-dist` to parse PDFs locally in the browser to act as a defense-in-depth measure.
