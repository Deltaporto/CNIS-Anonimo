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

test('redigirNome converte nome em iniciais e preenche com espaços até comprimento original', () => {
  const original = 'ROSALINA FERREIRA DA SILVA';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length, 'comprimento deve ser identico');
  assert.ok(resultado.startsWith('R. F. S.'), 'deve comecar com as iniciais corretas');
  assert.equal(resultado.trimEnd(), 'R. F. S.', 'sem trailing spaces deve ser so as iniciais');
});

test('redigirNome com dois nomes sem conectivos', () => {
  const original = 'JOAO SILVA';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length);
  assert.equal(resultado.trimEnd(), 'J. S.');
});

test('redigirNome ignora conectivos na geracao de iniciais', () => {
  const original = 'MARIA DA CONCEICAO';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length);
  assert.equal(resultado.trimEnd(), 'M. C.');
});

test('mapearSubstitutos detecta CPF valido e gera substituto byte-safe', () => {
  const pares = api.mapearSubstitutos('CPF do reu: 913.665.347-00 conforme certidao.');
  const par = pares.find(p => p.original === '913.665.347-00');
  assert.ok(par, 'deve detectar o CPF');
  assert.equal(par.substituto, '***.***.***-**');
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos ignora CPF com checksum invalido', () => {
  const pares = api.mapearSubstitutos('CPF: 123.456.789-00');
  assert.equal(pares.filter(p => p.original.includes('123.456')).length, 0);
});

test('mapearSubstitutos detecta OAB preservando label e zerificando numero', () => {
  const pares = api.mapearSubstitutos('Advogado OAB/RJ 123456 presente.');
  const par = pares.find(p => p.original.includes('OAB'));
  assert.ok(par, 'deve detectar OAB');
  assert.ok(par.substituto.startsWith('OAB/RJ '), 'label deve ser preservado');
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos detecta CRM preservando label', () => {
  const pares = api.mapearSubstitutos('Medico CRM/RJ 12345 emitiu laudo.');
  const par = pares.find(p => p.original.includes('CRM'));
  assert.ok(par);
  assert.equal(par.substituto.length, par.original.length);
  assert.ok(par.substituto.includes('00000'));
});

test('mapearSubstitutos detecta telefone e zerifica digitos preservando separadores', () => {
  const pares = api.mapearSubstitutos('Contato: (21) 99999-8888');
  const par = pares.find(p => p.original.includes('99999'));
  assert.ok(par, 'deve detectar telefone');
  assert.equal(par.substituto, par.original.replace(/\d/g, '0'));
  assert.equal(par.substituto.length, par.original.length);
});
