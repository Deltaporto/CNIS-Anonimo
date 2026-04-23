
## 2026-04-23 - Prevent arbitrary JS execution in pdfjs-dist
**Vulnerability:** Client-side PDF processing with `pdfjs-dist` could allow arbitrary JavaScript execution if malicious PDFs contain embedded JS and `eval()` is supported.
**Learning:** `pdfjs-dist` has a fallback `isEvalSupported` setting that defaults to true.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` as a defense-in-depth measure.
