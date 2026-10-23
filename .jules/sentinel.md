## 2024-05-24 - [PDF.js eval() Vulnerability (CVE-2024-4367)]
**Vulnerability:** Arbitrary JavaScript execution via malicious PDFs because pdfjs-dist (< 4.2.67) has `isEvalSupported` true by default.
**Learning:** External libraries processing user-uploaded files must be configured defensively. PDF.js uses `eval()` internally for certain font/stream operations which can be exploited.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when using older versions of pdfjs-dist. Update to patched versions when possible.
