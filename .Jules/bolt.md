## 2024-04-25 - Parallelizing loop execution securely
**Learning:** Replaced a sequential `await` loop processing files directly with a concurrency pool. Found that returning the processing results rather than modifying a global array avoids race conditions. Using a preallocated array and assigning values directly by task index ensures deterministic order without blocking the main loop execution.
**Action:** When implementing worker pools, ensure tasks return deterministic values and assign them by task index to array elements to guarantee correct order on task resolution.
