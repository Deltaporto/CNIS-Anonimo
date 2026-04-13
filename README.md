# Anonimizador INSS

Ferramenta web para anonimizar extratos do CNIS (Cadastro Nacional de Informações Sociais) e cartas de concessão do INSS em conformidade com a LGPD, permitindo o uso de plataformas SaaS previdenciárias sem expor dados reais dos segurados.

**Acesse:** https://deltaporto.github.io/CNIS-Anonimo/

## O que faz

Substitui os dados sensíveis do segurado por dados fictícios, mantendo toda a estrutura, formatação e metadados do PDF original — para que os parsers de plataformas como "Tramitação Inteligente" e "Fábrica de Cálculos" aceitem o arquivo normalmente.

| Campo | Tratamento |
|-------|-----------|
| Nome | Substituído por nome fictício identificável (ex: "JOAO FAKE DOS SANTOS") |
| CPF | Substituído por CPF fictício com dígitos verificadores válidos |
| NIT | Cada NIT encontrado no PDF é substituído por um NIT fictício válido e consistente no arquivo |
| Número do benefício | Substituído por número fictício com a mesma máscara do original |
| Código de autenticidade | Substituído por código fictício preservando o formato original |
| Nome da mãe | Substituído por nome fictício sempre iniciado por "MARIA" |
| Data de nascimento | **Preservada** |
| Vínculos, salários, contribuições, indicadores | **Preservados** |

## Como usar

1. Acesse o site
2. Escolha a aba `Extrato CNIS` ou `Carta de concessão`
3. Arraste ou selecione um ou mais PDFs
4. Aguarde o processamento local no navegador
5. Confira os dados identificados e os substitutos gerados automaticamente
6. O download do PDF anonimizado ou do ZIP começa automaticamente ao final

## Privacidade

100% client-side — o PDF é processado diretamente no navegador. Nenhum dado é enviado para servidores externos.

## Testes

Execute a suíte local com:

```bash
npm test
```

A bateria cobre:

- geração de dados fictícios, incluindo a regra de que titular e mãe usam o sobrenome fixo `FAKE DOS SANTOS`
- parsing de nome, CPF e múltiplos NITs
- helpers de nomeação e exibição do lote
- regressão do pipeline completo com todos os PDFs reais disponíveis em `teste/`

## Tecnologias

- [pdf-lib](https://pdf-lib.js.org/) — manipulação de PDFs no browser
- [pdf.js](https://mozilla.github.io/pdf.js/) — extração de texto
- [pako](https://nodeca.github.io/pako/) — compressão/descompressão dos content streams
