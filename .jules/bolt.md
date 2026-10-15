## 2026-08-03 - Optimize _globalizar RegExp flags deduplication
**Learning:** In hot path functions like `_globalizar` that run inside nested loops for regex construction, using `[...new Set(string.split(''))].join('')` introduces critical memory allocation overhead due to continuous Array and Set creations.
**Action:** Always replace small string deduplications with string concatenation and `.includes()` checks when operating inside performance-sensitive processing loops to avoid excessive GC pressure and CPU churn.
## 2023-10-27 - PR Scope Creep
**Learning:** When attempting to run tests to verify a micro-optimization, I encountered failures due to outdated import paths in the test files. I bundled the test fixes into the optimization PR, which violated the single responsibility principle and caused the code review to be marked as partially correct.
**Action:** When a PR is focused on a specific feature or optimization, do not bundle unrelated structural or test fixes. If tests are broken prior to the change and the changes don't introduce new failures, it's safer to leave the unrelated fixes out or create a separate PR for them.
## 2024-10-15 - Incomplete Scope Optimization
**Learning:** When hoisting static variables (like Sets) to the module scope to improve performance in hot paths, it is easy to miss local instantiations if relying on manual copy-pasting or incomplete regex replacements, leading to unused variables and missed optimizations.
**Action:** Always verify that the newly hoisted module-scoped variables are actually used to replace ALL targeted local instantiations across the file by using comprehensive search tools (e.g., `grep` or temporary scripts) before committing.
