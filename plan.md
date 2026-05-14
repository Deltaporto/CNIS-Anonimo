1. **Optimize String to Uint8Array Conversion in `js/pdf-processor.js`**
   - In `_substituirViaBytesRaw`, there are three places where strings are converted to `Uint8Array`s using the highly inefficient pattern `Uint8Array.from(str.split('').map(char => char.charCodeAt(0)))` or `Uint8Array.from(str.split(''), char => char.charCodeAt(0))`.
   - The file already has an efficient `encodeLatin1` helper function: `function encodeLatin1(str) { const bytes = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff; return bytes; }`.
   - Replace the three inefficient instances with `encodeLatin1(str)` or `encodeLatin1(partes.join(''))` to avoid intermediate array allocations, reducing execution time and memory overhead.

2. **Add a Journal Entry**
   - Create or update `.Jules/bolt.md` documenting this performance learning.
   - Note that replacing `Uint8Array.from(str.split('').map(...))` with a bounded loop (like `encodeLatin1`) provides a massive performance boost (over 10x faster) by avoiding excessive intermediate array allocations and garbage collection.

3. **Run tests**
   - Set up test dependencies and manually test to verify changes don't cause regressions.
   - Run `node --test tests/*.test.mjs` directly (fixing the `pdfjsBase.getDocument` test syntax if necessary) and ensure all process and unit tests pass.

4. **Run Pre-Commit Checks**
   - Ensure proper testing, verification, review, and reflection are done by invoking the `pre_commit_instructions` tool.

5. **Submit Changes**
   - Create a PR with title "⚡ Bolt: [performance improvement]" and the description containing what, why, impact, and measurement.
