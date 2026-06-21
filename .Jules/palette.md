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

## 2024-05-24 - Dynamic Action Labels for Batch Operations
**Learning:** Using static batch action labels (e.g., "Download all (ZIP)") when only a single item is processed creates cognitive friction. Users expect the UI to reflect the actual outcome (a single file).
**Action:** Dynamically update batch action buttons to reflect singular outcomes when the result set contains only one item.

## 2025-02-14 - Improve contrast ratio for Aguardando status pill
**Learning:** Light gray text (`#64748b`) on light gray backgrounds (`#f1f5f9`) frequently fails WCAG AA contrast guidelines for small text.
**Action:** Use darker grays (e.g., `#475569`) to ensure accessible contrast ratios (> 4.5:1) for status indicators and badges.

## 2024-05-18 - Global Drag and Drop Overlay
**Learning:** Attaching drag-and-drop events to a specific container (like an upload zone) can lead to accidental browser navigation and data loss if the user drops the file slightly outside the bounding box.
**Action:** Attach `dragover`, `dragleave`, and `drop` event listeners directly to the `window` object to create a forgiving, page-wide drop zone, using `event.relatedTarget === null` to correctly manage the hover state when the cursor leaves the viewport entirely.

## 2025-02-14 - Improve accessibility of tabular data rendered with generic elements
**Learning:** The application renders dynamic grid-based tables (for summarizing redactions) using generic `<div>` and `<span>` elements. Screen readers treat these as flat text, making it extremely difficult to associate "Campo" with its corresponding "Original" and "Substituído" values.
**Action:** Add explicit ARIA table roles (`role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`) to generic elements that visually function as data grids, restoring proper tabular navigation for assistive technologies.

## 2026-05-31 - Avoid aria-live on interactive controls
**Learning:** Applying `aria-live` directly to interactive controls like a `<button>` is an accessibility anti-pattern that can cause confusing or double-announcing behavior in screen readers, and actively harms accessibility.
**Action:** Do not use `aria-live` on interactive controls. It should be used on live regions (like status message containers) to announce dynamic content changes.

## 2026-05-31 - Disabled button UX improvement
**Learning:** A disabled action button without context can leave users confused about why they cannot proceed.
**Action:** Add a helpful `title` tooltip to disabled buttons explaining the blocking condition, and use `cursor: not-allowed` in CSS to provide immediate visual feedback that the element is unclickable.

## 2026-06-01 - Accessible Keyboard Shortcuts
**Learning:** Visual keyboard shortcuts (like `<kbd>Esc</kbd>`) appended to button text are read aloud by screen readers (e.g., 'Limpar e recomeçar Esc'), which creates a confusing auditory experience.
**Action:** When adding visual keyboard shortcuts, always apply `aria-hidden="true"` to the `<kbd>` element to hide the text from screen readers, and add the standard `aria-keyshortcuts` attribute to the parent interactive element to correctly and natively expose the binding to assistive technologies.

## 2026-06-04 - Elevate focus rings for custom inputs
**Learning:** When native radio buttons or checkboxes are hidden or visually integrated into a larger custom label/card container, the native focus ring is either lost or misaligned. Keyboard users lose visual tracking of where their focus is.
**Action:** Use the CSS `:has(:focus-visible)` pseudo-class on the parent container (e.g., `.custom-card:has(input:focus-visible)`) to elevate the focus ring to the entire custom component, providing a large, clear focus indicator that matches existing patterns.
## 2025-02-14 - Improve accessibility of tabular data rendered with generic elements
**Learning:** When dynamically generating a list using generic elements (e.g., `<div>`), apply `role="list"` to a dedicated parent container and `role="listitem"` to each child. The `role="list"` container must *only* contain `listitem` children; never apply it to wrappers containing mixed content like paragraphs.
**Action:** Always wrap `.evento-card` items in a dedicated `<div>` with `role="list"`, rather than applying the role to the mixed-content parent container.

## 2025-02-14 - Accessible Truncation Tooltips
**Learning:** Applying CSS text truncation (`text-overflow: ellipsis`) to dynamic text hides full data. While adding a `title` attribute for a hover tooltip solves this for mouse users, applying it to a concatenated string (label + value) causes screen readers to redundantly announce the entire string twice.
**Action:** Structurally separate the label from the value into distinct spans. Apply the `title` attribute *only* to the truncated value element to provide the tooltip without creating a redundant screen reader announcement anti-pattern.
## 2025-02-14 - Fix ARIA semantics for Fieldsets and Tabs
**Learning:** Adding `aria-label` to a `<fieldset>` that already contains a `<legend>` results in redundant screen reader announcements. Additionally, using `aria-controls` on a tab (`role="tab"`) that points to a non-tabpanel element (like a file upload dropzone) breaks expected tab navigation patterns. Also, grouping standalone radio inputs requires explicitly setting `role="radiogroup"`.
**Action:** Always rely on native semantic HTML `<legend>` for fieldsets, avoid using `aria-controls` if the target is not structurally a `tabpanel`, and remember to add `role="radiogroup"` on div wrappers enclosing radio buttons.
## 2026-06-21 - Visual Styling for Keyboard Shortcuts
**Learning:** Unstyled `<kbd>` tags inside buttons blend in with normal text, making keyboard shortcut hints visually ambiguous and difficult to parse quickly.
**Action:** Establish a visual design system pattern for `<kbd>` tags by applying explicit styling (e.g., borders, bottom-heavy weight, monospace fonts) to simulate a keycap, and apply `inline-flex` and `gap` to parent buttons for proper alignment and spacing.
