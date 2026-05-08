## 2024-05-08 - [CVE-2024-4367] Arbitrary JS Execution in pdfjs-dist
**Vulnerability:** The client-side PDF parser (`pdfjs-dist` version 3.11.174) was initialized without disabling `eval()` support, leaving the application vulnerable to CVE-2024-4367 where a maliciously crafted PDF could execute arbitrary JavaScript in the user's browser context.
**Learning:** Even well-known libraries can have hidden capabilities (like evaluating PDF embedded JS) that introduce severe XSS risks. Default configurations are not always secure by default, especially in older versions of libraries.
**Prevention:** Always explicitly pass `isEvalSupported: false` when calling `pdfjsLib.getDocument()` for text extraction, and regularly monitor dependencies for CVEs to update versions when patches are released.
