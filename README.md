# Análise de Métricas com SonarQube — Central do Mentor

Trabalho da disciplina **Métricas e Estimativas de Software** — Engenharia de Software, CEULP/ULBRA.

Aplicação do **SonarQube Community Edition** sobre um projeto real, com configuração do ambiente, execução da análise e interpretação de 7 métricas de produto.

> 📄 **[Leia o documento completo →](Trabalho_SonarQube_Metricas.md)**

---

## Resultados

Projeto analisado: **Central do Mentor** — monorepo React 19 + TypeScript (frontend) e Node.js + Express + SQLite (backend).
**77 arquivos · 23.289 linhas de código · 1.003 funções.**

| Métrica | Resultado | Rating |
|---|---|---|
| Complexidade Ciclomática | 2.182 (cognitiva 1.320) — média 2,18/função | — |
| Duplications | **13,8%** — 3.534 linhas em 250 blocos | — |
| Code Smells | 113 — dívida técnica de 774 min (`1d 4h`) | **A** |
| Coverage | **0,8%** — 3.747 de 3.775 linhas sem teste | — |
| Bugs | 10 (todos MAJOR) | **C** |
| Security Hotspots | 8 — 0% revisados | Review **E** |
| Quality Gate customizado | **ERROR** — 6 de 12 condições falharam | — |

## Três achados principais

**O rating A esconde o problema.** O projeto tirou Maintainability **A**, mas apenas porque 774 minutos de dívida divididos por 23.289 linhas resultam em 0,1% de Debt Ratio. O projeto é grande o bastante para diluir os próprios defeitos — enquanto convive com 13,8% de duplicação e 0,8% de cobertura.

**O que está testado é o que menos importa.** Os dois únicos arquivos com 100% de cobertura são utilitários de formatação. O middleware que protege todas as rotas autenticadas tem **0%**.

**A análise estática tem limite.** O SonarQube **não detectou** o fallback de segredo JWT hardcoded em `authController.js` — provavelmente a falha mais séria do projeto. Foi encontrada em leitura manual.

---

## Estrutura do repositório

```
.
├── README.md                          # este arquivo
├── Trabalho_SonarQube_Metricas.md     # documento completo do trabalho
├── config/
│   ├── sonar-project.properties       # configuração da análise
│   ├── vitest.config.ts               # configuração de testes e cobertura
│   └── tsconfig.sonar.json            # tsconfig compatível com o analisador
├── tests/
│   ├── sessionUtils.test.ts           # 17 testes
│   └── cn.test.ts                     # 5 testes
├── prints/                            # capturas de tela do dashboard
└── projeto-analisado/                 # snapshot do código analisado
    ├── backend/                       # Node.js + Express + SQLite
    └── frontend/                      # React 19 + TypeScript + Vite
```

### Sobre o código em `projeto-analisado/`

É um **snapshot** do projeto Central do Mentor, incluído para permitir a reprodução integral da análise. Observações:

- O código pertence ao repositório **`BitStudioLabs/dspw_central_do_mentor`** e foi desenvolvido pela equipe. Este repositório é um trabalho acadêmico de análise, não a fonte canônica do projeto — para contribuir com o sistema, use o repositório original.
- O **histórico Git original não foi replicado** — apenas os arquivos, na versão analisada (commit `a48ae1a`).
- Dependências (`node_modules`), artefatos de build e o relatório de cobertura foram excluídos.
- As senhas presentes em `frontend/src/data/mockData.ts` são **dados fictícios** (`'123456'`) e o valor de `JWT_SECRET` no código é um **placeholder** — ambos apontados pela própria análise e discutidos na seção 5.6 do documento.

---

## Como reproduzir

### 1. Subir o SonarQube

Requer apenas Docker — a imagem já traz a JVM, dispensando instalar Java.

```bash
docker run -d --name sonarqube-lta -p 9000:9000 \
  -v sonarlta_data:/opt/sonarqube/data \
  -v sonarlta_logs:/opt/sonarqube/logs \
  -v sonarlta_ext:/opt/sonarqube/extensions \
  sonarqube:lts-community
```

Após ~1 min: http://localhost:9000 — login `admin` / `admin` (troca obrigatória no primeiro acesso).

> ⚠️ **Use a versão LTS (9.9), não a `latest`.** O SonarQube 26.x **removeu o tipo de regra Security Hotspot** — são 0 regras desse tipo nas 27 linguagens suportadas, o que torna a métrica impossível de obter. Detalhes na seção 2.3 do documento.

### 2. Gerar o relatório de cobertura

O SonarQube **não executa testes** — ele apenas lê um relatório no formato `lcov`. Este passo precisa rodar **antes** do scanner.

```bash
cd projeto-analisado/frontend
npm install
npm run test:coverage      # gera frontend/coverage/lcov.info
```

O Vitest e o provider de cobertura já estão declarados no `package.json`, junto com os scripts `test` e `test:coverage`.

### 3. Rodar a análise

A partir de `projeto-analisado/`, onde está o `sonar-project.properties`:

```bash
cd projeto-analisado
docker run --rm \
  -e SONAR_HOST_URL="http://host.docker.internal:9000" \
  -e SONAR_TOKEN="SEU_TOKEN" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

Gere o token em `Minha Conta → Segurança → Gerar Token`. `host.docker.internal` é como o container enxerga o `localhost` da máquina.

### 4. Criar o Quality Gate customizado

`Quality Gates → Create`, e adicionar as condições sobre **Overall Code**:

| Métrica | Operador | Limiar |
|---|---|---|
| Coverage | menor que | 60% |
| Duplicated Lines (%) | maior que | 5% |
| Reliability Rating | pior que | A |
| Maintainability Rating | pior que | A |
| Security Rating | pior que | A |
| Security Hotspots Reviewed | menor que | 100% |

Depois associe ao projeto e **reexecute a análise** — o status do gate é calculado no momento da análise, não retroativamente.

---

## Plano de ação sugerido

Ordenado por retorno sobre esforço, conforme as condições reprovadas no Quality Gate:

| # | Ação | Esforço | Efeito |
|---|---|---|---|
| 1 | Revisar os 8 Security Hotspots na interface | ~30 min | Review Rating **E → A** |
| 2 | Corrigir os 10 bugs MAJOR (1 linha cada) | ~2 h | Reliability **C → A** |
| 3 | Extrair `ProfileLayout` e `AuthForm` | ~1 dia | Duplicação 13,8% → ~8% |
| 4 | Testar autenticação e validadores | ~3 dias | Coverage 0,8% → ~20% |

As duas primeiras somam **menos de 3 horas** e resolvem **4 das 6 condições reprovadas**.

---

## Ambiente utilizado

| Componente | Versão |
|---|---|
| SonarQube | Community Edition 9.9.8 LTS (Docker) |
| Scanner | `sonarsource/sonar-scanner-cli` (Docker) |
| Node.js | 24.11.1 |
| Framework de teste | Vitest + `@vitest/coverage-v8` |
