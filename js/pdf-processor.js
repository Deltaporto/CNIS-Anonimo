// Processador de PDF CNIS

const REGEX_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
const REGEX_NIT = /\d{3}\.\d{5}\.\d{2}-\d/;

const decoderLatin1 = new TextDecoder('latin1');

function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

// ── EXTRAÇÃO ───────────────────────────────────────────────────────────────────

async function extrairDadosSensiveis(pdfBytes) {
  const copia = pdfBytes instanceof ArrayBuffer ? pdfBytes.slice(0) : pdfBytes.buffer.slice(0);
  const pdf   = await pdfjsLib.getDocument({ data: copia }).promise;
  const page  = await pdf.getPage(1);
  const itens = (await page.getTextContent()).items.map(i => i.str);
  const texto = itens.join(' ');

  const resultado = { nome: '', cpf: '', nit: '', nomeMae: '' };

  const mCPF = texto.match(REGEX_CPF);
  if (mCPF) resultado.cpf = mCPF[0];

  const mNIT = texto.match(REGEX_NIT);
  if (mNIT) resultado.nit = mNIT[0];

  for (let i = 0; i < itens.length; i++) {
    const t = itens[i].trim();
    if (t === 'Nome:' && !resultado.nome) {
      for (let j = i + 1; j < Math.min(i + 6, itens.length); j++) {
        const c = itens[j].trim();
        if (c && c.length > 2 && !c.startsWith('Nome') && !c.match(/^\d/)) {
          resultado.nome = c; break;
        }
      }
    }
    if ((t.includes('mãe:') || t.includes('mae:')) && !resultado.nomeMae) {
      for (let j = i + 1; j < Math.min(i + 6, itens.length); j++) {
        const c = itens[j].trim();
        if (c && c.length > 2) { resultado.nomeMae = c; break; }
      }
    }
  }

  if (!resultado.nome) {
    const m = texto.match(/Nome:\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s{2,}|\s*Data\s|\s*Nome da)/);
    if (m) resultado.nome = m[1].trim();
  }
  if (!resultado.nomeMae) {
    const m = texto.match(/m(?:ã|a)e:\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)(?:\s{2,}|$)/);
    if (m) resultado.nomeMae = m[1].trim();
  }

  return resultado;
}

// ── SUBSTITUIÇÃO ───────────────────────────────────────────────────────────────

async function substituirDadosNoPDF(pdfBytes, dadosOriginais, dadosFicticios) {
  const subs = [];
  if (dadosOriginais.nome    && dadosFicticios.nome)    subs.push([dadosOriginais.nome,    dadosFicticios.nome.toUpperCase()]);
  if (dadosOriginais.cpf     && dadosFicticios.cpf)     subs.push([dadosOriginais.cpf,     dadosFicticios.cpf]);
  if (dadosOriginais.nit     && dadosFicticios.nit) {
    subs.push([dadosOriginais.nit, dadosFicticios.nit]);
    subs.push([dadosOriginais.nit.replace(/[.\-]/g, ''), dadosFicticios.nit.replace(/[.\-]/g, '')]);
  }
  if (dadosOriginais.nomeMae && dadosFicticios.nomeMae) subs.push([dadosOriginais.nomeMae, dadosFicticios.nomeMae.toUpperCase()]);

  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });

  if (subs.length > 0) {
    let encontrou = false;
    for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
      if (obj.contents instanceof Uint8Array && obj.dict) {
        if (_processarStream(obj, subs)) encontrou = true;
      }
    }

    // Fallback: manipulação de bytes brutos
    if (!encontrou) {
      return await _substituirViaBytesRaw(pdfBytes, subs);
    }
  }

  return await pdfDoc.save({ useObjectStreams: false });
}

function _processarStream(stream, subs) {
  const filterStr = (stream.dict.get(PDFLib.PDFName.of('Filter')) || '').toString();
  const isFlate   = filterStr.includes('FlateDecode');

  let decoded;
  if (isFlate) {
    try { decoded = pako.inflate(stream.contents); }
    catch { try { decoded = pako.inflateRaw(stream.contents); } catch { return false; } }
  } else {
    decoded = stream.contents;
  }

  let texto = decoderLatin1.decode(decoded);
  let mod   = texto;
  for (const [orig, fake] of subs) {
    if (orig) mod = mod.replace(new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fake);
  }
  if (mod === texto) return false;

  const novos = encodeLatin1(mod);
  const final = isFlate ? pako.deflate(novos) : novos;
  stream.contents = final;
  try { stream.dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(final.length)); } catch {}
  return true;
}

async function _substituirViaBytesRaw(pdfBytes, subs) {
  const bytes = new Uint8Array(pdfBytes instanceof ArrayBuffer ? pdfBytes : pdfBytes.buffer);
  let bin = Array.from(bytes, b => String.fromCharCode(b)).join('');

  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const partes = [];
  let last = 0, match, modificou = false;

  while ((match = re.exec(bin)) !== null) {
    const raw = Uint8Array.from(match[1].split('').map(c => c.charCodeAt(0)));
    let decoded;
    try { decoded = pako.inflate(raw); } catch { try { decoded = pako.inflateRaw(raw); } catch { continue; } }

    let texto = decoderLatin1.decode(decoded);
    let mod   = texto;
    for (const [orig, fake] of subs) {
      if (orig) mod = mod.replace(new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fake);
    }
    if (mod === texto) continue;

    modificou = true;
    const newBin = Array.from(pako.deflate(encodeLatin1(mod)), b => String.fromCharCode(b)).join('');
    partes.push(bin.slice(last, match.index) + 'stream\n' + newBin + '\nendstream');
    last = match.index + match[0].length;
  }

  if (!modificou) return bytes;

  partes.push(bin.slice(last));
  const result = Uint8Array.from(partes.join('').split(''), c => c.charCodeAt(0));

  try {
    const doc = await PDFLib.PDFDocument.load(result, { ignoreEncryption: true, updateMetadata: false });
    return await doc.save({ useObjectStreams: false });
  } catch {
    return result;
  }
}
