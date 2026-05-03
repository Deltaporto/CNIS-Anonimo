# Modo Processo Judicial Genérico — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar modo Processo Judicial que redige dados sensíveis com placeholders de mesmo comprimento, sem gerar dados fictícios.

**Architecture:** Novo `js/redactor.js` concentra padrões e redação byte-safe. `pdf-processor.js` ganha `processarDocumentoJudicial()` que varre todos os streams e reutiliza o pipeline binário existente. `app.js` e `index.html` ganham o terceiro modo.

**Tech Stack:** Node.js built-in test runner (`node --test`), arquivos `.mjs`, `pdf-lib`, `pdfjs-dist`, `pako`. Sem bundler — módulos testados via `new Function()` no helper `tests/helpers/browser-apis.mjs` (padrão já existente no projeto).

---

## Mapa de Arquivos

| Arquivo | Operação | Responsabilidade |
|---|---|---|
| `assets/common-first-names.json` | Criar | Dicionário de primeiros nomes BR (portado do APOIA) |
| `js/redactor.js` | Criar | Padrões regex + funções de redação byte-safe |
| `tests/redactor.test.mjs` | Criar | Testes unitários do redactor |
| `tests/helpers/browser-apis.mjs` | Modificar | Adicionar `loadRedactorApi()` e atualizar `loadPdfProcessorApi()` |
| `js/pdf-processor.js` | Modificar | Adicionar `processarDocumentoJudicial()` e `_extrairTextoCompleto()` |
| `js/app.js` | Modificar | Adicionar modo `'processo-judicial'`, `processarArquivoJudicial()`, `mostrarAchados()` |
| `index.html` | Modificar | Terceiro botão no seletor de modo |
| `tests/processo-judicial-regression.test.mjs` | Criar | Testes de regressão (Fase 5) |

---

## Task 1: Setup — dicionário de nomes + helper de testes

**Files:**
- Create: `assets/common-first-names.json`
- Modify: `tests/helpers/browser-apis.mjs`

- [ ] **Step 1: Copiar o dicionário de nomes do APOIA**

```bash
cp /home/rafa/Apoia-estudo/apoia/lib/anonym/common-first-names.json \
   /home/rafa/anonimiza-CNIS/assets/common-first-names.json
```

Verificar: `head -5 assets/common-first-names.json` → deve mostrar `["JOSE", "JOSÉ", ...]`

- [ ] **Step 2: Adicionar `loadRedactorApi` ao browser-apis.mjs**

Abrir `tests/helpers/browser-apis.mjs` e adicionar ao final:

```js
export async function loadRedactorApi() {
  const source = await readSource('js/redactor.js');
  const primeiroNomes = JSON.parse(
    await fs.readFile(new URL('assets/common-first-names.json', ROOT_URL), 'utf8')
  );

  return new Function('deps', `
    const { primeiroNomes } = deps;
    ${source}
    inicializar(primeiroNomes);
    return { redigirCPF, redigirNumerico, redigirMascarar, redigirNome, mapearSubstitutos, contarAchados };
  `)({ primeiroNomes });
}
```

- [ ] **Step 3: Atualizar `loadPdfProcessorApi` para aceitar redactorApi opcional**

Localizar `export async function loadPdfProcessorApi()` em `tests/helpers/browser-apis.mjs` e alterar para:

```js
export async function loadPdfProcessorApi(redactorApi = null) {
  const source = await readSource('js/pdf-processor.js');

  return new Function('deps', `
    const { TextDecoder, Uint8Array, ArrayBuffer, PDFLib, pako, pdfjsLib, mapearSubstitutos, contarAchados } = deps;
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
      aplicarEspecificacoesEmHex,
      processarDocumentoJudicial
    };
  `)({
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    PDFLib,
    pako,
    pdfjsLib,
    mapearSubstitutos: redactorApi ? redactorApi.mapearSubstitutos : () => [],
    contarAchados: redactorApi ? redactorApi.contarAchados : () => ({ cpfs: 0, oabs: 0, crms: 0, nomes: 0, numerosProcesso: [] })
  });
}
```

- [ ] **Step 4: Executar os testes existentes para verificar que nada quebrou**

```bash
node --test
```

Esperado: todos os testes passam (nenhum teste usa `processarDocumentoJudicial` ainda).

- [ ] **Step 5: Commit**

```bash
git add assets/common-first-names.json tests/helpers/browser-apis.mjs
git commit -m "feat: add common-first-names.json and update test helpers for redactor"
```

---

## Task 2: TDD — `redigirCPF` + esqueleto de `js/redactor.js`

**Files:**
- Create: `tests/redactor.test.mjs`
- Create: `js/redactor.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/redactor.test.mjs`:

```js
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
```

- [ ] **Step 2: Executar e confirmar falha**

```bash
node --test tests/redactor.test.mjs
```

Esperado: erro `Cannot find module` ou `ReferenceError: redigirCPF is not defined`.

- [ ] **Step 3: Implementar o esqueleto de `js/redactor.js` com `redigirCPF`**

Criar `js/redactor.js`:

```js
const NUMERO_DE_PROCESSO_PATTERN = /\b\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}\b/;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const OAB_PATTERN = /\b(OAB(?:\/[A-Z]{2}| [A-Z]{2})?:?\s*(?:n\.?|nº\.?)?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;
const CRM_PATTERN = /\b((?:CRM(?:\/[A-Z]{2})?|CREMERJ)\s*)(\d{2,10}|\d{2,3}\.\d{3})\b/i;
const IDENTIDADE_PATTERN = /\b(?:Identidade|Id\.?|Ident\.?|RG)\s*(?:n[.º]?\s*)?(\d[\d.\-\/]{4,8}\d)\b/i;
const TELEFONE_PATTERN = /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\b/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ENDERECO_PATTERN = /\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Trav\.?|Pra[cç]a|Rodovia|Rod\.?|Estrada|Estr\.?)\b\s+[^\n,]+(?:,?\s*n[.º]?\s*\d+)?/i;

let firstNameSet = new Set();

function inicializar(primeiroNomes) {
  firstNameSet = new Set(primeiroNomes.map(n => n.toLowerCase()));
}

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i);
  let resto = soma % 11;
  if ((resto < 2 ? 0 : 11 - resto) !== Number(d[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i);
  resto = soma % 11;
  return (resto < 2 ? 0 : 11 - resto) === Number(d[10]);
}

function redigirCPF(original) {
  return original.replace(/\d/g, '*');
}

function redigirNumerico(label, num) { return ''; }
function redigirMascarar(original) { return ''; }
function redigirNome(original) { return ''; }
function mapearSubstitutos(texto) { return []; }
function contarAchados(texto) { return { cpfs: 0, oabs: 0, crms: 0, nomes: 0, numerosProcesso: [] }; }
```

- [ ] **Step 4: Executar e confirmar que o teste passa**

```bash
node --test tests/redactor.test.mjs
```

Esperado: `✓ redigirCPF substitui todos os dígitos por asteriscos...`

- [ ] **Step 5: Commit**

```bash
git add js/redactor.js tests/redactor.test.mjs
git commit -m "feat: add js/redactor.js skeleton + TDD redigirCPF"
```

---

## Task 3: TDD — `redigirNumerico` e `redigirMascarar`

**Files:**
- Modify: `tests/redactor.test.mjs`
- Modify: `js/redactor.js`

- [ ] **Step 1: Adicionar testes que falham**

Adicionar ao final de `tests/redactor.test.mjs`:

```js
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
```

- [ ] **Step 2: Executar e confirmar 2 falhas**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 3: Implementar as funções em `js/redactor.js`**

Substituir os stubs:

```js
function redigirNumerico(label, num) {
  return label + '0'.repeat(num.length);
}

function redigirMascarar(original) {
  return '*'.repeat(original.length);
}
```

- [ ] **Step 4: Executar e confirmar 3 testes passando**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add tests/redactor.test.mjs js/redactor.js
git commit -m "feat: implement redigirNumerico and redigirMascarar"
```

---

## Task 4: TDD — `redigirNome`

**Files:**
- Modify: `tests/redactor.test.mjs`
- Modify: `js/redactor.js`

- [ ] **Step 1: Adicionar testes que falham**

```js
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
```

- [ ] **Step 2: Executar e confirmar 3 falhas**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 3: Implementar `redigirNome` em `js/redactor.js`**

```js
function redigirNome(original) {
  const conectivos = new Set(['de', 'da', 'das', 'do', 'dos']);
  const palavras = original.trim().split(/\s+/);
  const iniciais = palavras
    .filter(p => !conectivos.has(p.toLowerCase()))
    .map(p => p[0].toUpperCase() + '.')
    .join(' ');
  return iniciais.padEnd(original.length, ' ');
}
```

- [ ] **Step 4: Executar e confirmar 6 testes passando**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add tests/redactor.test.mjs js/redactor.js
git commit -m "feat: implement redigirNome with initials and byte-safe padding"
```

---

## Task 5: TDD — `mapearSubstitutos` padrões numéricos (CPF, OAB, CRM, RG, Telefone)

**Files:**
- Modify: `tests/redactor.test.mjs`
- Modify: `js/redactor.js`

- [ ] **Step 1: Adicionar testes que falham**

```js
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
```

- [ ] **Step 2: Executar e confirmar 5 falhas**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 3: Implementar `mapearSubstitutos` com padrões numéricos em `js/redactor.js`**

Adicionar o helper `_globalizar` e `_adicionarParUnico`, e substituir o stub de `mapearSubstitutos`:

```js
function _globalizar(pattern, flagsExtras) {
  const base = pattern.flags + 'g' + (flagsExtras || '');
  const flags = [...new Set(base.split(''))].join('');
  return new RegExp(pattern.source, flags);
}

function _adicionarParUnico(pares, original, substituto) {
  if (!original || !substituto) return;
  if (original.length !== substituto.length) return;
  if (pares.some(p => p.original === original)) return;
  pares.push({ original, substituto });
}

function mapearSubstitutos(texto) {
  const pares = [];

  const numerosProcesso = new Set(
    [...texto.matchAll(_globalizar(NUMERO_DE_PROCESSO_PATTERN))].map(m => m[0])
  );

  for (const m of texto.matchAll(_globalizar(CPF_PATTERN))) {
    if (!validarCPF(m[0]) || numerosProcesso.has(m[0])) continue;
    _adicionarParUnico(pares, m[0], redigirCPF(m[0]));
  }

  for (const m of texto.matchAll(_globalizar(OAB_PATTERN, 'i'))) {
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of texto.matchAll(_globalizar(CRM_PATTERN, 'i'))) {
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of texto.matchAll(_globalizar(IDENTIDADE_PATTERN, 'i'))) {
    const [full, num] = m;
    const label = full.slice(0, full.length - num.length);
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of texto.matchAll(_globalizar(TELEFONE_PATTERN))) {
    _adicionarParUnico(pares, m[0], m[0].replace(/\d/g, '0'));
  }

  return pares;
}
```

- [ ] **Step 4: Executar e confirmar 11 testes passando**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add tests/redactor.test.mjs js/redactor.js
git commit -m "feat: implement mapearSubstitutos with numeric patterns (CPF, OAB, CRM, RG, tel)"
```

---

## Task 6: TDD — `mapearSubstitutos` padrões textuais + proteção do processo + `contarAchados`

**Files:**
- Modify: `tests/redactor.test.mjs`
- Modify: `js/redactor.js`

- [ ] **Step 1: Adicionar testes que falham**

```js
test('mapearSubstitutos detecta email e mascara com asteriscos de mesmo comprimento', () => {
  const pares = api.mapearSubstitutos('Enviar para joao.silva@tjrj.jus.br urgente.');
  const par = pares.find(p => p.original.includes('@'));
  assert.ok(par, 'deve detectar email');
  assert.equal(par.substituto, '*'.repeat(par.original.length));
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos detecta nome com primeiro nome reconhecido e gera iniciais com padding', () => {
  const pares = api.mapearSubstitutos('A parte autora JOAO SILVA DOS SANTOS requer o seguinte.');
  const par = pares.find(p => p.original.includes('JOAO'));
  assert.ok(par, 'deve detectar nome iniciado por primeiro nome reconhecido');
  assert.equal(par.substituto.length, par.original.length, 'comprimento deve ser preservado');
  assert.ok(par.substituto.includes('J.'), 'deve conter inicial de JOAO');
  assert.ok(par.substituto.includes('S.'), 'deve conter inicial de SILVA');
});

test('mapearSubstitutos preserva numero do processo e nao o inclui como par', () => {
  const texto = 'Processo 0001234-56.2024.8.19.0001 e CPF 913.665.347-00.';
  const pares = api.mapearSubstitutos(texto);
  assert.equal(pares.find(p => p.original.includes('0001234')), undefined,
    'numero do processo nao deve aparecer como par de substituicao');
  assert.ok(pares.find(p => p.original === '913.665.347-00'),
    'CPF deve ser redatado mesmo com numero do processo presente');
});

test('contarAchados retorna contagens corretas por tipo', () => {
  const texto = 'Processo 0001234-56.2024.8.19.0001 CPF: 913.665.347-00 OAB/RJ 12345 JOAO SILVA DOS SANTOS';
  const achados = api.contarAchados(texto);
  assert.equal(achados.cpfs, 1);
  assert.equal(achados.oabs, 1);
  assert.equal(achados.numerosProcesso.length, 1);
  assert.equal(achados.numerosProcesso[0], '0001234-56.2024.8.19.0001');
});
```

- [ ] **Step 2: Executar e confirmar 4 falhas**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 3: Implementar `detectarNomesNoTexto`, completar `mapearSubstitutos` e `contarAchados` em `js/redactor.js`**

Adicionar `detectarNomesNoTexto` antes de `mapearSubstitutos`:

```js
function detectarNomesNoTexto(texto) {
  const conectivos = new Set(['de', 'da', 'das', 'do', 'dos']);
  const tokens = texto.match(/[A-ZÀ-ÿa-zà-ÿ]+|\s+|[^\wA-ZÀ-ÿ\s]+/g) || [];
  const nomes = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (!/^[A-ZÀ-Þ]/.test(tok) || !firstNameSet.has(tok.toLowerCase())) { i++; continue; }

    const seq = [tok];
    let j = i + 1;

    while (j < tokens.length) {
      const prox = tokens[j];
      if (/^\s+$/.test(prox)) { seq.push(prox); j++; continue; }
      if (conectivos.has(prox.toLowerCase()) ||
          /^[A-ZÀ-Þ][A-ZÀ-Þa-zà-ÿ]+$/.test(prox) ||
          /^[A-ZÀ-Þ]{2,}$/.test(prox)) {
        seq.push(prox); j++;
      } else { break; }
    }

    while (seq.length > 1) {
      const last = seq[seq.length - 1];
      if (/^\s+$/.test(last) || conectivos.has(last.toLowerCase())) seq.pop();
      else break;
    }

    const nome = seq.join('');
    const palavrasNome = nome.trim().split(/\s+/).filter(p => !conectivos.has(p.toLowerCase()));

    if (palavrasNome.length >= 2) { nomes.push(nome); i = j; }
    else { i++; }
  }

  return nomes;
}
```

Adicionar ao final de `mapearSubstitutos` (após o bloco de telefone, antes do `return pares`):

```js
  for (const m of texto.matchAll(_globalizar(EMAIL_PATTERN, 'i'))) {
    _adicionarParUnico(pares, m[0], redigirMascarar(m[0]));
  }

  for (const nome of detectarNomesNoTexto(texto)) {
    if (numerosProcesso.has(nome)) continue;
    _adicionarParUnico(pares, nome, redigirNome(nome));
  }
```

Substituir o stub de `contarAchados`:

```js
function contarAchados(texto) {
  const numerosProcesso = [...texto.matchAll(_globalizar(NUMERO_DE_PROCESSO_PATTERN))].map(m => m[0]);
  const cpfs = [...texto.matchAll(_globalizar(CPF_PATTERN))].filter(m => validarCPF(m[0])).length;
  const oabs = [...texto.matchAll(_globalizar(OAB_PATTERN, 'i'))].length;
  const crms = [...texto.matchAll(_globalizar(CRM_PATTERN, 'i'))].length;
  const nomes = detectarNomesNoTexto(texto).length;
  return { cpfs, oabs, crms, nomes, numerosProcesso };
}
```

- [ ] **Step 4: Executar e confirmar 15 testes passando**

```bash
node --test tests/redactor.test.mjs
```

- [ ] **Step 5: Executar suite completa para verificar regressoes**

```bash
node --test
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add tests/redactor.test.mjs js/redactor.js
git commit -m "feat: complete mapearSubstitutos with text patterns and contarAchados"
```

---

## Task 7: Estender `pdf-processor.js` — `processarDocumentoJudicial`

**Files:**
- Modify: `js/pdf-processor.js`
- Modify: `index.html`

- [ ] **Step 1: Verificar que `processarDocumentoJudicial` ainda nao existe**

```bash
grep -n "processarDocumentoJudicial" js/pdf-processor.js
```

Esperado: sem resultado.

- [ ] **Step 2: Adicionar `_extrairTextoCompleto` e `processarDocumentoJudicial` ao final de `js/pdf-processor.js`**

Adicionar após a funcao `coletarTextosDecodificadosViaBytes` (ultima funcao do arquivo):

```js
// ── MODO PROCESSO JUDICIAL ────────────────────────────────────────────────────

async function _extrairTextoCompleto(pdfBytes) {
  const copia = toUint8Array(pdfBytes).slice().buffer;
  const pdf = await pdfjsLib.getDocument({ data: copia }).promise;
  const textos = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textos.push(normalizarEspacos(content.items.map(item => item.str).join(' ')));
    }
  } finally {
    try { pdf.cleanup(); } catch {}
    try { await pdf.destroy(); } catch {}
  }

  return textos.join('\n');
}

async function processarDocumentoJudicial(pdfBytes) {
  const pdfBytesArr = toUint8Array(pdfBytes);
  const texto = await _extrairTextoCompleto(pdfBytesArr);
  const pares = mapearSubstitutos(texto);
  const achados = contarAchados(texto);

  if (!pares.length) {
    return { bytes: pdfBytesArr, ok: true, achados };
  }

  const specs = pares.map(({ original, substituto }, i) => ({
    id: `campo_${i}`,
    label: original.slice(0, 30),
    pairs: [[original, substituto]],
    verifyOriginals: [original]
  }));

  let bytesTrabalho = pdfBytesArr;
  const hits = {};

  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytesArr, {
    ignoreEncryption: true,
    updateMetadata: false
  });
  const mapasHex = extrairMapasHexPorFonte(pdfDoc);
  const specsHex = montarEspecificacoesHex(specs, mapasHex);

  let alterouStreams = false;
  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj.contents instanceof Uint8Array) || !obj.dict) continue;
    const result = _processarStream(obj, specs, specsHex);
    if (result.changed) alterouStreams = true;
    mergeHits(hits, result.hits);
  }

  if (alterouStreams) {
    bytesTrabalho = await pdfDoc.save({ useObjectStreams: false });
  }

  const specsPendentes = specs.filter(spec => !hits[spec.id]);
  if (!alterouStreams || specsPendentes.length > 0) {
    const specsHexPendentes = specsHex.filter(spec => !hits[spec.id]);
    const fallback = await _substituirViaBytesRaw(
      bytesTrabalho,
      alterouStreams ? specsPendentes : specs,
      alterouStreams ? specsHexPendentes : specsHex
    );
    bytesTrabalho = fallback.bytes;
    mergeHits(hits, fallback.hits);
  }

  return { bytes: bytesTrabalho, ok: true, achados };
}
```

> Nota: `mapearSubstitutos` e `contarAchados` sao globais no browser (via script tag) e injetados como deps nos testes (feito na Task 1).

- [ ] **Step 3: Adicionar `redactor.js` ao `index.html` antes de `pdf-processor.js`**

Localizar os `<script>` tags e adicionar:

```html
<script src="js/fake-data.js"></script>
<script src="js/redactor.js"></script>
<script src="js/pdf-processor.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 4: Executar toda a suite**

```bash
node --test
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add js/pdf-processor.js index.html
git commit -m "feat: add processarDocumentoJudicial to pdf-processor.js"
```

---

## Task 8: UI — modo, botao, `processarArquivoJudicial` e painel de achados

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`

- [ ] **Step 1: Adicionar o modo `'processo-judicial'` ao mapa `MODOS_DOCUMENTO` em `js/app.js`**

Adicionar ao objeto `MODOS_DOCUMENTO` (apos o objeto `'carta-concessao'`):

```js
'processo-judicial': {
  id: 'processo-judicial',
  prefixoArquivo: 'Processo',
  zipNome: 'Processos_anonimizados.zip',
  uploadTitulo: 'Arraste as pecas processuais aqui',
  uploadSub: 'ou <strong>clique para selecionar</strong> · peticoes, sentencas, acordaos · download automatico ao concluir',
  ariaLabel: 'Selecionar arquivos PDF de processos judiciais para anonimizar',
  botaoDownloadUm: 'Baixar novamente',
  botaoDownloadVarios: 'Baixar ZIP novamente'
}
```

- [ ] **Step 2: Adicionar `btnModoProcesso` e estado na UI em `js/app.js`**

Adicionar a variavel apos `btnModoCarta`:

```js
const btnModoProcesso = document.getElementById('btn-modo-processo');
```

Em `atualizarModoUI`, adicionar apos o bloco de `btnModoCarta`:

```js
  if (btnModoProcesso?.classList) {
    btnModoProcesso.classList.toggle('modo-ativo', modoAtual === 'processo-judicial');
    btnModoProcesso?.setAttribute('aria-pressed', String(modoAtual === 'processo-judicial'));
    btnModoProcesso?.setAttribute('aria-selected', String(modoAtual === 'processo-judicial'));
  }
```

Adicionar o listener (apos `btnModoCarta?.addEventListener`):

```js
btnModoProcesso?.addEventListener('click', () => trocarModo('processo-judicial'));
```

- [ ] **Step 3: Adicionar terceiro botao no `index.html`**

Localizar o `<div class="modo-selector">` e adicionar o terceiro botao:

```html
  <button type="button" class="modo-btn" id="btn-modo-processo" role="tab" aria-selected="false" aria-pressed="false">
    Processo Judicial
  </button>
```

- [ ] **Step 4: Adicionar `mostrarAchados` e `processarArquivoJudicial` em `js/app.js`**

Adicionar apos a funcao `mostrarSubs`:

```js
function mostrarAchados(item, achados) {
  const el = item.querySelector('.arquivo-subs');
  el.textContent = '';

  const resumo = document.createElement('div');
  resumo.className = 'subs-tabela';

  const partes = [];
  if (achados.cpfs) partes.push('CPFs: ' + achados.cpfs);
  if (achados.oabs) partes.push('OABs: ' + achados.oabs);
  if (achados.crms) partes.push('CRMs: ' + achados.crms);
  if (achados.nomes) partes.push('Nomes: ' + achados.nomes);

  const linha = document.createElement('div');
  linha.className = 'sub-linha';
  linha.style.gridTemplateColumns = '1fr';

  const textoEl = document.createElement('span');
  textoEl.className = 'sub-label';
  textoEl.textContent = partes.length
    ? 'Redatados — ' + partes.join(' · ')
    : 'Nenhum dado sensivel encontrado';
  linha.appendChild(textoEl);
  resumo.appendChild(linha);

  if (achados.numerosProcesso?.length) {
    const processoLinha = document.createElement('div');
    processoLinha.className = 'sub-linha';
    processoLinha.style.gridTemplateColumns = '1fr';

    const processoEl = document.createElement('span');
    processoEl.className = 'sub-original';
    processoEl.textContent = 'Processo preservado: ' + achados.numerosProcesso.join(', ');

    processoLinha.appendChild(processoEl);
    resumo.appendChild(processoLinha);
  }

  el.appendChild(resumo);
}

async function processarArquivoJudicial(file, item, indice, totalArquivos) {
  try {
    const pdfBytes = await file.arrayBuffer();
    setProgresso(item, 50);

    const resultado = await processarDocumentoJudicial(pdfBytes);
    setProgresso(item, 90);

    mostrarAchados(item, resultado.achados);
    setProgresso(item, 100, true);
    setStatus(item, 'ok', 'Anonimizado');

    resultados.push({
      nome: gerarNomeSaida(null, indice, totalArquivos, 'processo-judicial'),
      bytes: resultado.bytes
    });
  } catch (err) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Erro ao processar o PDF. Verifique se o arquivo e valido.');
    console.error('[Processo Judicial]', err);
  }
}
```

- [ ] **Step 5: Adicionar branch judicial em `processarArquivo`**

Em `processarArquivo`, imediatamente apos o bloco `if (!isPDF)`, adicionar:

```js
  if (modoLote === 'processo-judicial') {
    await processarArquivoJudicial(file, item, indice, totalArquivos);
    return;
  }
```

- [ ] **Step 6: Executar os testes**

```bash
node --test
```

Esperado: todos passam.

- [ ] **Step 7: Testar manualmente no browser**

```bash
npx serve . -p 3000
```

Abrir `http://localhost:3000`. Verificar:
- Tres botoes de modo visiveis e funcionando
- Upload de PDF no modo Processo Judicial mostra painel de achados
- Modos CNIS e Carta continuam funcionando

- [ ] **Step 8: Commit**

```bash
git add js/app.js index.html
git commit -m "feat: add Processo Judicial mode to UI with achados panel"
```

---

## Task 9: Fase 5 — Estrutura de testes de regressao

**Files:**
- Modify: `tests/helpers/browser-apis.mjs`
- Create: `tests/processo-judicial-regression.test.mjs`

- [ ] **Step 1: Criar o diretorio de fixtures**

```bash
mkdir -p tests/processo-judicial
```

- [ ] **Step 2: Adicionar helper de fixture ao `tests/helpers/browser-apis.mjs`**

Adicionar ao final do arquivo:

```js
const PROCESSO_JUDICIAL_FIXTURES_URL = new URL('processo-judicial/', new URL('../../tests/', ROOT_URL));

export const PROCESSO_JUDICIAL_FIXTURES = await (async () => {
  try {
    return (await fs.readdir(PROCESSO_JUDICIAL_FIXTURES_URL))
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
      .map(f => 'processo-judicial/' + f);
  } catch { return []; }
})();

export async function readProcessoJudicialFixture(filename) {
  const bytes = await fs.readFile(new URL('../../tests/' + filename, ROOT_URL));
  return new Uint8Array(bytes);
}
```

- [ ] **Step 3: Criar `tests/processo-judicial-regression.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadRedactorApi,
  loadPdfProcessorApi,
  PROCESSO_JUDICIAL_FIXTURES,
  readProcessoJudicialFixture
} from './helpers/browser-apis.mjs';

const redactorApi = await loadRedactorApi();
const pdfProcessorApi = await loadPdfProcessorApi(redactorApi);

if (!PROCESSO_JUDICIAL_FIXTURES.length) {
  console.log('[SKIP] Adicione PDFs em tests/processo-judicial/ para ativar os testes de regressao');
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

  test(fixture + ': numero do processo esta nos achados (se existir)', async () => {
    const bytes = await readProcessoJudicialFixture(fixture);
    const resultado = await pdfProcessorApi.processarDocumentoJudicial(bytes);
    assert.ok(Array.isArray(resultado.achados.numerosProcesso));
    assert.ok(typeof resultado.achados.cpfs === 'number');
    assert.ok(typeof resultado.achados.oabs === 'number');
  });
}
```

- [ ] **Step 4: Executar (deve rodar sem erros mesmo sem fixtures)**

```bash
node --test tests/processo-judicial-regression.test.mjs
```

Esperado: log `[SKIP] Adicione PDFs...` e nenhum erro.

- [ ] **Step 5: Executar suite completa**

```bash
node --test
```

Esperado: todos os testes passam.

- [ ] **Step 6: Instrucao para Fase 4 (CMaps de tribunais)**

Quando houver PDFs reais em `tests/processo-judicial/`:
1. Rodar `node --test tests/processo-judicial-regression.test.mjs`
2. Abrir os PDFs de saida visualmente
3. Se texto nao for substituido (provavelmente fonte subset): inspecionar com `grep -a "ToUnicode" <arquivo.pdf>` para identificar o CMap
4. Ajustar o parser em `parseToUnicodeCMap` em `js/pdf-processor.js`

- [ ] **Step 7: Commit final**

```bash
git add tests/processo-judicial-regression.test.mjs tests/helpers/browser-apis.mjs
git commit -m "feat: add regression test structure for Processo Judicial mode (Fase 5)"
```

---

## Checklist Final de Verificacao

- [ ] `node --test` passa sem erros
- [ ] Tres botoes de modo visiveis no browser
- [ ] Upload de PDF no modo Processo Judicial mostra painel de achados
- [ ] CPF valido num PDF de processo aparece redatado no output
- [ ] Numero do processo e preservado intacto
- [ ] Modos CNIS e Carta de Concessao continuam funcionando sem regressao
