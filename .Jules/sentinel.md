## 2024-05-14 - CVE-2024-4367 Mitigation in PDF.js
**Vulnerability:** Arbitrary JavaScript execution (XSS) via `eval()` in malicious PDFs processed by pdfjs-dist versions < 4.2.67.
**Learning:** The application uses pdfjs-dist version 3.11.174 to parse user-uploaded PDFs client-side. Without disabling `isEvalSupported`, malicious PDFs can execute arbitrary JavaScript within the application's context.
**Prevention:** Always initialize `pdfjsLib.getDocument()` with the `{ isEvalSupported: false }` configuration option when using vulnerable versions of pdfjs-dist for client-side processing.
