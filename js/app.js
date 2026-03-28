// Orquestração da interface

let arquivoAtual = null;
let bytesOriginais = null;

// Elementos DOM
const zonaUpload = document.getElementById('zona-upload');
const inputArquivo = document.getElementById('input-arquivo');
const secaoDados = document.getElementById('secao-dados');
const secaoUpload = document.getElementById('secao-upload');
const spinner = document.getElementById('spinner');
const msgSucesso = document.getElementById('msg-sucesso');
const msgErro = document.getElementById('msg-erro');

// Campos de exibição (dados originais)
const exibirNome = document.getElementById('exibir-nome');
const exibirCPF = document.getElementById('exibir-cpf');
const exibirNIT = document.getElementById('exibir-nit');
const exibirMae = document.getElementById('exibir-mae');

// Campos de edição (dados fictícios)
const inputNome = document.getElementById('input-nome');
const inputCPF = document.getElementById('input-cpf');
const inputNIT = document.getElementById('input-nit');
const inputMae = document.getElementById('input-mae');

// ── UPLOAD ──────────────────────────────────────────────

zonaUpload.addEventListener('click', () => inputArquivo.click());

inputArquivo.addEventListener('change', (e) => {
  if (e.target.files[0]) carregarArquivo(e.target.files[0]);
});

zonaUpload.addEventListener('dragover', (e) => {
  e.preventDefault();
  zonaUpload.classList.add('drag-over');
});

zonaUpload.addEventListener('dragleave', () => {
  zonaUpload.classList.remove('drag-over');
});

zonaUpload.addEventListener('drop', (e) => {
  e.preventDefault();
  zonaUpload.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    carregarArquivo(file);
  } else {
    mostrarErro('Apenas arquivos PDF são aceitos.');
  }
});

async function carregarArquivo(file) {
  ocultarMensagens();
  mostrarSpinner('Lendo PDF e identificando dados sensíveis…');

  try {
    bytesOriginais = await file.arrayBuffer();
    arquivoAtual = file;

    const dadosOriginais = await extrairDadosSensiveis(bytesOriginais);

    // Preenche exibição dos dados originais
    exibirNome.textContent = dadosOriginais.nome || '(não encontrado)';
    exibirCPF.textContent  = dadosOriginais.cpf  || '(não encontrado)';
    exibirNIT.textContent  = dadosOriginais.nit  || '(não encontrado)';
    exibirMae.textContent  = dadosOriginais.nomeMae || '(não encontrado)';

    // Gera dados fictícios e preenche campos editáveis
    const ficticios = gerarDadosFicticios(dadosOriginais.nome);
    inputNome.value = ficticios.nome;
    inputCPF.value  = ficticios.cpf;
    inputNIT.value  = ficticios.nit;
    inputMae.value  = ficticios.nomeMae;

    // Armazena dados originais para uso posterior
    document.getElementById('secao-dados').dataset.original = JSON.stringify(dadosOriginais);

    ocultarSpinner();
    secaoUpload.classList.add('oculto');
    secaoDados.classList.remove('oculto');
  } catch (err) {
    ocultarSpinner();
    mostrarErro('Erro ao processar o PDF: ' + err.message);
    console.error(err);
  }
}

// ── AÇÕES ──────────────────────────────────────────────

document.getElementById('btn-novo-pdf').addEventListener('click', () => {
  secaoDados.classList.add('oculto');
  secaoUpload.classList.remove('oculto');
  inputArquivo.value = '';
  ocultarMensagens();
  bytesOriginais = null;
  arquivoAtual = null;
});

document.getElementById('btn-regenerar').addEventListener('click', () => {
  const ficticios = gerarDadosFicticios();
  inputNome.value = ficticios.nome;
  inputCPF.value  = ficticios.cpf;
  inputNIT.value  = ficticios.nit;
  inputMae.value  = ficticios.nomeMae;
});

document.getElementById('btn-gerar').addEventListener('click', async () => {
  const dadosOriginais = JSON.parse(secaoDados.dataset.original || '{}');
  const dadosFicticios = {
    nome:     inputNome.value.trim().toUpperCase(),
    cpf:      inputCPF.value.trim(),
    nit:      inputNIT.value.trim(),
    nomeMae:  inputMae.value.trim().toUpperCase(),
  };

  ocultarMensagens();
  mostrarSpinner('Gerando PDF anonimizado…');
  document.getElementById('btn-gerar').disabled = true;

  try {
    const pdfAnonimizado = await substituirDadosNoPDF(bytesOriginais, dadosOriginais, dadosFicticios);
    baixarPDF(pdfAnonimizado, arquivoAtual.name);
    ocultarSpinner();
    mostrarSucesso('PDF anonimizado gerado com sucesso! O download iniciou automaticamente.');
  } catch (err) {
    ocultarSpinner();
    mostrarErro('Erro ao gerar o PDF: ' + err.message);
    console.error(err);
  } finally {
    document.getElementById('btn-gerar').disabled = false;
  }
});

// ── DOWNLOAD ──────────────────────────────────────────

function baixarPDF(bytes, nomeOriginal) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = nomeOriginal.replace(/\.pdf$/i, '');
  a.download = `${base}_anonimizado.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── HELPERS UI ────────────────────────────────────────

function mostrarSpinner(msg) {
  document.getElementById('spinner-msg').textContent = msg;
  spinner.classList.remove('oculto');
}

function ocultarSpinner() {
  spinner.classList.add('oculto');
}

function mostrarSucesso(msg) {
  msgSucesso.textContent = msg;
  msgSucesso.classList.remove('oculto');
}

function mostrarErro(msg) {
  msgErro.textContent = msg;
  msgErro.classList.remove('oculto');
}

function ocultarMensagens() {
  msgSucesso.classList.add('oculto');
  msgErro.classList.add('oculto');
}
