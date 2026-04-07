## 2024-05-24 - PDF.js arbitrary JS execution prevention
**Vulnerability:** Potential arbitrary JavaScript execution via embedded malicious functions in PDFs processed client-side.
**Learning:** `pdfjsLib.getDocument()` uses `eval()` by default to compile PDF functions. This is risky for client-side processing of untrusted user uploads.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` to disable `eval()` and secure the parsing pipeline.
