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
    assert.equal(ficticios.nome, `${extraidos.nome.split(/\s+/)[0]} FAKE DOS SANTOS`);
    assert.equal(ficticios.nomeMae, 'MARIA FAKE DOS SANTOS');
    assert.equal(ficticios.nits.length, extraidos.nits.length);

    const processado = await pdfProcessorApi.substituirDadosNoPDF(
      originalBytes,
      extraidos,
      ficticios
    );
    const ficticiosAplicados = processado.dadosFicticios || ficticios;

    assert.equal(processado.ok, true, JSON.stringify(processado));
    assert.deepEqual(processado.unreplacedFields, []);

    const bytesAnonimizados = processado.bytes instanceof Uint8Array
      ? processado.bytes
      : new Uint8Array(processado.bytes);
    const reextraidos = await pdfProcessorApi.extrairDadosSensiveis(bytesAnonimizados);

    assert.equal(reextraidos.nome, ficticiosAplicados.nome);
    assert.equal(reextraidos.cpf, ficticiosAplicados.cpf);
    assert.equal(reextraidos.nomeMae, ficticiosAplicados.nomeMae);
    assert.deepEqual(reextraidos.nits, ficticiosAplicados.nits);
  });
}
