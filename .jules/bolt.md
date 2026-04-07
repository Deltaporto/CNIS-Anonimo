## 2024-05-24 - Chunked Latin1 Decoder
**Learning:** `Array.from(bytes).map(b => String.fromCharCode(b)).join('')` is O(n) and creates massive intermediate arrays, crashing or slowing down heavily on large payloads (like PDF streams). `TextDecoder('latin1')` uses Windows-1252 instead of pure ISO-8859-1 (latin1), mutating byte values 128-159 (e.g. 0x80 becomes 0x20ac), which corrupts binary PDF streams.
**Action:** Use a chunked `String.fromCharCode.apply(null, chunk)` pattern. It avoids max call stack size errors, is memory-efficient, and correctly preserves raw byte values for 128-159.
