## 2024-11-20 - Parallelize Asynchronous File Processing
**Learning:** In the `js/app.js` file, file processing in `iniciarLote` was done sequentially in a `for` loop, waiting for each file to finish before moving to the next.
**Action:** By refactoring this to use a worker pool pattern with a concurrency limit (e.g., 3), the app can process multiple PDFs in parallel. The worker functions must return their results rather than pushing directly to global arrays to maintain deterministic output order and safety.
