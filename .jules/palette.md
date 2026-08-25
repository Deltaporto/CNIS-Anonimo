## 2025-02-25 - Avoid Direct aria-live on Interactive Controls
**Learning:** Adding `aria-live` directly to interactive controls like `<button>` elements (e.g., changing from 'Clear' to 'Are you sure?') causes double-announcing and confusion in screen readers.
**Action:** Use a dedicated, visually hidden live region (like `role="status"`) separated from the interactive element to safely provide conversational feedback when the UI requires state change announcements.
