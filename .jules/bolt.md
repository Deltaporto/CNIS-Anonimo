## 2026-08-03 - Optimize _globalizar RegExp flags deduplication
**Learning:** In hot path functions like `_globalizar` that run inside nested loops for regex construction, using `[...new Set(string.split(''))].join('')` introduces critical memory allocation overhead due to continuous Array and Set creations.
**Action:** Always replace small string deduplications with string concatenation and `.includes()` checks when operating inside performance-sensitive processing loops to avoid excessive GC pressure and CPU churn.
## 2023-10-27 - PR Scope Creep
**Learning:** When attempting to run tests to verify a micro-optimization, I encountered failures due to outdated import paths in the test files. I bundled the test fixes into the optimization PR, which violated the single responsibility principle and caused the code review to be marked as partially correct.
**Action:** When a PR is focused on a specific feature or optimization, do not bundle unrelated structural or test fixes. If tests are broken prior to the change and the changes don't introduce new failures, it's safer to leave the unrelated fixes out or create a separate PR for them.
## 2024-10-20 - Binary Search for Non-Overlapping Ranges
**Learning:** Range lists generated via `String.prototype.matchAll()` are intrinsically sorted by the `index` property. If the regex inherently ensures non-overlapping segments (like process numbers), they can be safely searched using a binary search.
**Action:** Whenever verifying bounds against a sequential array of regex matches in a hot path, replace linear iterations (O(N)) with a binary search (O(log N)) to achieve substantial micro-optimizations on large documents.
