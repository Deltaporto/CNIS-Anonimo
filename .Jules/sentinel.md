## 2024-05-06 - Prevent Arbitrary JS Execution in PDF.js (CVE-2024-4367)
**Vulnerability:** The application uses pdfjs-dist@3.11.174, which is vulnerable to CVE-2024-4367 allowing arbitrary JS execution via malicious PDFs using the eval() function inside the viewer component's font loading logic.
**Learning:** Even well-known libraries like PDF.js have critical CVEs. It is important to know about configuration options that reduce the library's attack surface, especially when handling untrusted documents uploaded by users.
**Prevention:** Initialize pdf.js getDocument with the `isEvalSupported: false` option to completely disable eval() calls, protecting against this specific attack vector on older vulnerable versions.
