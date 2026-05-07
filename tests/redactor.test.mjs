import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRedactorApi } from './helpers/browser-apis.mjs';

const api = await loadRedactorApi();

test('redigirCPF substitui todos os dígitos por asteriscos preservando máscara e comprimento', () => {
  assert.equal(api.redigirCPF('123.456.789-09'), '***.***.***-**');
  assert.equal(api.redigirCPF('913.665.347-00'), '***.***.***-**');
  assert.equal(api.redigirCPF('913.665.347-00').length, '913.665.347-00'.length);
  assert.ok(!/\d/.test(api.redigirCPF('000.000.000-00')));
});

test('redigirNumerico preserva label e substitui número por zeros de mesmo comprimento', () => {
  assert.equal(api.redigirNumerico('OAB/RJ ', '12345'), 'OAB/RJ 00000');
  assert.equal(api.redigirNumerico('CRM/RJ ', '1234'), 'CRM/RJ 0000');
  assert.equal(api.redigirNumerico('', '98765'), '00000');
  assert.equal(api.redigirNumerico('OAB/RJ ', '12345').length, 'OAB/RJ 12345'.length);
});

test('redigirMascarar substitui todo o conteúdo por asteriscos de mesmo comprimento', () => {
  assert.equal(api.redigirMascarar('joao@tjrj.jus.br'), '****************');
  assert.equal(api.redigirMascarar('RUA DAS FLORES 10').length, 'RUA DAS FLORES 10'.length);
  assert.ok(!/[^*]/.test(api.redigirMascarar('qualquer coisa')));
});

test('redigirNome converte nome em iniciais e preenche com espaços até comprimento original', () => {
  const original = 'ROSALINA FERREIRA DA SILVA';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length, 'comprimento deve ser identico');
  assert.ok(resultado.startsWith('R. F. S.'), 'deve comecar com as iniciais corretas');
  assert.equal(resultado.trimEnd(), 'R. F. S.', 'sem trailing spaces deve ser so as iniciais');
});

test('redigirNome com dois nomes sem conectivos', () => {
  const original = 'JOAO SILVA';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length);
  assert.equal(resultado.trimEnd(), 'J. S.');
});

test('redigirNome ignora conectivos na geracao de iniciais', () => {
  const original = 'MARIA DA CONCEICAO';
  const resultado = api.redigirNome(original);
  assert.equal(resultado.length, original.length);
  assert.equal(resultado.trimEnd(), 'M. C.');
});

test('mapearSubstitutos detecta CPF valido e gera substituto byte-safe', () => {
  const pares = api.mapearSubstitutos('CPF do reu: 913.665.347-00 conforme certidao.');
  const par = pares.find(p => p.original === '913.665.347-00');
  assert.ok(par, 'deve detectar o CPF');
  assert.equal(par.substituto, '***.***.***-**');
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos ignora CPF com checksum invalido', () => {
  const pares = api.mapearSubstitutos('CPF: 123.456.789-00');
  assert.equal(pares.filter(p => p.original.includes('123.456')).length, 0);
});

test('mapearSubstitutos detecta OAB preservando label e zerificando numero', () => {
  const pares = api.mapearSubstitutos('Advogado OAB/RJ 123456 presente. Intimar OAB-RJ) sob o n. 169.859.');
  const par = pares.find(p => p.original.includes('OAB'));
  assert.ok(par, 'deve detectar OAB');
  assert.ok(par.substituto.startsWith('OAB/RJ '), 'label deve ser preservado');
  assert.equal(par.substituto.length, par.original.length);
  assert.equal(
    pares.find(p => p.original === 'OAB-RJ) sob o n. 169.859')?.substituto,
    'OAB-RJ) sob o n. 0000000'
  );
});

test('mapearSubstitutos detecta OAB compacta e nomes de capa/evento', () => {
  const texto = [
    'NATHALYE LIBANIO DA SILVA CRUZ RJ246673',
    'RJ169859 - MARIANGELA MENDES ALBUQUERQUE MARQUES DE OLIVEIRA',
    'OLIVEIRA RJ169859'
  ].join(' ');
  const pares = api.mapearSubstitutos(texto);

  assert.equal(pares.find(p => p.original === 'RJ246673')?.substituto, 'RJ000000');
  assert.equal(pares.find(p => p.original === 'RJ169859')?.substituto, 'RJ000000');
  assert.equal(pares.find(p => p.original === 'OLIVEIRA RJ169859')?.substituto, 'O.       RJ000000');
  assert.ok(pares.find(p => p.original === 'NATHALYE LIBANIO DA SILVA CRUZ'));
  assert.ok(pares.find(p => p.original === 'MARIANGELA MENDES ALBUQUERQUE MARQUES DE OLIVEIRA'));
});

test('mapearSubstitutos detecta nome de parte por rotulo processual sem depender do primeiro nome', () => {
  const texto = [
    'AUTOR: GILVALDO ARGOLO SILVA',
    'RÉU: INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS',
    'GILVALDO ARGOLO SILVA propõe ação em face do INSS.'
  ].join(' ');
  const pares = api.mapearSubstitutos(texto);

  assert.ok(pares.find(p => p.original === 'GILVALDO ARGOLO SILVA'));
  assert.equal(pares.find(p => p.original.includes('INSTITUTO NACIONAL')), undefined);
});

test('mapearSubstitutos detecta rotulos processuais variados de partes', () => {
  const pares = api.mapearSubstitutos(
    'RECORRENTE: JURACI DE SOUZA LIMA RECORRIDO: INSS AGRAVANTE: MARCOS DOS ANJOS PEREIRA RECORRIDO(S): GILVALDO ARGOLO SILVA'
  );

  assert.ok(pares.find(p => p.original === 'JURACI DE SOUZA LIMA'));
  assert.ok(pares.find(p => p.original === 'MARCOS DOS ANJOS PEREIRA'));
  assert.ok(pares.find(p => p.original === 'GILVALDO ARGOLO SILVA'));
  assert.equal(pares.find(p => p.original === 'INSS'), undefined);
});

test('mapearSubstitutos expande aliases seguros a partir do nome completo da parte', () => {
  const texto = [
    'AUTOR: GILVALDO ARGOLO SILVA.',
    'GILVALDO SILVA pediu prioridade.',
    'ARGOLO SILVA juntou documentos.',
    'Gilvaldo A. Silva compareceu.',
    'Sr. Gilvaldo reiterou o pedido.'
  ].join(' ');
  const pares = api.mapearSubstitutos(texto);

  assert.ok(pares.find(p => p.original === 'GILVALDO ARGOLO SILVA'));
  assert.ok(pares.find(p => p.original === 'GILVALDO SILVA'));
  assert.ok(pares.find(p => p.original === 'ARGOLO SILVA'));
  assert.ok(pares.find(p => p.original === 'Gilvaldo A. Silva'));
  assert.ok(pares.find(p => p.original === 'Sr. Gilvaldo'));
});

test('mapearSubstitutos evita alias só com sobrenomes comuns da parte', () => {
  const texto = [
    'AUTOR: JOAO SILVA DOS SANTOS.',
    'SILVA SANTOS consta em outro trecho.'
  ].join(' ');
  const pares = api.mapearSubstitutos(texto);

  assert.ok(pares.find(p => p.original === 'JOAO SILVA DOS SANTOS'));
  assert.equal(pares.find(p => p.original === 'SILVA SANTOS'), undefined);
});

test('mapearSubstitutos detecta CRM preservando label', () => {
  const pares = api.mapearSubstitutos('Medico CRM/RJ 12345 emitiu laudo.');
  const par = pares.find(p => p.original.includes('CRM'));
  assert.ok(par);
  assert.equal(par.substituto.length, par.original.length);
  assert.ok(par.substituto.includes('00000'));
});

test('mapearSubstitutos detecta telefone e zerifica digitos preservando separadores', () => {
  const pares = api.mapearSubstitutos('Contato: (21) 99999-8888 | 98805-0822');
  const par = pares.find(p => p.original.includes('99999'));
  assert.ok(par, 'deve detectar telefone');
  assert.equal(par.substituto, par.original.replace(/\d/g, '0'));
  assert.equal(par.substituto.length, par.original.length);
  assert.equal(pares.find(p => p.original === '98805-0822')?.substituto, '00000-0000');
});

test('mapearSubstitutos detecta email e mascara com asteriscos de mesmo comprimento', () => {
  const pares = api.mapearSubstitutos('Enviar para joao.silva@tjrj.jus.br urgente.');
  const par = pares.find(p => p.original.includes('@'));
  assert.ok(par, 'deve detectar email');
  assert.equal(par.substituto, '*'.repeat(par.original.length));
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos redige codigo verificador de documento judicial', () => {
  const texto = [
    'mediante o preenchimento do código verificador 510016141883v5 e do código CRC 7159f385.',
    '5080099-57.2024.4.02.5101 510016141883 .V5'
  ].join(' ');
  const pares = api.mapearSubstitutos(texto);

  assert.equal(
    pares.find(p => p.original === 'código verificador 510016141883v5')?.substituto,
    'código verificador 000000000000v5'
  );
  assert.equal(pares.find(p => p.original === '510016141883 .V5')?.substituto, '000000000000 .V5');
  assert.equal(pares.find(p => p.original.includes('5080099')), undefined);
});

test('mapearSubstitutos detecta endereco e mascara com asteriscos de mesmo comprimento', () => {
  const pares = api.mapearSubstitutos('Residente na Rua das Flores 10, Centro.');
  const par = pares.find(p => p.original.toLowerCase().includes('rua das flores'));
  assert.ok(par, 'deve detectar endereco');
  assert.equal(par.substituto, '*'.repeat(par.original.length));
  assert.equal(par.substituto.length, par.original.length);
});

test('mapearSubstitutos nao inclui rotulos seguintes em nomes ou enderecos', () => {
  const pares = api.mapearSubstitutos(
    'Parte autora JOAO SILVA DOS SANTOS CPF 913.665.347-00 Endereco Rua das Flores 10 Pagina 1'
  );
  assert.ok(pares.find(p => p.original === 'JOAO SILVA DOS SANTOS'));
  assert.ok(pares.find(p => p.original === 'Rua das Flores 10'));
  assert.equal(pares.find(p => p.original.includes('SANTOS CPF')), undefined);
  assert.equal(pares.find(p => p.original.includes('Pagina')), undefined);
});

test('mapearSubstitutos detecta nome com primeiro nome reconhecido e gera iniciais com padding', () => {
  const pares = api.mapearSubstitutos('A parte autora JOAO SILVA DOS SANTOS requer o seguinte.');
  const par = pares.find(p => p.original.includes('JOAO'));
  assert.ok(par, 'deve detectar nome iniciado por primeiro nome reconhecido');
  assert.equal(par.substituto.length, par.original.length, 'comprimento deve ser preservado');
  assert.ok(par.substituto.includes('J.'), 'deve conter inicial de JOAO');
  assert.ok(par.substituto.includes('S.'), 'deve conter inicial de SILVA');
});

test('mapearSubstitutos preserva numero do processo e nao o inclui como par', () => {
  const texto = 'Processo 0001234-56.2024.8.19.0001 e CPF 913.665.347-00.';
  const pares = api.mapearSubstitutos(texto);
  assert.equal(pares.find(p => p.original.includes('0001234')), undefined,
    'numero do processo nao deve aparecer como par de substituicao');
  assert.ok(pares.find(p => p.original === '913.665.347-00'),
    'CPF deve ser redatado mesmo com numero do processo presente');
});

test('mapearSubstitutos preserva numero de processo CNJ compacto sem redacao parcial', () => {
  const texto = 'Capa do processo 50299468320254025101 e telefone (21) 99999-8888.';
  const pares = api.mapearSubstitutos(texto);
  assert.equal(pares.find(p => p.original.includes('50299468320254025101')), undefined);
  assert.equal(pares.find(p => p.original === '(21) 99999-8888')?.substituto, '(00) 00000-0000');
  assert.deepEqual(api.contarAchados(texto).numerosProcesso, ['50299468320254025101']);
});

test('contarAchados retorna contagens corretas por tipo', () => {
  const texto = 'Processo 0001234-56.2024.8.19.0001 e 0001234-56.2024.8.19.0001 CPF: 913.665.347-00 OAB/RJ 12345 JOAO SILVA DOS SANTOS';
  const achados = api.contarAchados(texto);
  assert.equal(achados.cpfs, 1);
  assert.equal(achados.oabs, 1);
  assert.equal(achados.enderecos, 0);
  assert.equal(achados.numerosProcesso.length, 1);
  assert.equal(achados.numerosProcesso[0], '0001234-56.2024.8.19.0001');
});
