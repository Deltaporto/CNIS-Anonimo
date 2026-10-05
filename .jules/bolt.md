## 2026-08-03 - Optimize _globalizar RegExp flags deduplication
**Learning:** In hot path functions like `_globalizar` that run inside nested loops for regex construction, using `[...new Set(string.split(''))].join('')` introduces critical memory allocation overhead due to continuous Array and Set creations.
**Action:** Always replace small string deduplications with string concatenation and `.includes()` checks when operating inside performance-sensitive processing loops to avoid excessive GC pressure and CPU churn.
## 2023-10-27 - PR Scope Creep
**Learning:** When attempting to run tests to verify a micro-optimization, I encountered failures due to outdated import paths in the test files. I bundled the test fixes into the optimization PR, which violated the single responsibility principle and caused the code review to be marked as partially correct.
**Action:** When a PR is focused on a specific feature or optimization, do not bundle unrelated structural or test fixes. If tests are broken prior to the change and the changes don't introduce new failures, it's safer to leave the unrelated fixes out or create a separate PR for them.
## 2026-10-05 - Optimize _chaveToken string normalization with memoization
**Learning:** In hot paths processing many individual words or tokens (like `detectarNomesPorRotuloProcessual`), repeatedly executing `.normalize()`, `.replace()`, and `.toUpperCase()` on exactly the same short strings (like "de", "da", "do") introduces massive CPU overhead.
**Action:** When performing complex or multi-step string normalization on repeated vocabulary in a hot path, use a `Map`-based memoization cache (with a size limit to prevent memory leaks) to reduce CPU churn.
