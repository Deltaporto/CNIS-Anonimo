## 2024-05-18 - Handling Heavy Client-Side Operations

**Learning:** When executing heavy, blocking client-side operations (like JSZip generation) that freeze the main thread, simply updating the DOM right before the operation is not enough because the browser won't have time to paint the changes. Also, dynamic updates need explicit ARIA attributes to be announced.

**Action:** Always wrap heavy operations in `try...finally` blocks, update the UI (disable buttons, show loading text), add a small `await new Promise(r => setTimeout(r, 10))` yield to allow the browser to paint, and use `aria-live="polite"` and `role="status"` on the updated elements so screen readers announce the state change.
