const crypto = require('crypto');

function bytesToStringOld(bytes) {
  return Array.from(bytes, byte => String.fromCharCode(byte)).join('');
}

function bytesToStringNew(bytes) {
  const CHUNK_SIZE = 32768;
  let str = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  return str;
}

const largeBytes = crypto.randomBytes(1024 * 1024); // 1MB

console.time('old bytesToString');
bytesToStringOld(largeBytes);
console.timeEnd('old bytesToString');

console.time('new bytesToString');
bytesToStringNew(largeBytes);
console.timeEnd('new bytesToString');

function stringToBytesOld(str) {
  return Uint8Array.from(str.split('').map(char => char.charCodeAt(0)));
}

function stringToBytesNew(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

const largeStr = bytesToStringNew(largeBytes);

console.time('old stringToBytes');
stringToBytesOld(largeStr);
console.timeEnd('old stringToBytes');

console.time('new stringToBytes');
stringToBytesNew(largeStr);
console.timeEnd('new stringToBytes');
