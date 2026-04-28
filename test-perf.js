const CHUNK_SIZE = 32768;
function bytesToBinaryString(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  return str;
}

const size = 10 * 1024 * 1024; // 10 MB
const bytes = new Uint8Array(size);
for (let i = 0; i < size; i++) bytes[i] = i % 256;

console.time('old');
Array.from(bytes, byte => String.fromCharCode(byte)).join('');
console.timeEnd('old');

console.time('new');
bytesToBinaryString(bytes);
console.timeEnd('new');

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

const str = bytesToBinaryString(bytes);
console.time('old_encode');
Uint8Array.from(str.split('').map(char => char.charCodeAt(0)));
console.timeEnd('old_encode');

console.time('new_encode');
encodeLatin1(str);
console.timeEnd('new_encode');
