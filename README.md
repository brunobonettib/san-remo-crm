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

## Presença por QR Code

Requer a migração `20261112020000_create_presenca.sql` aplicada manualmente no Supabase, após as anteriores. A interface utiliza somente as RPCs `obter_qr_presenca()`, `listar_presencas()` e `confirmar_presenca(p_token)`; não consulta nem altera as tabelas privadas.

Em `/gestor`, a seção **Presença e equipe** exibe o QR vigente e a fila com posição, validade e elegibilidade retornadas pelo servidor. O QR é consultado na fronteira estimada da janela de cinco minutos, a cada 15 segundos e ao retornar à aba. A fila é atualizada a cada 30 segundos e pode ser atualizada manualmente. O cronômetro é informativo; o banco determina a validade do QR e da presença.

Configure `VITE_APP_URL` com a origem pública da aplicação, por exemplo `https://crm.exemplo.com`, sem caminho, query ou fragmento. Ela será usada nos links do QR. Se estiver vazia, será usada a origem atual do navegador. Para acesso pelo celular, use um endereço acessível pelo aparelho; `localhost` aponta para o próprio celular. Em desenvolvimento na mesma rede, configure a origem com o IP do computador e a porta e execute `npm run dev -- --host 0.0.0.0`. Reinicie o Vite ou gere um novo build após alterar variáveis de ambiente. Na hospedagem, mantenha o fallback para `index.html`, incluindo `/presenca` (já configurado em `vercel.json`).

O QR é gerado localmente em SVG por `qrcode.react`, sem serviço externo. Ele abre `/presenca#token=...` pela câmera do celular, sem leitor interno. O fragmento não é enviado nos pedidos HTTP da página. A aplicação não registra tokens nem respostas das RPCs em logs. Não inclua a URL completa dessa tela em ferramentas de analytics ou logs de navegação.

O corretor precisa entrar na sua conta; o destino da presença é preservado no estado de navegação durante o login, inclusive ao recarregar essa tela. O retorno é limitado à rota interna `/presenca`. Abrir o link ou concluir o login não confirma presença: é necessário clicar em **Confirmar minha presença**. A RPC recebe somente `p_token`; identidade, validade e posição vêm do banco. Após sucesso, a tela informa validade e posição. Uma nova leitura permite outra confirmação explícita para renovar; durante a presença válida, a posição é mantida. Gestores são redirecionados à sua própria área.

Validação sugerida: leia o QR pelo celular, autentique como corretor, confirme e confira a fila no gestor. Teste uma nova leitura para renovação, QR expirado, usuário sem permissão, falha de rede, lista vazia e retorno à aba após a troca de janela.

## Distribuição de leads

Com `20261112030000_create_distribuicao.sql` aplicada após as migrações anteriores, o gestor pode clicar em **Distribuir próximo lead** em `/gestor`. Cada clique chama `distribuir_proximo_lead()` uma vez, sem parâmetros. A RPC escolhe o lead mais antigo do reservatório e o próximo corretor elegível, atualiza a mesma fila e grava o histórico em uma transação. A interface não escolhe o destinatário nem altera a atribuição diretamente.

O resultado informa lead, corretor e data. Também há mensagens para reservatório vazio e ausência de corretor elegível. Após uma distribuição, a página recarrega leads, indicadores, reservatório, fila de presença e histórico. O histórico é lido de `public.lead_distribuicoes` e fica disponível somente para gestores pela RLS. Se a rede falhar durante a chamada, confira o histórico e o reservatório antes de clicar novamente: a distribuição pode ter sido concluída no banco mesmo sem a resposta chegar ao navegador.
