# San Remo CRM

CRM imobiliário desenvolvido como desafio técnico Full Stack para a **San Remo Imóveis**.

A aplicação permite gerenciar leads, acompanhar o funil de vendas, controlar a presença de corretores por QR Code e distribuir oportunidades por round-robin, respeitando a ordem da fila e a disponibilidade dos profissionais.

O projeto prioriza experiência do usuário, responsividade, segurança e persistência dos dados.

### Links do projeto

- **Aplicação:** https://san-remo-crm-rose.vercel.app
- **Código-fonte:** https://github.com/brunobonettib/san-remo-crm

## Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React, TypeScript, Vite |
| Banco de dados | Supabase PostgreSQL |
| Autenticação | Supabase Auth |
| Segurança | Row Level Security (RLS), permissões PostgreSQL e RPCs |
| Navegação | React Router |
| QR Code | qrcode.react |
| Versionamento | Git e GitHub |
| Deploy | Vercel |
| Inteligência artificial | OpenAI Codex e ChatGPT |

## Funcionalidades

### Gestor

- Visualização de todos os leads em funil Kanban.
- Cadastro, edição e consulta de contatos.
- Reservatório de leads ainda não atribuídos.
- Registro e consulta de observações.
- Exibição do QR Code de presença, renovado a cada cinco minutos.
- Consulta à fila e à validade da presença dos corretores.
- Distribuição round-robin de leads.
- Histórico persistente das distribuições.

### Corretor

- Login individual.
- Confirmação de presença por QR Code.
- Visualização exclusiva dos leads atribuídos.
- Atualização das etapas de atendimento.
- Registro e consulta de observações.

### Funil de vendas

O funil possui seis etapas:

**Novo → Em contato → Visita agendada → Proposta → Ganho → Perdido**

Leads sem responsável permanecem no reservatório até serem distribuídos pelo gestor.

### Presença por QR Code

O QR Code é disponibilizado na área do gestor e atualizado automaticamente a cada cinco minutos.

O corretor utiliza a câmera do celular para acessar o link, autentica-se quando necessário e confirma sua presença.

- Somente o QR vigente é aceito.
- A presença habilita o corretor por cinco horas.
- A renovação durante a validade preserva a posição.
- Após a expiração, uma nova confirmação coloca o corretor no final da fila.
- A identidade e os horários são validados no servidor.

### Distribuição round-robin

Cada acionamento do gestor distribui **um lead**, selecionando o mais antigo do reservatório e o próximo corretor elegível.

Após receber o lead, o corretor é movido para o final da fila.

A distribuição utiliza uma transação PostgreSQL para garantir consistência entre atribuição, movimentação da fila e registro do histórico.

O sistema impede a atribuição duplicada e informa quando não existem leads ou corretores elegíveis.

## Demonstração

A aplicação possui contas fictícias para avaliação.

| Perfil | E-mail |
|---|---|
| Gestor | gestor.demo@example.com |
| Corretor — Ana | ana.demo@example.com |
| Corretor — Pedro | pedro.demo@example.com |
| Corretor — Carla | carla.demo@example.com |

**As senhas de demonstração serão fornecidas diretamente à equipe avaliadora, por canal privado.**

O cadastro público está desabilitado; os usuários são administrados pelo Supabase.

## Executar localmente

### Pré-requisitos

- Node.js 20.19+
- npm 10+
- Projeto Supabase configurado

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/brunobonettib/san-remo-crm.git
cd san-remo-crm
npm install
```

Copie `.env.example` para `.env.local` e configure:

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

O arquivo `vercel.json` configura o redirecionamento necessário para as rotas da aplicação na Vercel.

**Segurança:** variáveis `VITE_` ficam disponíveis no frontend. Utilize somente a chave publicável do Supabase. Nunca inclua senhas, chaves privadas ou `service_role` no código ou no repositório.

Para testar a leitura do QR Code em um celular durante o desenvolvimento, configure `VITE_APP_URL` com um endereço acessível pelo aparelho.

## Configuração do Supabase

Crie um projeto Supabase com autenticação por e-mail e senha.

Execute as migrações SQL disponíveis em `supabase/migrations/`, na ordem abaixo, utilizando o SQL Editor com privilégios administrativos:

| Ordem | Migração | Finalidade |
|---|---|---|
| 1 | `20261112000000_create_profiles.sql` | Perfis e permissões |
| 2 | `20261112010000_create_leads.sql` | Leads, etapas e observações |
| 3 | `20261112020000_create_presenca.sql` | Presença, QR Code e fila |
| 4 | `20261112030000_create_distribuicao.sql` | Round-robin e histórico |

As migrações recriam a estrutura necessária do banco, incluindo políticas RLS, permissões, funções e índices. Devem ser executadas uma única vez, na sequência indicada, em um banco novo.

### Usuários e perfis

1. Acesse **Authentication → Users** e crie os usuários fictícios.
2. Copie o UUID de cada usuário.
3. Cadastre o UUID correspondente em `public.profiles`, informando nome e papel (`gestor` ou `corretor`).
4. Desabilite novos cadastros públicos em **Authentication → Sign In / Providers**.
5. Mantenha o schema `private` fora dos schemas expostos pela Data API.

Exemplo de criação administrativa de um perfil:

```sql
insert into public.profiles (id, nome, papel)
values (
  'UUID_DO_USUARIO',
  'Corretor Demo',
  'corretor'
);
```

Substitua o UUID pelo identificador do usuário criado no Supabase Auth. Execute como administrador no SQL Editor.

Em **Authentication → URL Configuration**, informe o endereço da aplicação e os redirecionamentos autorizados.

As migrações não criam automaticamente contas nem leads de demonstração. Após a configuração, os leads podem ser cadastrados normalmente pela interface do gestor.

## Como testar os fluxos principais

### 1. CRM e funil

Entre como gestor, cadastre um lead fictício e verifique sua entrada no reservatório. Abra os detalhes, edite os dados e registre uma observação. Recarregue a aplicação para verificar a persistência.

### 2. Presença dos corretores

Na área do gestor, exiba o QR Code. Escaneie pelo celular e faça login como corretor. Confirme a presença e verifique sua posição e validade na fila.

Repita com outros corretores e renove uma presença válida para verificar a preservação da posição.

### 3. Distribuição round-robin

Com corretores habilitados e leads disponíveis no reservatório, clique em **Distribuir próximo lead**.

Confira o resultado, a movimentação da fila e o histórico. Repita para verificar a distribuição circular.

### 4. Atendimento pelo corretor

Entre como o corretor que recebeu um lead. Confira o acesso ao contato, atualize sua etapa e registre uma observação.

O corretor não pode acessar leads atribuídos a outros profissionais nem executar a distribuição.

## Segurança e consistência

As permissões são verificadas no PostgreSQL, além das restrições de navegação do frontend.

- Autenticação individual pelo Supabase Auth.
- RLS para restringir o acesso aos dados conforme o perfil.
- Funções administrativas com autorização explícita no banco.
- Distribuição transacional com bloqueios contra concorrência.
- Histórico persistente e protegido contra alterações.
- Validação da presença e do QR Code pelo horário do servidor.
- Ausência de credenciais privilegiadas no frontend.

## Desenvolvimento com inteligência artificial

Foram utilizadas duas ferramentas de IA durante o desenvolvimento:

**OpenAI Codex (VS Code):** apoio na implementação de componentes React e TypeScript, integração com Supabase, migrações SQL, estilização responsiva e testes direcionados.

**ChatGPT:** interpretação dos requisitos, apoio nas decisões de arquitetura e regras de negócio, revisão de segurança, planejamento das validações e documentação.

### Como os resultados foram conferidos

As implementações foram verificadas por meio de builds, testes automatizados direcionados, consultas SQL e testes manuais com sessões reais.

Entre os cenários validados estão:

- Login e separação de acesso entre gestor e corretor.
- Cadastro, edição e persistência de leads e observações.
- Leitura real do QR Code pelo celular.
- Rejeição de QR expirado.
- Renovação de presença sem alteração de posição.
- Cinco distribuições consecutivas na ordem circular correta.
- Persistência do histórico e tratamento de reservatório vazio.
- Bloqueio da distribuição para corretor autenticado.
- Testes locais de concorrência, expiração e rollback.
- Responsividade e regressões em diferentes tamanhos de tela.

Os fluxos principais também foram conferidos na aplicação publicada na Vercel, utilizando o Supabase real.

## Limitações conhecidas

- O QR Code é exibido na área do gestor; não há uma tela independente para totens ou recepção.
- A confirmação de presença não utiliza geolocalização, por não ser requisito do desafio.
- Os cenários de retorno à fila após cinco horas e ausência total de corretores elegíveis foram testados localmente, mas não homologados integralmente no ambiente publicado.
- A animação visual de roleta não foi implementada, pois é opcional. A distribuição circular está funcional.

---

**San Remo CRM — Desafio Técnico Full Stack | Novembro de 2026**