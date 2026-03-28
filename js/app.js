// Lógica de lote: processa múltiplos PDFs e baixa como ZIP automaticamente

const zonaUpload   = document.getElementById('zona-upload');
const inputArquivo = document.getElementById('input-arquivo');
const listaEl      = document.getElementById('lista-arquivos');
const acoesEl      = document.getElementById('acoes-globais');
const btnBaixarZip = document.getElementById('btn-baixar-zip');
const btnLimpar    = document.getElementById('btn-limpar');

let resultados = [];

// ── UPLOAD ────────────────────────────────────────────────────────────────────

zonaUpload.addEventListener('click', () => inputArquivo.click());

inputArquivo.addEventListener('change', e => {
  if (e.target.files.length) iniciarLote(Array.from(e.target.files));
});

zonaUpload.addEventListener('dragover', e => {
  e.preventDefault();
  zonaUpload.classList.add('drag-over');
});
zonaUpload.addEventListener('dragleave', () => zonaUpload.classList.remove('drag-over'));
zonaUpload.addEventListener('drop', e => {
  e.preventDefault();
  zonaUpload.classList.remove('drag-over');
  const pdfs = Array.from(e.dataTransfer.files)
    .filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  if (pdfs.length) iniciarLote(pdfs);
});

// ── LOTE ──────────────────────────────────────────────────────────────────────

async function iniciarLote(arquivos) {
  resultados = [];
  listaEl.textContent = '';
  listaEl.classList.remove('oculto');
  acoesEl.classList.add('oculto');

  const itens = arquivos.map(f => criarItemLista(f.name));

  for (let i = 0; i < arquivos.length; i++) {
    await processarArquivo(arquivos[i], itens[i]);
  }

  if (resultados.length === 0) return;

  if (resultados.length === 1) {
    baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
  } else {
    const zip = new JSZip();
    for (const r of resultados) zip.file(r.nome, r.bytes);
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    baixarBlob(zipBytes, 'application/zip', 'CNIS_anonimizados.zip');
  }

  // Mostra botão para baixar de novo
  acoesEl.classList.remove('oculto');
  const label = resultados.length === 1 ? 'Baixar novamente' : 'Baixar ZIP novamente';
  btnBaixarZip.textContent = '⬇ ' + label;
  btnBaixarZip.disabled = false;
}

async function processarArquivo(file, item) {
  setStatus(item, 'processando', 'Processando…');
  setProgresso(item, 30);

  try {
    const pdfBytes    = await file.arrayBuffer();
    setProgresso(item, 50);

    const dadosOriginais = await extrairDadosSensiveis(pdfBytes);
    setProgresso(item, 70);

    const dadosFicticios = gerarDadosFicticios(dadosOriginais.nome);
    const pdfAnonimizado = await substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios);
    setProgresso(item, 100, true);

    const ausentes = ['nome', 'cpf', 'nit', 'nomeMae']
      .filter(k => !dadosOriginais[k])
      .map(k => ({ nome: 'Nome', cpf: 'CPF', nit: 'NIT', nomeMae: 'Nome da mãe' }[k]));

    if (ausentes.length) {
      setStatus(item, 'aviso', 'Concluído (não encontrado: ' + ausentes.join(', ') + ')');
    } else {
      setStatus(item, 'ok', 'Anonimizado ✓');
    }

    mostrarSubs(item, dadosOriginais, dadosFicticios);

    const nomeAnon = file.name.replace(/\.pdf$/i, '_anonimizado.pdf');
    resultados.push({ nome: nomeAnon, bytes: pdfAnonimizado });

  } catch (err) {
    setProgresso(item, 100, false, true);
    setStatus(item, 'erro', 'Erro: ' + err.message);
    console.error('[CNIS]', file.name, err);
  }
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
  if (erro)     barra.classList.add('erro');
}

function mostrarSubs(item, originais, ficticios) {
  const el = item.querySelector('.arquivo-subs');

  const tabela = document.createElement('div');
  tabela.className = 'subs-tabela';

  const header = document.createElement('div');
  header.className = 'subs-header';
  ['Campo', 'Original', '', 'Substituído'].forEach((txt, i) => {
    const s = document.createElement('span');
    s.textContent = txt;
    if (i === 1) s.className = 'col-original';
    if (i === 3) s.className = 'col-novo';
    header.appendChild(s);
  });
  tabela.appendChild(header);

  const pares = [
    ['Nome', originais.nome,    ficticios.nome],
    ['CPF',  originais.cpf,     ficticios.cpf],
    ['NIT',  originais.nit,     ficticios.nit],
    ['Mãe',  originais.nomeMae, ficticios.nomeMae],
  ];

  pares.filter(([, orig]) => orig).forEach(([label, orig, fake]) => {
    const linha = document.createElement('div');
    linha.className = 'sub-linha';

    const lbl = document.createElement('span');
    lbl.className = 'sub-label';
    lbl.textContent = label;

    const original = document.createElement('span');
    original.className = 'sub-original';
    original.textContent = orig;

    const seta = document.createElement('span');
    seta.className = 'sub-seta';
    seta.textContent = '→';

    const novo = document.createElement('span');
    novo.className = 'sub-novo';
    novo.textContent = fake.toUpperCase();

    linha.append(lbl, original, seta, novo);
    tabela.appendChild(linha);
  });

  el.appendChild(tabela);
}

// ── DOWNLOAD ──────────────────────────────────────────────────────────────────

function baixarBlob(bytes, tipo, nome) {
  const blob = new Blob([bytes], { type: tipo });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── BOTÕES ────────────────────────────────────────────────────────────────────

btnBaixarZip.addEventListener('click', async () => {
  if (resultados.length === 1) {
    baixarBlob(resultados[0].bytes, 'application/pdf', resultados[0].nome);
    return;
  }
  const zip = new JSZip();
  for (const r of resultados) zip.file(r.nome, r.bytes);
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  baixarBlob(zipBytes, 'application/zip', 'CNIS_anonimizados.zip');
});

btnLimpar.addEventListener('click', () => {
  resultados = [];
  listaEl.textContent = '';
  listaEl.classList.add('oculto');
  acoesEl.classList.add('oculto');
  inputArquivo.value = '';
});
