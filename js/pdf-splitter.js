// Separador de peças de processo eProc — 100% no browser, sem import/export

// ── Variáveis de módulo ───────────────────────────────────────────────────────

let _ocrWorker = null;

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
  if (/^capa/i.test(title.trim())) return true;
  return title.startsWith('Evento.');
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
  let result = title.normalize('NFD').replace(/[̀-ͯ]/g, '');

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
  return content.items.map(i => i.str).join(' ');
}

function pageNeedsOcr(text) {
  return text.trim().length < 50;
}

async function renderPageToCanvas(page) {
  const viewport = page.getViewport({ scale: 2.0 });
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

  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
      document.head.appendChild(script);
    });
    return true;
  } catch (err) {
    onProgress({
      type: 'warn',
      message: 'OCR indisponível: não foi possível carregar Tesseract.js (' + err.message + ')'
    });
    return false;
  }
}

async function initOcrWorker() {
  if (_ocrWorker) return _ocrWorker;
  _ocrWorker = await Tesseract.createWorker('por', 1, {
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

function inferProcessNumber(filename) {
  const match = filename && filename.match(/\d{20}/);
  return match ? match[0] : 'Processo';
}

function buildMarkdownForEvent(evento, pageTexts) {
  const header = `# ${evento.title}\n\n<!-- páginas ${evento.startPageLabel}-${evento.endPageLabel} do PDF original -->\n\n`;
  const body = pageTexts.join('\n\n---\n\n');
  return header + body + '\n\n---\n';
}

function buildIndexMarkdown(processNumber, eventos) {
  const lines = [`# Índice do Processo ${processNumber}`, ''];

  for (const evento of eventos) {
    const ocrMark = evento.ocr ? ' *(OCR)*' : '';
    const pages = evento.pageCount === 1
      ? `p. ${evento.startPageLabel}`
      : `pp. ${evento.startPageLabel}-${evento.endPageLabel}`;
    lines.push(`- [${evento.title}](eventos/${evento.filename})${ocrMark} — ${pages}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function buildZip(processNumber, eventos, pagesData) {
  const zip = new JSZip();

  // Gerar markdowns de cada evento
  const markdowns = pagesData.map(({ evento, pageTexts }) =>
    buildMarkdownForEvent(evento, pageTexts)
  );

  // indice.md
  zip.file('indice.md', buildIndexMarkdown(processNumber, eventos));

  // integral.md
  zip.file('integral.md', markdowns.join('\n'));

  // eventos/
  for (let i = 0; i < eventos.length; i++) {
    zip.file('eventos/' + eventos[i].filename, markdowns[i]);
  }

  return zip.generateAsync({ type: 'uint8array' });
}

// ── Função principal ──────────────────────────────────────────────────────────

async function splitEprocPdf(arrayBuffer, onProgress = () => {}, filename = '') {
  // 1. Carregar PDF
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  // 2. Obter outline
  const outline = await pdfDoc.getOutline();

  if (!outline || outline.length === 0) {
    throw new Error(
      'Este PDF não possui marcadores (índice/outline). ' +
      'Apenas processos do eProc com índice automático são suportados.'
    );
  }

  // 3-4. Achatar e filtrar itens Eproc
  const allItems = flattenOutline(outline);
  const eprocItems = allItems.filter(item => isEprocEventTitle(item.title));

  if (eprocItems.length === 0) {
    throw new Error(
      'Nenhum evento do eProc encontrado nos marcadores deste PDF. ' +
      'Verifique se o arquivo é um processo judicial completo do eProc.'
    );
  }

  // 5. Resolver pageIndex de cada item
  const itemsWithPage = await Promise.all(
    eprocItems.map(async item => ({
      title: item.title,
      pageIndex: await resolveOutlinePageIndex(pdfDoc, item)
    }))
  );

  // 6. Calcular ranges de eventos
  const eventos = buildEventRanges(itemsWithPage, totalPages);

  // 7. Emitir progresso de outline
  onProgress({
    type: 'outline',
    message: `${eventos.length} eventos identificados no índice do processo`,
    percent: 5,
    eventTotal: eventos.length
  });

  const pagesData = [];
  let ocrCount = 0;
  let ocrFailCount = 0;
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
      const text = await extractPageText(page);

      if (pageNeedsOcr(text)) {
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
          pageTexts.push(ocrText);
          ocrFlags.push(true);
          ocrCount++;
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

  // Inferir número do processo a partir do nome do arquivo
  const processNumber = inferProcessNumber(filename);

  const zip = await buildZip(processNumber, eventos, pagesData);

  onProgress({
    type: 'done',
    message: 'Concluído!',
    percent: 100
  });

  // O worker OCR é mantido vivo em _ocrWorker para reuso na mesma sessão do browser,
  // evitando o custo de reinicialização do Tesseract a cada PDF. O chamador pode
  // invocar splitEprocPdf múltiplas vezes sem pagar o overhead de inicialização
  // repetida. O browser libera o worker ao fechar/recarregar a página.

  return { zip, eventos, ocrCount, ocrFailCount, totalPages };
}
