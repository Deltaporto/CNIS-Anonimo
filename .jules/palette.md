## 2024-05-24 - Wrap heavy client-side operations and announce status
**Learning:** Wrap heavy client-side operations (like JSZip generation) in `try...finally` blocks with explicit loading and disabled UI states to prevent UI freezing and duplicate actions. Apply `role="status"` and `aria-live="polite"` to dynamic text elements so screen readers announce processing updates automatically.
**Action:** Use these patterns to improve accessibility and user experience during long-running tasks.
