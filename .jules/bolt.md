## 2024-04-13 - Fast Typed Array to String conversions
**Learning:** `Array.from(bytes, byte => String.fromCharCode(byte)).join('')` is almost 10x slower than chunked `String.fromCharCode.apply(null, chunk)` for large arrays. Conversely, `Uint8Array.from(str.split('').map(char => char.charCodeAt(0)))` is significantly slower than a direct loop like `encodeLatin1`.
**Action:** Use chunked application of `String.fromCharCode` when converting typed arrays to strings, and use `encodeLatin1`-style direct loops for strings to typed arrays to avoid massive intermediate array allocations.
