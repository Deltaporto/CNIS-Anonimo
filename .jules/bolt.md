## 2024-05-14 - Extremely inefficient buffer to string operations
**Learning:** `Array.from(bytes, byte => String.fromCharCode(byte)).join('')` is a massive performance bottleneck when handling large arrays like `Uint8Array` of PDF bytes. It was taking ~3 seconds for a 5MB array. Similarly, `match[1].split('').map(...)` for parsing byte arrays was also extremely slow.
**Action:** Always use chunked `String.fromCharCode.apply` for binary-to-string (takes ~140ms for 5MB) and bounded `for`-loops for string-to-binary (takes ~10ms for 1MB).
