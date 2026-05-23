## 2024-05-24 - Hex string parsing performance
**Learning:** In tight loops processing PDFs (like `decodeUtf16BeHex` and `encodedHexToLatin1`), using `parseInt(hex.slice(i, i + 2), 16)` causes significant performance degradation due to intermediate string allocation (`slice`) and the overhead of `parseInt`.
**Action:** Replace `parseInt` and `slice` with a pre-computed lookup table mapping character codes to their integer values, and use bitwise shifting. This avoids memory allocation and improves execution speed by ~2-3x for hex parsing in JS.
