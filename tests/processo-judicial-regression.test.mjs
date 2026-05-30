import test from 'node:test';
import assert from 'node:assert/strict';
import * as PDFLib from 'pdf-lib';
const pdfjsBaseModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsBase = pdfjsBaseModule.default ?? pdfjsBaseModule;

import {
  loadRedactorApi,
  loadPdfProcessorApi,
  PROCESSO_JUDICIAL_FIXTURES,
  readProcessoJudicialFixture
} from './helpers/browser-apis.mjs';

const ROOT_URL = new URL('../', import.meta.url);
const STANDARD_FONT_DATA_URL = new URL('node_modules/pdfjs-dist/standard_fonts/', ROOT_URL).href;

const redactorApi = await loadRedactorApi();
const pdfProcessorApi = await loadPdfProcessorApi(redactorApi);

async function extrairTextoPdf(bytes) {
  const pdf = await pdfjsBase.getDocument({
    data: bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes),
    standardFontDataUrl: STANDARD_FONT_DATA_URL
  }).promise;
  const partes = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      partes.push(content.items.map(item => item.str).join(' '));
    }
  } finally {
    try { pdf.cleanup(); } catch {}
    try { await pdf.destroy(); } catch {}
  }

  return partes.join('\n');
}

async function criarPdfProcessual({ paginas = 3 } = {}) {
  const pdfDoc = await PDFLib.PDFDocument.create();
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const processo = '0001234-56.2024.8.19.0001';
  const cpfs = ['913.665.347-00', '013.881.617-45', '990.727.507-72'];

  for (let i = 0; i < paginas; i++) {
    const page = pdfDoc.addPage([595, 842]);
    const cpf = cpfs[i % cpfs.length];
    const linhas = [
      `Processo ${processo}`,
      'Parte autora JOAO SILVA DOS SANTOS',
      `CPF ${cpf}`,
      'Advogada OAB/RJ 123456',
      'Perito CRM/RJ 12345',
      'Contato (21) 99999-8888',
      'Email joao.silva@tjrj.jus.br',
      'Endereco Rua das Flores 10',
      `Pagina ${i + 1} de ${paginas}`
    ];

    linhas.forEach((linha, idx) => {
      page.drawText(linha, {
        x: 72,
        y: 780 - idx * 22,
        size: 12,
        font
      });
    });
  }

  return new Uint8Array(await pdfDoc.save({ useObjectStreams: false }));
}

if (!PROCESSO_JUDICIAL_FIXTURES.length) {
  console.log('[SKIP] Sem PDFs reais em tests/processo-judicial/; usando regressões sintéticas.');
}

for (const fixture of PROCESSO_JUDICIAL_FIXTURES) {
  test(fixture + ': retorna bytes validos de PDF', async () => {
    const bytes = await readProcessoJudicialFixture(fixture);
    const resultado = await pdfProcessorApi.processarDocumentoJudicial(bytes);
    assert.ok(resultado.bytes instanceof Uint8Array);
    assert.ok(resultado.bytes.length > 0);
    const header = String.fromCharCode(...resultado.bytes.slice(0, 5));
    assert.ok(header.startsWith('%PDF'), 'saida deve ser um PDF valido');
  });

  test(fixture + ': retorna achados estruturados', async () => {
    const bytes = await readProcessoJudicialFixture(fixture);
    const resultado = await pdfProcessorApi.processarDocumentoJudicial(bytes);
    assert.ok(Array.isArray(resultado.achados.numerosProcesso));
    assert.equal(typeof resultado.achados.cpfs, 'number');
    assert.equal(typeof resultado.achados.oabs, 'number');
    assert.equal(typeof resultado.achados.nomes, 'number');
  });
}

test('processa PDF judicial sintetico e preserva numero do processo', async () => {
  const bytes = await criarPdfProcessual({ paginas: 4 });
  const resultado = await pdfProcessorApi.processarDocumentoJudicial(bytes);
  const texto = await extrairTextoPdf(resultado.bytes);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.achados.numerosProcesso[0], '0001234-56.2024.8.19.0001');
  assert.ok(resultado.achados.cpfs >= 4);
  assert.ok(resultado.appliedCount > 0);
  assert.match(texto, /0001234-56\.2024\.8\.19\.0001/);
  assert.doesNotMatch(texto, /913\.665\.347-00/);
  assert.doesNotMatch(texto, /013\.881\.617-45/);
  assert.doesNotMatch(texto, /OAB\/RJ 123456/);
  assert.doesNotMatch(texto, /joao\.silva@tjrj\.jus\.br/i);
});

test('stress: processa PDF judicial com 150 paginas sem quebrar PDF de saida', async () => {
  const bytes = await criarPdfProcessual({ paginas: 150 });
  const inicio = performance.now();
  const resultado = await pdfProcessorApi.processarDocumentoJudicial(bytes);
  const duracaoMs = performance.now() - inicio;
  const texto = await extrairTextoPdf(resultado.bytes);

  assert.equal(resultado.ok, true);
  assert.ok(resultado.bytes.length > 0);
  assert.ok(resultado.achados.cpfs >= 150);
  assert.ok(resultado.appliedCount > 0);
  assert.match(texto, /0001234-56\.2024\.8\.19\.0001/);
  assert.doesNotMatch(texto, /913\.665\.347-00/);
  assert.doesNotMatch(texto, /OAB\/RJ 123456/);
  console.log(`[stress processo judicial] 150 paginas em ${Math.round(duracaoMs)}ms`);
});
