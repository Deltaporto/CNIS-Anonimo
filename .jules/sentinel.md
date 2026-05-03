## 2026-04-21 - PDF.js eval() Vulnerability
**Vulnerability:** PDF.js was configured to allow arbitrary JavaScript execution via eval() when processing untrusted PDFs, opening up the codebase to potential code execution attacks.
**Learning:** This risk exists because we did not explicitly set `isEvalSupported: false` during PDF parsing using `pdfjsLib.getDocument()`.
**Prevention:** Always explicitly set `isEvalSupported: false` when processing PDFs on the client-side to defend against execution of malicious code.