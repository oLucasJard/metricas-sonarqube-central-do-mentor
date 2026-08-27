# Configuração e Interpretação de Métricas com SonarQube

**Disciplina:** Métricas e Estimativas de Software
**Curso:** Engenharia de Software — CEULP/ULBRA
**Aluno:** Lucas Jardim
**Projeto analisado:** Central do Mentor (`dspw_central_do_mentor`)
**Ferramenta:** SonarQube Community Edition 9.9.8 LTS (via Docker)
**Data da análise:** 26/08/2026

---

## 1. O projeto analisado

O **Central do Mentor** é um sistema de mentoria que conecta mentores experientes a aprendizes. É um monorepo com duas aplicações:

| Camada | Stack | Arquivos | Linhas |
|---|---|---|---|
| Backend | Node.js + Express + SQLite (JavaScript, ESM) | 22 | 3.347 |
| Frontend | React 19 + TypeScript + Vite + Tailwind | 55 | 20.536 |

Após a análise, o SonarQube contabilizou **77 arquivos**, **23.289 linhas de código (NCLOC)** e **1.003 funções**.

A escolha do projeto não foi trivial e vale registrar: a primeira tentativa foi analisar um projeto em **Haskell**, mas o SonarQube **não possui analisador para essa linguagem**. Isso foi comprovado consultando a própria API do servidor:

```bash
curl -s -u admin:admin http://localhost:9000/api/languages/list
```

O retorno lista 27 linguagens suportadas (Java, JavaScript, TypeScript, Python, C#, C/C++, Go, Kotlin, PHP, Ruby, Scala, entre outras) — **Haskell não está entre elas**. Como o Sonar mede apenas o que consegue parsear, um projeto Haskell produziria 0 linhas de código e todas as métricas vazias. Por isso o projeto foi trocado por um em TypeScript/JavaScript.

> **[PRINT 0]** — Tela inicial do projeto no SonarQube
> URL: `http://localhost:9000/dashboard?id=central-do-mentor`

---

## 2. Instalação do SonarQube

A instalação foi feita via **Docker**, o que dispensa instalar o Java (o SonarQube roda sobre JVM, e a imagem já a traz embutida).

### 2.1 Subir o servidor

```bash
docker pull sonarqube:lts-community

docker run -d --name sonarqube-lta -p 9000:9000 \
  -v sonarlta_data:/opt/sonarqube/data \
  -v sonarlta_logs:/opt/sonarqube/logs \
  -v sonarlta_ext:/opt/sonarqube/extensions \
  sonarqube:lts-community
```

Os três volumes (`data`, `logs`, `extensions`) garantem que o banco interno, os logs e os plugins sobrevivam a uma recriação do container.

Após ~1 minuto o servidor responde em `http://localhost:9000`. O status pode ser conferido por API:

```bash
curl http://localhost:9000/api/system/status
# {"id":"...","version":"9.9.8.100196","status":"UP"}
```

**Primeiro acesso:** usuário `admin`, senha `admin`. O SonarQube obriga a troca de senha no primeiro login.

### 2.2 Gerar o token de análise

O scanner precisa se autenticar no servidor. A prática recomendada é usar um **token** em vez da senha — ele não expõe a credencial no arquivo de configuração e pode ser revogado individualmente.

Interface: `Minha Conta → Segurança → Gerar Token`. Ou por API:

```bash
curl -s -u admin:SENHA -X POST \
  "http://localhost:9000/api/user_tokens/generate?name=trabalho-metricas"
```

### 2.3 Escolha da versão — uma decisão relevante

A versão mais recente (**SonarQube 26.8**) foi testada primeiro, mas apresentou um problema para este trabalho: **ela removeu por completo o tipo de regra "Security Hotspot"**. A verificação foi feita direto no repositório de regras do servidor:

```bash
curl -s -u TOKEN: "http://localhost:9000/api/rules/search?types=SECURITY_HOTSPOT&ps=1"
# {"total":0, ...}  → nenhuma regra de hotspot em nenhuma das 27 linguagens
```

Na versão 26.8, o que antes era hotspot (ex.: CORS permissivo) passou a ser classificado diretamente como *Vulnerability*, sob o modelo **MQR (Multi-Quality Rule)**. Como o enunciado do trabalho exige a métrica **Security Hotspots** e usa a taxonomia clássica (*Bugs / Reliability Rating*, *Code Smells / Maintainability Rating*), optou-se pela versão **9.9.8 LTS**, que mantém **53 regras de Security Hotspot ativas** para JavaScript e TypeScript.

---

## 3. Configuração da análise

### 3.1 Arquivo `sonar-project.properties`

Criado na raiz do repositório. Cada bloco tem função específica:

```properties
# Identificação
sonar.projectKey=central-do-mentor
sonar.projectName=Central do Mentor
sonar.projectVersion=1.0

# Código de produção (monorepo: duas pastas)
sonar.sources=backend/src,frontend/src

# Testes — separados do código de produção
sonar.tests=frontend/src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

# Exclusões: dependências e artefatos de build não são código autoral
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.vite/**,**/*.min.js

# Coverage — o Sonar apenas LÊ este relatório, não executa testes
sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info
sonar.typescript.lcov.reportPaths=frontend/coverage/lcov.info

# tsconfig simplificado para a análise
sonar.typescript.tsconfigPath=frontend/tsconfig.sonar.json

sonar.sourceEncoding=UTF-8
```

Dois pontos merecem destaque:

- **`sonar.test.inclusions`** — separar teste de produção não é cosmético. Se os arquivos de teste entrassem como código de produção, eles inflariam a complexidade, a duplicação e os code smells com código que não vai para produção.
- **`sonar.typescript.tsconfigPath`** — o `tsconfig.app.json` do projeto usa opções do TypeScript 5.8 (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`) que o analisador do Sonar 9.9 não reconhece, o que abortava a análise dos 54 arquivos do frontend com o erro `Unknown compiler option`. A solução foi criar um `tsconfig.sonar.json` simplificado, usado **apenas** pela análise, sem interferir no build da aplicação.

### 3.2 Executar o scanner

Também via Docker, evitando instalar o Java:

```bash
docker run --rm \
  -e SONAR_HOST_URL="http://host.docker.internal:9000" \
  -e SONAR_TOKEN="squ_xxxxxxxxxxxxxxxx" \
  -v "CAMINHO/DO/PROJETO:/usr/src" \
  sonarsource/sonar-scanner-cli
```

`host.docker.internal` é o nome que o container usa para enxergar o `localhost` da máquina hospedeira — sem isso, o scanner não encontraria o servidor.

Resultado: `ANALYSIS SUCCESSFUL`, 79 arquivos analisados em ~2min30.

---

## 4. Resumo dos resultados

| Métrica | Valor obtido | Rating |
|---|---|---|
| Complexidade Ciclomática | 2.182 (cognitiva: 1.320) | — |
| Duplications | 13,8% — 3.534 linhas em 250 blocos | — |
| Code Smells | 113 — dívida de 774 min (12h54) | **A** |
| Coverage | 0,8% (linha 0,7% / branch 0,9%) | — |
| Bugs | 10 | **C** |
| Security Hotspots | 8 (0% revisados) | Review **E** |
| Vulnerabilities | 0 | Security **A** |
| Quality Gate customizado | **ERROR** (6 de 12 condições falharam) | — |

---

# 5. As 7 métricas

## 5.1 Complexidade Ciclomática

### Explicação teórica

A **complexidade ciclomática** (McCabe, 1976) mede o número de caminhos linearmente independentes dentro de uma unidade de código. Na prática, conta-se 1 (o caminho principal) e soma-se 1 para cada ponto de decisão: `if`, `else if`, `for`, `while`, `case`, `catch`, `&&`, `||`, operador ternário.

Ela importa por dois motivos diretos:

1. **Testabilidade** — a complexidade ciclomática é o número mínimo de casos de teste necessários para cobrir todos os caminhos. Uma função com complexidade 15 exige ao menos 15 testes para cobertura de caminhos.
2. **Manutenibilidade** — quanto mais caminhos, maior a carga cognitiva para entender o código e maior a chance de introduzir defeito ao alterá-lo.

O SonarQube complementa essa métrica com a **Complexidade Cognitiva**, que penaliza aninhamento e estruturas que quebram o fluxo linear de leitura. Duas funções podem ter a mesma complexidade ciclomática e cognitivas muito diferentes: um `switch` de 10 casos é ciclomaticamente complexo mas cognitivamente simples; três `if` aninhados são o oposto.

### Passo a passo de configuração

**É automática.** Não exige nenhuma configuração. O analisador calcula a complexidade durante o parse da árvore sintática, para toda linguagem suportada.

Onde aparece no dashboard:
- `Measures → Complexity → Cyclomatic Complexity` (visão de árvore, permite ordenar por arquivo)
- Também no painel lateral esquerdo do dashboard do projeto

Regras relacionadas que geram issue automaticamente no perfil *Sonar way*:
- `typescript:S3776` — Cognitive Complexity of functions should not be too high (limite padrão: **15**)

> **[PRINT 1]** — Complexidade ciclomática por arquivo
> URL: `http://localhost:9000/component_measures?id=central-do-mentor&metric=complexity`

### Resultado obtido

| Indicador | Valor |
|---|---|
| Complexidade Ciclomática total | **2.182** |
| Complexidade Cognitiva total | **1.320** |
| Funções | 1.003 |
| Arquivos | 77 |
| **Média por função** | **2,18** |
| **Média por arquivo** | **28,3** |

Arquivos mais complexos:

| Arquivo | Ciclomática | Cognitiva | NCLOC |
|---|---|---|---|
| `frontend/src/pages/CreateSessionPage.tsx` | 129 | 45 | 1.517 |
| `frontend/src/pages/SessionsPage.tsx` | 115 | 186 | 915 |
| `frontend/src/pages/SessionsFeed.tsx` | 107 | 68 | 720 |
| `frontend/src/pages/MentorProfile.tsx` | 106 | 36 | 1.749 |
| `frontend/src/pages/SessionDetailPage.tsx` | 106 | 143 | 1.232 |

### Interpretação dos insights

A **média de 2,18 por função é excelente** — a literatura considera saudável até 10 por função. Isoladamente, esse número sugeriria um código simples.

O problema aparece na **média por arquivo: 28,3**, e principalmente nos extremos. O `CreateSessionPage.tsx` concentra complexidade 129 em 1.517 linhas. Isso revela o padrão real do projeto: as funções individuais são pequenas, mas os **componentes React são gigantes** — cada página acumula dezenas de handlers, estados e blocos de renderização condicional em um único arquivo.

O contraste entre ciclomática e cognitiva é o dado mais interessante. Em `SessionsPage.tsx`, a cognitiva (186) **supera** a ciclomática (115). Isso indica **aninhamento profundo**: não são muitas decisões simples, são decisões dentro de decisões — o tipo de código que é difícil de ler mesmo quando é fácil de descrever. Já em `MentorProfile.tsx` ocorre o inverso (106 vs 36): muitas decisões, porém rasas e paralelas, tipicamente `&&` de renderização condicional em JSX.

O Sonar transformou isso em **5 code smells CRITICAL** do tipo *"Refactor this function to reduce its Cognitive Complexity"*.

**O que melhorar:** priorizar `SessionsPage.tsx` e `SessionDetailPage.tsx`, cuja complexidade cognitiva está desproporcional. A refatoração indicada é extrair os blocos aninhados em subcomponentes e mover a lógica de decisão para *custom hooks*, reduzindo o aninhamento em vez de apenas dividir arquivos.

---

## 5.2 Duplications (duplicação de código)

### Explicação teórica

Mede o percentual de linhas que aparecem repetidas no projeto. O SonarQube usa um algoritmo de detecção por blocos (*CPD — Copy/Paste Detector*): normaliza o código em tokens e procura sequências idênticas. Para a maioria das linguagens, o bloco mínimo considerado é de **10 linhas sucessivas** e ao menos 100 tokens.

Duplicação importa porque viola o princípio **DRY (Don't Repeat Yourself)** e tem custo concreto: uma correção de bug precisa ser aplicada em N lugares, e basta esquecer um para o defeito sobreviver. Duplicação é o principal multiplicador silencioso de esforço de manutenção.

### Passo a passo de configuração

**É automática.** O CPD roda em toda análise — no log do scanner aparece `CPD Executor Calculating CPD for 66 files`.

Onde aparece no dashboard:
- `Measures → Duplications → Duplicated Lines (%)`
- Ao abrir um arquivo, as linhas duplicadas ficam marcadas em uma barra vertical à esquerda, e é possível clicar para ver o trecho gêmeo

### Resultado obtido

| Indicador | Valor |
|---|---|
| **Densidade de duplicação** | **13,8%** |
| Linhas duplicadas | 3.534 |
| Blocos duplicados | 250 |

Arquivos mais duplicados:

| Arquivo | Densidade | Blocos |
|---|---|---|
| `frontend/src/pages/MenteeProfile.tsx` | **65,6%** | 48 |
| `backend/src/validators/mentorValidator.js` | 54,2% | 2 |
| `frontend/src/pages/MentorProfile.tsx` | 45,3% | 53 |
| `frontend/src/pages/Login.tsx` | 44,2% | 10 |
| `frontend/src/contexts/OnboardingContext.tsx` | 41,7% | 2 |
| `frontend/src/pages/Register.tsx` | 41,2% | 16 |

> **[PRINT 2]** — Duplicação por arquivo
> URL: `http://localhost:9000/component_measures?id=central-do-mentor&metric=duplicated_lines_density`

### Interpretação dos insights

**13,8% é o pior resultado do projeto** e o mais acionável. A referência usual da indústria é manter duplicação abaixo de **3%**; o Quality Gate padrão do SonarQube usa 3% para código novo. O projeto está a mais de 4× esse limite.

Os números apontam para duas causas distintas, que exigem soluções diferentes:

**1. Páginas de perfil espelhadas.** `MenteeProfile.tsx` (65,6%, 48 blocos) e `MentorProfile.tsx` (45,3%, 53 blocos) são claramente cópias uma da outra, adaptadas para dois tipos de usuário. Dois terços do arquivo de perfil do aprendiz existem em outro lugar. Qualquer ajuste de layout ou validação precisa ser feito duas vezes — e o risco é que só uma seja lembrada.

**2. Formulários repetidos.** `Login.tsx` (44,2%) e `Register.tsx` (41,2%) compartilham a mesma estrutura de campos, validação e tratamento de erro.

**3. Validadores do backend.** `mentorValidator.js` com 54,2% em apenas 2 blocos indica cadeias de validação `express-validator` copiadas entre endpoints.

**O que melhorar:** o ganho aqui é alto e o esforço é baixo, porque a duplicação é estrutural e não dispersa:
- Extrair um componente `ProfileLayout` parametrizado por tipo de usuário — isso sozinho deve derrubar vários pontos percentuais;
- Criar um componente `AuthForm` compartilhado por login e cadastro;
- Extrair as regras comuns dos validadores para funções reutilizáveis.

Vale registrar uma ressalva metodológica: parte da duplicação em arquivos `.tsx` é **JSX estrutural** (classes Tailwind repetidas, wrappers de layout), que o CPD detecta mas que nem sempre representa dívida real. Ainda assim, 65,6% em um único arquivo está muito além do que se explica por isso.

---

## 5.3 Code Smells / Maintainability Rating

### Explicação teórica

**Code Smell** é código que funciona, mas que dificulta a manutenção — não é defeito, é sintoma de má estruturação. O termo vem de Martin Fowler: métodos longos, parâmetros demais, código morto, nomes ruins, complexidade excessiva.

O SonarQube quantifica cada smell em **tempo estimado de correção** (em minutos). A soma é o **Technical Debt** (`sqale_index`), no modelo **SQALE**.

O **Maintainability Rating** deriva do **Technical Debt Ratio**:

```
Debt Ratio = Custo de correção ÷ Custo de desenvolvimento
```

onde o custo de desenvolvimento é estimado em **30 minutos por linha de código**. A escala:

| Rating | Debt Ratio |
|---|---|
| **A** | ≤ 5% |
| **B** | 6% a 10% |
| **C** | 11% a 20% |
| **D** | 21% a 50% |
| **E** | > 50% |

### Passo a passo de configuração

**É automática.** Os smells vêm do **Quality Profile** aplicado — por padrão o *Sonar way*, com **415 regras ativas para JavaScript** e **428 para TypeScript**. Verificável em `Quality Profiles`.

Onde aparece no dashboard:
- Aba `Issues → Type: Code Smell` (lista detalhada, filtrável por severidade)
- `Measures → Maintainability` (rating e dívida técnica)

É possível customizar criando um Quality Profile próprio e ativando/desativando regras — não foi necessário aqui.

### Resultado obtido

| Indicador | Valor |
|---|---|
| **Code Smells** | **113** |
| **Maintainability Rating** | **A** |
| Technical Debt | 774 min (**12h54**) |
| Technical Debt Ratio | 0,1% |

Principais smells (todos CRITICAL):

| Arquivo | Linha | Regra |
|---|---|---|
| `MentorProfile.tsx` | 40 | Refactor this function to reduce its Cognitive Complexity |
| `SessionDetailPage.tsx` | 43 | Refactor this function to reduce its Cognitive Complexity |
| `Register.tsx` | 6 | Refactor this function to reduce its Cognitive Complexity |
| `SessionsFeed.tsx` | 493 | Refactor this function to reduce its Cognitive Complexity |
| `SessionsPage.tsx` | 475 | Refactor this function to reduce its Cognitive Complexity |

> **[PRINT 3]** — Lista de Code Smells
> URL: `http://localhost:9000/project/issues?id=central-do-mentor&resolved=false&types=CODE_SMELL`

### Interpretação dos insights

Aqui está a **lição mais importante do trabalho: o rating A é enganoso se lido isoladamente.**

O projeto tirou **A** em manutenibilidade porque o Debt Ratio é de apenas 0,1%. Mas esse número é um **quociente**, e o denominador é enorme: 23.289 linhas × 30 min = 698.670 minutos de "custo de desenvolvimento" estimado. Contra isso, 774 minutos de dívida desaparecem estatisticamente.

Em outras palavras: **o projeto é grande o suficiente para diluir seus próprios problemas**. Um projeto de 1.000 linhas com os mesmos 113 smells teria Debt Ratio de 2,6% — ainda A, mas 26× pior em densidade real.

Isso mostra que o Maintainability Rating **não deve ser usado sozinho** como indicador de saúde. Cruzando com as outras métricas, o quadro real é bem menos confortável: 13,8% de duplicação e complexidade cognitiva concentrada não aparecem nesse A.

O conteúdo dos smells confirma o diagnóstico já visto na seção 5.1: os 5 mais severos são **todos** de complexidade cognitiva excessiva, nos mesmos arquivos. As três métricas — complexidade, duplicação e smells — estão apontando para o mesmo conjunto de arquivos.

**O que melhorar:** 12h54 de dívida é um valor perfeitamente absorvível em uma sprint. Atacar os 5 smells CRITICAL resolve simultaneamente o problema de complexidade cognitiva. O rating não vai melhorar (já é A), mas a legibilidade sim — e é esse o ganho real.

---

## 5.4 Coverage (cobertura de testes) — **exige configuração**

### Explicação teórica

**Cobertura de testes** mede o percentual de código executado durante a suíte de testes. O SonarQube trabalha com dois recortes:

- **Line Coverage** — percentual de linhas executáveis executadas ao menos uma vez;
- **Branch (Condition) Coverage** — percentual de ramos de decisão exercitados. Um `if` precisa ser testado com condição verdadeira **e** falsa para ter 100% de branch coverage.

A métrica `Coverage` do Sonar combina as duas:

```
Coverage = (linhas cobertas + condições cobertas) ÷ (linhas a cobrir + condições a cobrir)
```

Ela importa porque é o principal indicador de **risco de regressão**: código sem teste é código que ninguém saberá que quebrou. É importante ressaltar, porém, que cobertura alta **não garante qualidade** — ela prova que o código foi executado, não que foi verificado corretamente. Cobertura é condição necessária, não suficiente.

### Passo a passo de configuração

Esta é uma das duas métricas que **exigem configuração**, e a razão é fundamental:

> **O SonarQube não executa testes.** Ele apenas **lê** um relatório de cobertura gerado por uma ferramenta externa. Sem esse relatório, a métrica aparece vazia no dashboard.

O projeto não possuía **nenhum teste**, então foi necessário criar a infraestrutura completa:

**Passo 1 — Instalar o Vitest** (escolhido por integração nativa com o Vite, já usado no projeto):

```bash
cd frontend
npm install -D vitest @vitest/coverage-v8
```

**Passo 2 — Criar o `vitest.config.ts`** (arquivo separado, para não alterar o `vite.config.ts` de produção):

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],   // lcov = formato que o Sonar consome
      reportsDirectory: './coverage',
      all: true,                     // inclui arquivos SEM teste, como 0%
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts', 'src/main.tsx'],
    },
  },
})
```

A opção **`all: true`** é decisiva para a honestidade da métrica. Sem ela, o relatório incluiria apenas os arquivos que os testes importam — e a cobertura sairia artificialmente inflada (perto de 100%, medindo só o que já se sabe testado). Com `all: true`, todo o `src/` entra no denominador.

**Passo 3 — Escrever os testes.** Foram criados 22 testes cobrindo as funções puras de `sessionUtils.ts` (formatação de data, tradução de status, geração de iniciais e cores de avatar) e `cn.ts` (composição de classes CSS).

**Passo 4 — Adicionar o script ao `package.json`:**

```json
"test:coverage": "vitest run --coverage"
```

**Passo 5 — Gerar o relatório:**

```bash
npm run test:coverage
# Test Files  2 passed (2)
#      Tests  22 passed (22)
# → gera frontend/coverage/lcov.info
```

**Passo 6 — Apontar o Sonar para o relatório**, no `sonar-project.properties`:

```properties
sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info
sonar.typescript.lcov.reportPaths=frontend/coverage/lcov.info
```

**Ordem importa:** o `npm run test:coverage` precisa rodar **antes** do scanner. Se o `lcov.info` não existir no momento da análise, o Sonar simplesmente reporta 0% sem erro visível.

> **[PRINT 4]** — Cobertura de testes
> URL: `http://localhost:9000/component_measures?id=central-do-mentor&metric=coverage`
>
> **[PRINT 4b]** — Terminal com os 22 testes passando e o resumo de cobertura

### Resultado obtido

| Indicador | Valor |
|---|---|
| **Coverage** | **0,8%** |
| Line Coverage | 0,7% |
| Branch Coverage | 0,9% |
| Linhas a cobrir | 3.775 |
| Linhas não cobertas | 3.747 |
| Testes | 22 |

Por arquivo:

| Arquivo | Cobertura | Linhas a cobrir |
|---|---|---|
| `frontend/src/utils/cn.ts` | **100%** | 1 |
| `frontend/src/utils/sessionUtils.ts` | **100%** | 27 |
| `frontend/src/App.tsx` | 0% | 123 |
| `backend/src/controllers/authController.js` | 0% | 76 |
| `frontend/src/contexts/AuthContext.tsx` | 0% | 52 |
| `backend/src/middleware/auth.js` | 0% | 35 |

### Interpretação dos insights

**0,8% é o resultado mais grave do projeto** — mais grave que a duplicação, porque é o que impede corrigir os outros problemas com segurança.

De 3.775 linhas testáveis, **3.747 nunca são executadas por nenhum teste**. Na prática, o projeto não tem rede de proteção: qualquer refatoração — inclusive as recomendadas nas seções anteriores — seria feita às cegas. Existe aqui um **círculo vicioso** que vale nomear: a duplicação de 13,8% pede refatoração; a refatoração é arriscada sem testes; sem testes, ninguém refatora; e a duplicação cresce.

O detalhe dos arquivos mostra o padrão esperado de um projeto sem cultura de teste: os dois únicos arquivos cobertos são **funções puras utilitárias** — justamente as mais fáceis de testar e as **menos críticas** do sistema. Formatar uma data está 100% testado; **autenticar um usuário está 0%**.

Os arquivos descobertos mais preocupantes são exatamente os de maior risco:
- `authController.js` (76 linhas) — login, geração de JWT, hash de senha;
- `auth.js` (35 linhas) — o middleware que protege **todas** as rotas privadas;
- `AuthContext.tsx` (52 linhas) — estado de sessão no frontend.

Um defeito em qualquer um deles é uma falha de segurança, não um bug cosmético.

**O que melhorar:** a recomendação **não** é perseguir 80% de cobertura global — seria caro e de baixo retorno em componentes de UI. A estratégia correta é **cobertura orientada a risco**:

1. **Prioridade máxima** — `authController.js` e `auth.js`. São 111 linhas que controlam todo o acesso ao sistema. Testes aqui já elevariam a cobertura para ~3,5% e, mais importante, cobririam o que realmente importa.
2. **Prioridade média** — os validadores do backend (`mentorValidator.js`, `sessionValidator.js`), que são funções previsíveis e fáceis de testar.
3. **Prioridade baixa** — componentes React, que exigiriam `@testing-library/react` e dão retorno menor por esforço.

A meta realista de curto prazo seria **20–30% de cobertura concentrada nas camadas de negócio e segurança**, não um número global alto.

---

## 5.5 Bugs / Reliability Rating

### Explicação teórica

No SonarQube, **Bug** é um problema no código com **alta probabilidade de causar comportamento incorreto em produção**. A distinção em relação ao Code Smell é de natureza, não de gravidade: o smell atrapalha quem mantém o código; o bug atrapalha quem usa o sistema.

São detectados por análise estática — o Sonar não executa o código, ele identifica padrões reconhecidamente defeituosos (comparação de tipos incompatíveis, condição sempre verdadeira, valor de retorno ignorado, *null pointer* potencial).

O **Reliability Rating** é definido pelo **bug mais grave** encontrado, não pela quantidade:

| Rating | Critério |
|---|---|
| **A** | 0 bugs |
| **B** | ao menos 1 bug MINOR |
| **C** | ao menos 1 bug MAJOR |
| **D** | ao menos 1 bug CRITICAL |
| **E** | ao menos 1 bug BLOCKER |

### Passo a passo de configuração

**É automática.** Vem das regras do Quality Profile ativo.

Onde aparece no dashboard:
- Aba `Issues → Type: Bug`
- `Measures → Reliability`
- No card "Reliability" do dashboard principal

### Resultado obtido

| Indicador | Valor |
|---|---|
| **Bugs** | **10** |
| **Reliability Rating** | **C** |
| Severidade | 10 MAJOR, 0 CRITICAL, 0 BLOCKER |

Todos os 10 bugs, agrupados por tipo:

**Tipo 1 — Valor de retorno ignorado (6 ocorrências)**

| Arquivo | Linha | Mensagem |
|---|---|---|
| `DocumentUploadModal.tsx` | 574 | Remove this use of the output from `handleAddTag` |
| `CreateSessionPage.tsx` | 837 | Remove this use of the output from `handleAddRequirement` |
| `CreateSessionPage.tsx` | 969 | Remove this use of the output from `handleAddObjective` |
| `MenteeProfile.tsx` | 692 | Remove this use of the output from `addInterest` |
| `MenteeProfile.tsx` | 883 | Remove this use of the output from `addGoal` |
| `MentorProfile.tsx` | 842 | Remove this use of the output from `addSpecialty` |

**Tipo 2 — Valor vazado em renderização condicional (4 ocorrências)**

| Arquivo | Linha | Mensagem |
|---|---|---|
| `MentorSessionsManager.tsx` | 304 | Convert the conditional to a boolean to avoid leaked value |
| `CalendarPage.tsx` | 479 | Convert the conditional to a boolean to avoid leaked value |
| `SessionsFeed.tsx` | 610 | Convert the conditional to a boolean to avoid leaked value |
| `SessionsPage.tsx` | 597 | Convert the conditional to a boolean to avoid leaked value |

> **[PRINT 5]** — Lista de Bugs
> URL: `http://localhost:9000/project/issues?id=central-do-mentor&resolved=false&types=BUG`

### Interpretação dos insights

O rating **C** decorre da regra do pior caso: os 10 bugs são MAJOR, e **um único** MAJOR já rebaixaria o projeto de A para C. Não é o volume que define a nota — é a severidade máxima.

O achado mais valioso é que os 10 bugs se reduzem a **apenas dois padrões repetidos**, o que muda completamente a estimativa de correção:

**O padrão do "valor vazado"** é o mais perigoso, e é um erro clássico de React. Escrever `{lista.length && <Componente/>}` parece correto, mas quando `lista.length` é **0**, o JavaScript não retorna `false` — retorna o número `0`, e o React **renderiza o zero na tela**. O usuário vê um "0" solto na interface onde deveria haver espaço vazio. É um bug visual real, que só se manifesta no caso de lista vazia — exatamente o cenário que menos se testa manualmente. A correção é trivial: `{lista.length > 0 && <Componente/>}`.

**O padrão do "valor de retorno ignorado"** indica confusão entre métodos mutáveis e imutáveis de array. Provavelmente o código usa o retorno de uma função que altera o estado sem retornar nada útil — sintoma de gestão de estado inconsistente.

Vale observar que **todos os 10 bugs estão no frontend**. O backend, com 3.347 linhas, não gerou nenhum. Duas leituras possíveis: o backend é mais simples e direto (o que é plausível, dado o padrão MVC bem separado), ou as regras de análise para JavaScript puro são menos densas que as de TypeScript/React. Provavelmente ambas.

**O que melhorar:** este é o item de **melhor custo-benefício de todo o relatório**. São 10 correções mecânicas, de uma linha cada, sem risco de regressão. Corrigi-las eleva o **Reliability Rating de C para A** imediatamente. Deveria ser a primeira ação tomada.

---

## 5.6 Security Hotspots

### Explicação teórica

**Security Hotspot** é um trecho de código **sensível à segurança que exige revisão humana** — e é justamente isso que o diferencia de uma **Vulnerability**:

| | Vulnerability | Security Hotspot |
|---|---|---|
| Natureza | Falha confirmada | Código sensível a revisar |
| Ação | Corrigir | **Decidir** se é seguro |
| Certeza | O Sonar tem certeza | O Sonar não tem contexto |

O exemplo canônico é o CORS: `app.use(cors())` libera acesso de qualquer origem. Numa API pública, isso é intencional e correto. Numa API interna, é uma falha séria. O Sonar não sabe qual é o caso — então marca como hotspot e transfere a decisão ao desenvolvedor.

Cada hotspot é revisado e classificado como **Safe** (seguro no contexto), **Fixed** (corrigido) ou **Acknowledged** (risco conhecido e aceito). Disso deriva o **Security Review Rating**, baseado no **percentual de hotspots revisados** — não no número de hotspots:

| Rating | % revisado |
|---|---|
| **A** | ≥ 80% |
| **B** | 70% a 80% |
| **C** | 50% a 70% |
| **D** | 30% a 50% |
| **E** | < 30% |

### Passo a passo de configuração

**É automática**, mas com uma ressalva de versão importante (detalhada na seção 2.3):

Na versão **9.9.8 LTS** utilizada, o perfil *Sonar way* traz **53 regras de Security Hotspot ativas** para JavaScript e outras 53 para TypeScript. Na versão **26.8**, esse tipo de regra foi **eliminado** — existem 0 regras de hotspot em todas as 27 linguagens, e os achados de segurança passaram a ser classificados diretamente como Vulnerability.

Onde aparece no dashboard:
- Aba própria: `Security Hotspots`
- Agrupados por categoria OWASP, com nível de probabilidade (HIGH / MEDIUM / LOW)

### Resultado obtido

| Indicador | Valor |
|---|---|
| **Security Hotspots** | **8** |
| Hotspots revisados | **0%** |
| **Security Review Rating** | **E** |
| Vulnerabilities | 0 |
| Security Rating | **A** |

Detalhamento dos 8 hotspots:

| Categoria | Probabilidade | Localização | Descrição |
|---|---|---|---|
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:732` | Review this potentially hardcoded credential |
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:743` | Review this potentially hardcoded credential |
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:754` | Review this potentially hardcoded credential |
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:765` | Review this potentially hardcoded credential |
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:776` | Review this potentially hardcoded credential |
| `auth` | **HIGH** | `frontend/src/data/mockData.ts:788` | Review this potentially hardcoded credential |
| `insecure-conf` | LOW | `backend/src/server.js:20` | Make sure that enabling CORS is safe here |
| `others` | LOW | `backend/src/server.js:16` | Make sure disclosing the fingerprinting of this web technology is safe |

> **[PRINT 6]** — Security Hotspots
> URL: `http://localhost:9000/security_hotspots?id=central-do-mentor`

### Interpretação dos insights

O primeiro ponto a interpretar é a **aparente contradição entre os dois ratings de segurança**: Security Rating **A** (0 vulnerabilidades confirmadas) convivendo com Security Review Rating **E**. Não há contradição — são perguntas diferentes. O **A** diz "não encontrei falha comprovada". O **E** diz "encontrei 8 pontos que precisam da sua avaliação e **nenhum foi avaliado**". O E não pune o código; pune a **ausência de processo de revisão**.

Analisando os achados um a um:

**Os 6 hotspots HIGH em `mockData.ts`** são credenciais escritas diretamente no código. O nome do arquivo sugere fortemente que são **dados fictícios para desenvolvimento**, e o mais provável é que a revisão os classifique como **Safe**. Mas essa conclusão exige verificação — e é exatamente esse o propósito do hotspot. Dois riscos reais persistem mesmo em dados mock:
- Se essas mesmas senhas foram usadas para popular o banco via `seed.js`, elas são credenciais **funcionais** em qualquer ambiente onde o seed rodou;
- Arquivos de mock têm o hábito de sobreviver até produção, e este está no **frontend** — ou seja, seria entregue ao navegador do usuário.

**O CORS em `server.js:20`** (`app.use(cors())`) é o caso didático perfeito. Sem argumentos, essa chamada libera requisições de **qualquer origem**. Como a aplicação usa autenticação por JWT, a decisão precisa ser explícita: em produção, o correto seria restringir a origem ao domínio do frontend.

**A exposição de tecnologia em `server.js:16`** é o header `X-Powered-By: Express`, que informa a atacantes qual stack está em uso — facilitando a busca por exploits conhecidos daquela versão. Correção trivial: `app.disable('x-powered-by')` ou uso do pacote `helmet`.

**O que melhorar:**
1. **Revisar os 8 hotspots** na interface do Sonar, marcando cada um como Safe/Fixed/Acknowledged. Só isso já levaria o Security Review Rating de **E para A** — é uma ação de processo, não de código.
2. Confirmar que as credenciais de `mockData.ts` não coincidem com nenhuma senha real de seed.
3. Restringir o CORS por ambiente: `cors({ origin: process.env.FRONTEND_URL })`.
4. Adicionar `helmet` ao Express, que resolve o `X-Powered-By` e outros headers de segurança de uma vez.

**Observação adicional encontrada fora do Sonar:** durante a análise manual do código, identificou-se em `backend/src/controllers/authController.js:57` e `:94` um *fallback* de segredo JWT hardcoded:

```javascript
process.env.JWT_SECRET || 'seu_secret_jwt_muito_seguro_aqui_mude_em_producao'
```

Se a variável de ambiente não estiver definida, a aplicação assina tokens com uma string pública e previsível — permitindo que qualquer pessoa forje um token válido. O SonarQube **não sinalizou** esse ponto, o que ilustra uma limitação relevante da análise estática: **ela complementa, mas não substitui, a revisão humana de segurança**.

---

## 5.7 Quality Gate customizado — **exige configuração**

### Explicação teórica

O **Quality Gate** é um conjunto de condições booleanas aplicadas às métricas do projeto. Se **qualquer** condição falhar, o gate inteiro retorna **ERROR**. É o mecanismo que transforma métricas em **decisão automatizada**: integrado a um pipeline de CI/CD, um gate reprovado **bloqueia o merge ou o deploy**.

O conceito central é o **New Code** (código novo). O Quality Gate padrão do SonarQube — *Sonar way* — aplica suas condições **apenas ao código novo ou modificado**, seguindo a estratégia **Clean as You Code**: em vez de exigir que uma base legada inteira seja corrigida de uma vez (o que trava qualquer equipe), exige-se que **tudo que se escreve a partir de agora** atenda ao padrão. A dívida antiga é paga naturalmente, à medida que o código é tocado.

Um gate customizado permite adicionar condições sobre o **Overall Code** (todo o projeto) e calibrar os limiares ao contexto da equipe.

### Passo a passo de configuração

Esta é a segunda métrica que **exige configuração**.

**Passo 1 — Criar o Quality Gate.** Interface: `Quality Gates → Create`. Ou por API:

```bash
curl -u TOKEN: -X POST "http://localhost:9000/api/qualitygates/create" \
  -d "name=Metricas UNILUPULBRA - Central do Mentor"
```

**Passo 2 — Definir as condições.** Interface: `Add Condition`, escolhendo métrica, operador e limiar. Por API:

```bash
curl -u TOKEN: -X POST "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateId=<ID>&metric=coverage&op=LT&error=60"
```

Foram adicionadas **6 condições sobre o Overall Code**, com os limiares justificados abaixo:

| Métrica | Operador | Limiar | Justificativa da escolha |
|---|---|---|---|
| `coverage` | `LT` | **60%** | Abaixo da meta de mercado (80%), mas realista como alvo intermediário para um projeto que parte de 0,8% |
| `duplicated_lines_density` | `GT` | **5%** | Mais tolerante que os 3% do padrão Sonar, reconhecendo que JSX gera duplicação estrutural legítima |
| `reliability_rating` | `GT` | **A** | Nenhum bug deve chegar a produção — tolerância zero |
| `sqale_rating` | `GT` | **A** | Manutenibilidade mínima exigida |
| `security_rating` | `GT` | **A** | Nenhuma vulnerabilidade tolerada |
| `security_hotspots_reviewed` | `LT` | **100%** | Todo hotspot deve ser revisado — é processo, não esforço de código |

O gate herdou também as **6 condições padrão sobre New Code**, totalizando **12 condições**.

**Passo 3 — Associar ao projeto:**

```bash
curl -u TOKEN: -X POST "http://localhost:9000/api/qualitygates/select" \
  -d "gateId=<ID>&projectKey=central-do-mentor"
```

**Passo 4 — Reexecutar a análise.** Este passo é **obrigatório e fácil de esquecer**: o status do Quality Gate é calculado **no momento da análise**. Trocar o gate não reavalia o projeto retroativamente — sem uma nova análise, o dashboard continua exibindo o resultado do gate anterior.

> **[PRINT 7]** — Definição do Quality Gate customizado
> URL: `http://localhost:9000/quality_gates`
>
> **[PRINT 7b]** — Status do gate no dashboard do projeto (faixa vermelha "Failed")
> URL: `http://localhost:9000/dashboard?id=central-do-mentor`

### Resultado obtido

**Status geral: ERROR** — 6 condições falharam, 4 passaram.

| Condição | Valor atual | Limiar | Resultado |
|---|---|---|---|
| `coverage` | 0,8% | ≥ 60% | ❌ **FALHOU** |
| `duplicated_lines_density` | 13,8% | ≤ 5% | ❌ **FALHOU** |
| `reliability_rating` | C | A | ❌ **FALHOU** |
| `new_reliability_rating` | C | A | ❌ **FALHOU** |
| `security_hotspots_reviewed` | 0% | 100% | ❌ **FALHOU** |
| `new_security_hotspots_reviewed` | 0% | 100% | ❌ **FALHOU** |
| `sqale_rating` | A | A | ✅ passou |
| `new_maintainability_rating` | A | A | ✅ passou |
| `security_rating` | A | A | ✅ passou |
| `new_security_rating` | A | A | ✅ passou |

### Interpretação dos insights

O gate cumpriu exatamente sua função: **discriminou**. Não reprovou tudo nem aprovou tudo — separou o que está aceitável do que não está, e ordenou o trabalho.

Se este gate estivesse ativo em um pipeline de CI/CD, **nenhum código novo entraria em produção** hoje. Isso é o comportamento desejado: a régua está sendo aplicada.

As 4 condições que passaram têm um significado próprio: manutenibilidade e segurança **estrutural** estão em ordem. O projeto não tem vulnerabilidades confirmadas nem dívida técnica desproporcional. Os problemas são de **cobertura, confiabilidade e processo de revisão** — não de arquitetura.

Cruzando as 6 falhas com o esforço estimado de cada uma, o gate produz naturalmente um **plano de ação priorizado**:

| Prioridade | Condição | Ação | Esforço | Efeito |
|---|---|---|---|---|
| **1ª** | `security_hotspots_reviewed` | Revisar os 8 hotspots na interface | ~30 min | Review Rating **E → A** (2 condições resolvidas) |
| **2ª** | `reliability_rating` | Corrigir os 10 bugs MAJOR (1 linha cada) | ~2 h | Reliability **C → A** (2 condições resolvidas) |
| **3ª** | `duplicated_lines_density` | Extrair `ProfileLayout` e `AuthForm` | ~1 dia | 13,8% → estimados 8–9% |
| **4ª** | `coverage` | Testar autenticação e validadores | ~3 dias | 0,8% → ~20% |

As duas primeiras ações somam menos de **3 horas** e resolvem **4 das 6 condições reprovadas**. As duas últimas são as que exigem investimento real — e, notavelmente, `coverage` é a única que dificilmente atingirá o limiar de 60% no curto prazo.

Isso levanta uma reflexão final sobre calibração de gates: um limiar inatingível **desmotiva e acaba sendo ignorado** pela equipe. Numa situação real, o mais eficaz seria manter `coverage` em 60% apenas sobre o **New Code** (forçando todo código novo a vir testado, conforme a filosofia *Clean as You Code*) e adotar uma meta progressiva no Overall Code — 10%, depois 25%, depois 40%. O gate é uma ferramenta de mudança de comportamento, e para funcionar precisa ser exigente **e** alcançável.

---

## 6. Conclusão

A análise do **Central do Mentor** com o SonarQube produziu um diagnóstico que nenhuma métrica isolada revelaria.

**O aprendizado metodológico mais forte foi o do contraste entre indicadores.** O projeto obteve **Maintainability Rating A** e **Security Rating A** — dois "A" que, lidos sozinhos, sugeririam um código saudável. O restante das métricas conta outra história: 13,8% de duplicação, 0,8% de cobertura, 10 bugs e 8 hotspots sem revisão. O rating A de manutenibilidade, especificamente, é consequência aritmética do tamanho do projeto: 774 minutos de dívida diluídos em 23.289 linhas produzem um Debt Ratio de 0,1%. **O projeto é grande o suficiente para esconder seus próprios defeitos atrás de uma média favorável.**

**Do ponto de vista técnico**, as métricas convergiram para os mesmos arquivos. `MentorProfile.tsx`, `SessionsPage.tsx` e `MenteeProfile.tsx` aparecem simultaneamente entre os mais complexos, os mais duplicados e os que concentram code smells críticos. Não são três problemas — é um só: **componentes React monolíticos, criados por cópia e adaptação**, que acumulam responsabilidades demais em um único arquivo.

**O risco mais crítico**, porém, é a cobertura de 0,8%. Ela não é apenas mais uma métrica ruim: é a que **impede corrigir as outras**. Sem testes, cada refatoração sugerida neste relatório seria feita sem rede de proteção. E o padrão do que está testado é revelador — as funções de formatação de data têm 100% de cobertura, enquanto o middleware que protege todas as rotas autenticadas tem 0%.

**Sobre a ferramenta**, três aprendizados práticos ficaram evidentes:

1. **O Sonar mede apenas o que consegue parsear.** A tentativa inicial com Haskell falhou porque a linguagem não tem analisador — nenhuma métrica seria produzida.
2. **Nem toda métrica é automática.** Coverage e Quality Gate exigem configuração deliberada, e o Coverage depende de uma ferramenta externa: o Sonar lê o relatório, não executa os testes.
3. **A análise estática tem limites.** O segredo JWT hardcoded em `authController.js` — provavelmente a falha de segurança mais séria do projeto — **não foi detectado** pelo SonarQube. Ferramentas automatizadas complementam, mas não substituem, a revisão humana.

Por fim, o **Quality Gate customizado** foi o que transformou diagnóstico em plano. Ao reprovar 6 de 12 condições, ele não apenas apontou os problemas: ordenou-os. E o resultado dessa ordenação é encorajador — **3 horas de trabalho resolvem 4 das 6 reprovações**, deixando apenas duplicação e cobertura como investimentos de médio prazo.

---

## Anexo A — Arquivos criados/modificados

| Arquivo | Situação | Finalidade |
|---|---|---|
| `sonar-project.properties` | **criado** | Configuração da análise |
| `frontend/tsconfig.sonar.json` | **criado** | tsconfig compatível com o analisador |
| `frontend/vitest.config.ts` | **criado** | Configuração de testes e cobertura |
| `frontend/src/utils/sessionUtils.test.ts` | **criado** | 17 testes das funções de sessão |
| `frontend/src/utils/cn.test.ts` | **criado** | 5 testes da composição de classes |
| `frontend/package.json` | modificado | Scripts `test` e `test:coverage` |

## Anexo B — Comandos para reproduzir a análise

```bash
# 1. Subir o SonarQube
docker run -d --name sonarqube-lta -p 9000:9000 \
  -v sonarlta_data:/opt/sonarqube/data \
  -v sonarlta_logs:/opt/sonarqube/logs \
  -v sonarlta_ext:/opt/sonarqube/extensions \
  sonarqube:lts-community

# 2. Gerar o relatório de cobertura (ANTES do scanner)
cd frontend
npm install
npm run test:coverage

# 3. Rodar a análise
cd ..
docker run --rm \
  -e SONAR_HOST_URL="http://host.docker.internal:9000" \
  -e SONAR_TOKEN="SEU_TOKEN" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```
