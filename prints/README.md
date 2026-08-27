# Prints do dashboard

Capturas do SonarQube 9.9.8 LTS comprovando os resultados da análise. Todas já estão embutidas no [documento do trabalho](../Trabalho_SonarQube_Metricas.md).

| Figura | Arquivo | Tela | O que comprova |
|---|---|---|---|
| 1 | `00-dashboard.png` | Overview (aba Overall Code) | Quality Gate reprovado, 6 condições falhas, e todos os números do resumo |
| 2 | `01-complexidade.png` | Measures → Complexity | Complexidade ciclomática por arquivo |
| 3 | `02-duplicacao.png` | Measures → Duplications | 13,8% de densidade, com os arquivos mais duplicados |
| 4 | `03-code-smells.png` | Issues → Code Smell | Os 113 smells, os CRITICAL de complexidade cognitiva no topo |
| 5 | `04-coverage.png` | Measures → Coverage | 0,8% de cobertura, e os dois arquivos com 100% |
| 6 | `04b-testes-terminal.png` | Terminal | `npm run test:coverage` — 22 testes aprovados e a tabela que gera o `lcov.info` |
| 7 | `05-bugs.png` | Issues → Bug | Os 10 bugs MAJOR e seus dois padrões repetidos |
| 8 | `06-hotspots.png` | Security Hotspots | Os 8 hotspots por categoria, com o código sinalizado |
| 9 | `07-quality-gate.png` | Quality Gates | As 6 condições customizadas sobre Overall Code + as 6 herdadas |
| 10 | `07b-gate-status.png` | Project Settings → Quality Gate | O gate customizado associado ao projeto |

## Como foram geradas

As capturas 1–5 e 7–10 foram feitas com Chromium headless (Playwright) autenticado no SonarQube, em viewport de 1680×1050 com `deviceScaleFactor: 2`. Os banners informativos do servidor (aviso de versão, dica de CI, aviso de banco embarcado) foram ocultados para não poluir as telas.

A captura 6 é a **saída real** do comando `npm run test:coverage`, renderizada em uma janela de terminal para ficar legível na mesma resolução das demais.
