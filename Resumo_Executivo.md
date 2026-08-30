# Configuração e Interpretação de Métricas com SonarQube — Resumo Executivo

**Disciplina:** Métricas e Estimativas de Software
**Curso:** Engenharia de Software — CEULP/ULBRA
**Integrantes do grupo:** Lucas Jardim, Matheus José, William Dias
**Projeto analisado:** Central do Mentor (`dspw_central_do_mentor`)
**Ferramenta:** SonarQube Community Edition 9.9.8 LTS (via Docker)
**Data da análise:** 26/08/2026

---

## 1. O que foi feito

O **SonarQube Community 9.9.8 LTS** foi instalado localmente via Docker e configurado para analisar o **Central do Mentor** — um monorepo real de sistema de mentoria, com backend Node.js/Express/SQLite e frontend React 19 + TypeScript.

A análise cobriu **77 arquivos**, **23.289 linhas de código (NCLOC)** e **1.003 funções**.

Das 7 métricas exigidas, **5 são automáticas** (calculadas pelo analisador sem configuração) e **2 exigiram configuração deliberada**:

- **Coverage** — o projeto não tinha nenhum teste. Foi necessário instalar o Vitest, criar `vitest.config.ts`, escrever **22 testes** e gerar o relatório `lcov.info`, que o SonarQube apenas **lê** (ele não executa testes).
- **Quality Gate customizado** — foram criadas **6 condições sobre Overall Code**, somadas às 6 herdadas sobre New Code.

> **Escolha da versão.** A versão mais recente (26.8) foi descartada porque **removeu por completo o tipo de regra Security Hotspot** — são 0 regras desse tipo nas 27 linguagens suportadas, o que tornaria a métrica impossível de obter. A 9.9.8 LTS mantém 53 regras de hotspot ativas para JavaScript e TypeScript.

---

## 2. Resultados das 7 métricas

| # | Métrica | Configuração | Resultado | Rating |
|---|---|---|---|---|
| 1 | Complexidade Ciclomática | automática | 2.182 (cognitiva 1.320) — média **2,18**/função | — |
| 2 | Duplications | automática | **13,8%** — 3.534 linhas em 250 blocos | — |
| 3 | Code Smells / Maintainability | automática | 113 smells — dívida de 774 min (`1d 4h`) | **A** |
| 4 | Coverage | **exigiu configuração** | **0,8%** — 3.747 de 3.775 linhas sem teste | — |
| 5 | Bugs / Reliability | automática | 10 bugs, todos MAJOR | **C** |
| 6 | Security Hotspots | automática | 8 hotspots — **0%** revisados | Review **E** |
| 7 | Quality Gate customizado | **exigiu configuração** | **ERROR** — 6 de 12 condições falharam | — |

Complementarmente: **0 Vulnerabilities**, Security Rating **A**.

---

## 3. Interpretação — o que cada número diz

**Complexidade.** A média de 2,18 por função é excelente (a literatura tolera até 10). O problema está na média **por arquivo: 28,3**. As funções são pequenas, mas os componentes React são gigantes — `CreateSessionPage.tsx` concentra complexidade 129. Em `SessionsPage.tsx` a complexidade **cognitiva (186) supera a ciclomática (115)**, sinal de aninhamento profundo: decisões dentro de decisões.

**Duplicação.** 13,8% é mais de 4× o limite usual de 3%. Não é dispersa, é estrutural: `MenteeProfile.tsx` (65,6%) e `MentorProfile.tsx` (45,3%) são cópias adaptadas uma da outra; `Login.tsx` e `Register.tsx` repetem a mesma estrutura de formulário. Isso a torna barata de corrigir.

**Code Smells.** Aqui está a lição metodológica central: **o rating A é enganoso lido isoladamente**. O Debt Ratio é 0,1% apenas porque 774 minutos de dívida são divididos por 23.289 linhas × 30 min de custo estimado. O projeto é grande o suficiente para **diluir os próprios defeitos** — um projeto de 1.000 linhas com os mesmos 113 smells teria 2,6%.

**Coverage.** O resultado mais grave, porque é o que **impede corrigir os demais**: sem testes, toda refatoração é feita às cegas. Existe um círculo vicioso — a duplicação pede refatoração, a refatoração exige testes, sem testes ninguém refatora. E o padrão do que está coberto é revelador: os dois únicos arquivos com 100% são utilitários de formatação, enquanto **o middleware que protege todas as rotas autenticadas tem 0%**.

**Bugs.** O rating **C** vem da regra do pior caso — um único bug MAJOR já rebaixa de A para C. Os 10 se reduzem a **dois padrões repetidos por cópia**, ambos de uma linha. O mais relevante é o *valor vazado*: `{session.maxParticipants && (...)}` renderiza um "0" solto na tela quando o valor é zero, porque o JavaScript devolve o número, não `false`.

**Security Hotspots.** Security Rating **A** convivendo com Review Rating **E** não é contradição: o A diz "nenhuma falha comprovada", o E diz "8 pontos exigem sua avaliação e nenhum foi avaliado". O E pune a **ausência de processo de revisão**, não o código.

**Quality Gate.** Cumpriu sua função: **discriminou**. Reprovou cobertura, duplicação, confiabilidade e revisão de hotspots; aprovou manutenibilidade e segurança estrutural. Em um pipeline de CI/CD, nenhum código novo entraria em produção hoje.

---

## 4. Três achados principais

**1. Dois "A" escondem o quadro real.** Maintainability A e Security A sugeririam um projeto saudável. As outras métricas contam outra história: 13,8% de duplicação, 0,8% de cobertura, 10 bugs e 8 hotspots sem revisão. Nenhuma métrica deve ser lida sozinha.

**2. As métricas convergem para os mesmos arquivos.** `MentorProfile.tsx`, `SessionsPage.tsx` e `MenteeProfile.tsx` aparecem simultaneamente entre os mais complexos, os mais duplicados e os que concentram smells críticos. Não são três problemas — é um só: **componentes monolíticos criados por cópia e adaptação**.

**3. A análise estática tem limite.** O SonarQube **não detectou** o fallback de segredo JWT hardcoded em `authController.js:57` e `:94` (`process.env.JWT_SECRET || 'seu_secret_...'`) — provavelmente a falha mais séria do projeto, encontrada apenas em leitura manual. Ferramentas automatizadas complementam, mas não substituem, a revisão humana.

---

## 5. Plano de ação priorizado

Ordenado por retorno sobre esforço, derivado das condições reprovadas no Quality Gate:

| # | Ação | Esforço | Efeito |
|---|---|---|---|
| 1 | Revisar os 8 Security Hotspots na interface | ~30 min | Review Rating **E → A** |
| 2 | Corrigir os 10 bugs MAJOR (1 linha cada) | ~2 h | Reliability **C → A** |
| 3 | Extrair `ProfileLayout` e `AuthForm` | ~1 dia | Duplicação 13,8% → ~8% |
| 4 | Testar autenticação e validadores | ~3 dias | Coverage 0,8% → ~20% |

As **duas primeiras somam menos de 3 horas** e resolvem **4 das 6 condições reprovadas**.

---

## 6. Onde consultar o detalhamento

Este resumo condensa o documento completo, que traz, **para cada uma das 7 métricas**: explicação teórica, passo a passo de configuração, print do dashboard com o resultado real e interpretação dos insights.

| Documento | Conteúdo |
|---|---|
| `Trabalho_SonarQube_Metricas.docx` | Documento completo — 27 páginas, 10 capturas de tela |
| `prints/` | As 10 capturas do SonarQube, em resolução original |
| `config/` | `sonar-project.properties`, `vitest.config.ts`, `tsconfig.sonar.json` |
| `tests/` | Os 22 testes escritos para viabilizar a métrica de Coverage |
| `projeto-analisado/` | Snapshot do código analisado, para reprodução integral |
