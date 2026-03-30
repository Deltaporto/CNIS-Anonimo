import test from 'node:test';
import assert from 'node:assert/strict';

import { loadFakeDataApi } from './helpers/browser-apis.mjs';

const fakeDataApi = await loadFakeDataApi();

test('titular e mãe usam o sobrenome fixo FAKE DOS SANTOS', () => {
  for (let i = 0; i < 25; i++) {
    const dados = fakeDataApi.gerarDadosFicticios({
      nome: 'ROSALINA DA CONCEICAO CRUZ ALBERTO',
      cpf: '913.665.347-00',
      nits: ['111.68584.40-4']
    });

    assert.equal(dados.nome, 'ROSALINA FAKE DOS SANTOS');
    assert.equal(dados.nomeMae, 'MARIA FAKE DOS SANTOS');
  }
});

test('preserva o primeiro nome e gera um NIT fake por NIT original', () => {
  const dados = fakeDataApi.gerarDadosFicticios({
    nome: 'ROSALINA DA CONCEICAO CRUZ ALBERTO',
    cpf: '913.665.347-00',
    nits: ['111.68584.40-4', '222.33333.44-5']
  });

  assert.equal(dados.nome.split(' ')[0], 'ROSALINA');
  assert.equal(dados.nome, 'ROSALINA FAKE DOS SANTOS');
  assert.equal(dados.nomeMae, 'MARIA FAKE DOS SANTOS');
  assert.equal(dados.nits.length, 2);
  assert.equal(new Set(dados.nits.map(valor => valor.replace(/\D/g, ''))).size, 2);
  assert.notEqual(dados.cpf, '913.665.347-00');
  assert.notDeepEqual(
    dados.nits.map(valor => valor.replace(/\D/g, '')),
    ['11168584404', '22233333445']
  );
});
