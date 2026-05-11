## 2025-05-15 - [Mitigate CVE-2024-4367 in pdfjs-dist]
**Vulnerability:** The application uses `pdfjs-dist@3.11.174` and calls `getDocument` without disabling `eval` support, leaving it vulnerable to arbitrary JavaScript execution via malicious PDFs (CVE-2024-4367).
**Learning:** In older versions of `pdfjs-dist` (< 4.2.67), `isEvalSupported` defaults to true. This allows attackers to embed malicious JavaScript within PDF annotations or fonts, which is executed when the PDF is processed on the client side.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when using vulnerable versions of `pdfjs-dist` to disable the use of `eval()`.
