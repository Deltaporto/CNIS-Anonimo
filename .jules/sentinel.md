## 2025-05-15 - [PDF.js Hardening]
**Vulnerability:** PDF.js default configuration allows `eval()` for font parsing/rendering optimizations.
**Learning:** Maliciously crafted PDFs could exploit this to execute arbitrary JavaScript. For a tool like this that processes sensitive, user-provided PII PDFs entirely client-side, the defense-in-depth provided by disabling `eval` is critical to prevent code execution via untrusted documents.
**Prevention:** Always initialize PDF.js `getDocument` with `isEvalSupported: false` in security-sensitive contexts, and pair it with a strict CSP (`object-src 'none'`, `script-src 'self'`).
