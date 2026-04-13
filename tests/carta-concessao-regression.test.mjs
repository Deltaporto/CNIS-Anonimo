import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARTA_CONCESSAO_FIXTURES,
  loadFakeDataApi,
  loadPdfProcessorApi,
  readPdfFixture
} from './helpers/browser-apis.mjs';

const fakeDataApi = await loadFakeDataApi();
const pdfProcessorApi = await loadPdfProcessorApi();

for (const fixture of CARTA_CONCESSAO_FIXTURES) {
  test(`pipeline real da carta de concessão permanece íntegro em ${fixture}`, async () => {
    const originalBytes = await readPdfFixture(fixture);
    const extraidos = await pdfProcessorApi.extrairDadosSensiveis(originalBytes);

    assert.equal(extraidos.tipoDocumento, 'carta-concessao');
    assert.ok(extraidos.nome, 'deve extrair o nome/titular');
    assert.ok(extraidos.numeroBeneficio, 'deve extrair o número do benefício');
    assert.ok(extraidos.codigoAutenticidade, 'deve extrair o código de autenticidade');
    assert.ok(extraidos.endereco, 'deve extrair o endereço rotulado');
    assert.ok(
      extraidos.cpf || extraidos.nits.length >= 1,
      'deve extrair CPF ou ao menos um NIT'
    );

    const ficticios = fakeDataApi.gerarDadosFicticios(extraidos);
    assert.equal(ficticios.nome, `${extraidos.nome.split(/\s+/)[0]} FAKE DOS SANTOS`);
    assert.equal(ficticios.numeroBeneficio.length, extraidos.numeroBeneficio.length);
    assert.equal(ficticios.codigoAutenticidade.length, extraidos.codigoAutenticidade.length);
    assert.equal(ficticios.enderecoLinhas.length, extraidos.enderecoLinhas.length);
    assert.notEqual(ficticios.endereco, extraidos.endereco);

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

    assert.equal(reextraidos.tipoDocumento, 'carta-concessao');
    assert.equal(reextraidos.nome, ficticiosAplicados.nome);
    assert.equal(reextraidos.numeroBeneficio, ficticiosAplicados.numeroBeneficio);
    assert.equal(reextraidos.codigoAutenticidade, ficticiosAplicados.codigoAutenticidade);
    assert.equal(reextraidos.endereco, ficticiosAplicados.endereco);

    if (extraidos.cpf) {
      assert.equal(reextraidos.cpf, ficticiosAplicados.cpf);
    } else {
      assert.equal(reextraidos.cpf, '');
    }

    if (extraidos.nits.length) {
      assert.deepEqual(reextraidos.nits, ficticiosAplicados.nits);
    } else {
      assert.deepEqual(reextraidos.nits, []);
    }
  });
}
