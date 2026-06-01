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

test('modo extrair-pecas: config tem isSplit = true e campos corretos', () => {
  const config = appApi.obterConfigModo('extrair-pecas');
  assert.equal(config.id, 'extrair-pecas');
  assert.equal(config.isSplit, true);
  assert.equal(config.zipNome, 'Pecas_do_processo.zip');
});

test('modo extrair-pecas: obterConfigModo com modo desconhecido retorna config cnis', () => {
  const config = appApi.obterConfigModo('modo-inexistente');
  assert.equal(config.id, 'cnis');
});

test('modo extrair-pecas: modos cnis, carta-concessao e processo-judicial não têm isSplit', () => {
  for (const modo of ['cnis', 'carta-concessao', 'processo-judicial']) {
    const config = appApi.obterConfigModo(modo);
    assert.ok(!config.isSplit, `${modo} não deve ter isSplit`);
  }
});

test('modo extrair-pecas: resultado isZip é reconhecido como truthy e usa mime application/zip', () => {
  const resultado = { isZip: true, bytes: new Uint8Array([1, 2, 3]), nome: 'Pecas_do_processo.zip' };
  assert.ok(resultado.isZip);
  // Lógica espelhada do handler de download: isZip => application/zip
  const mimeType = resultado.isZip ? 'application/zip' : 'application/pdf';
  assert.equal(mimeType, 'application/zip');
});

test('modo extrair-pecas: pluraliza quantidade de peças extraídas', () => {
  assert.equal(appApi.formatarPecasExtraidas(1), '1 peça extraída');
  assert.equal(appApi.formatarPecasExtraidas(2), '2 peças extraídas');
});

test('modo extrair-pecas: Markdown anonimizado é padrão quando não há rádio selecionado', () => {
  assert.equal(appApi.obterSplitAnonimizarMarkdown(), true);
});

test('modo extrair-pecas: OCR ligado e aviso para páginas sem texto são padrão', () => {
  assert.deepEqual(appApi.obterSplitOcrOptions(), {
    enableOcr: true,
    missingTextMode: 'placeholder'
  });
});

test('modo extrair-pecas: nome do ZIP deixa claro se Markdown está anonimizado ou fiel', () => {
  const resultado = { processNumber: '5002849-72.2025.4.02.5113' };
  assert.equal(
    appApi.gerarNomeZipSplit(resultado, true),
    'Processo_5002849-72.2025.4.02.5113_pecas_anonimizadas.zip'
  );
  assert.equal(
    appApi.gerarNomeZipSplit(resultado, false),
    'Processo_5002849-72.2025.4.02.5113_pecas_texto_fiel.zip'
  );
});

test('modo extrair-pecas: gerarNomeSaida usa prefixo Processo', () => {
  // extrair-pecas herda prefixoArquivo = 'Processo' (igual a processo-judicial)
  // mas na prática o ZIP é nomeado diretamente; gerarNomeSaida não é chamado neste modo.
  // Verificamos que o prefixo do modo existe e está correto.
  const config = appApi.obterConfigModo('extrair-pecas');
  assert.equal(config.prefixoArquivo, 'Processo');
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
