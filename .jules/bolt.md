
## 2024-05-18 - Avoid Functional Iteration for Huge Typed Arrays
**Learning:** Using `Array.from` with a mapping function (e.g., `Array.from(bytes, byte => String.fromCharCode(byte))`) or chaining `.split('').map()` is disastrously slow and memory-intensive for large files like PDF binary streams.
**Action:** Always prefer chunked `String.fromCharCode.apply` with a safe max chunk size (e.g., 32768 to avoid call stack limits) to convert large `Uint8Array` to strings. Use bounded loops directly over TypedArrays (like the `encodeLatin1` helper) to encode strings to `Uint8Array` instead of splitting strings into arrays of characters first.
