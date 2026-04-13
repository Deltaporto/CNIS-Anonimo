// Processador de PDF CNIS

if (typeof window !== 'undefined' && typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

const decoderLatin1 = new TextDecoder('latin1');

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return new Uint8Array(bytes);
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
    resultado += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
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

function encodedHexToLatin1(hex) {
  if (!hex || hex.length % 2 !== 0) return '';

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  return decoderLatin1.decode(bytes);
}

function encodedHexToPdfLiteral(hex) {
  const texto = encodedHexToLatin1(hex);
  let escaped = '';

  for (const char of texto) {
    if (char === '\\' || char === '(' || char === ')') escaped += '\\';
    escaped += char;
  }

  return escaped;
}

function extrairMapasHexPorFonte(pdfDoc) {
  const mapas = [];
  const vistos = new Set();

  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!obj?.dict || typeof obj.dict.get !== 'function') continue;
    if (obj.dict.get(PDFLib.PDFName.of('Type'))?.toString() !== '/Font') continue;
    if (obj.dict.get(PDFLib.PDFName.of('Subtype'))?.toString() !== '/Type0') continue;

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
  if (!mapasHex.length) return [];

  const specsHex = [];

  for (const spec of specs) {
    const pairs = [];
    const pairsRaw = [];
    const verifyOriginals = [];
    const verifyOriginalsRaw = [];

    for (const mapa of mapasHex) {
      for (const [orig, repl] of spec.pairs) {
        const originalHex = encodeTextWithCMap(orig, mapa);
        const replacementHex = encodeTextWithCMap(repl, mapa);
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

  const atualizado = texto.replace(/<([0-9A-Fa-f]+)>/g, (match, hexString) => {
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

function decodificarStream(stream) {
  const filterStr = (stream.dict.get(PDFLib.PDFName.of('Filter')) || '').toString();
  const isFlate = filterStr.includes('FlateDecode');

  if (!isFlate) {
    return {
      decoded: stream.contents,
      encode: bytes => bytes
    };
  }

  try {
    return {
      decoded: pako.inflate(stream.contents),
      encode: bytes => pako.deflate(bytes)
    };
  } catch {
    try {
      return {
        decoded: pako.inflateRaw(stream.contents),
        encode: bytes => pako.deflate(bytes)
      };
    } catch {
      return null;
    }
  }
}

// ── EXTRAÇÃO ──────────────────────────────────────────────────────────────────

async function extrairDadosSensiveis(pdfBytes) {
  const copia = toUint8Array(pdfBytes).slice().buffer;
  const pdf = await pdfjsLib.getDocument({ data: copia }).promise;
  const resultado = {
    tipoDocumento: 'cnis',
    nome: '',
    cpf: '',
    nits: [],
    nomeMae: '',
    numeroBeneficio: '',
    codigoAutenticidade: ''
  };

  try {
    for (let paginaAtual = 1; paginaAtual <= pdf.numPages; paginaAtual++) {
      const page = await pdf.getPage(paginaAtual);
      const itens = (await page.getTextContent()).items.map(item => item.str);
      const texto = normalizarEspacos(itens.join(' '));

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
  let bin = Array.from(bytes, byte => String.fromCharCode(byte)).join('');

  const regexStreams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const partes = [];
  const hits = {};
  let last = 0;
  let modificou = false;
  let match;

  while ((match = regexStreams.exec(bin)) !== null) {
    const raw = Uint8Array.from(match[1].split('').map(char => char.charCodeAt(0)));

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

    const newBin = Array.from(
      pako.deflate(encodeLatin1(result.text)),
      byte => String.fromCharCode(byte)
    ).join('');

    partes.push(bin.slice(last, match.index) + 'stream\n' + newBin + '\nendstream');
    last = match.index + match[0].length;
  }

  if (!modificou) {
    return { bytes, hits };
  }

  partes.push(bin.slice(last));
  const resultBytes = Uint8Array.from(partes.join('').split(''), char => char.charCodeAt(0));

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
  const bin = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  const textos = [];
  const regexStreams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = regexStreams.exec(bin)) !== null) {
    const raw = Uint8Array.from(match[1].split('').map(char => char.charCodeAt(0)));

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
