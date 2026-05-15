## 2024-05-24 - [Mitigate CVE-2024-4367 in pdf.js]
**Vulnerability:** Arbitrary JavaScript execution via eval() in malicious PDFs when using pdfjs-dist versions < 4.2.67.
**Learning:** The client-side application passes user-uploaded PDFs to `pdfjsLib.getDocument`, which by default supports evaluation of embedded JS, posing a severe XSS risk.
**Prevention:** Always initialize `getDocument` with `isEvalSupported: false` when processing untrusted PDFs in older pdf.js versions.