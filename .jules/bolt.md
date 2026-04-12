## 2024-05-18 - Optimized String Conversion
**Learning:** For large typed arrays, using Array.from with functional maps (e.g. Array.from(bytes, byte => String.fromCharCode(byte)).join('')) is extremely slow.
**Action:** Use chunked String.fromCharCode.apply with a maximum chunk size of 32768 to significantly improve performance while avoiding call stack limits.
