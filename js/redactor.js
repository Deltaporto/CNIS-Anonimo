const NUMERO_DE_PROCESSO_PATTERN = /\b\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}\b/;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const OAB_PATTERN = /\b(OAB(?:\/[A-Z]{2}| [A-Z]{2})?:?\s*(?:n\.?|nº\.?)?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;
const CRM_PATTERN = /\b((?:CRM(?:\/[A-Z]{2})?|CREMERJ)\s*)(\d{2,10}|\d{2,3}\.\d{3})\b/i;
const IDENTIDADE_PATTERN = /\b(?:Identidade|Id\.?|Ident\.?|RG)\s*(?:n[.º]?\s*)?(\d[\d.\-\/]{4,8}\d)\b/i;
const TELEFONE_PATTERN = /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\b/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ENDERECO_PATTERN = /\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Trav\.?|Pra[cç]a|Rodovia|Rod\.?|Estrada|Estr\.?)\b\s+.+?(?=\s+(?:Processo|CPF|OAB|CRM|Contato|E-?mail|Endere[cç]o|Parte|P[aá]gina)\b|[,;\n]|$)/i;

let firstNameSet = new Set();

function inicializar(primeiroNomes) {
  firstNameSet = new Set(primeiroNomes.map(n => n.toLowerCase()));
}

async function inicializarRedactorPadrao(fetchFn = fetch) {
  if (firstNameSet.size) return;
  const resposta = await fetchFn('assets/common-first-names.json');
  inicializar(await resposta.json());
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

function redigirNumerico(label, num) {
  return label + '0'.repeat(num.length);
}

function redigirMascarar(original) {
  return '*'.repeat(original.length);
}
function redigirNome(original) {
  const conectivos = new Set(['de', 'da', 'das', 'do', 'dos']);
  const palavras = original.trim().split(/\s+/);
  const iniciais = palavras
    .filter(p => !conectivos.has(p.toLowerCase()))
    .map(p => p[0].toUpperCase() + '.')
    .join(' ');
  return iniciais.padEnd(original.length, ' ');
}
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

function detectarNomesNoTexto(texto) {
  const conectivos = new Set(['de', 'da', 'das', 'do', 'dos']);
  const rotulosParada = new Set([
    'CPF',
    'OAB',
    'CRM',
    'RG',
    'PROCESSO',
    'CONTATO',
    'EMAIL',
    'E-MAIL',
    'ENDERECO',
    'ENDEREÇO',
    'PAGINA',
    'PÁGINA'
  ]);
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
      if (rotulosParada.has(prox.toUpperCase())) break;
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

  for (const m of texto.matchAll(_globalizar(EMAIL_PATTERN, 'i'))) {
    _adicionarParUnico(pares, m[0], redigirMascarar(m[0]));
  }

  for (const m of texto.matchAll(_globalizar(ENDERECO_PATTERN, 'i'))) {
    _adicionarParUnico(pares, m[0], redigirMascarar(m[0]));
  }

  for (const nome of detectarNomesNoTexto(texto)) {
    if (numerosProcesso.has(nome)) continue;
    _adicionarParUnico(pares, nome, redigirNome(nome));
  }

  return pares;
}
function contarAchados(texto) {
  const numerosProcesso = [...new Set([...texto.matchAll(_globalizar(NUMERO_DE_PROCESSO_PATTERN))].map(m => m[0]))];
  const cpfs = [...texto.matchAll(_globalizar(CPF_PATTERN))].filter(m => validarCPF(m[0])).length;
  const oabs = [...texto.matchAll(_globalizar(OAB_PATTERN, 'i'))].length;
  const crms = [...texto.matchAll(_globalizar(CRM_PATTERN, 'i'))].length;
  const nomes = detectarNomesNoTexto(texto).length;
  const enderecos = [...texto.matchAll(_globalizar(ENDERECO_PATTERN, 'i'))].length;
  return { cpfs, oabs, crms, nomes, enderecos, numerosProcesso };
}
