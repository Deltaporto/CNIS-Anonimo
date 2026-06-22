## 2024-05-24 - Prevent Arbitrary JS Execution in pdf.js
**Vulnerability:** Arbitrary JavaScript execution via embedded eval() in malicious PDFs during client-side PDF processing.
**Learning:** `pdfjsLib.getDocument()` processes PDF structures which might be crafted maliciously to trigger internal eval statements during rendering/parsing in some environments, potentially leading to XSS or arbitrary code execution in the browser context.
**Prevention:** Always initialize `getDocument` with the option `isEvalSupported: false` as a defense-in-depth measure to completely disable the use of `eval()` during PDF parsing and rendering.
