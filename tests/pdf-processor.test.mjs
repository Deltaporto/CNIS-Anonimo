import test from 'node:test';
import assert from 'node:assert/strict';
import pako from 'pako';

import { loadPdfProcessorApi } from './helpers/browser-apis.mjs';

const pdfProcessorApi = await loadPdfProcessorApi();

test('coleta múltiplos NITs e deduplica por dígitos', () => {
  const texto = [
    'NIT: 111.68584.40-4',
    'PIS/PASEP: 11168584404',
    'Outro NIT: 222.33333.44-5',
    'NIT: 22233333445',
    'Nit: 1074601784-4'
  ].join(' ');

  assert.deepEqual(
    pdfProcessorApi.coletarNitsDoTexto(texto),
    ['111.68584.40-4', '222.33333.44-5', '1074601784-4']
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

test('extrai titular, número do benefício e código de autenticidade da carta de concessão', () => {
  const texto = [
    'CARTA DE CONCESSÃO',
    'TITULAR: ARMANDO DE OLIVEIRA',
    'CPF: 013.881.617-45',
    'Benefício 206.885.719-1',
    'Você pode conferir a autenticidade deste documento com o código 260312WYHVJRXC7FWY5G55'
  ].join(' ');

  assert.equal(pdfProcessorApi.extrairNomeDoTexto(texto), 'ARMANDO DE OLIVEIRA');
  assert.equal(pdfProcessorApi.extrairNumeroBeneficioDoTexto(texto), '206.885.719-1');
  assert.equal(
    pdfProcessorApi.extrairCodigoAutenticidadeDoTexto(texto),
    '260312WYHVJRXC7FWY5G55'
  );
});

test('substitui conteúdo codificado em hex usando mapa ToUnicode reverso', () => {
  const cmap = `
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
1 begincodespacerange
<0000><FFFF>
endcodespacerange
27 beginbfrange
<0003><0003><0020>
<0010><0010><002d>
<0011><0011><002e>
<0013><0013><0030>
<0014><0014><0031>
<0015><0015><0032>
<0016><0016><0033>
<0017><0017><0034>
<0018><0018><0035>
<0019><0019><0036>
<001A><001A><0037>
<001B><001B><0038>
<001C><001C><0039>
<0024><0024><0041>
<0026><0026><0043>
<0027><0027><0044>
<0028><0028><0045>
<0029><0029><0046>
<002E><002E><004B>
<002F><002F><004C>
<0031><0031><004E>
<0032><0032><004F>
<0035><0035><0052>
<0036><0036><0053>
<0037><0037><0054>
<0038><0038><0055>
<003D><003D><005A>
<0044><0044><0061>
<004E><004E><006B>
<0052><0052><006F>
endbfrange
endcmap
end
end
`.trim();

  const reverseMap = pdfProcessorApi.parseToUnicodeCMap(cmap);
  const specs = pdfProcessorApi.montarEspecificacoesSubstituicao(
    {
      nome: 'TEREZA DOS SANTOS',
      cpf: '733.874.017-87',
      nits: [],
      nomeMae: 'MARIA DOS SANTOS'
    },
    {
      nome: 'TEREZA FAKE DOS SANTOS',
      cpf: '123.456.789-09',
      nits: [],
      nomeMae: 'MARIA FAKE DOS SANTOS'
    }
  );
  const specsHex = pdfProcessorApi.montarEspecificacoesHex(specs, [reverseMap]);
  const nomeOriginal = pdfProcessorApi.encodeTextWithCMap('TEREZA DOS SANTOS', reverseMap);
  const cpfOriginal = pdfProcessorApi.encodeTextWithCMap('733.874.017-87', reverseMap);
  const nomeFake = pdfProcessorApi.encodeTextWithCMap('TEREZA FAKE DOS SANTOS', reverseMap);
  const cpfFake = pdfProcessorApi.encodeTextWithCMap('123.456.789-09', reverseMap);
  const stream = `BT\n/F4 8 Tf\n<${nomeOriginal}>Tj\n<${cpfOriginal}>Tj\nET`;

  const result = pdfProcessorApi.aplicarEspecificacoesEmHex(stream, specsHex);

  assert.equal(result.changed, true);
  assert.equal(result.hits.nome, 1);
  assert.equal(result.hits.cpf, 1);
  assert.match(result.text, new RegExp(nomeFake));
  assert.match(result.text, new RegExp(cpfFake));
  assert.doesNotMatch(result.text, new RegExp(nomeOriginal));
  assert.doesNotMatch(result.text, new RegExp(cpfOriginal));
});

test('verificação ignora streams sem operadores de texto ao procurar dados residuais', async () => {
  const specs = pdfProcessorApi.montarEspecificacoesSubstituicao(
    {
      nome: 'LUIZ ALBERTO DOS SANTOS',
      cpf: '',
      nits: [],
      nomeMae: 'NIEDA PEREIRA DOS SANTOS'
    },
    {
      nome: 'LUIZ FAKE DOS SANTOS',
      cpf: '',
      nits: [],
      nomeMae: 'MARIA FAKE DOS SANTOS'
    }
  );

  const streamTexto = 'BT\n(LUIZ FAKE DOS SANTOS) Tj\n(MARIA FAKE DOS SANTOS) Tj\nET';
  const streamMetadados = 'CID-SET NIEDA PEREIRA DOS SANTOS';
  const binarioPdf = [
    '%PDF-1.4',
    `stream\n${String.fromCharCode(...pako.deflate(streamTexto))}\nendstream`,
    `stream\n${String.fromCharCode(...pako.deflate(streamMetadados))}\nendstream`,
    '%%EOF'
  ].join('\n');
  const bytes = Uint8Array.from(binarioPdf, char => char.charCodeAt(0));

  const unreplacedFields = await pdfProcessorApi.verificarSubstituicoesNoPDF(bytes, specs);

  assert.deepEqual(unreplacedFields, []);
});

test('ajusta nomes fictícios quando a fonte do PDF não codifica o marcador padrao', () => {
  const mapaSemK = {
    ' ': '0003',
    A: '0024',
    B: '0025',
    C: '0026',
    D: '0027',
    E: '0028',
    F: '0029',
    I: '002C',
    L: '002F',
    M: '0030',
    N: '0031',
    O: '0032',
    R: '0035',
    S: '0036',
    T: '0037',
    V: '0039',
    Z: '003D'
  };

  const ajustados = pdfProcessorApi.ajustarDadosFicticiosParaMapasHex(
    {
      nome: 'ROBERTO CONSTANTINO DA SILVA',
      cpf: '990.727.507-72',
      nits: ['122.05156.39-1'],
      nomeMae: 'ROZELIA CARDOSO C SILVA'
    },
    {
      nome: 'ROBERTO FAKE DOS SANTOS',
      cpf: '123.456.789-09',
      nits: ['333.44444.55-6'],
      nomeMae: 'MARIA FAKE DOS SANTOS'
    },
    [mapaSemK]
  );

  assert.equal(ajustados.nome, 'ROBERTO FALSO DOS SANTOS');
  assert.equal(ajustados.nomeMae, 'MARIA FALSA DOS SANTOS');
});
