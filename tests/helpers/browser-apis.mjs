import fs from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import * as PDFLib from 'pdf-lib';
import pako from 'pako';
import * as pdfjsBase from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT_URL = new URL('../../', import.meta.url);
const CNIS_FIXTURES_URL = new URL('teste/', ROOT_URL);
const CARTA_CONCESSAO_FIXTURES_URL = new URL('teste-carta-de-concessao/', CNIS_FIXTURES_URL);
const STANDARD_FONT_DATA_URL = new URL('node_modules/pdfjs-dist/standard_fonts/', ROOT_URL).href;
const originalConsoleWarn = console.warn.bind(console);

console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('UnknownErrorException: Ensure that the `standardFontDataUrl`') ||
    message.includes('UnknownErrorException: Unable to load font data at:')
  ) {
    return;
  }

  originalConsoleWarn(...args);
};

const pdfjsLib = {
  ...pdfjsBase,
  getDocument(src) {
    if (src && typeof src === 'object') {
      const normalized = {
        ...src,
        standardFontDataUrl: src.standardFontDataUrl || STANDARD_FONT_DATA_URL
      };

      if (normalized.data instanceof ArrayBuffer) {
        normalized.data = new Uint8Array(normalized.data);
      }

      return pdfjsBase.getDocument(normalized);
    }

    return pdfjsBase.getDocument(src);
  }
};

function createElementStub() {
  return {
    addEventListener() {},
    append() {},
    appendChild() {},
    removeChild() {},
    click() {},
    setAttribute() {},
    querySelector() { return createElementStub(); },
    classList: { add() {}, remove() {} },
    style: {},
    textContent: '',
    innerHTML: '',
    disabled: false
  };
}

async function readSource(relativePath) {
  return fs.readFile(new URL(relativePath, ROOT_URL), 'utf8');
}

export async function loadFakeDataApi() {
  const source = await readSource('js/fake-data.js');

  return new Function('deps', `
    const { crypto } = deps;
    ${source}
    return {
      gerarDadosFicticios,
      gerarNomeMaeFicticio,
      gerarNomeCompleto,
      gerarCPF,
      gerarNIT,
      gerarNumeroBeneficio,
      gerarCodigoAutenticidade,
      gerarEnderecoFicticio
    };
  `)({ crypto: webcrypto });
}

export async function loadPdfProcessorApi() {
  const source = await readSource('js/pdf-processor.js');

  return new Function('deps', `
    const { TextDecoder, Uint8Array, ArrayBuffer, PDFLib, pako, pdfjsLib } = deps;
    ${source}
    return {
      extrairDadosSensiveis,
      substituirDadosNoPDF,
      verificarSubstituicoesNoPDF,
      ajustarDadosFicticiosParaMapasHex,
      coletarNitsDoTexto,
      extrairNomeDoTexto,
      extrairNomeMaeDoTexto,
      extrairCpfDoTexto,
      extrairNumeroBeneficioDoTexto,
      extrairCodigoAutenticidadeDoTexto,
      extrairEnderecoDasLinhas,
      parseToUnicodeCMap,
      encodeTextWithCMap,
      montarEspecificacoesSubstituicao,
      montarEspecificacoesHex,
      aplicarEspecificacoesEmHex
    };
  `)({
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    PDFLib,
    pako,
    pdfjsLib
  });
}

export async function loadAppApi() {
  const source = await readSource('js/app.js');

  return new Function('deps', `
    const { document, URL, Blob, JSZip } = deps;
    ${source}
    return {
      gerarNomeSaida,
      construirParesSubstituicao,
      coletarObservacoes
    };
  `)({
    document: {
      getElementById() { return createElementStub(); },
      createElement() { return createElementStub(); },
      body: createElementStub()
    },
    URL: {
      createObjectURL() { return 'blob:test'; },
      revokeObjectURL() {}
    },
    Blob: globalThis.Blob || class {},
    JSZip: class {
      file() {}
      async generateAsync() { return new Uint8Array(); }
    }
  });
}

export async function readPdfFixture(filename) {
  const bytes = await fs.readFile(new URL(filename, CNIS_FIXTURES_URL));
  return new Uint8Array(bytes);
}

export const CNIS_FIXTURES = (await fs.readdir(CNIS_FIXTURES_URL))
  .filter(filename => filename.toLowerCase().endsWith('.pdf'))
  .sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true }));

export const CARTA_CONCESSAO_FIXTURES = (await fs.readdir(CARTA_CONCESSAO_FIXTURES_URL))
  .filter(filename => filename.toLowerCase().endsWith('.pdf'))
  .sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true }))
  .map(filename => `teste-carta-de-concessao/${filename}`);
