// Lógica de lote: processa múltiplos PDFs e baixa como ZIP automaticamente

const MODOS_DOCUMENTO = {
  cnis: {
    id: 'cnis',
    prefixoArquivo: 'CNIS',
    zipNome: 'CNIS_anonimizados.zip',
    uploadTitulo: 'Arraste os extratos CNIS aqui',
    uploadSub: 'ou clique para selecionar · um ou vários arquivos · download automático ao concluir',
    ariaLabel: 'Selecionar arquivos PDF do CNIS para anonimizar',
    botaoDownloadUm: 'Baixar novamente',
    botaoDownloadVarios: 'Baixar ZIP novamente'
  },
  'carta-concessao': {
    id: 'carta-concessao',
    prefixoArquivo: 'Carta de Concessao',
    zipNome: 'Cartas_de_concessao_anonimizadas.zip',
    uploadTitulo: 'Arraste as cartas de concessão aqui',
    uploadSub: 'ou clique para selecionar · PDFs de carta de concessão ou memória de cálculo · download automático ao concluir',
    ariaLabel: 'Selecionar arquivos PDF de carta de concessão para anonimizar',
    botaoDownloadUm: 'Baixar novamente',
    botaoDownloadVarios: 'Baixar ZIP novamente'
  },
  'processo-judicial': {
    id: 'processo-judicial',
    prefixoArquivo: 'Processo',
    zipNome: 'Processos_anonimizados.zip',
    uploadTitulo: 'Arraste as peças processuais aqui',
    uploadSub: 'ou clique para selecionar · petições, sentenças, acórdãos · download automático ao concluir',
    ariaLabel: 'Selecionar arquivos PDF de processos judiciais para anonimizar',
    botaoDownloadUm: 'Baixar novamente',
    botaoDownloadVarios: 'Baixar ZIP novamente'
  },
  'extrair-pecas': {
    id: 'extrair-pecas',
    prefixoArquivo: 'Processo',
    zipNome: 'Pecas_do_processo.zip',
    uploadTitulo: 'Arraste a íntegra do processo (Eproc)',
    uploadSub: 'Preferencial: no Eproc, abra a árvore do processo, marque todos, use Versão p/ impressão e selecione o separador Ambos (Evento e Documento). clique para selecionar',
    ariaLabel: 'Selecionar PDF da íntegra do processo para extrair as peças em texto',
    botaoDownloadUm: 'Baixar peças extraídas novamente',
    botaoDownloadVarios: 'Baixar peças extraídas novamente',
    isSplit: true
  }
};

const zonaUpload = document.getElementById('zona-upload');
const inputArquivo = document.getElementById('input-arquivo');
const listaEl = document.getElementById('lista-arquivos');
const acoesEl = document.getElementById('acoes-globais');
const btnBaixarZip = document.getElementById('btn-baixar-zip');
const btnLimpar = document.getElementById('btn-limpar');
const btnModoCnis = document.getElementById('btn-modo-cnis');
const btnModoCarta = document.getElementById('btn-modo-carta');
const btnModoProcesso = document.getElementById('btn-modo-processo');
const btnModoExtrair = document.getElementById('btn-modo-extrair');
const uploadTituloEl = document.getElementById('upload-titulo');
const uploadSubEl = document.getElementById('upload-sub');
const infoExtrairEl = document.getElementById('info-extrair');
const saidaMdRadios = document.querySelectorAll('input[name="saida-md"]');
const ocrModoRadios = document.querySelectorAll('input[name="ocr-modo"]');
const semOcrPaginasRadios = document.querySelectorAll('input[name="sem-ocr-paginas"]');

let resultados = [];
let modoAtual = 'cnis';
let modoResultados = 'cnis';

function obterConfigModo(modo = 'cnis') {
  return MODOS_DOCUMENTO[modo] || MODOS_DOCUMENTO.cnis;
}

function obterSplitAnonimizarMarkdown() {
  const selecionado = document.querySelector('input[name="saida-md"]:checked');
  return !selecionado || selecionado.value !== 'fiel';
}

function obterSplitOcrOptions() {
  const ocrSelecionado = document.querySelector('input[name="ocr-modo"]:checked');
  const semOcrSelecionado = document.querySelector('input[name="sem-ocr-paginas"]:checked');
  return {
    enableOcr: !ocrSelecionado || ocrSelecionado.value !== 'desligado',
    missingTextMode: semOcrSelecionado?.value === 'omitir' ? 'omit' : 'placeholder'
  };
}

function atualizarOpcoesExtrairUI() {
  const anonimizado = obterSplitAnonimizarMarkdown();
  for (const radio of saidaMdRadios || []) {
    const label = radio.closest ? radio.closest('.saida-opcao') : null;
    if (label?.classList) {
      label.classList.toggle('saida-opcao-ativa', radio.checked);
    }
  }
  if (document.body?.dataset) {
    document.body.dataset.saidaMd = anonimizado ? 'anonimizado' : 'fiel';
  }

  const ocrOptions = obterSplitOcrOptions();
  for (const radio of ocrModoRadios || []) {
    const label = radio.closest ? radio.closest('.saida-opcao') : null;
    if (label?.classList) {
      label.classList.toggle('saida-opcao-ativa', radio.checked);
    }
  }
  for (const radio of semOcrPaginasRadios || []) {
    radio.disabled = ocrOptions.enableOcr;
    const label = radio.closest ? radio.closest('label') : null;
    if (label) {
      if (radio.disabled) {
        label.title = 'Desligue o OCR para configurar esta opção';
      } else {
        label.removeAttribute('title');
      }
    }
  }
  if (document.body?.dataset) {
    document.body.dataset.ocrModo = ocrOptions.enableOcr ? 'ligado' : 'desligado';
  }
}

function atualizarModoUI() {
  const config = obterConfigModo(modoAtual);
  if (document.body?.dataset) document.body.dataset.modo = modoAtual;
  atualizarOpcoesExtrairUI();

  if (uploadTituloEl) uploadTituloEl.textContent = config.uploadTitulo;
  if (uploadSubEl) {
    uploadSubEl.textContent = '';
    const parts = config.uploadSub.split('clique para selecionar');
    if (parts.length === 2) {
      uploadSubEl.appendChild(document.createTextNode(parts[0]));
      const strong = document.createElement('strong');
      strong.textContent = 'clique para selecionar';
      uploadSubEl.appendChild(strong);
      uploadSubEl.appendChild(document.createTextNode(parts[1]));
    } else {
      uploadSubEl.textContent = config.uploadSub;
    }
  }
  if (zonaUpload && typeof zonaUpload.setAttribute === 'function') {
    zonaUpload.setAttribute('aria-label', config.ariaLabel);
  }

  // Atualizar atributo multiple do input de arquivo
  if (inputArquivo) {
    inputArquivo.multiple = !config.isSplit;
  }

  if (btnModoCnis?.classList) {
    btnModoCnis.classList.toggle('modo-ativo', modoAtual === 'cnis');
    btnModoCarta?.classList.toggle('modo-ativo', modoAtual === 'carta-concessao');
    btnModoProcesso?.classList.toggle('modo-ativo', modoAtual === 'processo-judicial');
    btnModoExtrair?.classList.toggle('modo-ativo', modoAtual === 'extrair-pecas');
    btnModoExtrair?.classList.toggle('modo-ativo-extrair', modoAtual === 'extrair-pecas');
  }

  if (infoExtrairEl?.classList) {
    infoExtrairEl.classList.toggle('oculto', modoAtual !== 'extrair-pecas');
  }

  if (btnModoCnis && typeof btnModoCnis.setAttribute === 'function') {
    btnModoCnis.setAttribute('aria-selected', String(modoAtual === 'cnis'));
    btnModoCnis.setAttribute('tabindex', modoAtual === 'cnis' ? '0' : '-1');
  }
  if (btnModoCarta && typeof btnModoCarta.setAttribute === 'function') {
    btnModoCarta.setAttribute('aria-selected', String(modoAtual === 'carta-concessao'));
    btnModoCarta.setAttribute('tabindex', modoAtual === 'carta-concessao' ? '0' : '-1');
  }
  if (btnModoProcesso && typeof btnModoProcesso.setAttribute === 'function') {
    btnModoProcesso.setAttribute('aria-selected', String(modoAtual === 'processo-judicial'));
    btnModoProcesso.setAttribute('tabindex', modoAtual === 'processo-judicial' ? '0' : '-1');
  }
  if (btnModoExtrair && typeof btnModoExtrair.setAttribute === 'function') {
    btnModoExtrair.setAttribute('aria-selected', String(modoAtual === 'extrair-pecas'));
    btnModoExtrair.setAttribute('tabindex', modoAtual === 'extrair-pecas' ? '0' : '-1');
  }
}

function limparEstado() {
  resultados.length = 0;
  modoResultados = modoAtual;
  listaEl.textContent = '';
  listaEl.classList.add('oculto');
  acoesEl.classList.add('oculto');
  inputArquivo.value = '';
}

function trocarModo(modo) {
  if (!MODOS_DOCUMENTO[modo] || modoAtual === modo) return;
  modoAtual = modo;
  limparEstado();
  atualizarModoUI();
}

atualizarModoUI();

btnModoCnis?.addEventListener('click', () => trocarModo('cnis'));
btnModoCarta?.addEventListener('click', () => trocarModo('carta-concessao'));
btnModoProcesso?.addEventListener('click', () => trocarModo('processo-judicial'));
btnModoExtrair?.addEventListener('click', () => trocarModo('extrair-pecas'));
for (const radio of saidaMdRadios || []) {
  radio.addEventListener('change', atualizarOpcoesExtrairUI);
}
for (const radio of ocrModoRadios || []) {
  radio.addEventListener('change', atualizarOpcoesExtrairUI);
}
for (const radio of semOcrPaginasRadios || []) {
  radio.addEventListener('change', atualizarOpcoesExtrairUI);
}

const tablist = document.querySelector('.modo-selector');
if (tablist) {
  tablist.addEventListener('keydown', (e) => {
    const tabs = [btnModoCnis, btnModoCarta, btnModoProcesso, btnModoExtrair].filter(Boolean);
    if (!tabs.length) return;

    let currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    }

    if (newIndex !== currentIndex) {
      e.preventDefault();
      const novoBotao = tabs[newIndex];
      const modos = {
        'btn-modo-cnis': 'cnis',
        'btn-modo-carta': 'carta-concessao',
        'btn-modo-processo': 'processo-judicial',
        'btn-modo-extrair': 'extrair-pecas'
      };
      trocarModo(modos[novoBotao.id]);
      novoBotao.focus();
    }
  });
}

// ── UPLOAD ────────────────────────────────────────────────────────────────────

zonaUpload.addEventListener('click', () => inputArquivo.click());

zonaUpload.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    inputArquivo.click();
  }
});

inputArquivo.addEventListener('change', event => {
  if (event.target.files.length) {
    const arquivos = Array.from(event.target.files);
    const pdfs = arquivos.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    const rejeitados = arquivos.filter(file => file.type !== 'application/pdf' && !file.name.endsWith('.pdf'));

    if (rejeitados.length > 0) {
      const nomes = rejeitados.map(f => f.name).join(', ');
      mostrarToast(`Arquivos ignorados (apenas PDF): ${nomes}`);
    }

    if (pdfs.length) iniciarLote(pdfs);
  }
  event.target.value = '';
});

window.addEventListener('dragover', event => {
  event.preventDefault();
  zonaUpload.classList.add('drag-over');
});

window.addEventListener('dragleave', event => {
  event.preventDefault();
  if (event.relatedTarget === null) {
    zonaUpload.classList.remove('drag-over');
  }
});

window.addEventListener('drop', event => {
  event.preventDefault();
  zonaUpload.classList.remove('drag-over');

  const arquivos = Array.from(event.dataTransfer.files);
  const pdfs = arquivos.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
  const rejeitados = arquivos.filter(file => file.type !== 'application/pdf' && !file.name.endsWith('.pdf'));

  if (rejeitados.length > 0) {
    const nomes = rejeitados.map(f => f.name).join(', ');
    mostrarToast(`Arquivos ignorados (apenas PDF): ${nomes}`);
  }

  if (pdfs.length) iniciarLote(pdfs);
});

// ── LOTE ──────────────────────────────────────────────────────────────────────

async function iniciarLote(arquivos) {
  {
    const configCheck = obterConfigModo(modoAtual);
    if (configCheck.isSplit) {
      return iniciarSplitEproc(arquivos);
    }
  }

  resultados.length = 0;
  modoResultados = modoAtual;
  listaEl.textContent = '';
  listaEl.classList.remove('oculto');
  acoesEl.classList.add('oculto');

  const itens = arquivos.map(file => criarItemLista(file.name));

  // ⚡ Bolt: Use a worker pool with a concurrency limit to prevent UI blocking
  // and improve processing speed without exhausting browser memory.
  const LIMITE_CONCORRENCIA = 3;
  let indiceAtual = 0;

  async function trabalhador() {
    while (indiceAtual < arquivos.length) {
      const i = indiceAtual++;
      const resultado = await processarArquivo(arquivos[i], itens[i], i, arquivos.length, modoResultados);
      if (resultado) {
        resultados[i] = resultado;
      }
    }
  }

  const trabalhadores = [];
  for (let i = 0; i < Math.min(LIMITE_CONCORRENCIA, arquivos.length); i++) {
    trabalhadores.push(trabalhador());
  }

  await Promise.all(trabalhadores);

  // Filter out empty/undefined slots
  const resultadosValidos = resultados.filter(Boolean);
  resultados.length = 0;
  resultados.push(...resultadosValidos);

  if (resultados.length === 0) return;

  const config = obterConfigModo(modoResultados);
  acoesEl.classList.remove('oculto');
  btnBaixarZip.disabled = true;
  btnBaixarZip.setAttribute('aria-busy', 'true');
  btnBaixarZip.title = 'Aguarde o processamento de todos os arquivos para baixar';

  try {
    if (resultados.length === 1) {
      btnBaixarZip.textContent = config.botaoDownloadUm;
      baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
    } else {
      btnBaixarZip.textContent = 'Gerando ZIP...';
      const zip = new JSZip();
      for (const resultado of resultados) zip.file(resultado.nome, resultado.bytes);
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });
      baixarBlob(zipBytes, 'application/zip', config.zipNome);
    }
  } finally {
    btnBaixarZip.textContent = resultados.length === 1
      ? config.botaoDownloadUm
      : config.botaoDownloadVarios;
    btnBaixarZip.disabled = false;
    btnBaixarZip.removeAttribute('aria-busy');
    btnBaixarZip.removeAttribute('title');
  }
}

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

// ── SEPARAR PEÇAS (eProc) ─────────────────────────────────────────────────────

let _splitLogEl = null;
let _splitResumoEl = null;

function formatarPecasExtraidas(total) {
  return total === 1 ? '1 peça extraída' : `${total} peças extraídas`;
}

function gerarNomeZipSplit(resultado, anonimizado = true) {
  const suffix = anonimizado ? 'pecas_anonimizadas' : 'pecas_texto_fiel';
  if (resultado?.processNumber && resultado.processNumber !== 'Processo') {
    return `Processo_${resultado.processNumber}_${suffix}.zip`;
  }
  return anonimizado ? 'Pecas_anonimizadas.zip' : 'Pecas_texto_fiel.zip';
}

function atualizarLogSplit(progresso) {
  if (!_splitLogEl) return;
  if (!progresso || !progresso.message) return;
  const p = document.createElement('p');
  p.textContent = progresso.message;
  _splitLogEl.appendChild(p);
  _splitLogEl.scrollTop = _splitLogEl.scrollHeight;
}

function renderizarCardsSplit(resultado) {
  if (!_splitResumoEl) return;
  _splitResumoEl.textContent = '';

  if (!resultado || !resultado.eventos || resultado.eventos.length === 0) return;

  if (resultado.redactionSummary?.enabled) {
    const avisoAnon = document.createElement('p');
    avisoAnon.className = 'aviso-anonimizacao';
    avisoAnon.textContent = `Markdown anonimizado: ${resultado.redactionSummary.replacementCount || 0} substituição(ões) mapeadas. Revise antes de compartilhar.`;
    _splitResumoEl.appendChild(avisoAnon);
  } else {
    const avisoFiel = document.createElement('p');
    avisoFiel.className = 'aviso-texto-fiel';
    avisoFiel.textContent = 'Markdown fiel ao PDF: os textos extraídos podem conter dados sensíveis.';
    _splitResumoEl.appendChild(avisoFiel);
  }

  // Caso 1: OCR funcionou em algumas páginas
  if (resultado.ocrCount > 0) {
    const avisoOcr = document.createElement('p');
    avisoOcr.className = 'aviso-ocr';
    avisoOcr.textContent = `${resultado.ocrCount} página(s) processadas por reconhecimento de imagem (OCR).`;
    _splitResumoEl.appendChild(avisoOcr);
  }

  // Caso 2: OCR falhou em carregar mas havia páginas escaneadas
  if (resultado.ocrFailCount > 0) {
    const avisoFalha = document.createElement('p');
    avisoFalha.className = 'aviso-ocr';
    avisoFalha.textContent = 'Não foi possível preparar o leitor de imagens. As peças com texto normal foram extraídas, mas páginas escaneadas podem ficar incompletas.';
    _splitResumoEl.appendChild(avisoFalha);
  }

  if (resultado.ocrSkippedCount > 0) {
    const avisoSemOcr = document.createElement('p');
    avisoSemOcr.className = 'aviso-ocr';
    avisoSemOcr.textContent = `${resultado.ocrSkippedCount} página(s) sem texto não passaram por OCR. Revise os avisos no Markdown.`;
    _splitResumoEl.appendChild(avisoSemOcr);
  }

  if (resultado.omittedPageCount > 0) {
    const avisoOmitidas = document.createElement('p');
    avisoOmitidas.className = 'aviso-ocr';
    avisoOmitidas.textContent = `${resultado.omittedPageCount} página(s) sem texto foram omitidas do Markdown porque o OCR estava desligado.`;
    _splitResumoEl.appendChild(avisoOmitidas);
  }

  const listaEventos = document.createElement('div');
  listaEventos.setAttribute('role', 'list');

  for (const evento of resultado.eventos) {
    const card = document.createElement('div');
    card.className = 'evento-card' + (evento.ocr ? ' evento-card-ocr' : '');
    card.setAttribute('role', 'listitem');

    const titulo = document.createElement('span');
    titulo.className = 'evento-titulo';
    titulo.textContent = evento.title;

    const paginas = document.createElement('span');
    paginas.className = 'evento-paginas';
    const pageLabel = evento.pageCount === 1
      ? `p. ${evento.startPageLabel}`
      : `pp. ${evento.startPageLabel}–${evento.endPageLabel}`;
    paginas.textContent = pageLabel + (evento.ocr ? ' (texto reconhecido de imagem)' : '');

    card.appendChild(titulo);
    card.appendChild(paginas);
    listaEventos.appendChild(card);
  }

  _splitResumoEl.appendChild(listaEventos);
}

async function iniciarSplitEproc(arquivos) {
  // 1. Recusar mais de um arquivo
  if (arquivos.length !== 1) {
    mostrarToast('Envie apenas um PDF de íntegra por vez.');
    return;
  }

  const arquivo = arquivos[0];

  // 2. Validar extensão
  if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
    mostrarToast('Arquivo não é um PDF válido.');
    return;
  }

  // Verificar tamanho
  if (arquivo.size > MAX_PDF_SIZE) {
    mostrarToast('Não foi possível processar este PDF no navegador. Tente uma íntegra menor ou divida o arquivo na origem.');
    return;
  }

  // 3. Ler como ArrayBuffer
  const arrayBuffer = await arquivo.arrayBuffer();

  // 4. Validar assinatura %PDF
  const header = new Uint8Array(arrayBuffer, 0, 5);
  const isPdf = header[0] === 37 && header[1] === 80 && header[2] === 68 && header[3] === 70;
  if (!isPdf) {
    mostrarToast('Arquivo não é um PDF válido.');
    return;
  }

  // 5. Preparar UI
  resultados.length = 0;
  modoResultados = modoAtual;
  listaEl.textContent = '';
  listaEl.classList.remove('oculto');
  acoesEl.classList.add('oculto');

  // Criar item de progresso
  const item = criarItemLista(arquivo.name);
  setStatus(item, 'processando', 'Lendo índice…');
  setProgresso(item, 10);

  // Criar área de log dentro do item
  const logEl = document.createElement('div');
  logEl.className = 'split-log';
  item.appendChild(logEl);
  _splitLogEl = logEl;

  // Criar área de resumo de eventos
  const resumoEl = document.createElement('div');
  resumoEl.className = 'split-resumo';
  item.appendChild(resumoEl);
  _splitResumoEl = resumoEl;

  // 6. Chamar splitEprocPdf
  try {
    const anonimizarMarkdown = obterSplitAnonimizarMarkdown();
    const ocrOptions = obterSplitOcrOptions();
    if (anonimizarMarkdown && typeof inicializarRedactorPadrao === 'function') {
      setStatus(item, 'processando', 'Carregando anonimizador');
      setDetalheProcessamento(item, 'Preparando dicionário local de nomes');
      await inicializarRedactorPadrao();
    }

    const resultado = await splitEprocPdf(arrayBuffer, (progresso) => {
      atualizarLogSplit(progresso);
      if (Number.isFinite(progresso.percent)) setProgresso(item, progresso.percent);
      if (progresso.message) setDetalheProcessamento(item, progresso.message);
      if (progresso.type === 'event') {
        setStatus(item, 'processando', progresso.message);
      } else if (progresso.type === 'ocr') {
        setStatus(item, 'processando', 'OCR…');
      } else if (progresso.type === 'redaction') {
        setStatus(item, 'processando', 'Anonimizando Markdown');
      } else if (progresso.type === 'redaction-skip') {
        setStatus(item, 'processando', 'Preparando texto fiel');
      } else if (progresso.type === 'zip') {
        setStatus(item, 'processando', 'Empacotando…');
      } else if (progresso.type === 'done') {
        setStatus(item, 'ok', 'Concluído ✓');
      }
    }, arquivo.name, {
      anonymizeMarkdown: anonimizarMarkdown,
      enableOcr: ocrOptions.enableOcr,
      missingTextMode: ocrOptions.missingTextMode
    });

    setProgresso(item, 100, true);
    setStatus(item, 'ok', `${formatarPecasExtraidas(resultado.eventos.length)} ✓`);

    // 7. Renderizar cards de eventos
    renderizarCardsSplit(resultado);

    // 8. Baixar ZIP automaticamente com nome baseado no número do processo
    const config = obterConfigModo(modoResultados);
    const zipNome = gerarNomeZipSplit(resultado, anonimizarMarkdown);
    baixarBlob(resultado.zip, 'application/zip', zipNome);

    // 9. Armazenar resultado para rebaixar
    resultados.push({
      nome: zipNome,
      bytes: resultado.zip,
      mimeType: 'application/zip',
      isZip: true
    });

    // 10. Configurar botão de rebaixar
    acoesEl.classList.remove('oculto');
    btnBaixarZip.textContent = config.botaoDownloadUm;
    btnBaixarZip.disabled = false;

  } catch (err) {
    setProgresso(item, 100, false, true);

    const msg = err.message || 'Erro ao processar o PDF.';
    setStatus(item, 'erro', 'Erro ao processar');
    if (msg.includes('memória') || msg.includes('memory') || msg.includes('out of memory')) {
      mostrarToast('Não foi possível processar este PDF no navegador. Tente uma íntegra menor ou divida o arquivo na origem.');
    } else {
      mostrarToast(msg);
    }
    console.error('[ExtrairPecas]', err);
  } finally {
    _splitLogEl = null;
    _splitResumoEl = null;
  }
}

async function processarArquivo(file, item, indice, totalArquivos, modoLote) {
  setStatus(item, 'processando', 'Processando…');

  if (file.size > MAX_PDF_SIZE) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Arquivo muito grande (máx. 50 MB)');
    return null;
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPDF = header[0] === 0x25 && header[1] === 0x50 &&
                header[2] === 0x44 && header[3] === 0x46;

  if (!isPDF) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Arquivo não é um PDF válido');
    return null;
  }

  if (modoLote === 'processo-judicial') {
    return await processarArquivoJudicial(file, item, indice, totalArquivos);
  }

  setProgresso(item, 30);

  try {
    const pdfBytes = await file.arrayBuffer();
    setProgresso(item, 50);

    const dadosOriginais = await extrairDadosSensiveis(pdfBytes);
    setProgresso(item, 70);

    const dadosFicticios = gerarDadosFicticios(dadosOriginais);
    const resultadoPdf = await substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios);
    const dadosFicticiosAplicados = resultadoPdf.dadosFicticios || dadosFicticios;

    mostrarSubs(item, dadosOriginais, dadosFicticiosAplicados, modoLote);

    if (!resultadoPdf.ok) {
      setProgresso(item, 100, false, true);

      if (resultadoPdf.unreplacedFields.length) {
        setStatus(
          item,
          'erro',
          'Falha segura: restaram dados no PDF (' + resultadoPdf.unreplacedFields.join(', ') + ')'
        );
      } else {
        setStatus(item, 'erro', 'Falha segura: nenhuma substituição pôde ser confirmada');
      }

      return null;
    }

    setProgresso(item, 100, true);

    const observacoes = coletarObservacoes(dadosOriginais, resultadoPdf, modoLote);
    if (observacoes.length) {
      setStatus(item, 'aviso', 'Concluído (' + observacoes.join('; ') + ')');
    } else {
      setStatus(item, 'ok', 'Anonimizado ✓');
    }

    return {
      nome: gerarNomeSaida(dadosOriginais.nome, indice, totalArquivos, modoLote),
      bytes: resultadoPdf.bytes
    };
  } catch (err) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Erro ao processar o PDF. Verifique se o arquivo é válido.');
    console.error('[CNIS]', err);
    return null;
  }
}

async function processarArquivoJudicial(file, item, indice, totalArquivos) {
  setProgresso(item, 8);
  setDetalheProcessamento(item, 'Inicializando modo judicial no navegador');

  try {
    if (typeof inicializarRedactorPadrao === 'function') {
      setStatus(item, 'processando', 'Carregando detector');
      await inicializarRedactorPadrao();
    }

    setStatus(item, 'processando', 'Lendo arquivo');
    setDetalheProcessamento(item, formatarBytes(file.size) + ' · leitura local');
    const pdfBytes = await file.arrayBuffer();
    setProgresso(item, 10);

    const resultado = await processarDocumentoJudicial(pdfBytes, {
      onProgress: progresso => atualizarProgressoJudicial(item, progresso)
    });
    setProgresso(item, 96);
    setStatus(item, 'processando', 'Montando resumo');
    setDetalheProcessamento(item, 'Consolidando contadores e confirmação de resíduos');
    mostrarAchados(item, resultado.achados);

    if (!resultado.ok) {
      setProgresso(item, 100, false, true);

      if (resultado.unreplacedFields?.length) {
        setStatus(
          item,
          'erro',
          'Falha segura: restaram dados no PDF (' + resultado.unreplacedFields.join(', ') + ')'
        );
      } else {
        setStatus(item, 'erro', 'Falha segura: nenhuma substituição pôde ser confirmada');
      }

      return null;
    }

    setProgresso(item, 100, true);
    if (resultado.unmatchedFields?.length) {
      setDetalheProcessamento(item, `${resultado.appliedCount || 0} de ${resultado.expectedCount || 0} alvos confirmados`);
      setStatus(item, 'aviso', 'Concluído (não confirmado: ' + resultado.unmatchedFields.join(', ') + ')');
    } else {
      setDetalheProcessamento(item, `${resultado.appliedCount || 0} de ${resultado.expectedCount || 0} alvos confirmados`);
      setStatus(item, 'ok', 'Anonimizado ✓');
    }

    return {
      nome: gerarNomeSaida(null, indice, totalArquivos, 'processo-judicial'),
      bytes: resultado.bytes
    };
  } catch (err) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Erro ao processar o PDF. Verifique se o arquivo é válido.');
    console.error('[Processo Judicial]', err);
    return null;
  }
}

function coletarObservacoes(dadosOriginais, resultadoPdf, modo = 'cnis') {
  const observacoes = [];
  const ausentes = [];

  if (modo === 'carta-concessao') {
    if (!dadosOriginais.nome) ausentes.push('Nome/Titular');
    if (!dadosOriginais.numeroBeneficio) ausentes.push('Número do benefício');
    if (!dadosOriginais.codigoAutenticidade) ausentes.push('Código de autenticidade');
    if (!dadosOriginais.endereco) ausentes.push('Endereço');
    if (!dadosOriginais.cpf && (!Array.isArray(dadosOriginais.nits) || dadosOriginais.nits.length === 0)) {
      ausentes.push('CPF ou NIT');
    }
  } else {
    if (!dadosOriginais.nome) ausentes.push('Nome');
    if (!dadosOriginais.cpf) ausentes.push('CPF');
    if (!Array.isArray(dadosOriginais.nits) || dadosOriginais.nits.length === 0) ausentes.push('NIT');
    if (!dadosOriginais.nomeMae) ausentes.push('Nome da mãe');
  }

  if (ausentes.length) observacoes.push('não encontrado: ' + ausentes.join(', '));
  if (resultadoPdf.unmatchedFields.length) {
    observacoes.push('substituição não confirmada no stream: ' + resultadoPdf.unmatchedFields.join(', '));
  }

  return observacoes;
}

function gerarNomeSaida(nomeOriginal, indice, totalArquivos, modo = 'cnis') {
  const primeiroNome = nomeOriginal
    ? nomeOriginal.trim().split(/\s+/)[0]
    : 'Anonimizado';

  const nomeTitleCase = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
  const prefixo = obterConfigModo(modo).prefixoArquivo;

  if (totalArquivos === 1) return `${prefixo} ${nomeTitleCase}.pdf`;

  const largura = Math.max(2, String(totalArquivos).length);
  const sequencia = String(indice + 1).padStart(largura, '0');
  return `${prefixo} ${nomeTitleCase} ${sequencia}.pdf`;
}

// ── DOM HELPERS ───────────────────────────────────────────────────────────────

function criarItemLista(nomeArquivo) {
  const item = document.createElement('div');
  item.className = 'arquivo-item';
  item.setAttribute("role", "listitem");

  const cab = document.createElement('div');
  cab.className = 'arquivo-cabecalho';

  const icone = document.createElement('span');
  icone.className = 'arquivo-icone';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = '📄';

  const nome = document.createElement('span');
  nome.className = 'arquivo-nome';
  nome.textContent = nomeArquivo;

  const status = document.createElement('span');
  status.className = 'arquivo-status status-aguardando';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Aguardando';

  cab.append(icone, nome, status);

  const progressoWrap = document.createElement('div');
  progressoWrap.className = 'progresso-wrap';
  progressoWrap.setAttribute('role', 'progressbar');
  progressoWrap.setAttribute('aria-valuemin', '0');
  progressoWrap.setAttribute('aria-valuemax', '100');
  progressoWrap.setAttribute('aria-valuenow', '0');
  progressoWrap.setAttribute('aria-label', `Progresso de ${nomeArquivo}`);

  const progressoBarra = document.createElement('div');
  progressoBarra.className = 'progresso-barra';
  progressoWrap.appendChild(progressoBarra);

  const progressoDetalhe = document.createElement('div');
  progressoDetalhe.className = 'arquivo-progresso-detalhe';
  progressoDetalhe.setAttribute('aria-live', 'polite');
  progressoDetalhe.textContent = 'Na fila de processamento';

  const subs = document.createElement('div');
  subs.className = 'arquivo-subs';

  item.append(cab, progressoWrap, progressoDetalhe, subs);
  listaEl.appendChild(item);
  return item;
}

function setStatus(item, tipo, texto) {
  const el = item.querySelector('.arquivo-status');
  el.className = 'arquivo-status status-' + tipo;
  el.textContent = texto;
}

function setProgresso(item, pct, completo = false, erro = false) {
  const wrap = item.querySelector('.progresso-wrap');
  if (wrap) wrap.setAttribute('aria-valuenow', Math.round(pct));

  const barra = item.querySelector('.progresso-barra');
  barra.style.width = pct + '%';
  if (completo) barra.classList.add('completo');
  if (erro) barra.classList.add('erro');
}

function setDetalheProcessamento(item, texto) {
  const el = item.querySelector('.arquivo-progresso-detalhe');
  if (!el) return;
  el.textContent = texto || '';
  el.classList.toggle('vazio', !texto);
}

function atualizarProgressoJudicial(item, progresso = {}) {
  const pct = Math.max(0, Math.min(99, Number(progresso.percent) || 0));
  if (pct) setProgresso(item, pct);
  if (progresso.etapa) setStatus(item, 'processando', progresso.etapa);
  const partes = [];
  if (progresso.detalhe) partes.push(progresso.detalhe);
  if (Number.isFinite(progresso.percent)) partes.push(Math.round(pct) + '%');
  setDetalheProcessamento(item, partes.join(' · '));
}

function formatarBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'Tamanho desconhecido';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' bytes';
}

function mascarar(valor, campo) {
  if (!valor) return valor;
  if (campo === 'cpf') return valor.slice(0, 4) + '***.***-**';
  if (campo === 'nit') return valor.slice(0, 4) + '*****.**-*';
  if (campo === 'nome' || campo === 'mae') return valor.split(' ')[0] + ' ****';
  if (campo === 'beneficio') return valor.replace(/\d(?=(?:\D*\d){2})/g, '*');
  if (campo === 'codigo') return valor.slice(0, 6) + '***';
  if (campo === 'endereco') return valor.split(/\s+/).slice(0, 2).join(' ') + ' ***';
  return valor;
}

function construirParesSubstituicao(originais, ficticios, modo = originais.tipoDocumento || 'cnis') {
  const pares = [];

  if (originais.nome || ficticios.nome) {
    pares.push([modo === 'carta-concessao' ? 'Titular' : 'Nome', originais.nome, ficticios.nome, 'nome']);
  }

  if (originais.cpf || ficticios.cpf) {
    pares.push(['CPF', originais.cpf, ficticios.cpf, 'cpf']);
  }

  const nitsOriginais = Array.isArray(originais.nits) ? originais.nits : [];
  const nitsFicticios = Array.isArray(ficticios.nits) ? ficticios.nits : [];
  for (let i = 0; i < nitsOriginais.length; i++) {
    pares.push([
      nitsOriginais.length > 1 ? `NIT ${i + 1}` : 'NIT',
      nitsOriginais[i],
      nitsFicticios[i] || '',
      'nit'
    ]);
  }

  if (originais.numeroBeneficio || ficticios.numeroBeneficio) {
    pares.push(['Benefício', originais.numeroBeneficio, ficticios.numeroBeneficio, 'beneficio']);
  }

  if (originais.codigoAutenticidade || ficticios.codigoAutenticidade) {
    pares.push(['Código', originais.codigoAutenticidade, ficticios.codigoAutenticidade, 'codigo']);
  }

  if (originais.endereco || ficticios.endereco) {
    pares.push(['Endereço', originais.endereco, ficticios.endereco, 'endereco']);
  }

  if (originais.nomeMae || ficticios.nomeMae) {
    pares.push(['Mãe', originais.nomeMae, ficticios.nomeMae, 'mae']);
  }

  return pares;
}

function mostrarSubs(item, originais, ficticios, modo) {
  const el = item.querySelector('.arquivo-subs');
  el.textContent = '';

  const tabela = document.createElement('div');
  tabela.className = 'subs-tabela';
  tabela.setAttribute('role', 'table');
  tabela.setAttribute('aria-label', 'Resumo das substituições');

  const header = document.createElement('div');
  header.className = 'subs-header';
  header.setAttribute('role', 'row');

  ['Campo', 'Original', '', 'Substituído'].forEach((txt, i) => {
    const span = document.createElement('span');
    span.textContent = txt;
    span.setAttribute('role', 'columnheader');
    if (i === 1) span.className = 'col-original';
    if (i === 3) span.className = 'col-novo';
    header.appendChild(span);
  });

  tabela.appendChild(header);

  const pares = construirParesSubstituicao(originais, ficticios, modo);
  pares.filter(([, original]) => original).forEach(([label, original, fake, campo]) => {
    const linha = document.createElement('div');
    linha.className = 'sub-linha';
    linha.setAttribute('role', 'row');

    const lbl = document.createElement('span');
    lbl.className = 'sub-label';
    lbl.textContent = label;
    lbl.setAttribute('role', 'cell');

    const originalEl = document.createElement('span');
    originalEl.className = 'sub-original';
    originalEl.textContent = mascarar(original, campo);
    originalEl.title = originalEl.textContent;
    originalEl.setAttribute('role', 'cell');

    const seta = document.createElement('span');
    seta.className = 'sub-seta';
    seta.setAttribute('aria-hidden', 'true');
    seta.setAttribute('role', 'cell');
    seta.textContent = '→';

    const novo = document.createElement('span');
    novo.className = 'sub-novo';
    const textoNovo = fake ? fake.toUpperCase() : '—';
    novo.textContent = textoNovo;
    if (fake) novo.title = textoNovo;
    novo.setAttribute('role', 'cell');

    linha.append(lbl, originalEl, seta, novo);
    tabela.appendChild(linha);
  });

  el.appendChild(tabela);
}

function mostrarAchados(item, achados = {}) {
  const el = item.querySelector('.arquivo-subs');
  el.textContent = '';

  const resumo = document.createElement('div');
  resumo.className = 'subs-tabela';
  resumo.setAttribute('role', 'list');
  resumo.setAttribute('aria-label', 'Resumo do processo judicial');

  const partes = [];
  if (achados.cpfs) partes.push('CPFs: ' + achados.cpfs);
  if (achados.nits) partes.push('NITs: ' + achados.nits);
  if (achados.oabs) partes.push('OABs: ' + achados.oabs);
  if (achados.crms) partes.push('CRMs: ' + achados.crms);
  if (achados.nomes) partes.push('Nomes: ' + achados.nomes);
  if (achados.enderecos) partes.push('Endereços: ' + achados.enderecos);
  if (achados.identificadores) partes.push('IDs: ' + achados.identificadores);

  const linha = document.createElement('div');
  linha.className = 'sub-linha';
  linha.style.gridTemplateColumns = '1fr';
  linha.setAttribute('role', 'listitem');

  const textoEl = document.createElement('span');
  textoEl.className = 'sub-label';
  textoEl.textContent = partes.length
    ? 'Redatados: ' + partes.join(' · ')
    : 'Nenhum dado sensível encontrado';
  linha.appendChild(textoEl);
  resumo.appendChild(linha);

  if (achados.numerosProcesso?.length) {
    const processoLinha = document.createElement('div');
    processoLinha.className = 'sub-linha';
    processoLinha.style.gridTemplateColumns = '1fr';
    processoLinha.setAttribute('role', 'listitem');

    const labelEl = document.createElement('span');
    labelEl.className = 'sub-label';
    labelEl.style.marginRight = '8px';
    labelEl.style.display = 'inline-block';
    labelEl.textContent = 'Processo preservado: ';

    const processoEl = document.createElement('span');
    processoEl.className = 'sub-original';
    processoEl.textContent = achados.numerosProcesso.join(', ');
    processoEl.title = processoEl.textContent;

    processoLinha.appendChild(labelEl);
    processoLinha.appendChild(processoEl);
    resumo.appendChild(processoLinha);
  }

  el.appendChild(resumo);
}

// ── DOWNLOAD ──────────────────────────────────────────────────────────────────

function baixarBlob(bytes, tipo, nome) {
  const blob = new Blob([bytes], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── BOTÕES ────────────────────────────────────────────────────────────────────

btnBaixarZip.addEventListener('click', async () => {
  const config = obterConfigModo(modoResultados);

  if (resultados.length === 1 && resultados[0].isZip) {
    baixarBlob(resultados[0].bytes, 'application/zip', resultados[0].nome);
    return;
  }

  if (resultados.length === 1) {
    baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
    return;
  }

  const textoOriginal = btnBaixarZip.textContent;
  try {
    btnBaixarZip.disabled = true;
    btnBaixarZip.title = 'Aguarde a geração do arquivo para baixar';
    btnBaixarZip.setAttribute('aria-busy', 'true');
    btnBaixarZip.textContent = 'Gerando ZIP...';
    const zip = new JSZip();
    for (const resultado of resultados) zip.file(resultado.nome, resultado.bytes);
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    baixarBlob(zipBytes, 'application/zip', config.zipNome);
  } finally {
    btnBaixarZip.disabled = false;
    btnBaixarZip.removeAttribute('title');
    btnBaixarZip.removeAttribute('aria-busy');
    btnBaixarZip.textContent = textoOriginal;
  }
});

let limparTimeout;
btnLimpar.addEventListener('click', () => {
  if (!btnLimpar.dataset.confirm) {
    btnLimpar.dataset.confirm = 'true';
    btnLimpar.dataset.original = btnLimpar.innerHTML;
    btnLimpar.innerHTML = 'Tem certeza? <kbd aria-hidden="true">Esc</kbd>';
    btnLimpar.title = 'Clique novamente ou pressione Esc para confirmar';
    limparTimeout = setTimeout(() => {
      delete btnLimpar.dataset.confirm;
      btnLimpar.innerHTML = btnLimpar.dataset.original;
      btnLimpar.removeAttribute('title');
    }, 3000);
    return;
  }
  clearTimeout(limparTimeout);
  delete btnLimpar.dataset.confirm;
  btnLimpar.innerHTML = btnLimpar.dataset.original;
  btnLimpar.removeAttribute('title');

  limparEstado();
  atualizarModoUI();
  zonaUpload.focus();
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !acoesEl.classList.contains('oculto')) {
    btnLimpar.click();
  }
});

// ── TOAST ──────────────────────────────────────────────────────────────────────
function mostrarToast(mensagem) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notificacao';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.textContent = mensagem;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.classList.add('mostrar'), 10);

  setTimeout(() => {
    toast.classList.remove('mostrar');
    toast.classList.add('ocultar');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
