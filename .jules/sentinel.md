## 2025-04-25 - Prevent Arbitrary JavaScript Execution in PDF Parsing
**Vulnerability:** The client-side PDF processing library (`pdfjs-dist`) defaults to supporting `eval()`, which can be exploited by embedding malicious JavaScript in PDFs. This poses a risk as the application processes untrusted, user-supplied PDFs entirely in the browser.
**Learning:** The architecture of processing untrusted documents entirely client-side means that any vulnerability in the parsing library directly exposes the user's browser environment. The default configuration of `pdfjs-dist` favors feature completeness over strict security.
**Prevention:** Always initialize `pdfjsLib.getDocument` with `isEvalSupported: false` as a defense-in-depth measure to neutralize any embedded `eval()` payload attempts.
