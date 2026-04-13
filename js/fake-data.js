// Gerador de dados fictícios brasileiros

// Nomes são intencionalmente identificáveis como fictícios (contêm "FAKE")
// CPF e NIT são os únicos campos que precisam ser numericamente convincentes

const PRIMEIROS_MASC = ['JOAO', 'CARLOS', 'JOSE', 'PEDRO', 'PAULO'];
const PRIMEIROS_FEM  = ['MARIA', 'ANA', 'FRANCISCA', 'JULIA', 'SANDRA'];
const SOBRENOME_FICTICIO = 'FAKE DOS SANTOS';
const ALFABETO_MAIUSCULO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomInt(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

function escolha(arr) {
  return arr[randomInt(arr.length)];
}

function soDigitos(valor = '') {
  return String(valor).replace(/\D/g, '');
}

function randomDigit() {
  return String(randomInt(10));
}

function randomUpperChar() {
  return ALFABETO_MAIUSCULO[randomInt(ALFABETO_MAIUSCULO.length)];
}

function escolherCharAlternativo(pool, atual, fallbackFn) {
  const candidatos = pool.filter(char => char !== atual);
  if (candidatos.length) return candidatos[randomInt(candidatos.length)];
  return fallbackFn ? fallbackFn() : atual;
}

function aplicarMascaraNumerica(modelo = '', digitos = '') {
  let indiceDigito = 0;
  let resultado = '';

  for (const char of String(modelo)) {
    if (/\d/.test(char)) {
      resultado += digitos[indiceDigito] || '';
      indiceDigito += 1;
      continue;
    }

    resultado += char;
  }

  if (!resultado && digitos) return digitos;
  return resultado;
}

// Gera nome fictício preservando o primeiro nome original: "ROSALINA FAKE DOS SANTOS"
// Se não houver primeiro nome, usa um genérico.
function gerarNomeCompleto(nomeOriginal = null) {
  const primeiro = nomeOriginal
    ? nomeOriginal.trim().split(/\s+/)[0].toUpperCase()
    : escolha([...PRIMEIROS_MASC, ...PRIMEIROS_FEM]);
  return `${primeiro} ${SOBRENOME_FICTICIO}`;
}

function gerarNomeMaeFicticio() {
  return `MARIA ${SOBRENOME_FICTICIO}`;
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

function gerarNumeroBeneficio(numeroOriginal = '') {
  const digitosOriginais = soDigitos(numeroOriginal);
  const quantidadeDigitos = digitosOriginais.length || 10;

  let digitos;
  do {
    digitos = Array.from(
      crypto.getRandomValues(new Uint8Array(quantidadeDigitos)),
      byte => String(byte % 10)
    ).join('');
  } while (
    digitos === digitosOriginais ||
    /^(\d)\1+$/.test(digitos)
  );

  return aplicarMascaraNumerica(numeroOriginal, digitos);
}

function gerarCodigoAutenticidade(codigoOriginal = '') {
  const modelo = String(codigoOriginal || '').trim().toUpperCase();
  if (!modelo) return '';
  const digitosDisponiveis = [...new Set([...modelo].filter(char => /\d/.test(char)))];
  const letrasDisponiveis = [...new Set([...modelo].filter(char => /[A-Z]/.test(char)))];

  let codigo;
  do {
    codigo = [...modelo].map(char => {
      if (/\d/.test(char)) {
        return digitosDisponiveis.length
          ? digitosDisponiveis[randomInt(digitosDisponiveis.length)]
          : randomDigit();
      }
      if (/[A-Z]/.test(char)) {
        return letrasDisponiveis.length
          ? letrasDisponiveis[randomInt(letrasDisponiveis.length)]
          : randomUpperChar();
      }
      return char;
    }).join('');
  } while (codigo === modelo);

  return codigo;
}

function gerarLinhaEnderecoFicticia(linhaOriginal = '', letrasDisponiveis = [], digitosDisponiveis = []) {
  const linha = String(linhaOriginal || '').toUpperCase();
  if (!linha) return '';

  const poolLetras = letrasDisponiveis.length ? letrasDisponiveis : [...ALFABETO_MAIUSCULO];
  const poolDigitos = digitosDisponiveis.length ? digitosDisponiveis : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  let alterou = false;
  let resultado = '';

  for (const char of linha) {
    if (/[A-Z]/.test(char)) {
      const substituto = escolherCharAlternativo(poolLetras, char, randomUpperChar);
      if (substituto !== char) alterou = true;
      resultado += substituto;
      continue;
    }

    if (/\d/.test(char)) {
      const substituto = escolherCharAlternativo(poolDigitos, char, randomDigit);
      if (substituto !== char) alterou = true;
      resultado += substituto;
      continue;
    }

    resultado += char;
  }

  if (alterou) return resultado;

  const primeiroIndiceLetra = [...linha].findIndex(char => /[A-Z]/.test(char));
  if (primeiroIndiceLetra >= 0) {
    const chars = [...resultado];
    chars[primeiroIndiceLetra] = escolherCharAlternativo(poolLetras, chars[primeiroIndiceLetra], randomUpperChar);
    return chars.join('');
  }

  const primeiroIndiceDigito = [...linha].findIndex(char => /\d/.test(char));
  if (primeiroIndiceDigito >= 0) {
    const chars = [...resultado];
    chars[primeiroIndiceDigito] = escolherCharAlternativo(poolDigitos, chars[primeiroIndiceDigito], randomDigit);
    return chars.join('');
  }

  return resultado;
}

function gerarEnderecoFicticio(enderecoLinhasOriginais = []) {
  const linhas = Array.isArray(enderecoLinhasOriginais)
    ? enderecoLinhasOriginais.map(linha => String(linha || '').toUpperCase()).filter(Boolean)
    : [];

  if (!linhas.length) {
    return {
      endereco: '',
      enderecoLinhas: []
    };
  }

  const letrasDisponiveis = [...new Set(linhas.join('').match(/[A-Z]/g) || [])];
  const digitosDisponiveis = [...new Set(linhas.join('').match(/\d/g) || [])];
  const enderecoLinhas = linhas.map(linha =>
    gerarLinhaEnderecoFicticia(linha, letrasDisponiveis, digitosDisponiveis)
  );

  return {
    endereco: enderecoLinhas.join(' '),
    enderecoLinhas
  };
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
  const enderecoFicticio = gerarEnderecoFicticio(originais.enderecoLinhas || []);

  return {
    nome: gerarNomeCompleto(originais.nome || null),
    cpf: gerarCPFUnico(originais.cpf || ''),
    nits: nitsFicticios,
    nomeMae: gerarNomeMaeFicticio(),
    numeroBeneficio: originais.numeroBeneficio
      ? gerarNumeroBeneficio(originais.numeroBeneficio)
      : '',
    codigoAutenticidade: originais.codigoAutenticidade
      ? gerarCodigoAutenticidade(originais.codigoAutenticidade)
      : '',
    endereco: enderecoFicticio.endereco,
    enderecoLinhas: enderecoFicticio.enderecoLinhas
  };
}
