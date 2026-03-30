import test from 'node:test';
import assert from 'node:assert/strict';

import { loadPdfProcessorApi } from './helpers/browser-apis.mjs';

const pdfProcessorApi = await loadPdfProcessorApi();

test('coleta múltiplos NITs e deduplica por dígitos', () => {
  const texto = [
    'NIT: 111.68584.40-4',
    'PIS/PASEP: 11168584404',
    'Outro NIT: 222.33333.44-5',
    'NIT: 22233333445'
  ].join(' ');

  assert.deepEqual(
    pdfProcessorApi.coletarNitsDoTexto(texto),
    ['111.68584.40-4', '222.33333.44-5']
  );
});

test('extrai nome, nome da mãe e CPF com variações de rótulo', () => {
  const texto = [
    'NOME: ROSALINA DA CONCEICAO CRUZ ALBERTO',
    'CPF: 913.665.347-00',
    'Nome da mae: MARIA APARECIDA DOS SANTOS',
    'Data de nascimento: 01/01/1970'
  ].join(' ');

  assert.equal(
    pdfProcessorApi.extrairNomeDoTexto(texto),
    'ROSALINA DA CONCEICAO CRUZ ALBERTO'
  );
  assert.equal(
    pdfProcessorApi.extrairNomeMaeDoTexto(texto),
    'MARIA APARECIDA DOS SANTOS'
  );
  assert.equal(pdfProcessorApi.extrairCpfDoTexto(texto), '913.665.347-00');
});
