## 2024-05-18 - Making Custom DIV Interactive Elements Accessible
**Learning:** When using generic elements like `div` for core interactions (e.g., drag-and-drop upload zones), adding a click listener is not enough for keyboard users. They need `role="button"`, `tabindex="0"`, a keyboard event listener for `Enter` and `Space`, and an explicit focus style (`:focus-visible`) to be fully accessible. Adding an explicit `aria-label` also significantly improves the screen reader experience.
**Action:** Always verify if a custom interactive element can be reached via the `Tab` key and triggered via the keyboard, and check if decorative SVGs within it are hidden from screen readers using `aria-hidden="true"`.

## 2024-05-19 - Accessible Loading States for Heavy Client-Side Ops
**Learning:** Wrapping heavy client-side operations (like JSZip generation) in `try...finally` blocks prevents UI freezing and ensures disabled states revert properly even if errors occur. Combining this with `aria-live="polite"` and explicitly disabling interactive buttons ensures screen readers immediately announce processing updates and prevents duplicate user interactions.
**Action:** Always wrap heavy synchronous or automated multi-step operations in `try...finally` blocks, and apply temporary textual and disabled state changes paired with `aria-live="polite"` to alert users without breaking their flow.
