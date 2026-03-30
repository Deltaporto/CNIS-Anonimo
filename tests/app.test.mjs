import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAppApi } from './helpers/browser-apis.mjs';

const appApi = await loadAppApi();

test('gera nomes únicos por lote sem perder o primeiro nome', () => {
  assert.equal(appApi.gerarNomeSaida('JOAO DA SILVA', 0, 3), 'CNIS Joao 01.pdf');
  assert.equal(appApi.gerarNomeSaida('JOAO DA SILVA', 1, 3), 'CNIS Joao 02.pdf');
  assert.equal(appApi.gerarNomeSaida('', 0, 1), 'CNIS Anonimizado.pdf');
});

test('monta pares de substituição com NIT 1, NIT 2 e nome da mãe', () => {
  const pares = appApi.construirParesSubstituicao(
    {
      nome: 'ROSALINA DA CONCEICAO CRUZ ALBERTO',
      cpf: '913.665.347-00',
      nits: ['111.68584.40-4', '222.33333.44-5'],
      nomeMae: 'MARIA APARECIDA DOS SANTOS'
    },
    {
      nome: 'ROSALINA FAKE DOS SANTOS',
      cpf: '123.456.789-09',
      nits: ['333.44444.55-6', '777.88888.99-0'],
      nomeMae: 'MARIA FAKE DOS SANTOS'
    }
  );

  assert.deepEqual(
    pares.map(([label]) => label),
    ['Nome', 'CPF', 'NIT 1', 'NIT 2', 'Mãe']
  );
});
