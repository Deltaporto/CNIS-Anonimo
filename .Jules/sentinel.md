## 2024-05-09 - Mitigate CVE-2024-4367 in pdf.js
**Vulnerability:** Arbitrary JavaScript execution (XSS) via eval() when parsing malicious PDF files using older versions of pdfjs-dist (< 4.2.67).
**Learning:** By default, pdfjs-dist enables `isEvalSupported`, allowing it to use `eval()` for certain PDF operations. This can be exploited by crafted PDFs to run arbitrary code in the user's browser, which is critical since the app allows users to upload any PDF.
**Prevention:** Always initialize `pdfjsLib.getDocument()` with `{ isEvalSupported: false }` to disable this dangerous behavior.
