# Anonimizador de Extratos CNIS

## Problema

Advogados previdenciários precisam usar plataformas SaaS como "Tramitação Inteligente" e "Fábrica de Cálculos" para cálculos previdenciários, mas a LGPD impede o envio de dados reais dos segurados. Esta ferramenta substitui dados sensíveis por dados fictícios, gerando um PDF com estrutura idêntica ao original para que os parsers dessas plataformas aceitem o arquivo.

## Arquitetura

- **100% client-side** — JavaScript rodando no navegador, sem servidor
- **Hospedagem** — GitHub Pages (gratuito)
- **Privacidade** — Nenhum dado sai do navegador do usuário

## Campos Anonimizados

| Campo | Ação |
|-------|------|
| Nome | Substituir por nome fictício |
| CPF | Substituir por CPF fictício válido |
| NIT | Substituir por NIT fictício válido |
| Nome da mãe | Substituir por nome fictício |

Todos os demais dados (data de nascimento, vínculos, salários, contribuições, indicadores, NB, CNPJ, nome do empregador) são **preservados intactos**.

## Dados Fictícios

- Gerados automaticamente a cada execução
- Usuário pode editar antes de gerar o PDF final

## Fluxo do Usuário

1. Abre o site no navegador
2. Arrasta/seleciona o PDF do CNIS
3. Ferramenta extrai e exibe os dados sensíveis encontrados
4. Dados fictícios são gerados automaticamente
5. Usuário pode editar os dados fictícios se quiser
6. Clica "Gerar PDF Anonimizado"
7. Download do PDF anonimizado

## Requisito Crítico

O PDF gerado deve manter a **exata estrutura, formatação e metadados** de um PDF original emitido pelo Meu INSS, para que os parsers do "Tramitação Inteligente" e "Fábrica de Cálculos" não rejeitem o arquivo no upload.

## Abordagem Técnica

Estratégia: carregar o PDF original, localizar e substituir os textos sensíveis diretamente nos content streams do PDF, preservando toda a estrutura/layout/fontes originais.
