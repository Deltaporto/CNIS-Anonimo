import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CNIS_FIXTURES,
  loadFakeDataApi,
  loadPdfProcessorApi,
  readPdfFixture
} from './helpers/browser-apis.mjs';

const fakeDataApi = await loadFakeDataApi();
const pdfProcessorApi = await loadPdfProcessorApi();

for (const fixture of CNIS_FIXTURES) {
  test(`pipeline real do CNIS permanece íntegro em ${fixture}`, async () => {
    const originalBytes = await readPdfFixture(fixture);
    const extraidos = await pdfProcessorApi.extrairDadosSensiveis(originalBytes);

    assert.ok(extraidos.nome, 'deve extrair o nome do segurado');
    assert.ok(extraidos.cpf, 'deve extrair o CPF');
    assert.ok(extraidos.nomeMae, 'deve extrair o nome da mãe');
    assert.ok(extraidos.nits.length >= 1, 'deve extrair ao menos um NIT');

    const ficticios = fakeDataApi.gerarDadosFicticios(extraidos);
    assert.match(ficticios.nomeMae, /^MARIA\b/);
    assert.equal(ficticios.nits.length, extraidos.nits.length);

    const processado = await pdfProcessorApi.substituirDadosNoPDF(
      originalBytes,
      extraidos,
      ficticios
    );

    assert.equal(processado.ok, true, JSON.stringify(processado));
    assert.deepEqual(processado.unreplacedFields, []);

    const bytesAnonimizados = processado.bytes instanceof Uint8Array
      ? processado.bytes
      : new Uint8Array(processado.bytes);
    const reextraidos = await pdfProcessorApi.extrairDadosSensiveis(bytesAnonimizados);

    assert.equal(reextraidos.nome, ficticios.nome);
    assert.equal(reextraidos.cpf, ficticios.cpf);
    assert.equal(reextraidos.nomeMae, ficticios.nomeMae);
    assert.deepEqual(reextraidos.nits, ficticios.nits);
    assert.match(reextraidos.nomeMae, /^MARIA\b/);
  });
}
