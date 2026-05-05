## 2024-05-05 - Use encodeLatin1 over split map for Uint8Array
**Learning:** Using `Uint8Array.from(str.split('').map(char => char.charCodeAt(0)))` creates multiple intermediate arrays, causing excessive memory allocations and slow execution in V8 for large strings (like PDF streams). A simple bounded loop (`encodeLatin1`) is ~8-10x faster.
**Action:** Always use the existing `encodeLatin1` helper when converting binary strings to `Uint8Array`s in PDF processing loops.
