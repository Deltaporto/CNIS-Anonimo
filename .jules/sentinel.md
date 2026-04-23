## 2024-05-15 - PDF.js eval() vulnerability defense
**Vulnerability:** Arbitrary JavaScript execution via `eval()` embedded in malicious user-uploaded PDFs processed client-side.
**Learning:** `pdfjs-dist` relies on `eval()` by default for some internal optimizations, which could be exploited if an attacker crafts a malicious PDF containing executable JS payloads, especially in a 100% client-side application where uploaded PDFs are not sanitized server-side.
**Prevention:** Initialize `pdfjsLib.getDocument` with `isEvalSupported: false` as a defense-in-depth measure to completely disable the use of `eval()` during PDF processing.
