import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// ── Loader ────────────────────────────────────────────────────────────────────

async function loadPdfSplitterApi() {
  const source = await fs.readFile(
    new URL('../js/pdf-splitter.js', import.meta.url),
    'utf8'
  );

  const mockJSZip = class {
    constructor() { this._files = {}; }
    file(name, content) { this._files[name] = content; return this; }
    async generateAsync() { return new Uint8Array(); }
  };

  const mockPdfjsLib = {
    getDocument() { return { promise: Promise.resolve({ numPages: 0, getOutline: async () => [] }) }; }
  };

  return new Function('deps', `
    const { pdfjsLib, JSZip, document, window } = deps;
    ${source}
    return {
      flattenOutline,
      isEprocEventTitle,
      sanitizeFilename,
      inferProcessNumber,
      buildEventRanges,
      pageNeedsOcr,
      buildMarkdownForEvent,
      buildIndexMarkdown
    };
  `)({
    pdfjsLib: mockPdfjsLib,
    JSZip: mockJSZip,
    document: null,
    window: {}
  });
}

const api = await loadPdfSplitterApi();

// ── sanitizeFilename ──────────────────────────────────────────────────────────

test('sanitizeFilename: título típico do eProc', () => {
  const result = api.sanitizeFilename('Evento.23 - Doc.2 - PPP - Perfil Profissiográfico');
  // Deve conter apenas [a-zA-Z0-9_.-]
  assert.match(result, /^[a-zA-Z0-9_.\-]+$/);
  assert.ok(result.includes('Evento.23'));
  assert.ok(result.includes('Doc.2'));
});

test('sanitizeFilename: só espaços → evento_sem_nome', () => {
  assert.equal(api.sanitizeFilename('   '), 'evento_sem_nome');
});

test('sanitizeFilename: string vazia → evento_sem_nome', () => {
  assert.equal(api.sanitizeFilename(''), 'evento_sem_nome');
});

test('sanitizeFilename: null → evento_sem_nome', () => {
  assert.equal(api.sanitizeFilename(null), 'evento_sem_nome');
});

test('sanitizeFilename: sem underscore nas pontas', () => {
  const result = api.sanitizeFilename('_leading_trailing_');
  assert.ok(!result.startsWith('_'), 'Não deve começar com _');
  assert.ok(!result.endsWith('_'), 'Não deve terminar com _');
});

test('sanitizeFilename: underscores consecutivos colapsados', () => {
  const result = api.sanitizeFilename('A  B   C');
  assert.ok(!result.includes('__'), 'Não deve ter underscores duplos: ' + result);
});

test('sanitizeFilename: limite de 200 caracteres', () => {
  const long = 'A'.repeat(300);
  const result = api.sanitizeFilename(long);
  assert.ok(result.length <= 200);
});

// ── flattenOutline ────────────────────────────────────────────────────────────

test('flattenOutline: árvore simples sem filhos', () => {
  const items = [{ title: 'A' }, { title: 'B' }];
  const flat = api.flattenOutline(items);
  assert.equal(flat.length, 2);
  assert.equal(flat[0].title, 'A');
  assert.equal(flat[1].title, 'B');
});

test('flattenOutline: árvore com aninhamento profundo', () => {
  const items = [
    { title: 'A', items: [{ title: 'B', items: [{ title: 'C' }] }] }
  ];
  const flat = api.flattenOutline(items);
  assert.equal(flat.length, 3);
  assert.equal(flat[0].title, 'A');
  assert.equal(flat[1].title, 'B');
  assert.equal(flat[2].title, 'C');
});

test('flattenOutline: array vazio retorna array vazio', () => {
  assert.deepEqual(api.flattenOutline([]), []);
});

test('flattenOutline: null retorna array vazio', () => {
  assert.deepEqual(api.flattenOutline(null), []);
});

test('flattenOutline: preserva referência ao objeto original', () => {
  const original = { title: 'X', dest: [1, 2, 3] };
  const flat = api.flattenOutline([original]);
  assert.strictEqual(flat[0], original);
});

// ── isEprocEventTitle ─────────────────────────────────────────────────────────

test('isEprocEventTitle: evento numerado → true', () => {
  assert.equal(api.isEprocEventTitle('Evento.1 - Doc.1 - PETIÇÃO INICIAL'), true);
});

test('isEprocEventTitle: CAPA maiúsculo → true', () => {
  assert.equal(api.isEprocEventTitle('CAPA'), true);
});

test('isEprocEventTitle: capa minúsculo → true', () => {
  assert.equal(api.isEprocEventTitle('capa'), true);
});

test('isEprocEventTitle: Capa misto → true', () => {
  assert.equal(api.isEprocEventTitle('Capa'), true);
});

test('isEprocEventTitle: seção genérica → false', () => {
  assert.equal(api.isEprocEventTitle('Seção 1'), false);
});

test('isEprocEventTitle: string vazia → false', () => {
  assert.equal(api.isEprocEventTitle(''), false);
});

test('isEprocEventTitle: null → false', () => {
  assert.equal(api.isEprocEventTitle(null), false);
});

test('isEprocEventTitle: outro título → false', () => {
  assert.equal(api.isEprocEventTitle('Sumário'), false);
});

// ── buildEventRanges ──────────────────────────────────────────────────────────

test('buildEventRanges: calcula endPageIndexExclusive corretamente', () => {
  const items = [
    { title: 'CAPA', pageIndex: 0 },
    { title: 'Evento.1 - Doc.1', pageIndex: 5 },
    { title: 'Evento.2 - Doc.1', pageIndex: 10 }
  ];
  const ranges = api.buildEventRanges(items, 20);

  assert.equal(ranges.length, 3);
  assert.equal(ranges[0].startPageIndex, 0);
  assert.equal(ranges[0].endPageIndexExclusive, 5);
  assert.equal(ranges[1].startPageIndex, 5);
  assert.equal(ranges[1].endPageIndexExclusive, 10);
  assert.equal(ranges[2].startPageIndex, 10);
  assert.equal(ranges[2].endPageIndexExclusive, 20);
});

test('buildEventRanges: último evento vai até totalPages', () => {
  const items = [{ title: 'Evento.1', pageIndex: 0 }];
  const ranges = api.buildEventRanges(items, 15);
  assert.equal(ranges[0].endPageIndexExclusive, 15);
  assert.equal(ranges[0].pageCount, 15);
});

test('buildEventRanges: labels one-based corretos', () => {
  const items = [
    { title: 'Evento.1', pageIndex: 0 },
    { title: 'Evento.2', pageIndex: 5 }
  ];
  const ranges = api.buildEventRanges(items, 10);

  // startPageLabel = startPageIndex + 1
  assert.equal(ranges[0].startPageLabel, 1);
  assert.equal(ranges[0].endPageLabel, 5);   // exclusivo = 5, portanto endPageLabel = 5 (one-based inclusive = exclusive)
  assert.equal(ranges[1].startPageLabel, 6);
  assert.equal(ranges[1].endPageLabel, 10);
});

test('buildEventRanges: remove itens com pageIndex null', () => {
  const items = [
    { title: 'CAPA', pageIndex: 0 },
    { title: 'Evento.1', pageIndex: null },
    { title: 'Evento.2', pageIndex: 5 }
  ];
  const ranges = api.buildEventRanges(items, 20);
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0].title, 'CAPA');
  assert.equal(ranges[1].title, 'Evento.2');
});

test('buildEventRanges: remove duplicatas de pageIndex mantendo o primeiro', () => {
  const items = [
    { title: 'CAPA', pageIndex: 0 },
    { title: 'Evento.1', pageIndex: 0 },  // duplicata de pageIndex 0
    { title: 'Evento.2', pageIndex: 5 }
  ];
  const ranges = api.buildEventRanges(items, 20);
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0].title, 'CAPA');  // primeiro com pageIndex 0
  assert.equal(ranges[1].title, 'Evento.2');
});

test('buildEventRanges: ordena por pageIndex antes de processar', () => {
  const items = [
    { title: 'Evento.2', pageIndex: 10 },
    { title: 'CAPA', pageIndex: 0 },
    { title: 'Evento.1', pageIndex: 5 }
  ];
  const ranges = api.buildEventRanges(items, 20);
  assert.equal(ranges[0].title, 'CAPA');
  assert.equal(ranges[1].title, 'Evento.1');
  assert.equal(ranges[2].title, 'Evento.2');
});

test('buildEventRanges: filename gerado corretamente', () => {
  const items = [{ title: 'Evento.1 - Doc.1 - PETIÇÃO', pageIndex: 0 }];
  const ranges = api.buildEventRanges(items, 5);
  assert.ok(ranges[0].filename.endsWith('.md'));
  assert.match(ranges[0].filename, /^[a-zA-Z0-9_.\-]+\.md$/);
});

// ── pageNeedsOcr ──────────────────────────────────────────────────────────────

test('pageNeedsOcr: texto vazio → true', () => {
  assert.equal(api.pageNeedsOcr(''), true);
});

test('pageNeedsOcr: texto só com espaços → true', () => {
  assert.equal(api.pageNeedsOcr('   '), true);
});

test('pageNeedsOcr: texto com menos de 50 chars → true', () => {
  assert.equal(api.pageNeedsOcr('texto curto'), true);
});

test('pageNeedsOcr: texto com exatamente 50 chars → false', () => {
  const text = 'a'.repeat(50);
  assert.equal(api.pageNeedsOcr(text), false);
});

test('pageNeedsOcr: texto longo → false', () => {
  const text = 'Este é um texto bem longo com bastante conteúdo para não precisar de OCR.';
  assert.equal(api.pageNeedsOcr(text), false);
});

// ── inferProcessNumber ────────────────────────────────────────────────────────

test('inferProcessNumber: extrai sequência de 20 dígitos', () => {
  assert.equal(api.inferProcessNumber('50000000000000000000.pdf'), '50000000000000000000');
});

test('inferProcessNumber: extrai número no meio do nome', () => {
  assert.equal(
    api.inferProcessNumber('processo_50123456789012345678_2024.pdf'),
    '50123456789012345678'
  );
});

test('inferProcessNumber: sem 20 dígitos → "Processo"', () => {
  assert.equal(api.inferProcessNumber('processo.pdf'), 'Processo');
});

test('inferProcessNumber: string vazia → "Processo"', () => {
  assert.equal(api.inferProcessNumber(''), 'Processo');
});

test('inferProcessNumber: null → "Processo"', () => {
  assert.equal(api.inferProcessNumber(null), 'Processo');
});

test('inferProcessNumber: número menor que 20 dígitos → "Processo"', () => {
  assert.equal(api.inferProcessNumber('1234567890.pdf'), 'Processo');
});
