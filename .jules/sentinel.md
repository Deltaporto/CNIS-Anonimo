## 2024-10-27 - [Prevent Arbitrary Code Execution via PDF JS]
**Vulnerability:** The pdfjs-dist library was configured to extract text from untrusted PDFs without disabling JS evaluation (`isEvalSupported: false`), leaving the app potentially exposed to evaluating malicious scripts embedded in the PDFs.
**Learning:** Even when using a mature library for simple tasks like text extraction, its default configuration may allow unnecessary features like dynamic code execution for complex PDF features, which violates the principle of least privilege.
**Prevention:** Always initialize `pdfjsLib.getDocument` with `isEvalSupported: false` when parsing untrusted user-supplied documents for data extraction.
