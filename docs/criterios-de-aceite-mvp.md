# Criterios de Aceite do MVP

## Escopo minimo aprovado

O MVP sera considerado pronto quando cumprir os criterios abaixo.

## Funcionais

- aceitar `URL`
- aceitar upload de `PNG/JPG`
- gerar analise para `desktop`
- gerar analise para `mobile`
- exibir `heatmap`
- exibir `focus map`
- exibir scorecards
- exibir relatorio com IA
- comparar duas analises

## Tecnicos

- pipeline completo executado em ate `60s`
- artifacts persistidos corretamente
- jobs recuperaveis em caso de falha
- schema consistente entre worker e app

## Qualidade de produto

- CTA principal detectado corretamente na maioria das landing pages de teste
- headline principal detectado corretamente na maioria das landing pages de teste
- heatmap visualmente coerente com a hierarquia da tela
- relatorio final util e nao generico
- comparacao A/B mostrar diferencas reais

## Criterios de nao aceite

O MVP nao deve ser considerado pronto se:

- o heatmap parecer aleatorio
- o relatorio contradizer os scores
- o CTA principal for frequentemente ignorado
- a latencia estiver fora da faixa aceitavel
- a UI nao permitir interpretar rapidamente o resultado
