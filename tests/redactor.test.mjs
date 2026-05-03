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

test('redigirNumerico preserva label e substitui número por zeros de mesmo comprimento', () => {
  assert.equal(api.redigirNumerico('OAB/RJ ', '12345'), 'OAB/RJ 00000');
  assert.equal(api.redigirNumerico('CRM/RJ ', '1234'), 'CRM/RJ 0000');
  assert.equal(api.redigirNumerico('', '98765'), '00000');
  assert.equal(api.redigirNumerico('OAB/RJ ', '12345').length, 'OAB/RJ 12345'.length);
});

test('redigirMascarar substitui todo o conteúdo por asteriscos de mesmo comprimento', () => {
  assert.equal(api.redigirMascarar('joao@tjrj.jus.br'), '****************');
  assert.equal(api.redigirMascarar('RUA DAS FLORES 10').length, 'RUA DAS FLORES 10'.length);
  assert.ok(!/[^*]/.test(api.redigirMascarar('qualquer coisa')));
});
