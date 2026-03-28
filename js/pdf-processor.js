// Processador de PDF CNIS: extrai dados sensíveis e os substitui nos content streams

const REGEX_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
const REGEX_NIT = /\d{3}\.\d{5}\.\d{2}-\d/;

// ── CODIFICAÇÃO ────────────────────────────────────────────────────────────────
// PDFs CNIS usam Latin-1 nos content streams.
// TextEncoder só gera UTF-8; precisamos de Latin-1 manual.

const decoderLatin1 = new TextDecoder('latin1');

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

// ── EXTRAÇÃO ───────────────────────────────────────────────────────────────────

/**
 * Extrai dados sensíveis da primeira página do PDF usando pdf.js.
 * @param {ArrayBuffer} pdfBytes
 * @returns {Promise<{nome, cpf, nit, nomeMae}>}
 */
async function extrairDadosSensiveis(pdfBytes) {
  // Passa uma CÓPIA para o pdf.js — ele transfere o buffer para o worker,
  // o que detacharia o original e quebraria o pdf-lib em seguida.
  const copia = pdfBytes instanceof ArrayBuffer ? pdfBytes.slice(0) : pdfBytes.buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: copia });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();

  const itens = textContent.items.map(i => i.str);
  const textoFull = itens.join(' ');

  const resultado = { nome: '', cpf: '', nit: '', nomeMae: '' };

  // CPF e NIT via regex no texto concatenado
  const mCPF = textoFull.match(REGEX_CPF);
  if (mCPF) resultado.cpf = mCPF[0];

  const mNIT = textoFull.match(REGEX_NIT);
  if (mNIT) resultado.nit = mNIT[0];

  // Nome e Nome da mãe por contexto (item após o label)
  for (let i = 0; i < itens.length; i++) {
    const t = itens[i].trim();

    if (t === 'Nome:' && !resultado.nome) {
      // Próximo item não vazio que não seja outro label
      for (let j = i + 1; j < Math.min(i + 6, itens.length); j++) {
        const c = itens[j].trim();
        if (c && c.length > 2 && !c.startsWith('Nome') && !c.match(/^\d/)) {
          resultado.nome = c;
          break;
        }
      }
    }

    // "Nome da mãe:" pode vir como item único ou dividido
    if ((t.includes('mãe:') || t.includes('mae:')) && !resultado.nomeMae) {
      for (let j = i + 1; j < Math.min(i + 6, itens.length); j++) {
        const c = itens[j].trim();
        if (c && c.length > 2) {
          resultado.nomeMae = c;
          break;
        }
      }
    }
  }

  // Fallback regex se não achou pelo contexto
  if (!resultado.nome) {
    const m = textoFull.match(/Nome:\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s{2,}|\s*Data\s|\s*Nome da)/);
    if (m) resultado.nome = m[1].trim();
  }

  if (!resultado.nomeMae) {
    const m = textoFull.match(/m(?:ã|a)e:\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s{2,}|$)/);
    if (m) resultado.nomeMae = m[1].trim();
  }

  return resultado;
}

// ── SUBSTITUIÇÃO NOS STREAMS ───────────────────────────────────────────────────

/**
 * Ponto de entrada: carrega PDF, substitui dados sensíveis, salva.
 * @param {ArrayBuffer} pdfBytes
 * @param {{nome, cpf, nit, nomeMae}} dadosOriginais
 * @param {{nome, cpf, nit, nomeMae}} dadosFicticios
 * @returns {Promise<Uint8Array>}
 */
async function substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios) {
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  // Mapa de substituições (apenas dados preenchidos)
  const subs = [];
  if (dadosOriginais.nome && dadosFicticios.nome)
    subs.push([dadosOriginais.nome, dadosFicticios.nome.toUpperCase()]);
  if (dadosOriginais.cpf && dadosFicticios.cpf)
    subs.push([dadosOriginais.cpf, dadosFicticios.cpf]);
  if (dadosOriginais.nit && dadosFicticios.nit) {
    subs.push([dadosOriginais.nit, dadosFicticios.nit]);
    // Também substitui NIT sem pontuação, caso exista no stream
    subs.push([
      dadosOriginais.nit.replace(/[.\-]/g, ''),
      dadosFicticios.nit.replace(/[.\-]/g, ''),
    ]);
  }
  if (dadosOriginais.nomeMae && dadosFicticios.nomeMae)
    subs.push([dadosOriginais.nomeMae, dadosFicticios.nomeMae.toUpperCase()]);

  if (subs.length === 0) return await pdfDoc.save({ useObjectStreams: false });

  // Itera TODOS os objetos indiretos do PDF e processa os streams
  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (obj.constructor.name === 'PDFRawStream') {
      _processarRawStream(obj, subs);
    }
  }

  return await pdfDoc.save({ useObjectStreams: false });
}

/**
 * Descomprime um PDFRawStream, aplica substituições e recomprime.
 */
function _processarRawStream(stream, subs) {
  const rawBytes = stream.contents;
  if (!rawBytes || rawBytes.length === 0) return;

  // Detecta se está comprimido (FlateDecode)
  const filterEntry = stream.dict.get(PDFLib.PDFName.of('Filter'));
  const filterStr = filterEntry ? filterEntry.toString() : '';
  const isFlate = filterStr.includes('FlateDecode');

  let decoded;
  if (isFlate) {
    try {
      decoded = pako.inflate(rawBytes);
    } catch {
      try {
        decoded = pako.inflateRaw(rawBytes);
      } catch {
        return; // não conseguiu descomprimir, pula
      }
    }
  } else {
    decoded = rawBytes;
  }

  // Decodifica como Latin-1 para preservar bytes não-ASCII (ex: ã = 0xe3)
  let texto = decoderLatin1.decode(decoded);

  // Aplica substituições
  let modificado = texto;
  for (const [original, ficticio] of subs) {
    if (!original) continue;
    const pattern = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    modificado = modificado.replace(pattern, ficticio);
  }

  if (modificado === texto) return; // nada mudou, não precisa reescrever

  // Recodifica como Latin-1 (NÃO UTF-8!)
  const novosBytesRaw = encodeLatin1(modificado);

  // Recomprime se necessário
  let novoConteudo;
  if (isFlate) {
    novoConteudo = pako.deflate(novosBytesRaw);
  } else {
    novoConteudo = novosBytesRaw;
  }

  // Atualiza o stream
  stream.contents = novoConteudo;
  stream.dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(novoConteudo.length));
}

// ── ORQUESTRADOR ───────────────────────────────────────────────────────────────

/**
 * Extrai dados originais E gera PDF anonimizado.
 * @param {ArrayBuffer} pdfBytes
 * @param {{nome, cpf, nit, nomeMae}} dadosFicticios
 * @returns {Promise<{dadosOriginais, pdfAnonimizado: Uint8Array}>}
 */
async function processarCNIS(pdfBytes, dadosFicticios) {
  const dadosOriginais = await extrairDadosSensiveis(pdfBytes);
  const pdfAnonimizado = await substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios);
  return { dadosOriginais, pdfAnonimizado };
}
