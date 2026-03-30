// Processador de PDF CNIS

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

function limparNomeExtraido(valor = '') {
  return normalizarEspacos(valor.replace(/[:;,.\-]+$/g, ''));
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

  for (const match of texto.matchAll(/\b(?:NIT|NIS|PIS(?:\/PASEP)?|PASEP)\s*:?\s*(\d{11}|\d{3}\.\d{5}\.\d{2}-\d)\b/gi)) {
    const nit = formatarNIT(match[1]);
    adicionarValorUnico(encontrados, nit, soDigitos);
  }

  return encontrados;
}

function extrairNomeDoTexto(texto) {
  const match = texto.match(
    /\bNome(?!\s+da\s+m(?:ã|a)e)\s*:?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'`.-]+?)(?=\s+(?:Nome da m(?:ã|a)e|M(?:ã|a)e|CPF|NIT|NIS|PIS|PASEP|Data\b|P(?:á|a)gina\b|Identifica(?:ç|c)ão\b|Origem\b|C(?:ó|o)digo\b)|$)/i
  );
  return match ? limparNomeExtraido(match[1]) : '';
}

function extrairNomeMaeDoTexto(texto) {
  const match = texto.match(
    /\b(?:Nome da m(?:ã|a)e|M(?:ã|a)e)\s*:?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'`.-]+?)(?=\s+(?:Nome\b|CPF|NIT|NIS|PIS|PASEP|Data\b|P(?:á|a)gina\b|Identifica(?:ç|c)ão\b|Origem\b|C(?:ó|o)digo\b)|$)/i
  );
  return match ? limparNomeExtraido(match[1]) : '';
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

  if (dadosOriginais.nomeMae && dadosFicticios.nomeMae) {
    specs.push(criarEspecificacaoNominal('nomeMae', 'Nome da mãe', dadosOriginais.nomeMae, dadosFicticios.nomeMae));
  }

  return specs;
}

function aplicarEspecificacoesNoTexto(texto, specs) {
  let atualizado = texto;
  const hits = {};

  for (const spec of specs) {
    for (const [orig, repl] of spec.pairs) {
      const regex = new RegExp(escapeRegex(orig), 'g');
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
  const resultado = { nome: '', cpf: '', nits: [], nomeMae: '' };

  try {
    for (let paginaAtual = 1; paginaAtual <= pdf.numPages; paginaAtual++) {
      const page = await pdf.getPage(paginaAtual);
      const itens = (await page.getTextContent()).items.map(item => item.str);
      const texto = normalizarEspacos(itens.join(' '));

      if (!resultado.nome) resultado.nome = extrairNomeDoTexto(texto);
      if (!resultado.nomeMae) resultado.nomeMae = extrairNomeMaeDoTexto(texto);
      if (!resultado.cpf) resultado.cpf = extrairCpfDoTexto(texto);

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
  const specs = montarEspecificacoesSubstituicao(dadosOriginais, dadosFicticios);
  const hits = {};

  if (specs.length === 0) {
    const bytesSemAlteracao = toUint8Array(pdfBytes);
    return {
      bytes: bytesSemAlteracao,
      ok: true,
      expectedCount: 0,
      appliedCount: 0,
      unreplacedFields: [],
      unmatchedFields: []
    };
  }

  let bytesTrabalho = toUint8Array(pdfBytes);
  let alterouStreams = false;

  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });

  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj.contents instanceof Uint8Array) || !obj.dict) continue;

    const result = _processarStream(obj, specs);
    if (result.changed) alterouStreams = true;
    mergeHits(hits, result.hits);
  }

  if (alterouStreams) {
    bytesTrabalho = await pdfDoc.save({ useObjectStreams: false });
  }

  const specsPendentes = specs.filter(spec => !hits[spec.id]);
  if (!alterouStreams || specsPendentes.length > 0) {
    const fallback = await _substituirViaBytesRaw(
      bytesTrabalho,
      alterouStreams ? specsPendentes : specs
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
    unmatchedFields
  };
}

function _processarStream(stream, specs) {
  const decoded = decodificarStream(stream);
  if (!decoded) return { changed: false, hits: {} };

  const originalText = decoderLatin1.decode(decoded.decoded);
  const result = aplicarEspecificacoesNoTexto(originalText, specs);
  if (!result.changed) return { changed: false, hits: {} };

  const novosBytes = encodeLatin1(result.text);
  const finalBytes = decoded.encode(novosBytes);

  stream.contents = finalBytes;
  try { stream.dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(finalBytes.length)); } catch {}

  return {
    changed: true,
    hits: result.hits
  };
}

async function _substituirViaBytesRaw(pdfBytes, specs) {
  if (!specs.length) {
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
    const result = aplicarEspecificacoesNoTexto(originalText, specs);
    if (!result.changed) continue;

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
  const unreplaced = [];

  for (const spec of specs) {
    const encontrouOriginal = spec.verifyOriginals.some(original =>
      original && textos.some(texto => texto.includes(original))
    );

    if (encontrouOriginal) unreplaced.push(spec.label);
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

      textos.push(decoderLatin1.decode(decoded.decoded));
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
      textos.push(decoderLatin1.decode(pako.inflate(raw)));
      continue;
    } catch {}

    try {
      textos.push(decoderLatin1.decode(pako.inflateRaw(raw)));
    } catch {}
  }

  return textos;
}
