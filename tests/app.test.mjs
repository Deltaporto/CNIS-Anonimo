import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAppApi } from './helpers/browser-apis.mjs';

const appApi = await loadAppApi();

test('gera nomes únicos por lote sem perder o primeiro nome', () => {
  assert.equal(appApi.gerarNomeSaida('JOAO DA SILVA', 0, 3), 'CNIS Joao 01.pdf');
  assert.equal(appApi.gerarNomeSaida('JOAO DA SILVA', 1, 3), 'CNIS Joao 02.pdf');
  assert.equal(appApi.gerarNomeSaida('', 0, 1), 'CNIS Anonimizado.pdf');
  assert.equal(
    appApi.gerarNomeSaida('ARMANDO DE OLIVEIRA', 0, 1, 'carta-concessao'),
    'Carta de Concessao Armando.pdf'
  );
});

test('monta pares de substituição com NIT 1, NIT 2, benefício, código e nome da mãe', () => {
  const pares = appApi.construirParesSubstituicao(
    {
      nome: 'ROSALINA DA CONCEICAO CRUZ ALBERTO',
      cpf: '913.665.347-00',
      nits: ['111.68584.40-4', '222.33333.44-5'],
      nomeMae: 'MARIA APARECIDA DOS SANTOS',
      numeroBeneficio: '171760037-6',
      codigoAutenticidade: '260310ZNUFO1BMP91ZZ947',
      endereco: 'AVENIDA GEREMARIO DANTAS, 78 - TANQUE - JACAREPAGUA'
    },
    {
      nome: 'ROSALINA FAKE DOS SANTOS',
      cpf: '123.456.789-09',
      nits: ['333.44444.55-6', '777.88888.99-0'],
      nomeMae: 'MARIA FAKE DOS SANTOS',
      numeroBeneficio: '987654321-0',
      codigoAutenticidade: '26041388FU4G0KR-XB4S21',
      endereco: 'AVENIDA GERAL 99 - CENTRO'
    }
  );

  assert.deepEqual(
    pares.map(([label]) => label),
    ['Nome', 'CPF', 'NIT 1', 'NIT 2', 'Benefício', 'Código', 'Endereço', 'Mãe']
  );
});

test('coletar observações da carta cobra benefício, código e CPF ou NIT', () => {
  const observacoes = appApi.coletarObservacoes(
    {
      nome: 'ARMANDO DE OLIVEIRA',
      cpf: '',
      nits: [],
      nomeMae: '',
      numeroBeneficio: '',
      codigoAutenticidade: '',
      endereco: ''
    },
    {
      unmatchedFields: []
    },
    'carta-concessao'
  );

  assert.deepEqual(
    observacoes,
    ['não encontrado: Número do benefício, Código de autenticidade, Endereço, CPF ou NIT']
  );
});
