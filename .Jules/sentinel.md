## 2024-05-03 - CVE-2024-4367 Arbitrary JavaScript Execution in pdfjs-dist
**Vulnerability:** Client-side PDF processing with `pdfjs-dist` (< 4.2.67) allows arbitrary JavaScript execution via `eval()` in malicious PDFs if `isEvalSupported` is not explicitly disabled.
**Learning:** The default behavior of older `pdfjs-dist` versions processes untrusted PDF embedded scripts, posing an XSS/RCE risk in client applications.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when using `pdfjs-dist` versions vulnerable to CVE-2024-4367 to explicitly disable `eval()`.
