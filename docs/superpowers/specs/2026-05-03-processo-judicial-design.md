# Design: Modo Processo Judicial Genérico

**Data:** 2026-05-03
**Status:** Aprovado

---

## Objetivo

Adicionar um terceiro modo de anonimização — **Processo Judicial Genérico** — ao anonimiza-CNIS. Diferente dos modos CNIS e Carta de Concessão (que substituem dados por dados fictícios convincentes), o modo Processo Judicial **redige** os dados sensíveis com placeholders de mesmo comprimento de bytes, seguindo o padrão do repositório APOIA.

O número do processo (formato `0000000-00.0000.0.00.0000`) é **preservado** — a peça continua identificável, apenas os dados pessoais das partes são redatados.

---

## Arquitetura

### Princípio central

A substituição binária existente (pako decompress → busca hex → replace → compress) é **reutilizada sem alteração**. O que muda é a origem e o conteúdo da lista de pares `{original, substituto}`:

- **Modos CNIS / Carta:** lista vem de extração de campos rotulados (`Nome:`, `CPF:`) → substitutos são dados fictícios gerados por `fake-data.js`
- **Modo Processo Judicial:** lista vem de varredura global de padrões em todos os streams → substitutos são placeholders de mesmo comprimento gerados por `redactor.js`

### Constraint crítica: byte-safety

Todo substituto deve ter **exatamente o mesmo número de bytes** que o original (encoding Latin-1: 1 char = 1 byte). Estratégias por tipo:

| Campo | Original (exemplo) | Substituto | Estratégia |
|---|---|---|---|
| CPF | `123.456.789-09` (14) | `***.***.***-**` (14) | máscara de asteriscos mesma estrutura |
| OAB | `OAB/RJ 12345` | `OAB/RJ 00000` | label preservado, número → zeros |
| CRM | `CRM/RJ 1234` | `CRM/RJ 0000` | label preservado, número → zeros |
| RG | `12.345.678-9` | `00.000.000-0` | zeros, separadores preservados |
| Telefone | `(21) 99999-8888` | `(00) 00000-0000` | zeros, separadores preservados |
| E-mail | `joao@tjrj.jus.br` | `****************` | asteriscos × comprimento |
| Endereço | `RUA DAS FLORES 10` | `******************` | asteriscos × comprimento |
| Nome | `ROSALINA FERREIRA DA SILVA` (26) | `R. F. S.` + 18 espaços (26) | iniciais + padding 0x20 |

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `js/redactor.js` | **Novo.** Padrões APOIA + funções de redação byte-safe |
| `js/pdf-processor.js` | **Estendido.** Bifurcação por modo, nova função `extrairCamposProcessoJudicial()` |
| `js/app.js` | **Estendido.** Novo modo `'processo-judicial'` em `MODOS_DOCUMENTO` |
| `index.html` | **Estendido.** Terceiro botão no seletor de modo |
| `assets/common-first-names.json` | **Novo.** Dicionário de primeiros nomes BR (portado do APOIA) |

---

## Fase 1 — `js/redactor.js`

### Padrões (portados do APOIA)

```js
NUMERO_DE_PROCESSO_PATTERN  // /\b\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}\b/
CPF_PATTERN                 // com validação de checksum
OAB_LABEL_NUMBER_PATTERN    // dois grupos: (label)(número)
CRM_PATTERN                 // dois grupos: (label)(número)
IDENTIDADE_PATTERN          // RG — captura só o número
TELEFONE_FIXO_PATTERN
TELEFONE_MOVEL_PATTERN
EMAIL_PATTERN
ENDERECO_PATTERN
```

### Funções de redação

```js
function redigirCPF(original)           // → '***.***.***-**' mesmo comprimento
function redigirNumerico(label, num)    // → label + '0'.repeat(num.length)
function redigirMascarar(original)      // → '*'.repeat(original.length)
function redigirNome(original)          // → iniciais + ' '.repeat(padding)
function mapearSubstitutos(texto)       // → [{original, substituto}, ...]
```

### Detecção de nomes

Usa `common-first-names.json` (carregado via `fetch()` na inicialização) para identificar sequências de palavras que começam com um primeiro nome reconhecido. Cada nome próprio é convertido em iniciais (`JOAO SILVA` → `J. S.`) e o resultado é padded com espaços até o comprimento original.

### Proteção do número do processo

Antes de qualquer detecção, os matches de `NUMERO_DE_PROCESSO_PATTERN` são coletados num `Set` de valores protegidos. Qualquer par `{original}` que coincida é descartado da lista final de substituições.

### API pública

```js
// Inicialização assíncrona (carrega dicionário de nomes)
async function inicializar()

// Recebe texto extraído de uma página, retorna pares de substituição
function mapearSubstitutos(texto)
// → [{ original: String, substituto: String }, ...]
```

---

## Fase 2 — Extração global em `pdf-processor.js`

Nova função que substitui a extração baseada em rótulos para o modo judicial:

```js
async function extrairCamposProcessoJudicial(pdfDoc)
```

**Algoritmo:**
1. Itera por todas as páginas do documento
2. Para cada página, coleta itens de texto via pdfjs (reutiliza `agruparLinhasPorCoordenada`)
3. Concatena o texto de todas as linhas em texto corrido por página
4. Chama `redactor.mapearSubstitutos(texto)` para cada página
5. Deduplica por `original` (um mesmo CPF pode aparecer em múltiplas páginas)
6. Retorna lista plana de pares `{original, substituto}`

---

## Fase 3 — Substituição binária

### Bifurcação em `processarPDF()`

```js
async function processarPDF(arrayBuffer, modo) {
  // ...inicialização pdfjs e pdf-lib...

  const pares = modo === 'processo-judicial'
    ? await extrairCamposProcessoJudicial(pdfDoc)
    : await extrairCamposModoCnis(pdfDoc, modo);

  // pipeline binário compartilhado: hex lookup → replace → recompress
}
```

O restante do pipeline (busca hex nos streams, substituição byte-a-byte, recompressão com pako) é **idêntico** para todos os modos.

---

## Fase 4 — Ajuste fino de CMaps/Fontes

Não é uma mudança de código nova — é um ciclo de diagnóstico:

1. Coletar 3–5 PDFs reais de tribunais distintos (TRF, TJRJ, Eproc, PJe)
2. Rodar o processador e inspecionar o PDF de saída
3. Identificar fontes subset (`ABCDEF+Arial`) com CMaps `ToUnicode` não tratados
4. Aplicar micro-ajustes pontuais no parser de CMap existente em `pdf-processor.js`

O mecanismo de CMap já foi implementado no commit `7a4126e` para CNIS — a Fase 4 é extensão desse trabalho para novos encodings de tribunais.

---

## Fase 5 — Testes de regressão

Localização: `tests/processo-judicial/`

**Casos de teste mínimos:**

| Caso | Verificação |
|---|---|
| CPF detectado e redatado | Saída contém `***.***.***-**`, não o CPF original |
| OAB detectada, label preservado | `OAB/RJ 00000`, não `OAB/RJ 12345` |
| Número do processo preservado | Número original intacto no PDF de saída |
| Nome redatado com iniciais + padding | Comprimento do trecho no stream é idêntico |
| PDF de saída abre sem erro | pdfjs consegue parsear o arquivo gerado |
| Layout não quebra | Inspeção visual do PDF de saída |

---

## UI — Seletor de Modo e Painel de Achados

### `index.html`

Terceiro botão adicionado ao `modo-selector`:

```html
<button type="button" class="modo-btn" id="btn-modo-processo" role="tab"
        aria-selected="false" aria-pressed="false">
  Processo Judicial
</button>
```

### `js/app.js`

Novo modo em `MODOS_DOCUMENTO`:

```js
'processo-judicial': {
  id: 'processo-judicial',
  prefixoArquivo: 'Processo',
  zipNome: 'Processos_anonimizados.zip',
  uploadTitulo: 'Arraste as peças processuais aqui',
  uploadSub: 'ou <strong>clique para selecionar</strong> · petições, sentenças, acórdãos · download automático ao concluir',
  ariaLabel: 'Selecionar arquivos PDF de processos judiciais para anonimizar',
  botaoDownloadUm: 'Baixar novamente',
  botaoDownloadVarios: 'Baixar ZIP novamente'
}
```

### Painel de Achados

Após o processamento de cada arquivo, exibir um resumo na `lista-arquivos`:

```
✓ Processo_anonimizado.pdf
  CPFs redatados: 3 · OABs: 2 · CRMs: 1 · Nomes: 7
  Processos preservados: 0001234-56.2024.8.19.0001, 0009876-11.2023.8.19.0002
```

Implementado como um elemento HTML gerado dinamicamente por `app.js` ao receber o resultado do `pdf-processor.js`. O processador retorna um objeto `{ pdf, achados: { cpfs, oabs, crms, nomes, numerosProcesso: [] } }`. O campo `numerosProcesso` é um array pois um PDF pode conter referências a múltiplos processos.

---

## Fora de Escopo

- Anonimização de imagens escaneadas dentro do PDF (OCR)
- Detecção de assinaturas digitais (a assinatura será invalidada após modificação binária — comportamento esperado e desejável)
- Configuração granular por tipo de campo na UI (ex: checkbox "redigir e-mails")
- Suporte a PDFs protegidos por senha
