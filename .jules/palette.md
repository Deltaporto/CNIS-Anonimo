## 2024-05-24 - Dynamic Status Updates Accessibility
**Learning:** Adding `role="status"` and `aria-live="polite"` to dynamically changing text elements (like file processing statuses) is crucial for screen reader users to be aware of asynchronous background progress without manual exploration.
**Action:** Always add `aria-live` regions for any dynamic text that updates asynchronously, such as loading states or processing results, to ensure complete screen reader coverage.
