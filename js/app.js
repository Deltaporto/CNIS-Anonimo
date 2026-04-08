// Lógica de lote: processa múltiplos PDFs e baixa como ZIP automaticamente

const zonaUpload = document.getElementById('zona-upload');
const inputArquivo = document.getElementById('input-arquivo');
const listaEl = document.getElementById('lista-arquivos');
const acoesEl = document.getElementById('acoes-globais');
const btnBaixarZip = document.getElementById('btn-baixar-zip');
const btnLimpar = document.getElementById('btn-limpar');

let resultados = [];

// ── UPLOAD ────────────────────────────────────────────────────────────────────

zonaUpload.addEventListener('click', () => inputArquivo.click());

zonaUpload.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    inputArquivo.click();
  }
});

inputArquivo.addEventListener('change', event => {
  if (event.target.files.length) iniciarLote(Array.from(event.target.files));
});

zonaUpload.addEventListener('dragover', event => {
  event.preventDefault();
  zonaUpload.classList.add('drag-over');
});

zonaUpload.addEventListener('dragleave', () => zonaUpload.classList.remove('drag-over'));

zonaUpload.addEventListener('drop', event => {
  event.preventDefault();
  zonaUpload.classList.remove('drag-over');

  const pdfs = Array.from(event.dataTransfer.files)
    .filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));

  if (pdfs.length) iniciarLote(pdfs);
});

// ── LOTE ──────────────────────────────────────────────────────────────────────

async function iniciarLote(arquivos) {
  resultados = [];
  listaEl.textContent = '';
  listaEl.classList.remove('oculto');
  acoesEl.classList.add('oculto');

  const itens = arquivos.map(file => criarItemLista(file.name));

  for (let i = 0; i < arquivos.length; i++) {
    await processarArquivo(arquivos[i], itens[i], i, arquivos.length);
  }

  if (resultados.length === 0) return;

  acoesEl.classList.remove('oculto');
  if (resultados.length === 1) {
    baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
    btnBaixarZip.textContent = '⬇ Baixar novamente';
    btnBaixarZip.disabled = false;
  } else {
    btnBaixarZip.textContent = '⏳ Gerando ZIP...';
    btnBaixarZip.disabled = true;
    try {
      const zip = new JSZip();
      for (const resultado of resultados) zip.file(resultado.nome, resultado.bytes);
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });
      baixarBlob(zipBytes, 'application/zip', 'CNIS_anonimizados.zip');
    } finally {
      btnBaixarZip.textContent = '⬇ Baixar ZIP novamente';
      btnBaixarZip.disabled = false;
    }
  }
}

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

async function processarArquivo(file, item, indice, totalArquivos) {
  setStatus(item, 'processando', 'Processando…');

  if (file.size > MAX_PDF_SIZE) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Arquivo muito grande (máx. 50 MB)');
    return;
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPDF = header[0] === 0x25 && header[1] === 0x50 &&
                header[2] === 0x44 && header[3] === 0x46;

  if (!isPDF) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Arquivo não é um PDF válido');
    return;
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

    mostrarSubs(item, dadosOriginais, dadosFicticiosAplicados);

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

      return;
    }

    setProgresso(item, 100, true);

    const observacoes = coletarObservacoes(dadosOriginais, resultadoPdf);
    if (observacoes.length) {
      setStatus(item, 'aviso', 'Concluído (' + observacoes.join('; ') + ')');
    } else {
      setStatus(item, 'ok', 'Anonimizado ✓');
    }

    resultados.push({
      nome: gerarNomeSaida(dadosOriginais.nome, indice, totalArquivos),
      bytes: resultadoPdf.bytes
    });
  } catch (err) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Erro ao processar o PDF. Verifique se o arquivo é válido.');
    console.error('[CNIS]', err);
  }
}

function coletarObservacoes(dadosOriginais, resultadoPdf) {
  const observacoes = [];
  const ausentes = [];

  if (!dadosOriginais.nome) ausentes.push('Nome');
  if (!dadosOriginais.cpf) ausentes.push('CPF');
  if (!Array.isArray(dadosOriginais.nits) || dadosOriginais.nits.length === 0) ausentes.push('NIT');
  if (!dadosOriginais.nomeMae) ausentes.push('Nome da mãe');

  if (ausentes.length) observacoes.push('não encontrado: ' + ausentes.join(', '));
  if (resultadoPdf.unmatchedFields.length) {
    observacoes.push('substituição não confirmada no stream: ' + resultadoPdf.unmatchedFields.join(', '));
  }

  return observacoes;
}

function gerarNomeSaida(nomeOriginal, indice, totalArquivos) {
  const primeiroNome = nomeOriginal
    ? nomeOriginal.trim().split(/\s+/)[0]
    : 'Anonimizado';

  const nomeTitleCase = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
  if (totalArquivos === 1) return `CNIS ${nomeTitleCase}.pdf`;

  const largura = Math.max(2, String(totalArquivos).length);
  const sequencia = String(indice + 1).padStart(largura, '0');
  return `CNIS ${nomeTitleCase} ${sequencia}.pdf`;
}

// ── DOM HELPERS ───────────────────────────────────────────────────────────────

function criarItemLista(nomeArquivo) {
  const item = document.createElement('div');
  item.className = 'arquivo-item';

  const cab = document.createElement('div');
  cab.className = 'arquivo-cabecalho';

  const icone = document.createElement('span');
  icone.className = 'arquivo-icone';
  icone.textContent = '📄';

  const nome = document.createElement('span');
  nome.className = 'arquivo-nome';
  nome.textContent = nomeArquivo;

  const status = document.createElement('span');
  status.className = 'arquivo-status status-aguardando';
  status.setAttribute('role', 'status');
  status.textContent = 'Aguardando';

  cab.append(icone, nome, status);

  const progressoWrap = document.createElement('div');
  progressoWrap.className = 'progresso-wrap';

  const progressoBarra = document.createElement('div');
  progressoBarra.className = 'progresso-barra';
  progressoWrap.appendChild(progressoBarra);

  const subs = document.createElement('div');
  subs.className = 'arquivo-subs';

  item.append(cab, progressoWrap, subs);
  listaEl.appendChild(item);
  return item;
}

function setStatus(item, tipo, texto) {
  const el = item.querySelector('.arquivo-status');
  el.className = 'arquivo-status status-' + tipo;
  el.textContent = texto;
}

function setProgresso(item, pct, completo = false, erro = false) {
  const barra = item.querySelector('.progresso-barra');
  barra.style.width = pct + '%';
  if (completo) barra.classList.add('completo');
  if (erro) barra.classList.add('erro');
}

function mascarar(valor, campo) {
  if (!valor) return valor;
  if (campo === 'cpf') return valor.slice(0, 4) + '***.***-**';
  if (campo === 'nit') return valor.slice(0, 4) + '*****.**-*';
  if (campo === 'nome' || campo === 'mae') return valor.split(' ')[0] + ' ****';
  return valor;
}

function construirParesSubstituicao(originais, ficticios) {
  const pares = [
    ['Nome', originais.nome, ficticios.nome, 'nome'],
    ['CPF', originais.cpf, ficticios.cpf, 'cpf']
  ];

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

  pares.push(['Mãe', originais.nomeMae, ficticios.nomeMae, 'mae']);
  return pares;
}

function mostrarSubs(item, originais, ficticios) {
  const el = item.querySelector('.arquivo-subs');
  el.textContent = '';

  const tabela = document.createElement('div');
  tabela.className = 'subs-tabela';

  const header = document.createElement('div');
  header.className = 'subs-header';

  ['Campo', 'Original', '', 'Substituído'].forEach((txt, i) => {
    const span = document.createElement('span');
    span.textContent = txt;
    if (i === 1) span.className = 'col-original';
    if (i === 3) span.className = 'col-novo';
    header.appendChild(span);
  });

  tabela.appendChild(header);

  const pares = construirParesSubstituicao(originais, ficticios);
  pares.filter(([, original]) => original).forEach(([label, original, fake, campo]) => {
    const linha = document.createElement('div');
    linha.className = 'sub-linha';

    const lbl = document.createElement('span');
    lbl.className = 'sub-label';
    lbl.textContent = label;

    const originalEl = document.createElement('span');
    originalEl.className = 'sub-original';
    originalEl.textContent = mascarar(original, campo);

    const seta = document.createElement('span');
    seta.className = 'sub-seta';
    seta.textContent = '→';

    const novo = document.createElement('span');
    novo.className = 'sub-novo';
    novo.textContent = fake ? fake.toUpperCase() : '—';

    linha.append(lbl, originalEl, seta, novo);
    tabela.appendChild(linha);
  });

  el.appendChild(tabela);
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
  if (resultados.length === 1) {
    baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
    return;
  }

  const textoOriginal = btnBaixarZip.textContent;
  btnBaixarZip.textContent = '⏳ Gerando ZIP...';
  btnBaixarZip.disabled = true;

  try {
    const zip = new JSZip();
    for (const resultado of resultados) zip.file(resultado.nome, resultado.bytes);
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    baixarBlob(zipBytes, 'application/zip', 'CNIS_anonimizados.zip');
  } finally {
    btnBaixarZip.textContent = textoOriginal;
    btnBaixarZip.disabled = false;
  }
});

btnLimpar.addEventListener('click', () => {
  resultados = [];
  listaEl.textContent = '';
  listaEl.classList.add('oculto');
  acoesEl.classList.add('oculto');
  inputArquivo.value = '';
});
