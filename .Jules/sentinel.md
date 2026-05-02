
## 2024-05-02 - Arbitrary JavaScript Execution via eval() in pdfjs-dist
**Vulnerability:** pdfjs-dist versions < 4.2.67 are vulnerable to CVE-2024-4367, where malicious PDFs can execute arbitrary JavaScript via `eval()` during font rendering.
**Learning:** Client-side PDF processing tools can introduce XSS or arbitrary code execution vectors if they rely on `eval()` or `Function()` for rendering logic, bypassing standard CSP and input validation.
**Prevention:** Initialize pdfjs-dist with `isEvalSupported: false` when parsing untrusted user PDFs.
