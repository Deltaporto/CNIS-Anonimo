const NUMERO_DE_PROCESSO_PATTERN = /\b\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}\b/;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const NIT_PATTERN = /\b\d{3}\.?\d{5}\.?\d{2}-?\d\b/;
const NIT_ROTULADO_PATTERN = /\b((?:NIT|NIS|PIS(?:\/PASEP)?|PASEP)\s*:?\s*)(\d{11}|\d{10}-\d|\d{3}\.\d{5}\.\d{2}-\d)\b/i;
const BENEFICIO_PATTERN = /\b((?:NB\.?|Benef[ií]cio(?:\s+Prev\.?)?|N[úu]mero\s+do\s+Benef[ií]cio|Esp[eé]cie\/NB)\s*[:.]?\s*(?:--\/)?)(\d{6,12})\b/i;
const TITULO_ELEITOR_PATTERN = /\b((?:T[ií]tulo\s+de\s+Eleitor(?:\s+N[úu]mero)?|T[ií]tulo)\s*:?\s*)(\d{10,13})\b/i;
const IDENTIFICADOR_LONGO_PATTERN = /\b\d{10,15}\b/;
const OAB_PATTERN = /\b(OAB(?:\/[A-Z]{2}| [A-Z]{2})?:?\s*(?:n\.?|nº\.?)?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;
const OAB_ZERO_PATTERN = /\b(0AB(?:\/[A-Z]{2}| [A-Z]{2})?:?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;
const OAB_SOB_PATTERN = /\b(OAB[-\/ ]?[A-Z]{2}\)?\s+sob\s+o\s+n\.?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;
const OAB_COMPACTA_PATTERN = /\b([A-Z]{2})(\d{4,6})\b/;
const CRM_PATTERN = /\b((?:CRM(?:\/[A-Z]{2})?|CREMERJ)\s*)(\d{4,10}|\d{2,3}\.\d{3})\b/i;
const CRM_COMPACTO_PATTERN = /\b(CRM[A-Z]{2})(\d{4,10})\b/i;
const IDENTIDADE_PATTERN = /\b(?:Identidade|Id\.?|Ident\.?|RG)\s*(?:n[.º]?\s*)?(\d[\d.\-\/]{4,8}\d)\b/i;
const TELEFONE_PATTERN = /(?:\(\d{2}\)\s*|\b\d{2}\s*)?\b\d{4,5}[-\s]?\d{4}\b/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ENDERECO_PATTERN = /\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Trav\.?|Pra[cç]a|Rodovia|Rod\.?|Estrada|Estr\.?)\b(?!\s+PERICIAL\b)\s+.+?(?=\s+(?:Processo|CPF|OAB|CRM|Contato|E-?mail|Endere[cç]o|Parte|P[aá]gina|C[aá]lcul[oa])\b|[,;\n]|$)/i;
const CODIGO_VERIFICADOR_PATTERN = /\b(c[oó]digo\s+verificador\s+)(\d{8,14})(v\d+)?\b/i;
const CODIGO_VERIFICADOR_RODAPE_PATTERN = /\b(\d{8,14})(\s*\.?\s*V\d+)\b/i;
const SOBRENOMES_COMUNS = new Set([
  'ALMEIDA',
  'ALVES',
  'ANDRADE',
  'ARAUJO',
  'BARBOSA',
  'CARVALHO',
  'COSTA',
  'DIAS',
  'FERNANDES',
  'FERREIRA',
  'GOMES',
  'LIMA',
  'LOPES',
  'MARTINS',
  'MENDES',
  'MORAES',
  'NASCIMENTO',
  'OLIVEIRA',
  'PEREIRA',
  'RIBEIRO',
  'ROCHA',
  'RODRIGUES',
  'SANTOS',
  'SILVA',
  'SOARES',
  'SOUSA',
  'SOUZA'
]);

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

function redigirDigitos(original) {
  return original.replace(/\d/g, '0');
}

function redigirMascarar(original) {
  return '*'.repeat(original.length);
}
function redigirCodigo(original) {
  return original.replace(/[A-Z]/gi, 'X').replace(/\d/g, '0');
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
function redigirNomeComPrefixo(original) {
  const conectivos = new Set(['de', 'da', 'das', 'do', 'dos', 'e']);
  const tratamentos = new Set(['sr', 'sr.', 'sra', 'sra.', 'senhor', 'senhora']);
  return original.replace(/[A-ZÀ-ÿ][A-ZÀ-ÿ.]+/g, palavra => {
    const normalizada = palavra.toLowerCase();
    if (tratamentos.has(normalizada)) return palavra;
    if (conectivos.has(normalizada)) return ' '.repeat(palavra.length);
    return (palavra[0].toUpperCase() + '.').padEnd(palavra.length, ' ');
  });
}
function _globalizar(pattern, flagsExtras) {
  const base = pattern.flags + 'g' + (flagsExtras || '');
  const flags = [...new Set(base.split(''))].join('');
  return new RegExp(pattern.source, flags);
}

const _paresSeen = new WeakMap();

function _adicionarParUnico(pares, original, substituto) {
  if (!original || !substituto) return;
  if (original.length !== substituto.length) return;

  // ⚡ Bolt: Fast O(1) lookup using WeakMap to prevent O(N^2) scaling without mutating the array
  let seen = _paresSeen.get(pares);
  if (!seen) {
    seen = new Set(pares.map(p => p.original));
    _paresSeen.set(pares, seen);
  }

  if (seen.has(original)) return;
  seen.add(original);
  pares.push({ original, substituto });
}

function _coletarMatches(pattern, texto, flagsExtras = '') {
  return [...texto.matchAll(_globalizar(pattern, flagsExtras))];
}

function _coletarRangesProtegidos(texto) {
  return _coletarMatches(NUMERO_DE_PROCESSO_PATTERN, texto).map(match => ({
    valor: match[0],
    inicio: match.index,
    fim: match.index + match[0].length
  }));
}

function _sobrepoeRangeProtegido(match, ranges) {
  const inicio = match.index;
  const fim = match.index + match[0].length;
  return ranges.some(range => inicio < range.fim && fim > range.inicio);
}

function _semAcentos(valor) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _chaveToken(token) {
  return _semAcentos(token).toUpperCase().replace(/[^A-Z]/g, '');
}

function _ehPrimeiroNomeComum(token) {
  return firstNameSet.has(_semAcentos(token).toLowerCase()) ||
    firstNameSet.has(token.toLowerCase());
}

function _ehSobrenomeComum(token) {
  return SOBRENOMES_COMUNS.has(_chaveToken(token));
}

function _titleCaseNome(nome) {
  return nome.toLowerCase().replace(/[a-zà-ÿ]+/gi, parte =>
    parte.charAt(0).toUpperCase() + parte.slice(1)
  );
}

function _escapeRegExp(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    'ÓRGÃO',
    'ORGAO',
    'JULGADOR',
    'JUIZ',
    'JUIZA',
    'RELATOR',
    'RELATORA',
    'LOCALIZADOR',
    'LOCALIZADORES',
    'RECORRENTE',
    'RECORRIDO',
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

function detectarNomesJuridicosEmCaixaAlta(texto) {
  const nomes = [];
  const palavraNome = '[A-ZÀ-Ý]{2,}';
  const trechoNome = `${palavraNome}(?:\\s+(?:DE|DA|DAS|DO|DOS|${palavraNome})){1,7}`;
  const patterns = [
    new RegExp(`\\b[A-Z]{2}\\d{4,6}\\s*-\\s*(${trechoNome})\\b`, 'g'),
    new RegExp(`\\b(${trechoNome})\\s+[A-Z]{2}\\d{4,6}\\b`, 'g')
  ];

  for (const pattern of patterns) {
    for (const match of texto.matchAll(pattern)) {
      const nome = match[1].trim();
      const palavras = nome.split(/\s+/).filter(p => !['DE', 'DA', 'DAS', 'DO', 'DOS'].includes(p));
      if (palavras.length >= 2) nomes.push(nome);
    }
  }

  return nomes;
}

function detectarNomesPorRotuloProcessual(texto) {
  const nomes = [];
  const conectivos = new Set(['DE', 'DA', 'DAS', 'DO', 'DOS', 'E']);
  const rotulosParte = [
    'PARTE\\s+AUTORA',
    'PARTE\\s+R[ÉE]',
    'AUTOR(?:A)?',
    'AUTOR\\s+PRINCIPAL',
    'R[ÉE]U',
    'REU',
    'REQUERENTE',
    'REQUERID[OA]',
    'BENEFICI[ÁA]RIO(?:\\s+DOS\\s+HONOR[ÁA]RIOS)?',
    'RECORRENTE',
    'RECORRID[OA]',
    'APELANTE',
    'APELAD[OA]',
    'AGRAVANTE',
    'AGRAVAD[OA]',
    'IMPETRANTE',
    'IMPETRAD[OA]',
    'EXEQUENTE',
    'EXECUTAD[OA]',
    'EMBARGANTE',
    'EMBARGAD[OA]',
    'INTERESSAD[OA]',
    'ASSISTID[OA]',
    'NOME'
  ];
  const rotuloParte = `(?:${rotulosParte.join('|')})`;
  const rotulosParada = [
    rotuloParte,
    'ADVOGAD[OA]',
    'PROCURADOR(?:A)?',
    'REPRESENTANTE',
    'CPF',
    'CNPJ',
    'NIT',
    'NIS',
    'OAB',
    'CRM',
    'RG',
    'PROCESSO',
    'PROCEDIMENTO',
    'SENTEN[ÇC]A',
    'PODER',
    'JUSTI[ÇC]A',
    'JUIZ(?:A)?',
    'VARA',
    'SUBSE[ÇC][AÃ]O'
  ].join('|');
  const palavraNome = '[A-ZÀ-Ý]{2,}';
  const trechoNome = `${palavraNome}(?:\\s+(?:DE|DA|DAS|DO|DOS|E|${palavraNome})){1,10}`;
  const pattern = new RegExp(
    `\\b${rotuloParte}\\b(?:\\(S\\))?\\s*(?::|-)?\\s*(${trechoNome})(?=\\s+(?:${rotulosParada})\\b|\\s*[,;.]|$)`,
    'gi'
  );

  for (const match of texto.matchAll(pattern)) {
    const nome = match[1].trim().replace(/[.,;:]+$/g, '').trim();
    const semConectivos = nome.split(/\s+/).filter(p => !conectivos.has(_chaveToken(p)));
    const entePublico = /\b(?:INSS|INSTITUTO\s+NACIONAL|UNI[AÃ]O|FAZENDA\s+NACIONAL|MUNIC[IÍ]PIO|ESTADO\s+(?:DO|DA|DE)|DISTRITO\s+FEDERAL|MINIST[ÉE]RIO\s+P[ÚU]BLICO|DEFENSORIA\s+P[ÚU]BLICA|PROCURADORIA)\b/i.test(nome);
    if (semConectivos.length >= 2 && !entePublico) nomes.push(nome);
  }

  return nomes;
}

function adicionarNomeComVariantes(pares, nome) {
  _adicionarParUnico(pares, nome, redigirNome(nome));

  const compacto = nome.replace(/\s+/g, '');
  if (compacto.length >= 8 && compacto !== nome) {
    _adicionarParUnico(pares, compacto, redigirMascarar(compacto));
  }

  const indicesEspaco = [];
  for (let i = 0; i < nome.length; i++) {
    if (nome[i] === ' ') indicesEspaco.push(i);
  }

  for (const idx of indicesEspaco) {
    const variante = nome.slice(0, idx) + nome.slice(idx + 1);
    if (variante.length < nome.length - 1) continue;
    _adicionarParUnico(pares, variante, redigirNome(variante));
  }
}

function adicionarAliasesConservadoresNomeDetectado(pares, texto, nome) {
  const conectivos = new Set(['DE', 'DA', 'DAS', 'DO', 'DOS', 'E']);
  const principais = nome.trim().split(/\s+/).filter(p => !conectivos.has(_chaveToken(p)));
  if (principais.length < 2) return;

  const primeiro = principais[0];
  const ultimo = principais[principais.length - 1];
  const penultimo = principais[principais.length - 2];

  if (!_ehPrimeiroNomeComum(primeiro) || !_ehSobrenomeComum(ultimo)) {
    _adicionarAliasNomeSePresente(pares, texto, `${primeiro} ${ultimo}`);
  }

  if (!_ehSobrenomeComum(ultimo)) {
    _adicionarAliasNomeSePresente(pares, texto, ultimo);
  }

  if (principais.length >= 3 && (!_ehSobrenomeComum(penultimo) || !_ehSobrenomeComum(ultimo))) {
    _adicionarAliasNomeSePresente(pares, texto, `${primeiro} ${penultimo}`);
    _adicionarAliasNomeSePresente(pares, texto, `${penultimo} ${ultimo}`);
  }
}

function _adicionarAliasNomeSePresente(pares, texto, alias) {
  if (!alias || alias.length < 5) return;
  const formas = new Set([alias, _titleCaseNome(alias)]);
  for (const forma of formas) {
    if (texto.includes(forma)) adicionarNomeComVariantes(pares, forma);
  }
}

function _adicionarAliasesComTratamento(pares, texto, alvos) {
  for (const alvo of alvos) {
    if (!alvo || alvo.length < 4) continue;
    const pattern = new RegExp(`\\b(?:Sr\\.?|Sra\\.?|Senhor(?:a)?)\\s+${_escapeRegExp(alvo)}\\b`, 'gi');
    for (const match of texto.matchAll(pattern)) {
      _adicionarParUnico(pares, match[0], redigirNomeComPrefixo(match[0]));
    }
  }
}

function adicionarAliasesNomeParte(pares, texto, nome) {
  const conectivos = new Set(['DE', 'DA', 'DAS', 'DO', 'DOS', 'E']);
  const palavras = nome.trim().split(/\s+/);
  const principais = palavras.filter(p => !conectivos.has(_chaveToken(p)));
  if (principais.length < 2) return;

  const primeiro = principais[0];
  const ultimo = principais[principais.length - 1];
  const penultimo = principais[principais.length - 2];
  const primeiroIncomum = !_ehPrimeiroNomeComum(primeiro);
  const ultimoIncomum = !_ehSobrenomeComum(ultimo);
  const penultimoIncomum = !_ehSobrenomeComum(penultimo);

  if (primeiroIncomum || ultimoIncomum) {
    _adicionarAliasNomeSePresente(pares, texto, `${primeiro} ${ultimo}`);
  }

  if (principais.length >= 3) {
    _adicionarAliasNomeSePresente(pares, texto, `${primeiro} ${penultimo} ${ultimo}`);
    if (penultimoIncomum || ultimoIncomum) {
      _adicionarAliasNomeSePresente(pares, texto, `${penultimo} ${ultimo}`);
    }

    const intermediarios = principais.slice(1, -1);
    const comIniciais = [primeiro, ...intermediarios.map(p => p[0] + '.'), ultimo].join(' ');
    const comIniciaisSemPonto = [primeiro, ...intermediarios.map(p => p[0]), ultimo].join(' ');
    _adicionarAliasNomeSePresente(pares, texto, comIniciais);
    _adicionarAliasNomeSePresente(pares, texto, comIniciaisSemPonto);
  }

  if (primeiroIncomum) {
    _adicionarAliasNomeSePresente(pares, texto, primeiro);
    _adicionarAliasesComTratamento(pares, texto, [primeiro]);
  }
  if (!primeiroIncomum && nome.length >= 20) {
    _adicionarAliasNomeSePresente(pares, texto, primeiro);
  }
  if (penultimoIncomum || ultimoIncomum) {
    _adicionarAliasNomeSePresente(pares, texto, `${primeiro} ${penultimo}`);
    _adicionarAliasesComTratamento(pares, texto, [`${penultimo} ${ultimo}`, ultimo]);
  }
}

function mapearSubstitutos(texto) {
  const pares = [];

  const processosProtegidos = _coletarRangesProtegidos(texto);
  const numerosProcesso = new Set(processosProtegidos.map(match => match.valor));

  for (const m of _coletarMatches(CPF_PATTERN, texto)) {
    if (!validarCPF(m[0]) || _sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    _adicionarParUnico(pares, m[0], redigirCPF(m[0]));
  }

  for (const m of _coletarMatches(NIT_ROTULADO_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, nit] = m;
    _adicionarParUnico(pares, full, label + redigirDigitos(nit));
    const digitos = nit.replace(/\D/g, '');
    if (digitos !== nit) _adicionarParUnico(pares, digitos, '0'.repeat(digitos.length));
  }

  for (const m of _coletarMatches(NIT_PATTERN, texto)) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    _adicionarParUnico(pares, m[0], redigirDigitos(m[0]));
    const digitos = m[0].replace(/\D/g, '');
    if (digitos !== m[0]) _adicionarParUnico(pares, digitos, '0'.repeat(digitos.length));
  }

  for (const m of _coletarMatches(BENEFICIO_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, label + '0'.repeat(num.length));
    _adicionarParUnico(pares, num, '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(TITULO_ELEITOR_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, label + '0'.repeat(num.length));
    _adicionarParUnico(pares, num, '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(OAB_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of _coletarMatches(OAB_ZERO_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of _coletarMatches(OAB_SOB_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
  }

  for (const m of _coletarMatches(/\b([A-ZÀ-Ý]{3,})\s+([A-Z]{2})(\d{4,6})\b/, texto)) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, nome, uf, num] = m;
    _adicionarParUnico(pares, full, `${redigirNome(nome)} ${uf}${'0'.repeat(num.length)}`);
  }

  for (const m of _coletarMatches(OAB_COMPACTA_PATTERN, texto)) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, uf, num] = m;
    _adicionarParUnico(pares, full, uf + '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(CRM_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
    _adicionarParUnico(pares, num, '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(CRM_COMPACTO_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, num] = m;
    _adicionarParUnico(pares, full, label + '0'.repeat(num.length));
    _adicionarParUnico(pares, num, '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(IDENTIDADE_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, num] = m;
    const label = full.slice(0, full.length - num.length);
    _adicionarParUnico(pares, full, redigirNumerico(label, num));
    _adicionarParUnico(pares, num, '0'.repeat(num.length));
  }

  for (const m of _coletarMatches(TELEFONE_PATTERN, texto)) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    _adicionarParUnico(pares, m[0], m[0].replace(/\d/g, '0'));
  }

  for (const m of _coletarMatches(EMAIL_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    _adicionarParUnico(pares, m[0], redigirMascarar(m[0]));
  }

  for (const m of _coletarMatches(ENDERECO_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    _adicionarParUnico(pares, m[0], redigirMascarar(m[0]));
  }

  for (const m of _coletarMatches(CODIGO_VERIFICADOR_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, label, codigo, sufixo = ''] = m;
    _adicionarParUnico(pares, full, label + redigirCodigo(codigo) + sufixo);
  }

  for (const m of _coletarMatches(CODIGO_VERIFICADOR_RODAPE_PATTERN, texto, 'i')) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos)) continue;
    const [full, codigo, sufixo] = m;
    _adicionarParUnico(pares, full, redigirCodigo(codigo) + sufixo);
  }

  for (const m of _coletarMatches(IDENTIFICADOR_LONGO_PATTERN, texto)) {
    if (_sobrepoeRangeProtegido(m, processosProtegidos) || /^0+$/.test(m[0])) continue;
    _adicionarParUnico(pares, m[0], '0'.repeat(m[0].length));
  }

  for (const nome of detectarNomesNoTexto(texto)) {
    if (numerosProcesso.has(nome)) continue;
    adicionarNomeComVariantes(pares, nome);
    adicionarAliasesConservadoresNomeDetectado(pares, texto, nome);
  }

  for (const nome of detectarNomesJuridicosEmCaixaAlta(texto)) {
    if (numerosProcesso.has(nome)) continue;
    adicionarNomeComVariantes(pares, nome);
    adicionarAliasesConservadoresNomeDetectado(pares, texto, nome);

    const palavras = nome.trim().split(/\s+/);
    if (palavras.length >= 4) {
      const prefixo = palavras.slice(0, -1).join(' ');
      adicionarNomeComVariantes(pares, prefixo);
    }
  }

  const nomesPartes = detectarNomesPorRotuloProcessual(texto);
  for (const nome of nomesPartes) {
    if (numerosProcesso.has(nome)) continue;
    adicionarNomeComVariantes(pares, nome);
    adicionarAliasesNomeParte(pares, texto, nome);
  }

  return pares;
}
function contarAchados(texto) {
  const processosProtegidos = _coletarRangesProtegidos(texto);

  const numerosProcesso = [...new Set([...texto.matchAll(_globalizar(NUMERO_DE_PROCESSO_PATTERN))].map(m => m[0]))];
  const cpfs = [...texto.matchAll(_globalizar(CPF_PATTERN))].filter(m => validarCPF(m[0])).length;
  const nits = [...new Set([
    ...[...texto.matchAll(_globalizar(NIT_ROTULADO_PATTERN, 'i'))].map(m => m[2].replace(/\D/g, '')),
    ...[...texto.matchAll(_globalizar(NIT_PATTERN))].map(m => m[0].replace(/\D/g, ''))
  ].filter(Boolean))].length;
  const identificadores = [...texto.matchAll(_globalizar(IDENTIFICADOR_LONGO_PATTERN))]
    .filter(m => !_sobrepoeRangeProtegido(m, processosProtegidos) && !/^0+$/.test(m[0]))
    .length;
  const oabs = [...texto.matchAll(_globalizar(OAB_PATTERN, 'i'))].length +
    [...texto.matchAll(_globalizar(OAB_ZERO_PATTERN, 'i'))].length +
    [...texto.matchAll(_globalizar(OAB_SOB_PATTERN, 'i'))].length +
    [...texto.matchAll(_globalizar(OAB_COMPACTA_PATTERN))].length;
  const crms = [...texto.matchAll(_globalizar(CRM_PATTERN, 'i'))].length +
    [...texto.matchAll(_globalizar(CRM_COMPACTO_PATTERN, 'i'))].length;
  const nomes = detectarNomesNoTexto(texto).length +
    detectarNomesJuridicosEmCaixaAlta(texto).length +
    detectarNomesPorRotuloProcessual(texto).length;
  const enderecos = [...texto.matchAll(_globalizar(ENDERECO_PATTERN, 'i'))].length;
  return { cpfs, nits, oabs, crms, nomes, enderecos, identificadores, numerosProcesso };
}
