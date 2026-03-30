# Anonimizador CNIS

Ferramenta web para anonimizar extratos do CNIS (Cadastro Nacional de Informações Sociais) em conformidade com a LGPD, permitindo o uso de plataformas SaaS previdenciárias sem expor dados reais dos segurados.

**Acesse:** https://deltaporto.github.io/CNIS-Anonimo/

## O que faz

Substitui os dados sensíveis do segurado por dados fictícios, mantendo toda a estrutura, formatação e metadados do PDF original — para que os parsers de plataformas como "Tramitação Inteligente" e "Fábrica de Cálculos" aceitem o arquivo normalmente.

| Campo | Tratamento |
|-------|-----------|
| Nome | Substituído por nome fictício identificável (ex: "JOAO FAKE DA SILVA") |
| CPF | Substituído por CPF fictício com dígitos verificadores válidos |
| NIT | Cada NIT encontrado no PDF é substituído por um NIT fictício válido e consistente no arquivo |
| Nome da mãe | Substituído por nome fictício sempre iniciado por "MARIA" |
| Data de nascimento | **Preservada** |
| Vínculos, salários, contribuições, indicadores | **Preservados** |

## Como usar

1. Acesse o site
2. Arraste ou selecione o PDF do CNIS
3. Aguarde o processamento local no navegador
4. Confira os dados identificados e os substitutos gerados automaticamente
5. O download do PDF anonimizado ou do ZIP começa automaticamente ao final

## Privacidade

100% client-side — o PDF é processado diretamente no navegador. Nenhum dado é enviado para servidores externos.

## Tecnologias

- [pdf-lib](https://pdf-lib.js.org/) — manipulação de PDFs no browser
- [pdf.js](https://mozilla.github.io/pdf.js/) — extração de texto
- [pako](https://nodeca.github.io/pako/) — compressão/descompressão dos content streams
