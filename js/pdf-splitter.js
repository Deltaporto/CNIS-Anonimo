// Separador de peças de processo eProc — 100% no browser, sem import/export

// ── Variáveis de módulo ───────────────────────────────────────────────────────

let _ocrWorker = null;
let _tesseractLoadPromise = null;
let _tesseractLoadFailed = false;

const OCR_RENDER_TARGET_SCALE = 1.35;
const OCR_RENDER_MAX_PIXELS = 1_800_000;

// ── Funções internas ──────────────────────────────────────────────────────────

function flattenOutline(items) {
  const result = [];
  function visit(list) {
    for (const item of list) {
      result.push(item);
      if (item.items && item.items.length > 0) {
        visit(item.items);
      }
    }
  }
  visit(items || []);
  return result;
}

function isEprocEventTitle(title) {
  if (!title) return false;
  const normalized = title.trim();
  if (/^capa(?:\b|$)/i.test(normalized)) return true;
  return /^evento(?:\.|\s+)\s*\d+/i.test(normalized);
}

async function resolveOutlinePageIndex(pdfDoc, item) {
  try {
    let dest = item.dest;

    if (!dest) {
      throw new Error('item.dest é null/undefined');
    }

    if (typeof dest === 'string') {
      dest = await pdfDoc.getDestination(dest);
    }

    if (!Array.isArray(dest) || dest.length === 0) {
      throw new Error('Destino inválido: ' + JSON.stringify(dest));
    }

    return await pdfDoc.getPageIndex(dest[0]);
  } catch (err) {
    console.warn('[pdf-splitter] resolveOutlinePageIndex falhou para "' + item.title + '":', err.message);
    return null;
  }
}

function sanitizeFilename(title) {
  if (!title) return 'evento_sem_nome';

  // Normalizar caracteres acentuados para ASCII equivalente
  let result = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remover espaços após ponto (ex: "Evento. 1" → "Evento.1")
  result = result.replace(/\.\s+/g, '.');

  // Substituir chars fora de [a-zA-Z0-9_.-] por _
  result = result.replace(/[^a-zA-Z0-9_.\-]/g, '_');

  // Colapsar múltiplos _ consecutivos
  result = result.replace(/_+/g, '_');

  // Remover _ no início e no fim
  result = result.replace(/^_+|_+$/g, '');

  // Limitar a 200 caracteres
  if (result.length > 200) result = result.slice(0, 200);

  return result || 'evento_sem_nome';
}

function buildDocumentTitle(filename) {
  if (!filename) return 'Documento';
  return filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Documento';
}

function buildSingleDocumentEvent(filename, totalPages) {
  const docTitle = buildDocumentTitle(filename);
  return {
    title: docTitle,
    filename: sanitizeFilename(docTitle) + '.md',
    startPageIndex: 0,
    endPageIndexExclusive: totalPages,
    startPageLabel: 1,
    endPageLabel: totalPages,
    pageCount: totalPages,
    ocr: false
  };
}

function normalizarTextoPagina(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

async function extractAllPageTexts(pdfDoc, totalPages, onProgress = () => {}) {
  const texts = [];

  for (let i = 0; i < totalPages; i++) {
    const page = await pdfDoc.getPage(i + 1);
    texts[i] = await extractPageText(page);

    if (i === 0 || i === totalPages - 1 || (i + 1) % 10 === 0) {
      onProgress({
        type: 'scan',
        message: `Lendo índice e separadores (${i + 1}/${totalPages})...`,
        percent: Math.round(2 + ((i + 1) / totalPages) * 3)
      });
    }
  }

  return texts;
}

function stripSeparatorTitleNoise(title) {
  return normalizarTextoPagina(title)
    .replace(/^Procurador citado\/intimado:\s*Prazo:\s*Data inicial da contagem do prazo:\s*Data final:\s*/i, '')
    .replace(/^Usuário\.?:\s*Processo:\s*Sequência Evento:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEventSeparatorFromText(text, pageIndex) {
  const normalized = normalizarTextoPagina(text);
  if (!normalized.includes('PÁGINA DE SEPARAÇÃO')) return null;
  if (!/Sequência Evento:/i.test(normalized)) return null;
  if (/\bTipo documento:\b/i.test(normalized) || /\bDocumento\s+\d+\b/i.test(normalized)) return null;

  const sequenceMatches = [...normalized.matchAll(/\bEvento\s+(\d+)\b/gi)];
  const lastSequence = sequenceMatches[sequenceMatches.length - 1];
  if (!lastSequence) return null;

  const titleMatch = normalized.match(/\bSequência Evento:\s*(.+?)\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/i);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const eventNumber = lastSequence[1];
  const title = stripSeparatorTitleNoise(rawTitle) || `Evento ${eventNumber}`;

  return {
    title: `Evento. ${eventNumber} - ${title}`,
    pageIndex,
    source: 'separator'
  };
}

function buildEventSeparatorsFromPageTexts(pageTexts) {
  const separators = [];

  for (let i = 0; i < pageTexts.length; i++) {
    const separator = parseEventSeparatorFromText(pageTexts[i], i);
    if (separator) separators.push(separator);
  }

  return separators;
}

function buildEventRanges(outlineItems, totalPages) {
  // Filtrar itens sem pageIndex
  const valid = outlineItems.filter(item => item.pageIndex !== null && item.pageIndex !== undefined);

  // Ordenar por pageIndex
  valid.sort((a, b) => a.pageIndex - b.pageIndex);

  // Remover duplicatas de pageIndex (manter o primeiro)
  const deduped = [];
  const seenPages = new Set();
  for (const item of valid) {
    if (!seenPages.has(item.pageIndex)) {
      seenPages.add(item.pageIndex);
      deduped.push(item);
    }
  }

  return deduped.map((item, i) => {
    const startPageIndex = item.pageIndex;
    const endPageIndexExclusive = i + 1 < deduped.length ? deduped[i + 1].pageIndex : totalPages;
    const startPageLabel = startPageIndex + 1;
    const endPageLabel = endPageIndexExclusive; // one-based inclusive = exclusive - 1 + 1 = exclusive
    const pageCount = endPageIndexExclusive - startPageIndex;
    const filename = sanitizeFilename(item.title) + '.md';

    return {
      title: item.title,
      filename,
      startPageIndex,
      endPageIndexExclusive,
      startPageLabel,
      endPageLabel,
      pageCount,
      ocr: false
    };
  });
}

async function extractPageText(page) {
  const content = await page.getTextContent();
  if (!content.items.length) return '';

  const lines = [];
  let currentLine = '';
  let lastY = null;

  for (const item of content.items) {
    if (!item.str) continue;
    const y = item.transform[5];
    const newLine = item.hasEOL || (lastY !== null && Math.abs(y - lastY) > 8);
    if (newLine) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = item.str;
    } else {
      const sep = currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '';
      currentLine += sep + item.str;
    }
    lastY = y;
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines.join('\n');
}

function pageNeedsOcr(text) {
  const normalized = normalizarTextoPagina(text);
  if (!normalized) return true;
  if (normalized.includes('PÁGINA DE SEPARAÇÃO')) return false;

  const substantive = normalized
    .replace(/Processo\s+\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4},?\s*/gi, ' ')
    .replace(/Evento\s+\d+,?\s*/gi, ' ')
    .replace(/[A-Z0-9]{4,}\d{1,3},?\s*/g, ' ')
    .replace(/Página\s+\d+(?:\s+de\s+\d+)?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return substantive.length < 50;
}

function calculateOcrRenderScale(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  const basePixels = baseViewport.width * baseViewport.height;
  if (!Number.isFinite(basePixels) || basePixels <= 0) {
    return OCR_RENDER_TARGET_SCALE;
  }

  const maxScale = Math.sqrt(OCR_RENDER_MAX_PIXELS / basePixels);
  return Math.max(1, Math.min(OCR_RENDER_TARGET_SCALE, maxScale));
}

async function renderPageToCanvas(page) {
  const viewport = page.getViewport({ scale: calculateOcrRenderScale(page) });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext('2d');
  const renderTask = page.render({ canvasContext, viewport });
  await renderTask.promise;
  return canvas;
}

async function ensureTesseractLoaded(onProgress = () => {}) {
  if (typeof window !== 'undefined' && window.Tesseract) return true;
  if (_tesseractLoadFailed) return false;

  if (typeof document === 'undefined' || !document.createElement) {
    onProgress({
      type: 'warn',
      message: 'OCR indisponível neste ambiente.'
    });
    _tesseractLoadFailed = true;
    return false;
  }

  try {
    if (!_tesseractLoadPromise) {
      _tesseractLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        script.integrity = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
        document.head.appendChild(script);
      });
    }

    await _tesseractLoadPromise;
    return typeof window !== 'undefined' && !!window.Tesseract;
  } catch (err) {
    _tesseractLoadFailed = true;
    onProgress({
      type: 'warn',
      message: 'OCR indisponível: não foi possível carregar Tesseract.js (' + err.message + ')'
    });
    return false;
  }
}

async function initOcrWorker() {
  if (_ocrWorker) return _ocrWorker;

  const tesseract = typeof Tesseract !== 'undefined'
    ? Tesseract
    : (typeof window !== 'undefined' ? window.Tesseract : null);

  if (!tesseract) {
    throw new Error('Tesseract.js não está carregado');
  }

  _ocrWorker = await tesseract.createWorker('por', 1, {
    logger: () => {}
  });
  return _ocrWorker;
}

async function ocrFromCanvas(canvas) {
  try {
    const worker = await initOcrWorker();
    const result = await worker.recognize(canvas);
    return result.data.text;
  } catch (err) {
    console.warn('[pdf-splitter] ocrFromCanvas falhou:', err.message);
    return '';
  }
}

function formatCnjDigits(digits) {
  return `${digits.slice(0,7)}-${digits.slice(7,9)}.${digits.slice(9,13)}.${digits.slice(13,14)}.${digits.slice(14,16)}.${digits.slice(16,20)}`;
}

function extractProcessNumberFromText(value) {
  if (!value) return null;
  const text = String(value);

  const cnj = text.match(/(?:^|\D)(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})(?!\d)/);
  if (cnj) return cnj[1];

  const legacy = text.match(/(?:^|\D)(\d{20})(?!\d)/);
  if (legacy) return formatCnjDigits(legacy[1]);

  return null;
}

function inferProcessNumber(...sources) {
  const queue = [...sources];

  while (queue.length) {
    const source = queue.shift();
    if (!source) continue;

    if (Array.isArray(source)) {
      queue.push(...source);
      continue;
    }

    if (typeof source === 'object') {
      if (source.title) queue.push(source.title);
      if (source.filename) queue.push(source.filename);
      if (source.pageTexts) queue.push(source.pageTexts);
      if (source.evento) queue.push(source.evento);
      continue;
    }

    const processNumber = extractProcessNumberFromText(source);
    if (processNumber) return processNumber;
  }

  return 'Processo';
}

function escapeMarkdownLinkText(text) {
  return String(text || '').replace(/([\\\[\]])/g, '\\$1');
}

function buildPageTextFallback(evento, index) {
  return `[Texto não extraído da página ${evento.startPageLabel + index}.]`;
}

function normalizeMissingTextMode(value) {
  return value === 'omit' ? 'omit' : 'placeholder';
}

function getMarkdownRedactor() {
  const mapper = typeof mapearSubstitutos === 'function' ? mapearSubstitutos : null;
  const counter = typeof contarAchados === 'function' ? contarAchados : null;
  if (!mapper || !counter) return null;
  return { mapearSubstitutos: mapper, contarAchados: counter };
}

function aplicarParesNoTexto(text, pares) {
  if (!text || !pares || pares.length === 0) return text;
  const ordered = [...pares].sort((a, b) => b.original.length - a.original.length);
  let result = text;
  for (const { original, substituto } of ordered) {
    if (!original || substituto === undefined) continue;
    result = result.split(original).join(substituto);
  }
  return result;
}

function buildUniqueEventFilenames(eventos) {
  const seen = new Map();

  for (const evento of eventos) {
    const base = sanitizeFilename(evento.title).replace(/\.md$/i, '') || 'evento_sem_nome';
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    evento.filename = count === 0 ? `${base}.md` : `${base}_${count + 1}.md`;
  }
}

function contarAchadosSensiveis(achados = {}) {
  return (achados.cpfs || 0) +
    (achados.nits || 0) +
    (achados.oabs || 0) +
    (achados.crms || 0) +
    (achados.nomes || 0) +
    (achados.enderecos || 0) +
    (achados.identificadores || 0);
}

function formatarLinhaAchado(label, value) {
  return `- ${label}: ${Number(value) || 0}`;
}

function buildRedactionReport(processNumber, eventos, summary) {
  const achados = summary.achadosAntes || {};
  const residuais = summary.achadosDepois || {};
  const lines = [
    '# Relatório de anonimização',
    '',
    `- Modo: Markdown anonimizado`,
    `- Processo: ${processNumber && processNumber !== 'Processo' ? processNumber : 'não identificado'}`,
    `- Peças extraídas: ${eventos.length}`,
    `- OCR: ${summary.ocrEnabled === false ? 'desligado' : 'ligado'}`,
    `- Páginas com OCR: ${summary.ocrCount || 0}`,
    `- Páginas sem texto extraído: ${summary.ocrFailCount || 0}`,
    `- Páginas sem OCR por opção do usuário: ${summary.ocrSkippedCount || 0}`,
    `- Páginas omitidas do Markdown: ${summary.omittedPageCount || 0}`,
    `- Substituições textuais mapeadas: ${summary.replacementCount || 0}`,
    `- Resíduos sensíveis detectáveis após anonimização: ${summary.residualSensitiveCount || 0}`,
    '',
    '## Achados antes da anonimização',
    '',
    formatarLinhaAchado('CPFs', achados.cpfs),
    formatarLinhaAchado('NITs/NIS/PIS', achados.nits),
    formatarLinhaAchado('OABs', achados.oabs),
    formatarLinhaAchado('CRMs', achados.crms),
    formatarLinhaAchado('Nomes', achados.nomes),
    formatarLinhaAchado('Endereços', achados.enderecos),
    formatarLinhaAchado('Identificadores longos', achados.identificadores),
    '',
    '## Conferência após anonimização',
    '',
    formatarLinhaAchado('CPFs', residuais.cpfs),
    formatarLinhaAchado('NITs/NIS/PIS', residuais.nits),
    formatarLinhaAchado('OABs', residuais.oabs),
    formatarLinhaAchado('CRMs', residuais.crms),
    formatarLinhaAchado('Nomes', residuais.nomes),
    formatarLinhaAchado('Endereços', residuais.enderecos),
    formatarLinhaAchado('Identificadores longos', residuais.identificadores),
    '',
    '## Observação',
    '',
    'O número do processo é preservado para conferência. Revise o material antes de compartilhar: OCR ruim, imagens e dados fora de padrão podem escapar da anonimização automática.',
    ''
  ];
  return lines.join('\n');
}

function anonimizarMarkdownExtraido(pagesData, eventos, options = {}) {
  if (!options.anonymizeMarkdown) {
    return {
      mode: 'texto_fiel',
      enabled: false,
      replacementCount: 0,
      achadosAntes: null,
      achadosDepois: null,
      residualSensitiveCount: null
    };
  }

  const redactor = getMarkdownRedactor();
  if (!redactor) {
    throw new Error('Anonimizador de Markdown indisponível. Recarregue a página e tente novamente.');
  }

  const originalText = pagesData
    .flatMap(({ pageTexts }) => pageTexts.filter(text => text !== null))
    .join('\n');
  const pares = redactor.mapearSubstitutos(originalText);
  const achadosAntes = redactor.contarAchados(originalText);

  for (const item of pagesData) {
    item.pageTexts = item.pageTexts.map(text => text === null ? null : aplicarParesNoTexto(text, pares));
  }

  for (const evento of eventos) {
    const redactedTitle = aplicarParesNoTexto(evento.title, pares).replace(/\s{2,}/g, ' ').trim();
    if (redactedTitle) evento.title = redactedTitle;
  }
  buildUniqueEventFilenames(eventos);

  const redactedText = pagesData
    .flatMap(({ pageTexts }) => pageTexts.filter(text => text !== null))
    .join('\n');
  const achadosDepois = redactor.contarAchados(redactedText);

  return {
    mode: 'anonimizado',
    enabled: true,
    replacementCount: pares.length,
    achadosAntes,
    achadosDepois,
    residualSensitiveCount: contarAchadosSensiveis(achadosDepois)
  };
}

function buildMarkdownForEvent(evento, pageTexts) {
  const header = `# ${evento.title}\n\n<!-- páginas ${evento.startPageLabel}-${evento.endPageLabel} do PDF original -->\n\n`;
  const blocks = pageTexts
    .map((text, index) => {
      if (text === null) return null;
      return text && text.trim() ? text : buildPageTextFallback(evento, index);
    })
    .filter(text => text !== null);
  const body = blocks.length
    ? blocks.join('\n\n---\n\n')
    : '[Todas as páginas sem texto extraível foram omitidas.]';
  return header + body + '\n\n---\n';
}

function buildIndexMarkdown(processNumber, eventos) {
  const title = processNumber && processNumber !== 'Processo'
    ? `# Índice do Processo ${processNumber}`
    : '# Índice das Peças Extraídas';
  const lines = [title, ''];

  for (const evento of eventos) {
    const ocrMark = evento.ocr ? ' *(OCR)*' : '';
    const pages = evento.pageCount === 1
      ? `p. ${evento.startPageLabel}`
      : `pp. ${evento.startPageLabel}-${evento.endPageLabel}`;
    lines.push(`- [${escapeMarkdownLinkText(evento.title)}](eventos/${evento.filename})${ocrMark} — ${pages}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function buildZip(processNumber, eventos, pagesData, redactionSummary = null) {
  const zip = new JSZip();

  // Gerar markdowns de cada evento
  const markdowns = pagesData.map(({ evento, pageTexts }) =>
    buildMarkdownForEvent(evento, pageTexts)
  );

  // indice.md
  zip.file('indice.md', buildIndexMarkdown(processNumber, eventos));

  if (redactionSummary?.enabled) {
    zip.file('relatorio_anonimizacao.md', buildRedactionReport(processNumber, eventos, redactionSummary));
  }

  // integral.md
  zip.file('integral.md', markdowns.join('\n'));

  // eventos/
  for (let i = 0; i < eventos.length; i++) {
    zip.file('eventos/' + eventos[i].filename, markdowns[i]);
  }

  return zip.generateAsync({ type: 'uint8array' });
}

// ── Função principal ──────────────────────────────────────────────────────────

async function splitEprocPdf(arrayBuffer, onProgress = () => {}, filename = '', options = {}) {
  // 1. Carregar PDF
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pageTextCache = await extractAllPageTexts(pdfDoc, totalPages, onProgress);

  // 2. Tentar ler índice do Eproc; fallback para documento único se não houver
  const outline = await pdfDoc.getOutline();
  const allItems = outline ? flattenOutline(outline) : [];
  const eprocItems = allItems.filter(item => isEprocEventTitle(item.title));
  const separatorItems = buildEventSeparatorsFromPageTexts(pageTextCache);

  let eventos;

  if (eprocItems.length > 0 || separatorItems.length > 0) {
    // Caminho normal: íntegra do Eproc com índice de eventos
    const itemsWithPage = await Promise.all(
      eprocItems.map(async item => ({
        title: item.title,
        pageIndex: await resolveOutlinePageIndex(pdfDoc, item)
      }))
    );
    eventos = buildEventRanges([...itemsWithPage, ...separatorItems], totalPages);
    if (eventos.length > 0) {
      onProgress({
        type: 'outline',
        message: `${eventos.length} eventos identificados no índice do processo`,
        percent: 5,
        eventTotal: eventos.length
      });
    } else {
      eventos = [buildSingleDocumentEvent(filename, totalPages)];
      onProgress({
        type: 'warning',
        message: 'O índice foi encontrado, mas não foi possível resolver as páginas. Extraindo o texto completo do documento...',
        percent: 5,
        eventTotal: 1
      });
    }
  } else {
    // Fallback: qualquer PDF sem índice Eproc → documento único
    eventos = [buildSingleDocumentEvent(filename, totalPages)];
    onProgress({
      type: 'warning',
      message: 'Nenhum índice de eventos encontrado. Extraindo o texto completo do documento...',
      percent: 5,
      eventTotal: 1
    });
  }

  const pagesData = [];
  let ocrCount = 0;
  let ocrFailCount = 0;
  let ocrSkippedCount = 0;
  let omittedPageCount = 0;
  const enableOcr = options.enableOcr !== false;
  const missingTextMode = normalizeMissingTextMode(options.missingTextMode);
  const totalEventPages = eventos.reduce((sum, ev) => sum + ev.pageCount, 0);
  let processedPages = 0;

  // 8. Processar cada evento
  for (let evIdx = 0; evIdx < eventos.length; evIdx++) {
    const evento = eventos[evIdx];

    onProgress({
      type: 'event',
      message: `Processando: ${evento.title}`,
      percent: Math.round(5 + (processedPages / totalEventPages) * 85),
      eventIndex: evIdx,
      eventTotal: eventos.length
    });

    const pageTexts = [];
    const ocrFlags = [];

    for (let pi = evento.startPageIndex; pi < evento.endPageIndexExclusive; pi++) {
      const page = await pdfDoc.getPage(pi + 1); // pdfjs usa 1-based
      const text = pageTextCache[pi] !== undefined ? pageTextCache[pi] : await extractPageText(page);

      if (pageNeedsOcr(text)) {
        if (!enableOcr) {
          onProgress({
            type: 'warning',
            message: `Página ${pi + 1} sem texto extraível; OCR desligado`,
            percent: Math.round(5 + (processedPages / totalEventPages) * 85)
          });
          if (missingTextMode === 'omit') {
            pageTexts.push(null);
            omittedPageCount++;
          } else {
            pageTexts.push('');
          }
          ocrFlags.push(false);
          ocrSkippedCount++;
          processedPages++;
          continue;
        }

        const loaded = await ensureTesseractLoaded(onProgress);

        if (loaded) {
          onProgress({
            type: 'ocr',
            message: `OCR na página ${pi + 1}...`,
            percent: Math.round(5 + (processedPages / totalEventPages) * 85),
            pageIndex: pi,
            pageTotal: totalPages
          });

          const canvas = await renderPageToCanvas(page);
          const ocrText = await ocrFromCanvas(canvas);
          // Liberar memória do canvas
          canvas.width = 0;
          canvas.height = 0;
          if (ocrText.trim()) {
            pageTexts.push(ocrText);
            ocrFlags.push(true);
            ocrCount++;
          } else {
            pageTexts.push('');
            ocrFlags.push(false);
            ocrFailCount++;
          }
        } else {
          onProgress({
            type: 'warning',
            message: `Não foi possível preparar o leitor de imagens (página ${pi + 1} ignorada)`,
            percent: Math.round(5 + (processedPages / totalEventPages) * 85)
          });
          pageTexts.push('');
          ocrFlags.push(false);
          ocrFailCount++;
        }
      } else {
        onProgress({
          type: 'page',
          message: `Página ${pi + 1} de ${totalPages}`,
          percent: Math.round(5 + (processedPages / totalEventPages) * 85),
          pageIndex: pi,
          pageTotal: totalPages
        });
        pageTexts.push(text);
        ocrFlags.push(false);
      }

      processedPages++;
    }

    // Marcar evento como OCR se qualquer página usou OCR
    evento.ocr = ocrFlags.some(Boolean);
    pagesData.push({ evento, pageTexts, ocr: ocrFlags });
  }

  // 9. Empacotar ZIP
  onProgress({
    type: 'zip',
    message: 'Empacotando...',
    percent: 92
  });

  // Inferir número do processo a partir do nome do arquivo, índice e texto extraído.
  const processNumber = inferProcessNumber(filename, eventos, pagesData);

  const anonymizeMarkdown = options.anonymizeMarkdown === true;
  onProgress({
    type: anonymizeMarkdown ? 'redaction' : 'redaction-skip',
    message: anonymizeMarkdown ? 'Anonimizando Markdown...' : 'Mantendo texto fiel ao PDF...',
    percent: 90
  });

  const redactionSummary = anonimizarMarkdownExtraido(pagesData, eventos, {
    anonymizeMarkdown
  });
  redactionSummary.ocrCount = ocrCount;
  redactionSummary.ocrFailCount = ocrFailCount;
  redactionSummary.ocrSkippedCount = ocrSkippedCount;
  redactionSummary.omittedPageCount = omittedPageCount;
  redactionSummary.ocrEnabled = enableOcr;

  const zip = await buildZip(processNumber, eventos, pagesData, redactionSummary);

  onProgress({
    type: 'done',
    message: 'Concluído!',
    percent: 100
  });

  // O worker OCR é mantido vivo em _ocrWorker para reuso na mesma sessão do browser,
  // evitando o custo de reinicialização do Tesseract a cada PDF. O chamador pode
  // invocar splitEprocPdf múltiplas vezes sem pagar o overhead de inicialização
  // repetida. O browser libera o worker ao fechar/recarregar a página.

  return { zip, eventos, ocrCount, ocrFailCount, ocrSkippedCount, omittedPageCount, totalPages, processNumber, redactionSummary };
}
