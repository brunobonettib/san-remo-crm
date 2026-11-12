# San Remo CRM

Base inicial do CRM imobiliário da San Remo, criada com React, TypeScript e Vite.

## Requisitos

- Node.js 20.19 ou superior
- npm 10 ou superior

## Como executar

```bash
npm install
npm run dev
```

O servidor de desenvolvimento informará no terminal o endereço local da aplicação.

## Build de produção

```bash
npm run build
```

Os arquivos gerados serão salvos em `dist/`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha as variáveis públicas do projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

As duas variáveis são validadas ao carregar o cliente. Se alguma estiver ausente ou vazia, a aplicação informa apenas o nome da variável necessária, sem expor valores.

Variáveis prefixadas com `VITE_` são incluídas no código do frontend. Portanto, use somente a chave publicável do Supabase e nunca adicione chaves secretas ou privilegiadas.

O cliente está disponível em `src/lib/supabase.ts`. A sessão é persistida e renovada pelo SDK Supabase. O logout encerra a sessão deste navegador.

## Autenticação e perfis

- `/login`: entrada com e-mail e senha, sem cadastro público na interface.
- `/gestor`: página inicial exclusiva de gestores.
- `/corretor`: página inicial exclusiva de corretores.

A aplicação consulta `id`, `nome` e `papel` em `public.profiles`, filtrando pelo usuário autenticado. Um perfil ausente, inválido ou uma falha na consulta bloqueia as páginas protegidas. A tentativa de abrir a URL de outro papel redireciona para a área do próprio usuário.

Para testar com usuários reais, aplique manualmente a migração em `supabase/migrations/` como `postgres` no SQL Editor e cadastre os usuários em Authentication > Users. Depois insira os perfis pelo painel, usando o UUID de cada usuário, um nome e o papel `gestor` ou `corretor`. A aplicação não cria nem altera perfis.

Para manter o cadastro exclusivamente administrativo, desative a opção de permitir novos cadastros públicos nas configurações de Supabase Auth. Não exponha o schema `private` na Data API. A proteção de dados depende das políticas RLS e dos GRANTs da migração; as rotas protegem a interface.

O projeto usa React Router para navegação. Na hospedagem, configure fallback das rotas para `index.html`, permitindo recarregar `/gestor` e `/corretor`. No Vercel, o arquivo `vercel.json` já define esse comportamento.

Validação manual sugerida: entre com um usuário de cada papel, recarregue a página, tente abrir a URL do outro papel e saia da conta. Confira também que um usuário sem perfil fica bloqueado.

## Estado atual

Em `/gestor`, o CRM consulta leads reais do Supabase, exibe o funil nas seis etapas e o reservatório de leads sem responsável, do mais antigo para o mais recente. A listagem busca todas as páginas da API e inclui o nome do responsável quando houver.

O cadastro envia somente `nome`, `telefone`, `origem`, `interesse`, `email` (opcional) e `etapa`. O responsável é definido pelo banco como `NULL`. A edição usa `atualizar_lead` com `p_id`, `p_nome`, `p_telefone`, `p_origem`, `p_interesse`, `p_email` e `p_etapa`, preservando a atribuição atual.

Para usar essas operações, a versão atual da migração `20261112010000_create_leads.sql` precisa estar aplicada no seu projeto Supabase. As migrações não são executadas pela aplicação.

Validação do gestor: confira o funil e a ordem do reservatório, cadastre um lead sem e-mail, abra seus detalhes, edite seus dados e recarregue a página para conferir a persistência. Se a API falhar, a interface permite tentar novamente sem preencher a lista com dados fictícios.

Em `/corretor`, o funil lista somente o resultado autorizado pela RLS da sessão. O corretor consulta os detalhes e atualiza a etapa usando `UPDATE` com payload `{ etapa }`, filtrado pelo ID do lead. Não há cadastro, acesso ao reservatório ou edição de contato/responsável nessa área.

O detalhe do lead inclui observações para gestor e corretor, com texto, autor e data. O cadastro envia somente `lead_id` e `texto`; os registros não podem ser editados ou excluídos pela interface. Quando a RLS de `profiles` impede a consulta ao nome de outro autor, a observação exibe seu identificador real (`autor_id`), sem tentar ampliar o acesso ao perfil.

Validação do corretor: use um usuário com leads atribuídos, confira as seis etapas e atualize uma etapa. Em ambos os perfis, registre uma observação, reabra o detalhe e confira texto, autor e data. Confirme também as mensagens para lista vazia, falha de consulta e operação negada pelo banco.
