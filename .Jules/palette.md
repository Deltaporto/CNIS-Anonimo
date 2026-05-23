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

## 2024-05-24 - Semantic Headings and Text Truncation Tooltips
**Learning:** The application lacked semantic headings (`<h1>`, `<h2>`), which severely impacts screen reader navigation. Furthermore, dynamically generated values in grid columns use CSS text truncation (`text-overflow: ellipsis`), which hides full data from all users.
**Action:** Always map structural elements that act as visual headings to native heading tags (`<h1>`-`<h6>`) to establish a proper document outline. When using `text-overflow: ellipsis` on dynamic data, always bind the element's `title` attribute to the full text to ensure accessibility via hover tooltips.
## 2024-05-24 - Restore native list accessibility to generic generic DOM containers
**Learning:** When using generic `<div>` tags to render dynamic lists, the screen reader loses all context about the list structure and the total number of items, causing a degraded experience.
**Action:** Always add `role="list"` to the parent container element and `role="listitem"` to every generated child element. This simple semantic addition restores the expected behavior for assistive technologies without requiring structural HTML changes.

## 2024-05-24 - Incorrect ARIA attributes on tab buttons
**Learning:** Elements using `role="tab"` should use the `aria-selected` attribute to indicate their active state, not `aria-pressed` (which is reserved for toggle buttons).
**Action:** Remove `aria-pressed` from `role="tab"` elements and strictly use `aria-selected` for tab components to prevent incorrect semantics being announced by screen readers.
