import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRedactorApi } from './helpers/browser-apis.mjs';

const api = await loadRedactorApi();

test('redigirCPF substitui todos os dígitos por asteriscos preservando máscara e comprimento', () => {
  assert.equal(api.redigirCPF('123.456.789-09'), '***.***.***-**');
  assert.equal(api.redigirCPF('913.665.347-00'), '***.***.***-**');
  assert.equal(api.redigirCPF('913.665.347-00').length, '913.665.347-00'.length);
  assert.ok(!/\d/.test(api.redigirCPF('000.000.000-00')));
});
