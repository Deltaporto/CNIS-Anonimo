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
