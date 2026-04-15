const fs = require('fs');

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

function bytesToString(bytes) {
  const CHUNK_SIZE = 32768;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE)));
  }
  return chunks.join('');
}

const largeArray = new Uint8Array(2 * 1024 * 1024); // 2MB
for (let i = 0; i < largeArray.length; i++) largeArray[i] = i % 256;

console.time('Array.from (bytes to string)');
let s1 = Array.from(largeArray, byte => String.fromCharCode(byte)).join('');
console.timeEnd('Array.from (bytes to string)');

console.time('bytesToString');
let s2 = bytesToString(largeArray);
console.timeEnd('bytesToString');

console.time('Uint8Array.from (string to bytes)');
let a1 = Uint8Array.from(s2.split('').map(char => char.charCodeAt(0)));
console.timeEnd('Uint8Array.from (string to bytes)');

console.time('encodeLatin1');
let a2 = encodeLatin1(s2);
console.timeEnd('encodeLatin1');
