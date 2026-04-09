## 2024-05-18 - Making Custom DIV Interactive Elements Accessible
**Learning:** When using generic elements like `div` for core interactions (e.g., drag-and-drop upload zones), adding a click listener is not enough for keyboard users. They need `role="button"`, `tabindex="0"`, a keyboard event listener for `Enter` and `Space`, and an explicit focus style (`:focus-visible`) to be fully accessible. Adding an explicit `aria-label` also significantly improves the screen reader experience.
**Action:** Always verify if a custom interactive element can be reached via the `Tab` key and triggered via the keyboard, and check if decorative SVGs within it are hidden from screen readers using `aria-hidden="true"`.

## 2024-05-19 - Wrapping Heavy Client-Side Operations & Dynamic Text Accessibility
**Learning:** Heavy client-side operations (like JSZip generation) can cause UI freezing and duplicate actions if the UI state isn't managed properly. Furthermore, dynamic text elements (like processing status) are not automatically announced by screen readers.
**Action:** Wrap heavy client-side operations in `try...finally` blocks with explicit loading and disabled UI states. Apply `role="status"` and `aria-live="polite"` to dynamic text elements so screen readers announce processing updates automatically.
