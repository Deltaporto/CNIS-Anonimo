## 2026-04-29 - [Mitigated CVE-2024-4367 in pdfjs-dist]
**Vulnerability:** Arbitrary JavaScript execution via `eval()` when parsing malicious PDF files using older versions of pdfjs-dist (like 3.11.174 used here).
**Learning:** The `getDocument` function in pdfjs-dist defaults to supporting `eval` for rendering certain PDF features, but this is a critical vector for XSS/RCE if the PDF content is untrusted.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when parsing user-uploaded PDFs, especially in data-extraction tools that do not require evaluating embedded JavaScript.
