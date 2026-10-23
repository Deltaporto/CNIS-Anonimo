## 2026-08-03 - Optimize _globalizar RegExp flags deduplication
**Learning:** In hot path functions like `_globalizar` that run inside nested loops for regex construction, using `[...new Set(string.split(''))].join('')` introduces critical memory allocation overhead due to continuous Array and Set creations.
**Action:** Always replace small string deduplications with string concatenation and `.includes()` checks when operating inside performance-sensitive processing loops to avoid excessive GC pressure and CPU churn.
## 2023-10-27 - PR Scope Creep
**Learning:** When attempting to run tests to verify a micro-optimization, I encountered failures due to outdated import paths in the test files. I bundled the test fixes into the optimization PR, which violated the single responsibility principle and caused the code review to be marked as partially correct.
**Action:** When a PR is focused on a specific feature or optimization, do not bundle unrelated structural or test fixes. If tests are broken prior to the change and the changes don't introduce new failures, it's safer to leave the unrelated fixes out or create a separate PR for them.
## 2026-08-03 - Replace linear search with binary search in protected range overlap checks
**Learning:** Checking overlap for numerous match identifiers against a list of protected ranges using O(N) linear search causes severe O(N*M) performance degradation. Since matchAll() ranges are inherently non-overlapping and sorted by index, binary search can safely be used.
**Action:** Always mathematically verify if a dataset is sorted by index and non-overlapping. If so, replace O(N) linear searches with O(log N) binary searches to optimize performance.
