## 2024-10-24 - Mitigating DOM-based XSS by Replacing .innerHTML
**Vulnerability:** Potential DOM-based XSS vectors via `.innerHTML` assignments that constructed dynamic text elements or blindly restored previous DOM states without sanitization.
**Learning:** Using `.innerHTML` to insert dynamic text or caching it as state (`dataset.original`) allows rendering of arbitrary HTML. When inner structures like `<kbd>` need preservation, replacing `.innerHTML` with `.textContent` breaks functionality by rendering literal tags.
**Prevention:** Always use safe DOM methods: use `.textContent` for dynamic/untrusted strings, and `.insertAdjacentHTML()` or explicit DOM creation (like `document.createElement`) to construct or inject static trusted UI structures.
