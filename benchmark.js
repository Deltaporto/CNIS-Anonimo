const { performance } = require('perf_hooks');

function bytesToLatin1(bytes) {
  let result = '';
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    result += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return result;
}

const bytes = new Uint8Array(5 * 1024 * 1024); // 5 MB
for (let i = 0; i < bytes.length; i++) {
  bytes[i] = i % 256;
}

const t0 = performance.now();
const bin1 = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
const t1 = performance.now();

const t2 = performance.now();
const bin2 = bytesToLatin1(bytes);
const t3 = performance.now();

console.log(`Array.from: ${t1 - t0} ms`);
console.log(`bytesToLatin1: ${t3 - t2} ms`);

const str = bin2;
const t4 = performance.now();
const raw1 = Uint8Array.from(str.split('').map(char => char.charCodeAt(0)));
const t5 = performance.now();

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

const t6 = performance.now();
const raw2 = encodeLatin1(str);
const t7 = performance.now();

console.log(`Uint8Array.from(split.map): ${t5 - t4} ms`);
console.log(`encodeLatin1: ${t7 - t6} ms`);
