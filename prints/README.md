# Prints do dashboard

Capturas de tela do SonarQube comprovando os resultados. Servidor em `http://localhost:9000`.

| Arquivo | Tela | URL |
|---|---|---|
| `00-dashboard.png` | Visão geral do projeto | `/dashboard?id=central-do-mentor` |
| `01-complexidade.png` | Complexidade ciclomática por arquivo | `/component_measures?id=central-do-mentor&metric=complexity` |
| `02-duplicacao.png` | Duplicação por arquivo | `/component_measures?id=central-do-mentor&metric=duplicated_lines_density` |
| `03-code-smells.png` | Lista de Code Smells | `/project/issues?id=central-do-mentor&types=CODE_SMELL` |
| `04-coverage.png` | Cobertura de testes | `/component_measures?id=central-do-mentor&metric=coverage` |
| `04b-testes-terminal.png` | Terminal com os 22 testes passando | `npm run test:coverage` |
| `05-bugs.png` | Lista de Bugs | `/project/issues?id=central-do-mentor&types=BUG` |
| `06-hotspots.png` | Security Hotspots | `/security_hotspots?id=central-do-mentor` |
| `07-quality-gate.png` | Definição do Quality Gate customizado | `/quality_gates` |
| `07b-gate-status.png` | Status do gate no projeto (Failed) | `/dashboard?id=central-do-mentor` |
