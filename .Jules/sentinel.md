## 2024-04-27 - [pdfjs-dist eval() execution vulnerability (CVE-2024-4367)]
**Vulnerability:** Arbitrary JavaScript execution possible via `eval()` during font processing in older versions of `pdfjs-dist` (like `< 4.2.67`).
**Learning:** By default `pdfjsLib.getDocument()` processes fonts with `eval()` if `isEvalSupported` is not explicitly disabled. Given the legacy version required by the application (3.11.174), it remained vulnerable unless safely configured.
**Prevention:** When initializing `pdfjsLib.getDocument()` in legacy versions, always explicitly provide `{ isEvalSupported: false }` to mitigate the remote code execution vector from potentially malicious uploaded PDF files.
