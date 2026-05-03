## 2024-05-18 - Making Custom DIV Interactive Elements Accessible
**Learning:** When using generic elements like `div` for core interactions (e.g., drag-and-drop upload zones), adding a click listener is not enough for keyboard users. They need `role="button"`, `tabindex="0"`, a keyboard event listener for `Enter` and `Space`, and an explicit focus style (`:focus-visible`) to be fully accessible. Adding an explicit `aria-label` also significantly improves the screen reader experience.
**Action:** Always verify if a custom interactive element can be reached via the `Tab` key and triggered via the keyboard, and check if decorative SVGs within it are hidden from screen readers using `aria-hidden="true"`.
## 2024-05-18 - Managing Long-Running Client-Side Processes
**Learning:** When executing heavy synchronous or asynchronous tasks on the client side (like JSZip generation), the UI can appear frozen or permit duplicate clicks. Wrapping these operations in `try...finally` blocks with explicit UI loading states (disabling buttons, changing text) is critical for a smooth user experience.
**Action:** Apply visual disabled states and `try...finally` logic to any heavy processing functions that affect user interactable elements.

## 2024-05-18 - Dynamic Content Accessibility
**Learning:** For status texts generated dynamically in JavaScript (like file processing status changing from 'Aguardando' to 'Concluído'), screen readers will ignore these updates unless explicitly told to read them.
**Action:** Always add `role="status"` and `aria-live="polite"` to dynamic text elements so updates are smoothly announced to screen reader users without stealing focus.

## 2024-05-18 - Custom Progress Bar Accessibility
**Learning:** For custom-built progress indicators using generic HTML tags (e.g., div) in this app, explicitly setting `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, and dynamically updating `aria-valuenow` via JavaScript ensures accurate screen reader announcements of the processing status.
**Action:** Always add ARIA progressbar roles and dynamically update `aria-valuenow` to custom progress bars, especially for dynamic file processing loops.
