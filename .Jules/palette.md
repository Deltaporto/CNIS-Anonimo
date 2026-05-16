## 2024-05-18 - Making Custom DIV Interactive Elements Accessible
**Learning:** When using generic elements like `div` for core interactions (e.g., drag-and-drop upload zones), adding a click listener is not enough for keyboard users. They need `role="button"`, `tabindex="0"`, a keyboard event listener for `Enter` and `Space`, and an explicit focus style (`:focus-visible`) to be fully accessible. Adding an explicit `aria-label` also significantly improves the screen reader experience.
**Action:** Always verify if a custom interactive element can be reached via the `Tab` key and triggered via the keyboard, and check if decorative SVGs within it are hidden from screen readers using `aria-hidden="true"`.
## 2024-05-18 - Managing Long-Running Client-Side Processes
**Learning:** When executing heavy synchronous or asynchronous tasks on the client side (like JSZip generation), the UI can appear frozen or permit duplicate clicks. Wrapping these operations in `try...finally` blocks with explicit UI loading states (disabling buttons, changing text) is critical for a smooth user experience.
**Action:** Apply visual disabled states and `try...finally` logic to any heavy processing functions that affect user interactable elements.

## 2024-05-18 - Dynamic Content Accessibility
**Learning:** For status texts generated dynamically in JavaScript (like file processing status changing from 'Aguardando' to 'Concluído'), screen readers will ignore these updates unless explicitly told to read them.
**Action:** Always add `role="status"` and `aria-live="polite"` to dynamic text elements so updates are smoothly announced to screen reader users without stealing focus.
## 2024-05-18 - Drag and Drop File Filtering UX
**Learning:** Silently failing when users drag and drop invalid files leads to confusion. While a native `alert()` is not the most delightful UX, providing immediate, explicit feedback about which files were rejected is far better than no feedback.
**Action:** Always provide explicit error feedback when filtering files during a drag-and-drop event, using a non-blocking toast notification if available, or a native alert as a fallback.
## 2024-05-18 - Drag and Drop Flickering CSS Fix
**Learning:** Applying `pointer-events: none` to all child elements of a dropzone to prevent hover/drag flickering is effective, but it can accidentally disable interactive text/links within the dropzone. It should be applied carefully only to non-interactive decorative elements like SVGs.
**Action:** When fixing drag-over flickering, target only decorative child elements (like `.zona-upload svg`) with `pointer-events: none` rather than all child elements, to preserve clickability of nested manual upload triggers.
## 2024-05-18 - Accessible Custom Progress Indicators
**Learning:** Custom progress indicators built with generic elements like `div` are not announced as progress bars by screen readers by default. They must explicitly include `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and dynamically update `aria-valuenow` via JavaScript to ensure screen readers announce their state and progress accurately.
**Action:** Always apply `role="progressbar"` and the `aria-value*` attributes to the container element of custom progress bars, and ensure `aria-valuenow` is updated whenever the visual width or percentage changes.
