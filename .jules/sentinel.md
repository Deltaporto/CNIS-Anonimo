## 2025-01-28 - [PDF Parsing Security]
**Vulnerability:** Arbitrary JavaScript execution via `eval()` when parsing malicious PDFs using `pdfjs-dist`.
**Learning:** `pdfjs-dist` may execute code within the PDF context using `eval()` under certain conditions. This poses a severe threat if the application runs inside the browser and processes untrusted PDFs.
**Prevention:** Always initialize `pdfjsLib.getDocument` with `isEvalSupported: false` as a defense-in-depth measure to prevent execution of embedded scripts.