## 2026-04-17 - Parallel PDF Processing Bottleneck
**Learning:** Sequential `await` processing of large PDFs in client-side loops creates a bottleneck, while unbounded `Promise.all` can cause memory exhaustion. Refactoring worker functions to return individual results and assigning them to the destination array by their original index guarantees deterministic output ordering.
**Action:** Implemented a worker-pool pattern with a concurrency limit of 3 in the loop to maximize throughput and ensured ordered results using index-based assignment.
