## 2024-10-24 - CVE-2024-4367 Arbitrary Code Execution via pdfjs-dist
**Vulnerability:** Arbitrary JavaScript execution via eval() in malicious PDFs when using pdfjs-dist versions < 4.2.67.
**Learning:** The default behavior of pdfjs-dist getDocument supports eval, which can be exploited if malicious PDFs are uploaded and parsed client-side.
**Prevention:** Always initialize getDocument with isEvalSupported: false for client-side PDF processing with older pdfjs-dist versions.
