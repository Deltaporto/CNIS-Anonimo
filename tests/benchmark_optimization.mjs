import { loadPdfProcessorApi } from './helpers/browser-apis.mjs';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  const pdfProcessorApi = await loadPdfProcessorApi();

  const cmap = `
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
1 begincodespacerange
<0000><FFFF>
endcodespacerange
27 beginbfrange
<0003><0003><0020>
<0010><0010><002d>
<0011><0011><002e>
<0013><0013><0030>
<0014><0014><0031>
<0015><0015><0032>
<0016><0016><0033>
<0017><0017><0034>
<0018><0018><0035>
<0019><0019><0036>
<001A><001A><0037>
<001B><001B><0038>
<001C><001C><0039>
<0024><0024><0041>
<0026><0026><0043>
<0027><0027><0044>
<0028><0028><0045>
<0029><0029><0046>
<002E><002E><004B>
<002F><002F><004C>
<0031><0031><004E>
<0032><0032><004F>
<0035><0035><0052>
<0036><0036><0053>
<0037><0037><0054>
<0038><0038><0055>
<003D><003D><005A>
<0044><0044><0061>
<004E><004E><006B>
<0052><0052><006F>
endbfrange
endcmap
end
end
`.trim();

  const reverseMap = pdfProcessorApi.parseToUnicodeCMap(cmap);
  const specs = pdfProcessorApi.montarEspecificacoesSubstituicao(
    {
      nome: 'TEREZA DOS SANTOS',
      cpf: '733.874.017-87',
      nits: ['111.68584.40-4', '222.33333.44-5'],
      nomeMae: 'MARIA DOS SANTOS'
    },
    {
      nome: 'TEREZA FAKE DOS SANTOS',
      cpf: '123.456.789-09',
      nits: ['999.88888.77-6', '555.44444.33-2'],
      nomeMae: 'MARIA FAKE DOS SANTOS'
    }
  );
  const specsHex = pdfProcessorApi.montarEspecificacoesHex(specs, [reverseMap]);

  const nomeOriginal = pdfProcessorApi.encodeTextWithCMap('TEREZA DOS SANTOS', reverseMap);
  const cpfOriginal = pdfProcessorApi.encodeTextWithCMap('733.874.017-87', reverseMap);

  // Create a large text with many hex blocks
  let largeStream = 'BT\n/F4 8 Tf\n';
  for (let i = 0; i < 5000; i++) {
    largeStream += `<${nomeOriginal}>Tj\n<${cpfOriginal}>Tj\n`;
    largeStream += `<001300140015>Tj\n`; // some other hex
  }
  largeStream += 'ET';

  const iterations = 10;
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    pdfProcessorApi.aplicarEspecificacoesEmHex(largeStream, specsHex);
    const end = performance.now();
    totalTime += (end - start);
  }

  console.log(`Average time over ${iterations} iterations: ${(totalTime / iterations).toFixed(4)}ms`);
}

runBenchmark();
