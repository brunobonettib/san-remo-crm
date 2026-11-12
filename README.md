# San Remo CRM

CRM imobiliário desenvolvido como desafio técnico Full Stack para a **San Remo Imóveis**.

A aplicação permite gerenciar leads, acompanhar o funil de vendas, controlar a presença de corretores por QR Code e distribuir oportunidades por round-robin, respeitando a ordem da fila e a disponibilidade dos profissionais.

O projeto prioriza experiência do usuário, responsividade, segurança, consistência das operações e persistência dos dados.

## Links do projeto

- **Aplicação publicada:** https://san-remo-crm-rose.vercel.app
- **Repositório GitHub:** https://github.com/brunobonettib/san-remo-crm

## 1. Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React, TypeScript, Vite |
| Banco de dados | Supabase PostgreSQL |
| Autenticação | Supabase Auth |
| Segurança | Row Level Security (RLS), permissões PostgreSQL e funções RPC |
| Navegação | React Router |
| QR Code | qrcode.react |
| Versionamento | Git e GitHub |
| Hospedagem | Vercel |
| Inteligência artificial | OpenAI Codex e ChatGPT |

## 2. Arquitetura e decisões técnicas

A aplicação utiliza uma arquitetura Full Stack com **React e TypeScript no frontend**, integrado ao **Supabase para autenticação, persistência e execução das regras críticas de negócio**.

A solução foi projetada para atender aos requisitos do desafio sem introduzir complexidade desnecessária, como um servidor de aplicação separado ou microsserviços.

### Organização da solução

- **Frontend:** interfaces de gestor e corretor, navegação, formulários, funil Kanban, estados de carregamento e comunicação com o Supabase.
- **Autenticação:** Supabase Auth, responsável por identificar os usuários e manter suas sessões.
- **Autorização:** perfis de gestor e corretor, com restrições aplicadas tanto na interface quanto no PostgreSQL.
- **Persistência:** PostgreSQL, responsável por armazenar leads, observações, perfis, presenças e histórico de distribuição.
- **Regras críticas:** funções RPC executadas no banco para validar presença, controlar a fila e realizar distribuições.
- **Hospedagem:** frontend publicado na Vercel, conectado ao projeto Supabase.

### Por que utilizar funções RPC no PostgreSQL?

As operações sensíveis não dependem exclusivamente da lógica executada no navegador.

A validação de presença e a distribuição round-robin são realizadas por funções no banco de dados, permitindo:

- Verificar permissões antes de executar operações.
- Utilizar o horário do servidor para validar o QR Code e a expiração da presença.
- Executar a distribuição de forma transacional.
- Aplicar bloqueios de concorrência para evitar distribuições inconsistentes.
- Registrar a atribuição e o histórico de forma consistente.

Essa abordagem reduz a possibilidade de inconsistências causadas por requisições simultâneas ou manipulação do frontend.

### Segurança dos dados

O controle de acesso utiliza **Row Level Security (RLS)** e verificações de autorização no PostgreSQL.

O gestor pode consultar todos os leads, enquanto o corretor acessa somente aqueles atribuídos a ele.

As operações administrativas possuem validações adicionais no banco. Assim, esconder funcionalidades na interface não é a única proteção aplicada.

A aplicação utiliza apenas a chave publicável do Supabase no frontend, sem expor credenciais privilegiadas.

## 3. Funcionalidades

### Perfil Gestor

- Autenticação individual.
- Visualização de todos os leads em funil Kanban.
- Cadastro, edição e consulta de contatos.
- Reservatório de leads sem responsável.
- Consulta de detalhes e observações.
- Exibição do QR Code de presença.
- Acompanhamento da fila de corretores habilitados.
- Distribuição round-robin de oportunidades.
- Histórico persistente das distribuições.

### Perfil Corretor

- Login individual.
- Confirmação de presença por QR Code.
- Visualização exclusiva dos próprios leads.
- Atualização das etapas de atendimento.
- Registro e consulta de observações.

### Funil de vendas

O CRM possui seis etapas:

1. Novo
2. Em contato
3. Visita agendada
4. Proposta
5. Ganho
6. Perdido

Os leads não atribuídos permanecem no reservatório do gestor até serem distribuídos.

### Controle de presença por QR Code

O QR Code é disponibilizado na área do gestor e atualizado automaticamente a cada cinco minutos.

O corretor utiliza a câmera do celular para acessar o link, autentica-se quando necessário e confirma sua presença.

**Regras implementadas:**

- Somente o QR Code vigente é aceito.
- Cada confirmação habilita o corretor por cinco horas.
- Renovar uma presença válida preserva a posição na fila.
- Após a expiração, uma nova confirmação coloca o corretor no final da fila.
- A fila é contínua, sem abertura ou encerramento de sessões.
- Os horários e a validade são verificados no banco de dados.

### Distribuição round-robin

Cada acionamento do gestor distribui um lead, selecionando:

1. O lead mais antigo do reservatório.
2. O próximo corretor habilitado na ordem da fila.

Após receber um lead, o corretor é movido para o final da fila.

A operação é executada de forma transacional no PostgreSQL, garantindo consistência entre a atribuição, a movimentação da fila e o registro do histórico.

O sistema também:

- Ignora corretores com presença expirada.
- Impede que o mesmo lead seja distribuído duas vezes.
- Informa quando não há leads disponíveis.
- Informa quando não há corretores habilitados.
- Mantém um histórico com lead, corretor e data da distribuição.

## 4. Contas de demonstração

A aplicação possui usuários fictícios para reprodução dos fluxos.

| Perfil | E-mail |
|---|---|
| Gestor | gestor.demo@example.com |
| Corretor — Ana Martins | ana.demo@example.com |
| Corretor — Pedro Oliveira | pedro.demo@example.com |
| Corretora — Carla Souza | carla.demo@example.com |

**As senhas de demonstração são fornecidas separadamente à equipe avaliadora, por canal privado.**

O cadastro público de novos usuários está desabilitado. As contas são administradas pelo Supabase Auth.

## 5. Execução local

### Pré-requisitos

- Node.js compatível com a versão do Vite utilizada no projeto
- npm
- Projeto Supabase configurado

Clone o repositório:

```bash
git clone https://github.com/brunobonettib/san-remo-crm.git
cd san-remo-crm
```

Instale as dependências:

```bash
npm install
```

Copie o arquivo `.env.example` para `.env.local` e configure as variáveis:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
VITE_APP_URL=http://localhost:5173
```

Inicie a aplicação:

```bash
npm run dev
```

Para validar o build de produção:

```bash
npm run build
```

O arquivo `vercel.json` configura o redirecionamento necessário para as rotas do React Router na Vercel.

**Observação:** para testar a leitura do QR Code em um celular durante o desenvolvimento, configure `VITE_APP_URL` com um endereço da aplicação acessível pelo aparelho, como a URL publicada na Vercel.

**Segurança:** variáveis com prefixo `VITE_` ficam disponíveis no frontend. Nunca utilize senhas, chaves secretas ou `service_role` nessas variáveis.

## 6. Configuração do Supabase

Crie um projeto Supabase e habilite a autenticação por e-mail e senha.

### Migrações do banco de dados

As migrações SQL estão disponíveis em `supabase/migrations/`.

Execute os arquivos na seguinte ordem, utilizando o SQL Editor do Supabase com privilégios administrativos:

| Ordem | Arquivo | Responsabilidade |
|---|---|---|
| 1 | `20261112000000_create_profiles.sql` | Perfis e autorização |
| 2 | `20261112010000_create_leads.sql` | Leads, etapas e observações |
| 3 | `20261112020000_create_presenca.sql` | QR Code, presença e fila |
| 4 | `20261112030000_create_distribuicao.sql` | Round-robin e histórico |

As migrações criam as estruturas necessárias do PostgreSQL, incluindo tabelas, índices, políticas RLS, permissões e funções.

Execute-as uma única vez, na ordem indicada, em um banco novo.

### Criação dos usuários

1. Acesse **Authentication → Users** no painel do Supabase.
2. Crie as contas fictícias de demonstração.
3. Copie o UUID de cada usuário.
4. Cadastre o perfil correspondente em `public.profiles`.
5. Informe o nome e o papel (`gestor` ou `corretor`).
6. Desabilite novos cadastros públicos nas configurações de autenticação.

Exemplo de cadastro administrativo de perfil:

```sql
insert into public.profiles (id, nome, papel)
values (
  'UUID_DO_USUARIO',
  'Corretor Demo',
  'corretor'
);
```

Substitua o UUID pelo identificador do usuário criado no Supabase Auth. Execute o comando como administrador.

Mantenha o schema `private` fora dos schemas expostos pela Data API.

Em **Authentication → URL Configuration**, configure o endereço público da aplicação e os redirecionamentos autorizados.

As migrações não criam automaticamente as contas de demonstração nem os leads. Os contatos podem ser cadastrados pela interface do gestor após a configuração.

## 7. Como reproduzir os fluxos principais

### Fluxo 1 — Gestão de leads

1. Entre na aplicação como gestor.
2. Acesse o funil e o reservatório.
3. Cadastre um novo lead fictício.
4. Verifique que ele permanece sem responsável no reservatório.
5. Abra os detalhes, edite os dados e registre uma observação.
6. Recarregue a página para verificar a persistência.

### Fluxo 2 — Controle de presença

1. Entre como gestor e localize o QR Code.
2. Escaneie o código com a câmera de um celular.
3. Entre com uma conta de corretor.
4. Confirme explicitamente a presença.
5. Confira a posição e a validade na fila do gestor.
6. Repita com outros corretores.
7. Renove uma presença ainda válida para verificar a preservação da posição.

### Fluxo 3 — Distribuição round-robin

1. Mantenha corretores habilitados e leads disponíveis no reservatório.
2. Entre como gestor.
3. Clique em **Distribuir próximo lead**.
4. Verifique o lead e o corretor selecionados.
5. Observe a movimentação da fila.
6. Consulte o histórico.
7. Repita a operação para verificar a ordem circular.

### Fluxo 4 — Atendimento pelo corretor

1. Entre como um corretor que recebeu um lead.
2. Confira os contatos atribuídos ao seu perfil.
3. Abra os detalhes de um lead.
4. Atualize sua etapa de atendimento.
5. Registre uma observação.
6. Recarregue a página para conferir a persistência.

O corretor não possui permissão para distribuir leads ou consultar contatos atribuídos a outros profissionais.

## 8. Desenvolvimento com inteligência artificial

O projeto foi desenvolvido com apoio de duas ferramentas de IA:

**OpenAI Codex (VS Code):** utilizado como assistente de desenvolvimento na implementação de componentes React e TypeScript, integração com Supabase, migrações SQL, ajustes de interface, responsividade e testes direcionados.

**ChatGPT:** utilizado no entendimento dos requisitos, apoio às decisões arquiteturais, análise das regras de negócio, revisão de segurança, planejamento das validações e documentação.

### Como os resultados foram conferidos

As implementações foram verificadas por meio de:

- Builds de produção.
- Testes automatizados direcionados.
- Consultas e verificações SQL no PostgreSQL.
- Testes manuais de autenticação e autorização.
- Testes reais de leitura do QR Code pelo celular.
- Testes de distribuição e persistência dos dados.
- Verificações de responsividade em diferentes resoluções.
- Execução dos fluxos principais na aplicação publicada na Vercel.

### Cenários validados

- Login e redirecionamento conforme o perfil.
- Cadastro, edição e persistência de leads.
- Alteração de etapas e registro de observações.
- Restrição de acesso aos dados por perfil.
- Rejeição de QR Code expirado.
- Renovação de presença sem alteração de posição.
- Cinco distribuições consecutivas na ordem circular correta.
- Histórico persistente e tratamento de reservatório vazio.
- Bloqueio da distribuição para um corretor autenticado.
- Testes locais direcionados de concorrência, expiração e rollback.

O uso de IA foi acompanhado de verificações técnicas e testes funcionais. As decisões de implementação foram avaliadas considerando os requisitos do desafio.

## 9. Limitações conhecidas

O projeto foi desenvolvido como um MVP, priorizando os requisitos obrigatórios do desafio.

- O QR Code é exibido na área do gestor; não existe uma tela independente para totens ou recepção.
- A confirmação de presença não utiliza geolocalização, pois não é um requisito do desafio.
- Os cenários de retorno à fila após cinco horas e ausência total de corretores elegíveis foram cobertos por testes locais, mas não homologados integralmente na aplicação publicada.
- A animação visual de roleta não foi implementada, pois é opcional. A distribuição circular está funcional.

## 10. Publicação

A aplicação está hospedada na **Vercel**, com integração ao repositório GitHub e persistência no Supabase.

As variáveis de ambiente necessárias são configuradas no painel da Vercel, sem incluir credenciais privilegiadas no código-fonte.

**Aplicação:** https://san-remo-crm-rose.vercel.app

**Repositório:** https://github.com/brunobonettib/san-remo-crm

---

**San Remo CRM — Desafio Técnico Full Stack | Novembro de 2026**