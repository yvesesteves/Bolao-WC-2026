# 🏆**Bolão Copa do Mundo 2026 (WC-2026)**

- Um sistema completo de bolão para a Copa do Mundo, desenvolvido para gerenciar ligas privadas, palpites de jogos e pontuações de forma 100% automatizada. O projeto abrange desde o Front-end interativo até o Back-end robusto com banco de dados relacional, funções serverless e integração com APIs externas.
- Plataforma gratuita de bolão para a Copa do Mundo de 2026. Projeto open-source desenvolvido exclusivamente para entretenimento entre amigos, sem fins lucrativos e sem envolver apostas com dinheiro real.

## **Sobre o Projeto**

Este projeto foi construído para automatizar a experiência clássica do bolão de futebol. Diferente de sistemas manuais, esta aplicação busca os resultados reais dos jogos através de uma API externa, processa as regras de pontuação de forma autônoma no banco de dados e atualiza o ranking dos usuários em tempo real.

## **Funcionalidades**

* **Autenticação de Usuários:** Login seguro e gerenciamento de sessões.
* **Sistema de Ligas Privadas:** Criação de bolões com geração de código de convite (ex: `A1B2C3`), permitindo que os usuários entrem e saiam de ligas.
* **Palpites Dinâmicos:**
  * **Fase de Grupos:** Palpites de placar exato com travas automáticas baseadas no horário de início da partida.
  * **Mata-Mata:** Interface adaptada (Radio Buttons) para escolha de seleção classificada, ignorando o placar numérico para acomodar jogos decididos nos pênaltis.
  * **Palpites Extras (Bônus):** Previsões para Campeão, Vice, Zebra, Artilheiro, etc.
* **Motor de Pontos Automatizado (Database Triggers):** Regras de pontuação calculadas instantaneamente no banco de dados assim que o status de um jogo muda.
* **Prevenção de Erros (UX):** Alertas em tela caso o usuário tente salvar uma rodada deixando jogos abertos em branco.
* **Ranking Dinâmico:** Agregação de pontos no client-side para exibição atualizada da classificação da liga.

## **Tecnologias e Arquitetura**

O projeto foi construído utilizando uma stack moderna focada em performance e resiliência:

### **Front-end**
* **HTML5 & CSS3:** Estrutura e estilização responsiva.
* **JavaScript (Vanilla):** Lógica de interface, manipulação do DOM e comunicação com o Back-end, evidenciando forte domínio dos fundamentos da linguagem sem dependência de frameworks.

### **Back-end & Infraestrutura**
* **Supabase:** Backend-as-a-Service (BaaS) principal do projeto.
  * **PostgreSQL:** Banco de dados relacional.
  * **Database Triggers & Functions (PL/pgSQL):** O "cérebro" das pontuações, executando o cálculo de milhares de palpites simultaneamente na camada de dados.
  * **Supabase Auth:** Gerenciamento de usuários.
  * **Row Level Security (RLS):** Políticas de segurança rígidas garantindo que um usuário só possa modificar seus próprios palpites e gerenciar suas próprias participações em ligas.
* **Deno / Edge Functions:** Robô programado (em TypeScript) para rodar periodicamente, atuando como middleware entre a API de futebol e o banco de dados.
* **API Externa (football-data.org):** Consumo de dados oficiais (times, datas, placares e status das partidas).
* **Google Cloud Console:** Configuração e gerenciamento de credenciais/APIs.
* **Vercel:** Hospedagem do Front-end (CI/CD integrado com o GitHub).

##  **Estrutura do Projeto**

A organização de pastas segue uma separação clara entre ambiente web (cliente) e regras de backend:

```text
WC-2026/
├── .vscode/               # Configurações do editor
├── img/                   # Assets estáticos (ícones, logo, bandeiras das seleções)
├── supabase/
│   └── functions/         # Edge Functions (Ex: robô de atualização de jogos em TypeScript)
├── web/
│   ├── index.html         # Landing page / Login
│   ├── ligas.html         # Dashboard de ligas do usuário
│   ├── ligas.js           # Lógica de criação, entrada e saída de ligas
│   ├── palpites.html      # Tela principal de jogos e palpites
│   ├── palpites.js        # Lógica de renderização de partidas, travas de horário e salvamento
│   ├── ranking.html       # Tabela de classificação
│   ├── ranking.js         # Agregação de pontos e exibição do ranking
│   ├── style.css          # Folha de estilos global
│   ├── usuario.html       # Configurações de perfil
│   └── usuario.js         # Lógica de atualização de perfil e preferências
└── README.md              # Documentação do projeto

```
## **Como a Automação Funciona (Fluxo de Dados)**
**1.** A Edge Function (Robô) acorda periodicamente e faz uma requisição HTTP para a API do football-data.org.

**2.** O Robô identifica jogos que mudaram o status para FINISHED (encerrado), traduz os dados e faz um UPDATE na tabela jogos do Supabase.

**3.** Este UPDATE acorda o Database Trigger no PostgreSQL.

**4.** O Trigger cruza os gols oficiais com a tabela de palpites, calcula quem acertou o placar (ou o vencedor no mata-mata) e injeta os pontos na coluna do usuário.

**5.** Quando o usuário acessa o site, o JavaScript apenas puxa os pontos já mastigados e monta o ranking na tela.

---
### *Developed by Yves Esteves* 
