
## 2024-04-10 - Disable eval in pdf.js
**Vulnerability:** pdfjs-dist getDocument can be vulnerable to arbitrary JavaScript execution via `eval()` if processing malicious PDFs.
**Learning:** By default, pdf.js may use `eval()` to execute PDF scripts/functions, which can be an attack vector in client-side processing applications.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` as a defense-in-depth measure.
