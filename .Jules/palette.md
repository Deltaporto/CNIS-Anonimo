## 2024-05-18 - Replace blocking alert with toast for file rejection
**Learning:** Using a native browser `alert()` for validation feedback (like rejecting non-PDF files) creates a blocking, jarring user experience that interrupts workflow.
**Action:** Replace native `alert()` dialogs with custom, non-blocking toast notifications (`mostrarToast`) that disappear automatically, providing feedback without halting the user's interaction flow.

## 2024-05-18 - Prevent redundant screen reader announcements on decorative elements
**Learning:** Decorative icons (like emojis used for file types or arrows pointing to new values) are often announced by screen readers, creating verbosity and noise that confuses users relying on assistive technology.
**Action:** Apply `aria-hidden="true"` to purely decorative visual elements (like `📄` and `→`) inside dynamic UI updates to ensure screen readers skip them and focus only on the meaningful text.

## 2024-05-18 - Implement roving tabindex for ARIA tablists
**Learning:** Elements using `role="tablist"` require manual implementation of keyboard navigation (like arrow keys) and roving `tabindex` (`0` for active, `-1` for inactive) to meet WCAG standards. Screen readers expect this specific interaction pattern.
**Action:** Whenever using `role="tablist"`, always add a `keydown` listener to handle `ArrowRight`/`ArrowLeft` and dynamically update `tabindex` attributes to ensure keyboard users can navigate tabs without having to Tab through every single option.

## 2024-05-19 - Prevent keyboard focus drop when hiding active elements
**Learning:** When a user interacts with a button (like "Clear state") that conditionally hides itself or its parent container, keyboard focus is abruptly lost and dropped back to the `<body>` element. This creates a disorienting experience for screen reader and keyboard-only users, forcing them to navigate back from the top of the page.
**Action:** When hiding an interactive element that currently has focus, programmatically shift focus to the next logical step in the user's workflow (e.g., the primary upload zone) to maintain continuous keyboard accessibility.
