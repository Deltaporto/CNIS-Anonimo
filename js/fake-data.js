// Gerador de dados fictícios brasileiros

// Nomes são intencionalmente identificáveis como fictícios (contêm "FAKE")
// CPF e NIT são os únicos campos que precisam ser numericamente convincentes

const PRIMEIROS_MASC = ['JOAO', 'CARLOS', 'JOSE', 'PEDRO', 'PAULO'];
const PRIMEIROS_FEM  = ['MARIA', 'ANA', 'FRANCISCA', 'JULIA', 'SANDRA'];
const SOBRENOMES     = ['SILVA', 'SANTOS', 'OLIVEIRA', 'FERREIRA', 'LIMA'];

function randomInt(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

function escolha(arr) {
  return arr[randomInt(arr.length)];
}

function soDigitos(valor = '') {
  return String(valor).replace(/\D/g, '');
}

// Gera nome fictício preservando o primeiro nome original: "ROSALINA FAKE DA SILVA"
// Se não houver primeiro nome, usa um genérico.
function gerarNomeCompleto(nomeOriginal = null) {
  const primeiro = nomeOriginal
    ? nomeOriginal.trim().split(/\s+/)[0].toUpperCase()
    : escolha([...PRIMEIROS_MASC, ...PRIMEIROS_FEM]);
  const sobrenome = escolha(SOBRENOMES);
  return `${primeiro} FAKE DA ${sobrenome}`;
}

function gerarNomeMaeFicticio() {
  return `MARIA FAKE DA ${escolha(SOBRENOMES)}`;
}

// CPF: 11 dígitos, formato XXX.XXX.XXX-XX
function gerarCPF() {
  const digitos = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b % 10);

  // Primeiro dígito verificador
  let soma = digitos.reduce((acc, d, i) => acc + d * (10 - i), 0);
  let resto = soma % 11;
  digitos.push(resto < 2 ? 0 : 11 - resto);

  // Segundo dígito verificador
  soma = digitos.reduce((acc, d, i) => acc + d * (11 - i), 0);
  resto = soma % 11;
  digitos.push(resto < 2 ? 0 : 11 - resto);

  const n = digitos.join('');
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

// NIT/PIS: 11 dígitos, formato XXX.XXXXX.XX-X
function gerarNIT() {
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let digitos;

  // Garante NIT válido
  do {
    digitos = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b % 10);
  } while (digitos.every(d => d === digitos[0])); // evita todos iguais

  const soma = digitos.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const resto = soma % 11;
  const verificador = resto < 2 ? 0 : 11 - resto;
  digitos.push(verificador);

  const n = digitos.join('');
  return `${n.slice(0, 3)}.${n.slice(3, 8)}.${n.slice(8, 10)}-${n.slice(10)}`;
}

function gerarCPFUnico(cpfOriginal = '') {
  const proibidos = new Set();
  const cpfOriginalDigitos = soDigitos(cpfOriginal);
  if (cpfOriginalDigitos) proibidos.add(cpfOriginalDigitos);

  let cpf;
  do {
    cpf = gerarCPF();
  } while (proibidos.has(soDigitos(cpf)));

  return cpf;
}

function gerarNITUnico(proibidosDigitos) {
  let nit;
  do {
    nit = gerarNIT();
  } while (proibidosDigitos.has(soDigitos(nit)));

  proibidosDigitos.add(soDigitos(nit));
  return nit;
}

function gerarDadosFicticios(originais = {}) {
  const nitsOriginais = Array.isArray(originais.nits) ? originais.nits : [];
  const proibidosNIT = new Set(nitsOriginais.map(soDigitos).filter(Boolean));
  const nitsFicticios = nitsOriginais.map(() => gerarNITUnico(proibidosNIT));

  return {
    nome: gerarNomeCompleto(originais.nome || null),
    cpf: gerarCPFUnico(originais.cpf || ''),
    nits: nitsFicticios,
    nomeMae: gerarNomeMaeFicticio()
  };
}
