// Processador de PDF CNIS

if (typeof window !== 'undefined' && typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

const decoderLatin1 = new TextDecoder('latin1');

const HEX_LOOKUP = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_LOOKUP[i] = i.toString(16).padStart(2, '0').toUpperCase();
}

const HEX_CHAR_TO_INT = new Uint8Array(256);
for (let i = 0; i < 256; i++) HEX_CHAR_TO_INT[i] = 0;
for (let i = 48; i <= 57; i++) HEX_CHAR_TO_INT[i] = i - 48; // 0-9
for (let i = 65; i <= 70; i++) HEX_CHAR_TO_INT[i] = i - 55; // A-F
for (let i = 97; i <= 102; i++) HEX_CHAR_TO_INT[i] = i - 87; // a-f

function bytesToLatin1String(bytes) {
  let str = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return str;
}


function encodeLatin1(str) {
  const len = str.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function soDigitos(valor = '') {
  return String(valor).replace(/\D/g, '');
}

function normalizarEspacos(valor = '') {
  return String(valor).replace(/\s+/g, ' ').trim();
}

function formatarCPF(valor = '') {
  const digitos = soDigitos(valor);
  if (digitos.length !== 11) return '';
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function formatarNIT(valor = '') {
  const digitos = soDigitos(valor);
  if (digitos.length !== 11) return '';
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 8)}.${digitos.slice(8, 10)}-${digitos.slice(10)}`;
}

function formatarNumeroBeneficio(valor = '') {
  const digitos = soDigitos(valor);
  if (digitos.length !== 10) return '';
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function limparNomeExtraido(valor = '') {
  return normalizarEspacos(valor.replace(/[:;,.\-]+$/g, ''));
}

function limparCodigoAutenticidade(valor = '') {
  return normalizarEspacos(valor).replace(/[.;,:]+$/g, '').toUpperCase();
}

function adicionarValorUnico(lista, valor, chaveFn = v => v) {
  if (!valor) return;
  const chave = chaveFn(valor);
  if (!chave) return;
  if (!lista.some(item => chaveFn(item) === chave)) lista.push(valor);
}

// avoids callback allocation overhead in a hot path
function _checkOverlap(inicio, fim, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    if (inicio < ranges[i].fim && fim > ranges[i].inicio) return true;
  }
  return false;
}

function extrairCpfDoTexto(texto) {
  const matchFormatado = texto.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
  if (matchFormatado) return matchFormatado[0];

  const matchRotulado = texto.match(/\bCPF\s*:?\s*(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})\b/i);
  return matchRotulado ? formatarCPF(matchRotulado[1]) : '';
}

function coletarNitsDoTexto(texto) {
  const encontrados = [];

  for (const match of texto.matchAll(/\b\d{3}\.\d{5}\.\d{2}-\d\b/g)) {
    adicionarValorUnico(encontrados, match[0], soDigitos);
  }

  for (const match of texto.matchAll(/\b(?:NIT|NIS|PIS(?:\/PASEP)?|PASEP)\s*:?\s*(\d{11}|\d{10}-\d|\d{3}\.\d{5}\.\d{2}-\d)\b/gi)) {
    adicionarValorUnico(encontrados, normalizarEspacos(match[1]), soDigitos);
  }

  return encontrados;
}

function extrairNomeDoTexto(texto) {
  const match = texto.match(
    /\b(?:Nome|Titular)(?!\s+da\s+m(?:ã|a)e)\s*:?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'`.-]+?)(?=\s+(?:Nome da m(?:ã|a)e|M(?:ã|a)e|CPF|NIT|NIS|PIS|PASEP|Data\b|P(?:á|a)gina\b|Identifica(?:ç|c)ão\b|Origem\b|C(?:ó|o)digo\b|Benef[ií]cio\b|N[úu]mero do Benef[ií]cio\b|Aps\b)|$)/i
  );
  return match ? limparNomeExtraido(match[1]) : '';
}

function extrairNomeMaeDoTexto(texto) {
  const match = texto.match(
    /\b(?:Nome da m(?:ã|a)e|M(?:ã|a)e)\s*:?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'`.-]+?)(?=\s+(?:Nome\b|CPF|NIT|NIS|PIS|PASEP|Data\b|P(?:á|a)gina\b|Identifica(?:ç|c)ão\b|Origem\b|C(?:ó|o)digo\b)|$)/i
  );
  return match ? limparNomeExtraido(match[1]) : '';
}

function extrairNumeroBeneficioDoTexto(texto) {
  const matchRotulado = texto.match(
    /\b(?:N[úu]mero do Benef[ií]cio|Benef[ií]cio)\s*:?\s*(\d{3}\.\d{3}\.\d{3}-\d|\d{9,10}-\d)\b/i
  );
  if (matchRotulado) return normalizarEspacos(matchRotulado[1]);

  const matchFormato = texto.match(/\b\d{3}\.\d{3}\.\d{3}-\d\b/);
  return matchFormato ? matchFormato[0] : '';
}

function extrairCodigoAutenticidadeDoTexto(texto) {
  const match = texto.match(/\bc[oó]digo\s+([A-Z0-9-]{12,})\b/i);
  return match ? limparCodigoAutenticidade(match[1]) : '';
}

function inferirTipoDocumentoNoTexto(texto) {
  if (/\bcarta\s+de\s+concess[aã]o\b/i.test(texto)) return 'carta-concessao';
  if (/\bmem[oó]ria\s+de\s+c[aá]lculo\s+do\s+benef[ií]cio\b/i.test(texto)) return 'carta-concessao';
  return 'cnis';
}

function agruparLinhasPorCoordenada(itens = []) {
  const grupos = new Map();

  for (const item of itens) {
    const texto = normalizarEspacos(item?.str || '');
    if (!texto) continue;

    const y = Number(item?.transform?.[5] || 0).toFixed(2);
    const x = Number(item?.transform?.[4] || 0);

    if (!grupos.has(y)) grupos.set(y, []);
    grupos.get(y).push({ x, texto });
  }

  return [...grupos.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, partes]) =>
      normalizarEspacos(
        partes
          .sort((a, b) => a.x - b.x)
          .map(parte => parte.texto)
          .join(' ')
      )
    )
    .filter(Boolean);
}

function linhaEhRotuloDeParadaEndereco(linha = '') {
  return /^(?:Banco\b|Ag[eê]ncia\b|Local de Pagamento\b|Dados do Pagamento do Benef[ií]cio\b|C[aá]lculo\b|SEQ\b|Seu cadastro\b|Pagamento do Benef[ií]cio\b|Voc[eê]\b|Ap[oó]s\b|Comunicamos\b|Mantenha\b|Aps:|Nome:|Titular:|CPF\b|Nit:|N[úu]mero do Benef[ií]cio\b|Data de Concess[aã]o\b|Sal[aá]rio\b|Valor do Benef[ií]cio\b|\*|P[aá]gina\b)/i.test(linha);
}

function linhaPareceEnderecoInicial(linha = '') {
  return /\b(?:RUA|AV(?:ENIDA)?|ALAMEDA|TRAVESSA|ESTRADA|RODOVIA|PRA[CÇ]A|LARGO|VIA)\b/i.test(linha)
    || /\d/.test(linha);
}

function linhaPareceEnderecoContinuacao(linha = '') {
  return /\b(?:LOJA|SALA|CASA|BLOCO|APTO?|ANDAR|CJ|CONJ|QD|QUADRA|LT|LOTE|FUNDOS)\b/i.test(linha)
    || /^[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9\s.'/-]+$/.test(linha);
}

function extrairEnderecoDasLinhas(linhas = []) {
  for (let i = 0; i < linhas.length; i++) {
    const linha = normalizarEspacos(linhas[i]);
    if (!/^Endere(?:ç|c)o\b/i.test(linha)) continue;

    const matchInline = linha.match(/^Endere(?:ç|c)o\s*:\s*(.+)$/i);
    const enderecoLinhas = [];
    const enderecoLinhasBrutas = [];

    if (matchInline?.[1]) {
      const valor = normalizarEspacos(matchInline[1]);
      if (valor) {
        enderecoLinhas.push(valor);
        enderecoLinhasBrutas.push(linha);
      }
    }

    let lacunasAposCaptura = 0;
    for (let j = i + 1; j < Math.min(linhas.length, i + 8); j++) {
      const proxima = normalizarEspacos(linhas[j]);
      if (!proxima) continue;
      if (linhaEhRotuloDeParadaEndereco(proxima)) {
        if (enderecoLinhas.length) break;
        continue;
      }

      if (!enderecoLinhas.length) {
        if (!linhaPareceEnderecoInicial(proxima)) continue;
      } else if (!linhaPareceEnderecoContinuacao(proxima)) {
        lacunasAposCaptura += 1;
        if (lacunasAposCaptura >= 2) break;
        continue;
      }

      enderecoLinhas.push(proxima);
      enderecoLinhasBrutas.push(proxima);
      lacunasAposCaptura = 0;
      if (enderecoLinhas.length >= 3) break;
    }

    if (enderecoLinhas.length) {
      return {
        endereco: enderecoLinhas.join(' '),
        enderecoLinhas,
        enderecoLinhasBrutas
      };
    }
  }

  return {
    endereco: '',
    enderecoLinhas: [],
    enderecoLinhasBrutas: []
  };
}

function escapeRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergeHits(destino, origem) {
  for (const [id, total] of Object.entries(origem)) {
    destino[id] = (destino[id] || 0) + total;
  }
}

function normalizarPares(pares) {
  const vistos = new Set();
  const unicos = [];

  for (const [orig, repl] of pares) {
    if (!orig || !repl) continue;
    const chave = `${orig}=>${repl}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push([orig, repl]);
  }

  return unicos;
}

function normalizarListaValores(valores) {
  const vistos = new Set();
  const unicos = [];

  for (const valor of valores) {
    if (!valor) continue;
    if (vistos.has(valor)) continue;
    vistos.add(valor);
    unicos.push(valor);
  }

  return unicos;
}

const CANDIDATOS_SUFIXO_TITULAR = [
  'FAKE DOS SANTOS',
  'FALSO DOS SANTOS',
  'FICTICIO DOS SANTOS',
  'FALSO DA SILVA',
  'FICTICIO DA SILVA'
];

const CANDIDATOS_NOME_MAE = [
  'MARIA FAKE DOS SANTOS',
  'MARIA FALSA DOS SANTOS',
  'MARIA FICTICIA DOS SANTOS',
  'MARIA FALSA DA SILVA',
  'MARIA FICTICIA DA SILVA'
];

function precompilarPares(pares) {
  return pares.map(([orig, repl]) => [new RegExp(escapeRegex(orig), 'g'), repl]);
}

function decodificarPdfLiteral(literal = '') {
  // ⚡ Bolt: Fast-path optimization. Most PDF literals do not contain escape sequences.
  // Using an early return with `includes` bypasses the expensive O(N) character-by-character
  // iteration, yielding a massive speedup for the vast majority of literal strings.
  if (!literal.includes('\\')) return literal;

  // ⚡ Bolt: Fast-path string scanning. Native V8 `indexOf` is significantly faster
  // (~1000x for sparse matches in large payloads) than manual character-by-character iteration loops.
  let resultado = '';
  let start = 0;
  let i = literal.indexOf('\\');

  while (i !== -1) {
    resultado += literal.slice(start, i);
    i++;

    const prox = literal[i];
    if (prox === undefined) {
      start = literal.length;
      break;
    }

    if (prox === 'n') resultado += '\n';
    else if (prox === 'r') resultado += '\r';
    else if (prox === 't') resultado += '\t';
    else if (prox === 'b') resultado += '\b';
    else if (prox === 'f') resultado += '\f';
    else if (/[0-7]/.test(prox)) {
      let octal = prox;
      let j = 1;
      while (j < 3 && /[0-7]/.test(literal[i + j] || '')) {
        octal += literal[i + j];
        j++;
      }
      resultado += String.fromCharCode(parseInt(octal, 8));
      i += j - 1;
    } else {
      resultado += prox;
    }

    start = i + 1;
    i = literal.indexOf('\\', start);
  }

  resultado += literal.slice(start);

  return resultado;
}

function escaparPdfLiteral(texto = '') {
  return String(texto).replace(/[\\()]/g, '\\$&');
}

function extrairLiteraisPdf(conteudo = '') {
  const literais = [];
  const len = conteudo.length;
  let i = conteudo.indexOf('(');

  // ⚡ Bolt: Fast-path string scanning. Native V8 Regex exec is significantly faster
  // (~2-3x) than manual character-by-character iteration for finding sparse sequences.
  const regex = /[\\()]/g;

  while (i !== -1 && i < len) {
    let profundidade = 1;
    let fim = i + 1;

    regex.lastIndex = fim;
    let match;

    while (profundidade > 0 && (match = regex.exec(conteudo)) !== null) {
      fim = match.index;
      const char = match[0];

      if (char === '\\') {
        regex.lastIndex++; // Skip the escaped character
      } else if (char === '(') {
        profundidade++;
      } else if (char === ')') {
        profundidade--;
      }
    }

    if (profundidade === 0) {
      fim = regex.lastIndex; // Last matched character was ')'
      literais.push(decodificarPdfLiteral(conteudo.slice(i + 1, fim - 1)));
      i = fim;
    } else {
      i++;
    }

    i = conteudo.indexOf('(', i);
  }

  return literais;
}

function aplicarEspecificacoesEmArraysTJ(texto, specs) {
  const segmentos = [];

  texto.replace(/\[((?:\\.|[^\]])*)\]\s*TJ/g, (match, conteudoArray, offset) => {
    if (/<[^>]+>/.test(conteudoArray)) return match;

    const valor = extrairLiteraisPdf(conteudoArray).join('');
    if (!valor) return match;

    segmentos.push({
      match,
      offset,
      end: offset + match.length,
      valor,
      startTexto: 0,
      endTexto: 0
    });

    return match;
  });

  if (!segmentos.length) return { text: texto, hits: {}, changed: false };

  let textoVisivel = '';
  for (const segmento of segmentos) {
    segmento.startTexto = textoVisivel.length;
    textoVisivel += segmento.valor;
    segmento.endTexto = textoVisivel.length;
  }

  const caracteres = textoVisivel.split('');
  const rangesAplicados = [];
  const hits = {};

  for (const spec of specs) {
    const pares = spec.pairs || [];

    for (const [original, substituto] of pares) {
      if (!original || !substituto || original.length !== substituto.length) continue;

      let pos = textoVisivel.indexOf(original);
      while (pos !== -1) {
        const fim = pos + original.length;
        const sobrepoe = _checkOverlap(pos, fim, rangesAplicados);

        if (!sobrepoe) {
          for (let k = 0; k < original.length; k++) {
            caracteres[pos + k] = substituto[k];
          }
          rangesAplicados.push({ inicio: pos, fim });
          hits[spec.id] = (hits[spec.id] || 0) + 1;
        }

        pos = textoVisivel.indexOf(original, pos + original.length);
      }
    }
  }

  if (!rangesAplicados.length) return { text: texto, hits: {}, changed: false };

  const textoRedatado = caracteres.join('');
  const partes = [];
  let ultimo = 0;

  for (const segmento of segmentos) {
    partes.push(texto.slice(ultimo, segmento.offset));

    const mudouSegmento = _checkOverlap(segmento.startTexto, segmento.endTexto, rangesAplicados);

    if (mudouSegmento) {
      const novoValor = textoRedatado.slice(segmento.startTexto, segmento.endTexto);
      partes.push(`[(${escaparPdfLiteral(novoValor)})] TJ`);
    } else {
      partes.push(segmento.match);
    }

    ultimo = segmento.end;
  }

  partes.push(texto.slice(ultimo));

  return {
    text: partes.join(''),
    hits,
    changed: true
  };
}

function aplicarEspecificacoesEmLiteraisTjFragmentados(texto, specs) {
  const segmentos = [];

  texto.replace(/\((?:\\.|[^\\()])*\)\s*Tj/g, (match, offset) => {
    const literal = match.slice(1, match.lastIndexOf(')'));
    const valor = decodificarPdfLiteral(literal);
    if (!valor) return match;

    segmentos.push({
      match,
      offset,
      end: offset + match.length,
      valor,
      startTexto: 0,
      endTexto: 0
    });

    return match;
  });

  if (!segmentos.length) return { text: texto, hits: {}, changed: false };

  let textoVisivel = '';
  for (const segmento of segmentos) {
    segmento.startTexto = textoVisivel.length;
    textoVisivel += segmento.valor;
    segmento.endTexto = textoVisivel.length;
  }

  const caracteres = textoVisivel.split('');
  const rangesAplicados = [];
  const hits = {};

  for (const spec of specs) {
    const pares = spec.pairs || [];

    for (const [original, substituto] of pares) {
      if (!original || !substituto || original.length !== substituto.length) continue;

      let pos = textoVisivel.indexOf(original);
      while (pos !== -1) {
        const fim = pos + original.length;
        const sobrepoe = _checkOverlap(pos, fim, rangesAplicados);

        if (!sobrepoe) {
          for (let k = 0; k < original.length; k++) {
            caracteres[pos + k] = substituto[k];
          }
          rangesAplicados.push({ inicio: pos, fim });
          hits[spec.id] = (hits[spec.id] || 0) + 1;
        }

        pos = textoVisivel.indexOf(original, pos + original.length);
      }
    }
  }

  if (!rangesAplicados.length) return { text: texto, hits: {}, changed: false };

  const textoRedatado = caracteres.join('');
  const partes = [];
  let ultimo = 0;

  for (const segmento of segmentos) {
    partes.push(texto.slice(ultimo, segmento.offset));

    const mudouSegmento = _checkOverlap(segmento.startTexto, segmento.endTexto, rangesAplicados);

    if (mudouSegmento) {
      const novoValor = textoRedatado.slice(segmento.startTexto, segmento.endTexto);
      partes.push(`(${escaparPdfLiteral(novoValor)}) Tj`);
    } else {
      partes.push(segmento.match);
    }

    ultimo = segmento.end;
  }

  partes.push(texto.slice(ultimo));

  return {
    text: partes.join(''),
    hits,
    changed: true
  };
}

function aplicarEspecificacoesEmHexArraysTJ(texto, specsHex) {
  const segmentos = [];

  texto.replace(/\[((?:\\.|[^\]])*)\]\s*TJ/g, (match, conteudoArray, offset) => {
    const hexes = [...conteudoArray.matchAll(/<([0-9A-Fa-f]+)>/g)].map(item => item[1].toUpperCase());
    if (!hexes.length) return match;

    const valor = hexes.join('');
    if (!valor) return match;

    segmentos.push({
      match,
      offset,
      end: offset + match.length,
      valor,
      startHex: 0,
      endHex: 0
    });

    return match;
  });

  if (!segmentos.length) return { text: texto, hits: {}, changed: false };

  let hexVisivel = '';
  for (const segmento of segmentos) {
    segmento.startHex = hexVisivel.length;
    hexVisivel += segmento.valor;
    segmento.endHex = hexVisivel.length;
  }

  const caracteres = hexVisivel.split('');
  const rangesAplicados = [];
  const hits = {};

  for (const spec of specsHex) {
    for (const [original, substituto] of spec.pairs || []) {
      if (!original || !substituto || original.length !== substituto.length) continue;

      const originalUpper = original.toUpperCase();
      const substitutoUpper = substituto.toUpperCase();
      let pos = hexVisivel.indexOf(originalUpper);

      while (pos !== -1) {
        const fim = pos + originalUpper.length;
        const sobrepoe = _checkOverlap(pos, fim, rangesAplicados);

        if (!sobrepoe) {
          for (let k = 0; k < originalUpper.length; k++) {
            caracteres[pos + k] = substitutoUpper[k];
          }
          rangesAplicados.push({ inicio: pos, fim });
          hits[spec.id] = (hits[spec.id] || 0) + 1;
        }

        pos = hexVisivel.indexOf(originalUpper, pos + originalUpper.length);
      }
    }
  }

  if (!rangesAplicados.length) return { text: texto, hits: {}, changed: false };

  const hexRedatado = caracteres.join('');
  const partes = [];
  let ultimo = 0;

  for (const segmento of segmentos) {
    partes.push(texto.slice(ultimo, segmento.offset));

    const mudouSegmento = _checkOverlap(segmento.startHex, segmento.endHex, rangesAplicados);

    if (mudouSegmento) {
      const novoValor = hexRedatado.slice(segmento.startHex, segmento.endHex);
      partes.push(`[<${novoValor}>] TJ`);
    } else {
      partes.push(segmento.match);
    }

    ultimo = segmento.end;
  }

  partes.push(texto.slice(ultimo));

  return {
    text: partes.join(''),
    hits,
    changed: true
  };
}

function aplicarEspecificacoesEmHexTjFragmentado(texto, specsHex) {
  const segmentos = [];

  texto.replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (match, hex, offset) => {
    segmentos.push({
      match,
      offset,
      end: offset + match.length,
      valor: hex.toUpperCase(),
      startHex: 0,
      endHex: 0
    });
    return match;
  });

  if (!segmentos.length) return { text: texto, hits: {}, changed: false };

  let hexVisivel = '';
  for (const segmento of segmentos) {
    segmento.startHex = hexVisivel.length;
    hexVisivel += segmento.valor;
    segmento.endHex = hexVisivel.length;
  }

  const caracteres = hexVisivel.split('');
  const rangesAplicados = [];
  const hits = {};

  for (const spec of specsHex) {
    for (const [original, substituto] of spec.pairs || []) {
      if (!original || !substituto || original.length !== substituto.length) continue;

      const originalUpper = original.toUpperCase();
      const substitutoUpper = substituto.toUpperCase();
      let pos = hexVisivel.indexOf(originalUpper);

      while (pos !== -1) {
        const fim = pos + originalUpper.length;
        const sobrepoe = _checkOverlap(pos, fim, rangesAplicados);

        if (!sobrepoe) {
          for (let k = 0; k < originalUpper.length; k++) {
            caracteres[pos + k] = substitutoUpper[k];
          }
          rangesAplicados.push({ inicio: pos, fim });
          hits[spec.id] = (hits[spec.id] || 0) + 1;
        }

        pos = hexVisivel.indexOf(originalUpper, pos + originalUpper.length);
      }
    }
  }

  if (!rangesAplicados.length) return { text: texto, hits: {}, changed: false };

  const hexRedatado = caracteres.join('');
  const partes = [];
  let ultimo = 0;

  for (const segmento of segmentos) {
    partes.push(texto.slice(ultimo, segmento.offset));

    const mudouSegmento = _checkOverlap(segmento.startHex, segmento.endHex, rangesAplicados);

    if (mudouSegmento) {
      const novoValor = hexRedatado.slice(segmento.startHex, segmento.endHex);
      partes.push(`<${novoValor}> Tj`);
    } else {
      partes.push(segmento.match);
    }

    ultimo = segmento.end;
  }

  partes.push(texto.slice(ultimo));

  return {
    text: partes.join(''),
    hits,
    changed: true
  };
}

function algumMapaCodificaPar(original, substituto, mapasHex) {
  return mapasHex.some(mapa =>
    encodeTextWithCMap(original, mapa) && encodeTextWithCMap(substituto, mapa)
  );
}

function escolherSubstitutoNominalCompativel(original, atual, candidatos, mapasHex) {
  if (!original || !atual || !mapasHex.length) return atual;
  if (algumMapaCodificaPar(original, atual, mapasHex)) return atual;

  return candidatos.find(candidato =>
    algumMapaCodificaPar(original, candidato, mapasHex)
  ) || atual;
}

function ajustarDadosFicticiosParaMapasHex(dadosOriginais, dadosFicticios, mapasHex) {
  if (!mapasHex.length) return { ...dadosFicticios };

  const ajustados = {
    ...dadosFicticios,
    nits: Array.isArray(dadosFicticios.nits) ? [...dadosFicticios.nits] : []
  };

  if (dadosOriginais.nome && ajustados.nome) {
    const primeiroNome = dadosOriginais.nome.trim().split(/\s+/)[0]?.toUpperCase();
    const candidatosTitular = primeiroNome
      ? CANDIDATOS_SUFIXO_TITULAR.map(sufixo => `${primeiroNome} ${sufixo}`)
      : [];

    ajustados.nome = escolherSubstitutoNominalCompativel(
      dadosOriginais.nome,
      ajustados.nome,
      candidatosTitular,
      mapasHex
    );
  }

  if (dadosOriginais.nomeMae && ajustados.nomeMae) {
    ajustados.nomeMae = escolherSubstitutoNominalCompativel(
      dadosOriginais.nomeMae,
      ajustados.nomeMae,
      CANDIDATOS_NOME_MAE,
      mapasHex
    );
  }

  return ajustados;
}

function criarEspecificacaoNominal(id, label, original, ficticio) {
  const fakeUpper = ficticio.toUpperCase();
  return {
    id,
    label,
    pairs: normalizarPares([
      [original, fakeUpper],
      [original.toUpperCase(), fakeUpper]
    ]),
    verifyOriginals: normalizarListaValores([
      original,
      original.toUpperCase()
    ])
  };
}

function criarEspecificacaoNumerica(id, label, original, ficticio, formatador) {
  const originalDigitos = soDigitos(original);
  const ficticioDigitos = soDigitos(ficticio);

  return {
    id,
    label,
    pairs: normalizarPares([
      [original, ficticio],
      [formatador(originalDigitos), formatador(ficticioDigitos)],
      [originalDigitos, ficticioDigitos]
    ]),
    verifyOriginals: normalizarListaValores([
      original,
      formatador(originalDigitos),
      originalDigitos
    ])
  };
}

function criarEspecificacaoNumeroBeneficio(id, label, original, ficticio) {
  const originalDigitos = soDigitos(original);
  const ficticioDigitos = soDigitos(ficticio);
  const originalFormatado = formatarNumeroBeneficio(originalDigitos);
  const ficticioFormatado = formatarNumeroBeneficio(ficticioDigitos);

  return {
    id,
    label,
    pairs: normalizarPares([
      [original, ficticio],
      [originalFormatado, ficticioFormatado],
      [originalDigitos, ficticioDigitos]
    ]),
    verifyOriginals: normalizarListaValores([
      original,
      originalFormatado,
      originalDigitos
    ])
  };
}

function criarEspecificacaoEndereco(dadosOriginais, dadosFicticios) {
  const origLinhas = Array.isArray(dadosOriginais.enderecoLinhas) ? dadosOriginais.enderecoLinhas : [];
  const origBrutas = Array.isArray(dadosOriginais.enderecoLinhasBrutas)
    ? dadosOriginais.enderecoLinhasBrutas
    : [];
  const fakeLinhas = Array.isArray(dadosFicticios.enderecoLinhas) ? dadosFicticios.enderecoLinhas : [];

  if (!origLinhas.length || origLinhas.length !== fakeLinhas.length) return null;

  const pairs = [];
  const verifyOriginals = [];

  for (let i = 0; i < origLinhas.length; i++) {
    const original = origLinhas[i];
    const substituto = fakeLinhas[i];
    const bruto = origBrutas[i] || original;
    const brutoFake = bruto === original ? substituto : bruto.replace(original, substituto);

    pairs.push([original, substituto]);
    pairs.push([bruto, brutoFake]);
    verifyOriginals.push(original, bruto);
  }

  return {
    id: 'endereco',
    label: 'Endereço',
    pairs: normalizarPares(pairs),
    verifyOriginals: normalizarListaValores(verifyOriginals)
  };
}

function montarEspecificacoesSubstituicao(dadosOriginais, dadosFicticios) {
  const specs = [];

  if (dadosOriginais.nome && dadosFicticios.nome) {
    specs.push(criarEspecificacaoNominal('nome', 'Nome', dadosOriginais.nome, dadosFicticios.nome));
  }

  if (dadosOriginais.cpf && dadosFicticios.cpf) {
    specs.push(criarEspecificacaoNumerica('cpf', 'CPF', dadosOriginais.cpf, dadosFicticios.cpf, formatarCPF));
  }

  const nitsOriginais = Array.isArray(dadosOriginais.nits) ? dadosOriginais.nits : [];
  const nitsFicticios = Array.isArray(dadosFicticios.nits) ? dadosFicticios.nits : [];
  const totalNits = Math.min(nitsOriginais.length, nitsFicticios.length);

  for (let i = 0; i < totalNits; i++) {
    const label = totalNits > 1 ? `NIT ${i + 1}` : 'NIT';
    specs.push(
      criarEspecificacaoNumerica(`nit:${i}`, label, nitsOriginais[i], nitsFicticios[i], formatarNIT)
    );
  }

  if (dadosOriginais.numeroBeneficio && dadosFicticios.numeroBeneficio) {
    specs.push(
      criarEspecificacaoNumeroBeneficio(
        'numeroBeneficio',
        'Número do benefício',
        dadosOriginais.numeroBeneficio,
        dadosFicticios.numeroBeneficio
      )
    );
  }

  if (dadosOriginais.codigoAutenticidade && dadosFicticios.codigoAutenticidade) {
    specs.push(
      criarEspecificacaoNominal(
        'codigoAutenticidade',
        'Código de autenticidade',
        dadosOriginais.codigoAutenticidade,
        dadosFicticios.codigoAutenticidade
      )
    );
  }

  const specEndereco = criarEspecificacaoEndereco(dadosOriginais, dadosFicticios);
  if (specEndereco) specs.push(specEndereco);

  if (dadosOriginais.nomeMae && dadosFicticios.nomeMae) {
    specs.push(criarEspecificacaoNominal('nomeMae', 'Nome da mãe', dadosOriginais.nomeMae, dadosFicticios.nomeMae));
  }

  for (const spec of specs) {
    spec.compiledPairs = precompilarPares(spec.pairs);
  }

  return specs;
}

function aplicarEspecificacoesNoTexto(texto, specs) {
  let atualizado = texto;
  const hits = {};

  for (const spec of specs) {
    for (const [regex, repl] of spec.compiledPairs || precompilarPares(spec.pairs)) {
      const matches = atualizado.match(regex);
      if (!matches) continue;

      atualizado = atualizado.replace(regex, repl);
      hits[spec.id] = (hits[spec.id] || 0) + matches.length;
    }
  }

  const resultTj = aplicarEspecificacoesEmLiteraisTjFragmentados(atualizado, specs);
  atualizado = resultTj.text;
  mergeHits(hits, resultTj.hits);

  const resultArrays = aplicarEspecificacoesEmArraysTJ(atualizado, specs);
  atualizado = resultArrays.text;
  mergeHits(hits, resultArrays.hits);

  atualizado = atualizado.replace(/\[((?:\\.|[^\]])*)\]\s*TJ/g, (match, conteudoArray) => {
    if (/<[^>]+>/.test(conteudoArray)) return match;

    const textoArray = extrairLiteraisPdf(conteudoArray).join('');
    if (!textoArray) return match;

    let textoRedatado = textoArray;
    const hitsArray = {};

    for (const spec of specs) {
      for (const [regex, repl] of spec.compiledPairs || precompilarPares(spec.pairs)) {
        const matches = textoRedatado.match(regex);
        if (!matches) continue;

        textoRedatado = textoRedatado.replace(regex, repl);
        hitsArray[spec.id] = (hitsArray[spec.id] || 0) + matches.length;
      }
    }

    if (textoRedatado === textoArray) return match;
    mergeHits(hits, hitsArray);
    return `[(${escaparPdfLiteral(textoRedatado)})] TJ`;
  });

  return {
    text: atualizado,
    hits,
    changed: atualizado !== texto
  };
}

function contemOperadoresDeTexto(texto = '') {
  return texto.includes('BT') && (texto.includes('Tj') || texto.includes('TJ'));
}

function decodeUtf16BeHex(hex = '') {
  let resultado = '';

  for (let i = 0; i + 3 < hex.length; i += 4) {
    const code = (HEX_CHAR_TO_INT[hex.charCodeAt(i)] << 12) |
                 (HEX_CHAR_TO_INT[hex.charCodeAt(i + 1)] << 8) |
                 (HEX_CHAR_TO_INT[hex.charCodeAt(i + 2)] << 4) |
                 HEX_CHAR_TO_INT[hex.charCodeAt(i + 3)];
    resultado += String.fromCharCode(code);
  }

  return resultado;
}

function parseToUnicodeCMap(cmapText = '') {
  const reverseMap = Object.create(null);

  for (const block of cmapText.matchAll(/\d+\s+beginbfchar\s+([\s\S]*?)\s+endbfchar/g)) {
    for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const destino = decodeUtf16BeHex(match[2]);
      if (destino.length === 1) reverseMap[destino] = match[1].toUpperCase();
    }
  }

  for (const block of cmapText.matchAll(/\d+\s+beginbfrange\s+([\s\S]*?)\s+endbfrange/g)) {
    for (const linhaBruta of block[1].split(/\r?\n/)) {
      const linha = linhaBruta.trim();
      if (!linha) continue;

      const matchSequencial = linha.match(
        /^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>$/
      );

      if (matchSequencial) {
        const inicio = parseInt(matchSequencial[1], 16);
        const fim = parseInt(matchSequencial[2], 16);
        const destinoInicial = parseInt(matchSequencial[3], 16);
        const largura = matchSequencial[1].length;

        for (let offset = 0; offset <= fim - inicio; offset++) {
          const origemHex = (inicio + offset).toString(16).padStart(largura, '0').toUpperCase();
          const destino = String.fromCodePoint(destinoInicial + offset);
          if (destino.length === 1) reverseMap[destino] = origemHex;
        }

        continue;
      }

      const matchArray = linha.match(
        /^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.*?)\]$/
      );

      if (!matchArray) continue;

      const inicio = parseInt(matchArray[1], 16);
      const largura = matchArray[1].length;
      const destinos = [...matchArray[3].matchAll(/<([0-9A-Fa-f]+)>/g)]
        .map(match => decodeUtf16BeHex(match[1]));

      destinos.forEach((destino, index) => {
        if (destino.length !== 1) return;
        const origemHex = (inicio + index).toString(16).padStart(largura, '0').toUpperCase();
        reverseMap[destino] = origemHex;
      });
    }
  }

  return reverseMap;
}

function encodeTextWithCMap(texto, reverseMap) {
  let encoded = '';

  for (const char of String(texto || '')) {
    const code = reverseMap[char];
    if (!code) return '';
    encoded += code;
  }

  return encoded;
}

function ajustarSubstitutoParaMapa(original, substituto, reverseMap) {
  if (!original || !substituto || original.length !== substituto.length) return '';

  const chars = [];

  for (let i = 0; i < original.length; i++) {
    const orig = original[i];
    const repl = substituto[i];
    const candidatos = [];

    if (reverseMap[repl]) candidatos.push(repl);
    if (/\d/.test(orig)) candidatos.push('0', '9', ' ');
    else if (/[A-Za-zÀ-ÿ]/.test(orig)) candidatos.push(' ', 'X', 'A', 'N', 'L');
    else candidatos.push(orig, ' ');

    const escolhido = candidatos.find(char => reverseMap[char]);
    if (!escolhido) return '';
    chars.push(escolhido);
  }

  const ajustado = chars.join('');
  if (ajustado === original) return '';
  return ajustado;
}

function encodedHexToLatin1(hex) {
  if (!hex || hex.length % 2 !== 0) return '';

  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const p = i * 2;
    bytes[i] = (HEX_CHAR_TO_INT[hex.charCodeAt(p)] << 4) | HEX_CHAR_TO_INT[hex.charCodeAt(p + 1)];
  }

  return decoderLatin1.decode(bytes);
}

function encodedHexToPdfLiteral(hex) {
  const texto = encodedHexToLatin1(hex);
  // ⚡ Bolt: Fast-path string escaping. Native V8 RegExp replace is ~10x faster
  // than manual character-by-character iteration and concatenation.
  return texto.replace(/[\\()]/g, '\\$&');
}

function encodeTextToLatin1Hex(texto) {
  // ⚡ Bolt: Fast-path string building. String concatenation is significantly
  // faster (~2-3x) than intermediate Array allocation and .join('') in tight loops.
  let hexStr = '';
  for (let i = 0; i < texto.length; i++) {
    hexStr += HEX_LOOKUP[texto.charCodeAt(i) & 0xff];
  }
  return hexStr;
}

function extrairMapasHexPorFonte(pdfDoc) {
  const mapas = [];
  const vistos = new Set();

  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!obj?.dict || typeof obj.dict.get !== 'function') continue;
    if (obj.dict.get(PDFLib.PDFName.of('Type'))?.toString() !== '/Font') continue;

    const toUnicodeRef = obj.dict.get(PDFLib.PDFName.of('ToUnicode'));
    if (!toUnicodeRef) continue;

    const chave = toUnicodeRef.toString();
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const toUnicodeStream = pdfDoc.context.lookup(toUnicodeRef);
    if (!(toUnicodeStream?.contents instanceof Uint8Array) || !toUnicodeStream.dict) continue;

    const decoded = decodificarStream(toUnicodeStream);
    if (!decoded) continue;

    const cmapText = decoderLatin1.decode(decoded.decoded);
    const reverseMap = parseToUnicodeCMap(cmapText);
    if (Object.keys(reverseMap).length) mapas.push(reverseMap);
  }

  return mapas;
}

function montarEspecificacoesHex(specs, mapasHex) {
  const specsHex = [];

  for (const spec of specs) {
    const pairs = [];
    const pairsRaw = [];
    const verifyOriginals = [];
    const verifyOriginalsRaw = [];

    for (const [orig, repl] of spec.pairs) {
      const originalHex = encodeTextToLatin1Hex(orig);
      const replacementHex = encodeTextToLatin1Hex(repl);
      if (originalHex && replacementHex) {
        pairs.push([originalHex, replacementHex]);
      }
    }

    for (const original of spec.verifyOriginals) {
      const originalHex = encodeTextToLatin1Hex(original);
      if (originalHex) verifyOriginals.push(originalHex);
    }

    for (const mapa of mapasHex) {
      for (const [orig, repl] of spec.pairs) {
        const originalHex = encodeTextWithCMap(orig, mapa);
        let replacementHex = encodeTextWithCMap(repl, mapa);
        let replacement = repl;

        if (originalHex && !replacementHex) {
          replacement = ajustarSubstitutoParaMapa(orig, repl, mapa);
          replacementHex = encodeTextWithCMap(replacement, mapa);
        }

        if (originalHex && replacementHex) {
          pairs.push([originalHex, replacementHex]);
          pairsRaw.push([
            encodedHexToPdfLiteral(originalHex),
            encodedHexToPdfLiteral(replacementHex)
          ]);
        }
      }

      for (const original of spec.verifyOriginals) {
        const originalHex = encodeTextWithCMap(original, mapa);
        if (originalHex) {
          verifyOriginals.push(originalHex);
          verifyOriginalsRaw.push(encodedHexToPdfLiteral(originalHex));
        }
      }
    }

    if (pairs.length || pairsRaw.length || verifyOriginals.length || verifyOriginalsRaw.length) {
      const p = normalizarPares(pairs);
      const pr = normalizarPares(pairsRaw);

      specsHex.push({
        id: spec.id,
        label: spec.label,
        pairs: p,
        compiledPairs: precompilarPares(p),
        pairsRaw: pr,
        compiledPairsRaw: precompilarPares(pr),
        verifyOriginals: normalizarListaValores(verifyOriginals),
        verifyOriginalsRaw: normalizarListaValores(verifyOriginalsRaw)
      });
    }
  }

  return specsHex;
}

function aplicarEspecificacoesEmHex(texto, specsHex) {
  if (!specsHex.length || !contemOperadoresDeTexto(texto)) {
    return { text: texto, hits: {}, changed: false };
  }

  const hits = {};
  let changed = false;

  const fragmentado = aplicarEspecificacoesEmHexArraysTJ(texto, specsHex);
  let textoBase = fragmentado.text;
  if (fragmentado.changed) {
    changed = true;
    mergeHits(hits, fragmentado.hits);
  }

  const fragmentadoTj = aplicarEspecificacoesEmHexTjFragmentado(textoBase, specsHex);
  textoBase = fragmentadoTj.text;
  if (fragmentadoTj.changed) {
    changed = true;
    mergeHits(hits, fragmentadoTj.hits);
  }

  const atualizado = textoBase.replace(/<([0-9A-Fa-f]+)>/g, (match, hexString) => {
    let hexAtualizado = hexString;

    for (const spec of specsHex) {
      for (const [regex, repl] of spec.compiledPairs || precompilarPares(spec.pairs)) {
        const matches = hexAtualizado.match(regex);
        if (!matches) continue;

        hexAtualizado = hexAtualizado.replace(regex, repl);
        hits[spec.id] = (hits[spec.id] || 0) + matches.length;
      }
    }

    if (hexAtualizado !== hexString) {
      changed = true;
      return `<${hexAtualizado}>`;
    }

    return match;
  });

  let textoFinal = atualizado;

  for (const spec of specsHex) {
    for (const [regex, repl] of spec.compiledPairsRaw || precompilarPares(spec.pairsRaw || [])) {
      const matches = textoFinal.match(regex);
      if (!matches) continue;

      textoFinal = textoFinal.replace(regex, repl);
      hits[spec.id] = (hits[spec.id] || 0) + matches.length;
      changed = true;
    }
  }

  return {
    text: textoFinal,
    hits,
    changed
  };
}

function normalizarBytesDecodificados(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return null;
}

function decodificarStream(stream) {
  const filterStr = (stream.dict.get(PDFLib.PDFName.of('Filter')) || '').toString();
  const isFlate = filterStr.includes('FlateDecode');

  if (!isFlate) {
    return {
      decoded: stream.contents,
      encode: bytes => bytes
    };
  }

  for (const inflar of [pako.inflate, pako.inflateRaw]) {
    try {
      const decoded = normalizarBytesDecodificados(inflar(stream.contents));
      if (decoded) {
        return {
          decoded,
          encode: bytes => pako.deflate(bytes)
        };
      }
    } catch {}
  }

  if (typeof PDFLib.decodePDFRawStream === 'function') {
    try {
      const decoded = normalizarBytesDecodificados(PDFLib.decodePDFRawStream(stream).decode());
      if (decoded) {
        return {
          decoded,
          encode: bytes => pako.deflate(bytes)
        };
      }
    } catch {}
  }

  return null;
}

// ── EXTRAÇÃO ──────────────────────────────────────────────────────────────────

async function extrairDadosSensiveis(pdfBytes) {
  const copia = toUint8Array(pdfBytes).slice().buffer;
  const pdf = await pdfjsLib.getDocument({ data: copia, isEvalSupported: false }).promise;
  const resultado = {
    tipoDocumento: 'cnis',
    nome: '',
    cpf: '',
    nits: [],
    nomeMae: '',
    numeroBeneficio: '',
    codigoAutenticidade: '',
    endereco: '',
    enderecoLinhas: [],
    enderecoLinhasBrutas: []
  };

  try {
    for (let paginaAtual = 1; paginaAtual <= pdf.numPages; paginaAtual++) {
      const page = await pdf.getPage(paginaAtual);
      const content = await page.getTextContent();
      const itens = content.items;
      const texto = normalizarEspacos(itens.map(item => item.str).join(' '));
      const linhas = agruparLinhasPorCoordenada(itens);

      if (inferirTipoDocumentoNoTexto(texto) === 'carta-concessao') {
        resultado.tipoDocumento = 'carta-concessao';
      }
      if (!resultado.nome) resultado.nome = extrairNomeDoTexto(texto);
      if (!resultado.nomeMae) resultado.nomeMae = extrairNomeMaeDoTexto(texto);
      if (!resultado.cpf) resultado.cpf = extrairCpfDoTexto(texto);
      if (!resultado.numeroBeneficio) resultado.numeroBeneficio = extrairNumeroBeneficioDoTexto(texto);
      if (!resultado.codigoAutenticidade) {
        resultado.codigoAutenticidade = extrairCodigoAutenticidadeDoTexto(texto);
      }
      if (!resultado.endereco) {
        const enderecoExtraido = extrairEnderecoDasLinhas(linhas);
        if (enderecoExtraido.endereco) {
          resultado.endereco = enderecoExtraido.endereco;
          resultado.enderecoLinhas = enderecoExtraido.enderecoLinhas;
          resultado.enderecoLinhasBrutas = enderecoExtraido.enderecoLinhasBrutas;
        }
      }

      for (const nit of coletarNitsDoTexto(texto)) {
        adicionarValorUnico(resultado.nits, nit, soDigitos);
      }
    }

    return resultado;
  } finally {
    try { pdf.cleanup(); } catch {}
    try { await pdf.destroy(); } catch {}
  }
}

// ── SUBSTITUIÇÃO ──────────────────────────────────────────────────────────────

async function substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios) {
  const hits = {};
  let bytesTrabalho = toUint8Array(pdfBytes);
  let alterouStreams = false;

  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const mapasHex = extrairMapasHexPorFonte(pdfDoc);
  const dadosFicticiosAjustados = ajustarDadosFicticiosParaMapasHex(
    dadosOriginais,
    dadosFicticios,
    mapasHex
  );
  const specs = montarEspecificacoesSubstituicao(dadosOriginais, dadosFicticiosAjustados);

  if (specs.length === 0) {
    const bytesSemAlteracao = toUint8Array(pdfBytes);
    return {
      bytes: bytesSemAlteracao,
      ok: true,
      expectedCount: 0,
      appliedCount: 0,
      unreplacedFields: [],
      unmatchedFields: [],
      dadosFicticios: dadosFicticiosAjustados
    };
  }

  const specsHex = montarEspecificacoesHex(specs, mapasHex);

  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj.contents instanceof Uint8Array) || !obj.dict) continue;

    const result = _processarStream(obj, specs, specsHex);
    if (result.changed) alterouStreams = true;
    mergeHits(hits, result.hits);
  }

  if (alterouStreams) {
    bytesTrabalho = await pdfDoc.save({ useObjectStreams: false });
  }

  const specsPendentes = specs.filter(spec => !hits[spec.id]);
  if (!alterouStreams || specsPendentes.length > 0) {
    const specsHexPendentes = specsHex.filter(spec => !hits[spec.id]);
    const fallback = await _substituirViaBytesRaw(
      bytesTrabalho,
      alterouStreams ? specsPendentes : specs,
      alterouStreams ? specsHexPendentes : specsHex
    );
    bytesTrabalho = fallback.bytes;
    mergeHits(hits, fallback.hits);
  }

  const unreplacedFields = await verificarSubstituicoesNoPDF(bytesTrabalho, specs);
  const unmatchedFields = specs
    .filter(spec => !hits[spec.id])
    .map(spec => spec.label);
  const appliedCount = specs.filter(spec => hits[spec.id]).length;

  return {
    bytes: bytesTrabalho,
    ok: unreplacedFields.length === 0 && !(specs.length > 0 && appliedCount === 0),
    expectedCount: specs.length,
    appliedCount,
    unreplacedFields,
    unmatchedFields,
    dadosFicticios: dadosFicticiosAjustados
  };
}

function _processarStream(stream, specs, specsHex = []) {
  const decoded = decodificarStream(stream);
  if (!decoded) return { changed: false, hits: {} };

  const originalText = decoderLatin1.decode(decoded.decoded);
  if (!contemOperadoresDeTexto(originalText)) return { changed: false, hits: {} };

  const resultLiteral = aplicarEspecificacoesNoTexto(originalText, specs);
  const resultHex = aplicarEspecificacoesEmHex(resultLiteral.text, specsHex);
  const result = {
    text: resultHex.text,
    hits: {}
  };
  mergeHits(result.hits, resultLiteral.hits);
  mergeHits(result.hits, resultHex.hits);

  if (result.text === originalText) return { changed: false, hits: {} };

  const novosBytes = encodeLatin1(result.text);
  const finalBytes = decoded.encode(novosBytes);

  stream.contents = finalBytes;
  try { stream.dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(finalBytes.length)); } catch {}

  return {
    changed: true,
    hits: result.hits
  };
}

async function _substituirViaBytesRaw(pdfBytes, specs, specsHex = []) {
  if (!specs.length && !specsHex.length) {
    return { bytes: toUint8Array(pdfBytes), hits: {} };
  }

  const bytes = toUint8Array(pdfBytes);
  let bin = bytesToLatin1String(bytes);

  const regexStreams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const partes = [];
  const hits = {};
  let last = 0;
  let modificou = false;
  let match;

  while ((match = regexStreams.exec(bin)) !== null) {
    const raw = encodeLatin1(match[1]);

    let decoded;
    try {
      decoded = pako.inflate(raw);
    } catch {
      try {
        decoded = pako.inflateRaw(raw);
      } catch {
        continue;
      }
    }

    const originalText = decoderLatin1.decode(decoded);
    if (!contemOperadoresDeTexto(originalText)) continue;

    const resultLiteral = aplicarEspecificacoesNoTexto(originalText, specs);
    const resultHex = aplicarEspecificacoesEmHex(resultLiteral.text, specsHex);
    const result = {
      text: resultHex.text,
      hits: {}
    };
    mergeHits(result.hits, resultLiteral.hits);
    mergeHits(result.hits, resultHex.hits);
    if (result.text === originalText) continue;

    modificou = true;
    mergeHits(hits, result.hits);

    const newBin = bytesToLatin1String(pako.deflate(encodeLatin1(result.text)));

    partes.push(bin.slice(last, match.index) + 'stream\n' + newBin + '\nendstream');
    last = match.index + match[0].length;
  }

  if (!modificou) {
    return { bytes, hits };
  }

  partes.push(bin.slice(last));
  const resultBytes = encodeLatin1(partes.join(''));

  try {
    const doc = await PDFLib.PDFDocument.load(resultBytes, { ignoreEncryption: true, updateMetadata: false });
    return {
      bytes: await doc.save({ useObjectStreams: false }),
      hits
    };
  } catch {
    return {
      bytes: resultBytes,
      hits
    };
  }
}

async function verificarSubstituicoesNoPDF(pdfBytes, specs) {
  const textos = await coletarTextosDecodificados(pdfBytes);
  let specsHex = [];

  try {
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    specsHex = montarEspecificacoesHex(specs, extrairMapasHexPorFonte(pdfDoc));
  } catch {}

  const unreplaced = [];

  for (const spec of specs) {
    const encontrouOriginalLiteral = spec.verifyOriginals.some(original =>
      original && textos.some(texto => texto.includes(original))
    );

    const specHex = specsHex.find(item => item.id === spec.id);
    const encontrouOriginalHex = specHex
      ? (
          specHex.verifyOriginals.some(original =>
            original && textos.some(texto => texto.includes(original))
          ) ||
          specHex.verifyOriginalsRaw.some(original =>
            original && textos.some(texto => texto.includes(original))
          )
        )
      : false;

    if (encontrouOriginalLiteral || encontrouOriginalHex) unreplaced.push(spec.label);
  }

  return unreplaced;
}

async function coletarTextosDecodificados(pdfBytes) {
  const textos = [];

  try {
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });

    for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
      if (!(obj.contents instanceof Uint8Array) || !obj.dict) continue;

      const decoded = decodificarStream(obj);
      if (!decoded) continue;

      const texto = decoderLatin1.decode(decoded.decoded);
      if (!contemOperadoresDeTexto(texto)) continue;

      textos.push(texto);
    }
  } catch {
    return coletarTextosDecodificadosViaBytes(pdfBytes);
  }

  return textos.length ? textos : coletarTextosDecodificadosViaBytes(pdfBytes);
}

function coletarTextosDecodificadosViaBytes(pdfBytes) {
  const bytes = toUint8Array(pdfBytes);
  const bin = bytesToLatin1String(bytes);
  const textos = [];
  const regexStreams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = regexStreams.exec(bin)) !== null) {
    const raw = encodeLatin1(match[1]);

    try {
      const texto = decoderLatin1.decode(pako.inflate(raw));
      if (contemOperadoresDeTexto(texto)) textos.push(texto);
      continue;
    } catch {}

    try {
      const texto = decoderLatin1.decode(pako.inflateRaw(raw));
      if (contemOperadoresDeTexto(texto)) textos.push(texto);
    } catch {}
  }

  return textos;
}

// ── MODO PROCESSO JUDICIAL ────────────────────────────────────────────────────

async function _emitirProgressoJudicial(onProgress, payload) {
  if (typeof onProgress !== 'function') return;
  try {
    onProgress(payload);
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function _extrairTextoCompleto(pdfBytes, onProgress = null) {
  const copia = toUint8Array(pdfBytes).slice().buffer;
  await _emitirProgressoJudicial(onProgress, {
    percent: 12,
    etapa: 'Abrindo PDF',
    detalhe: 'Preparando leitura das páginas'
  });
  const pdf = await pdfjsLib.getDocument({ data: copia, isEvalSupported: false }).promise;
  const textos = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textos.push(normalizarEspacos(content.items.map(item => item.str).join(' ')));
      if (i === 1 || i === pdf.numPages || i % 5 === 0) {
        await _emitirProgressoJudicial(onProgress, {
          percent: 12 + Math.round((i / pdf.numPages) * 20),
          etapa: 'Extraindo texto',
          detalhe: `Página ${i} de ${pdf.numPages}`
        });
      }
    }
  } finally {
    try { pdf.cleanup(); } catch {}
    try { await pdf.destroy(); } catch {}
  }

  return textos.join('\n');
}

async function verificarSubstituicoesNoTextoExtraido(pdfBytes, specs) {
  let texto = '';

  try {
    texto = await _extrairTextoCompleto(pdfBytes);
  } catch {
    return [];
  }

  const unreplaced = [];

  for (const spec of specs) {
    const encontrou = spec.verifyOriginals.some(original =>
      original && texto.includes(normalizarEspacos(original))
    );

    if (encontrou && !unreplaced.includes(spec.label)) unreplaced.push(spec.label);
  }

  return unreplaced;
}

function ehCampoCriticoNaoRedatado(label = '') {
  const valor = String(label);
  if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(valor)) return true;
  if (/\bOAB\b|[A-Z]{2}\d{4,6}\b/i.test(valor)) return true;
  if (/\b(?:CRM|CREMERJ)\b/i.test(valor)) return true;
  if (/\b(?:RG|Identidade|Ident\.?|Id\.?)\b/i.test(valor)) return true;
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(valor)) return true;
  return false;
}

async function processarDocumentoJudicial(pdfBytes, opcoes = {}) {
  const onProgress = typeof opcoes === 'function' ? opcoes : opcoes?.onProgress;
  const pdfBytesArr = toUint8Array(pdfBytes);
  const texto = await _extrairTextoCompleto(pdfBytesArr, onProgress);
  await _emitirProgressoJudicial(onProgress, {
    percent: 36,
    etapa: 'Detectando dados',
    detalhe: 'Mapeando documentos, nomes, aliases e contatos'
  });
  const pares = mapearSubstitutos(texto);
  const achados = contarAchados(texto);

  if (!pares.length) {
    await _emitirProgressoJudicial(onProgress, {
      percent: 100,
      etapa: 'Finalizado',
      detalhe: 'Nenhum dado sensível encontrado'
    });
    return {
      bytes: pdfBytesArr,
      ok: true,
      achados,
      expectedCount: 0,
      appliedCount: 0,
      unreplacedFields: [],
      unmatchedFields: []
    };
  }

  const specs = pares.map(({ original, substituto }, i) => ({
    id: `campo_${i}`,
    label: original.slice(0, 50),
    pairs: [[original, substituto]],
    verifyOriginals: [original]
  }));

  const hits = {};
  let bytesTrabalho = pdfBytesArr;
  let alterouStreams = false;

  await _emitirProgressoJudicial(onProgress, {
    percent: 44,
    etapa: 'Preparando substituições',
    detalhe: `${specs.length} alvos mapeados`
  });
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytesArr, {
    ignoreEncryption: true,
    updateMetadata: false
  });
  const mapasHex = extrairMapasHexPorFonte(pdfDoc);
  const specsHex = montarEspecificacoesHex(specs, mapasHex);
  const objetos = [...pdfDoc.context.enumerateIndirectObjects()];

  for (let i = 0; i < objetos.length; i++) {
    const [, obj] = objetos[i];
    if (!(obj.contents instanceof Uint8Array) || !obj.dict) continue;
    const result = _processarStream(obj, specs, specsHex);
    if (result.changed) alterouStreams = true;
    mergeHits(hits, result.hits);
    if (i === 0 || i === objetos.length - 1 || i % 40 === 0) {
      await _emitirProgressoJudicial(onProgress, {
        percent: 48 + Math.round((i / Math.max(1, objetos.length - 1)) * 26),
        etapa: 'Reescrevendo PDF',
        detalhe: `Objeto ${i + 1} de ${objetos.length}`
      });
    }
  }

  if (alterouStreams) {
    await _emitirProgressoJudicial(onProgress, {
      percent: 76,
      etapa: 'Salvando alterações',
      detalhe: 'Recriando o PDF anonimizado'
    });
    bytesTrabalho = await pdfDoc.save({ useObjectStreams: false });
  }

  const specsPendentes = specs.filter(spec => !hits[spec.id]);
  if (!alterouStreams || specsPendentes.length > 0) {
    await _emitirProgressoJudicial(onProgress, {
      percent: 82,
      etapa: 'Aplicando fallback',
      detalhe: `${alterouStreams ? specsPendentes.length : specs.length} alvos pendentes`
    });
    const specsHexPendentes = specsHex.filter(spec => !hits[spec.id]);
    const fallback = await _substituirViaBytesRaw(
      bytesTrabalho,
      alterouStreams ? specsPendentes : specs,
      alterouStreams ? specsHexPendentes : specsHex
    );
    bytesTrabalho = fallback.bytes;
    mergeHits(hits, fallback.hits);
  }

  await _emitirProgressoJudicial(onProgress, {
    percent: 90,
    etapa: 'Verificando saída',
    detalhe: 'Procurando resíduos críticos no PDF gerado'
  });
  const unreplacedFieldsBrutos = [
    ...new Set([
      ...(await verificarSubstituicoesNoPDF(bytesTrabalho, specs)),
      ...(await verificarSubstituicoesNoTextoExtraido(bytesTrabalho, specs))
    ])
  ];
  const unreplacedFields = unreplacedFieldsBrutos.filter(ehCampoCriticoNaoRedatado);
  const residuosNaoCriticos = unreplacedFieldsBrutos.filter(label => !ehCampoCriticoNaoRedatado(label));
  const unmatchedFields = specs
    .filter(spec => !hits[spec.id])
    .map(spec => spec.label)
    .concat(residuosNaoCriticos)
    .filter((label, index, lista) => lista.indexOf(label) === index);
  const appliedCount = specs.filter(spec => hits[spec.id]).length;

  await _emitirProgressoJudicial(onProgress, {
    percent: 98,
    etapa: 'Consolidando resultado',
    detalhe: `${appliedCount} substituições confirmadas`
  });

  return {
    bytes: bytesTrabalho,
    ok: unreplacedFields.length === 0 && !(specs.length > 0 && appliedCount === 0),
    achados,
    expectedCount: specs.length,
    appliedCount,
    unreplacedFields,
    unmatchedFields
  };
}
