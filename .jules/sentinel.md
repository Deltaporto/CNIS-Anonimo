## 2026-04-22 - Disable eval() in PDF.js for Defense-in-Depth
**Vulnerability:** The application parses user-provided PDFs via PDF.js. Without explicit configuration, PDF.js may evaluate embedded JavaScript (`eval()`), introducing a potential arbitrary execution vector or XSS if maliciously crafted PDFs are uploaded.
**Learning:** The default configuration of PDF.js might leave `isEvalSupported` enabled, posing a risk when handling untrusted documents strictly for data extraction purposes.
**Prevention:** Always initialize `pdfjsLib.getDocument` with `{ isEvalSupported: false }` when processing untrusted PDFs, especially since the core functionality (`extrairDadosSensiveis`) only requires parsing text content.
