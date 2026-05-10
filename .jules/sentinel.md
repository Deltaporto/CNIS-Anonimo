## 2024-05-24 - Fix Arbitrary JS Execution in pdfjs-dist
**Vulnerability:** Arbitrary JavaScript execution (CVE-2024-4367) via eval() in malicious PDFs due to using an older version of pdfjs-dist (3.11.174).
**Learning:** Client-side PDF processing libraries that parse complex formats can use `eval()` internally. When using vulnerable versions, this can lead to XSS.
**Prevention:** Initialize `getDocument` with `isEvalSupported: false` to disable evaluation and mitigate the vulnerability.
