# Comenta PALAVRA → recebe DM: o passo a passo

Alguém comenta uma palavra no seu post. Em segundos, essa pessoa recebe uma mensagem no direct com o que você prometeu. E embaixo do comentário aparece uma resposta pública, tipo "te mandei no direct".

Tudo roda na sua conta, com a API oficial da Meta. API é a porta que deixa um sistema conversar com outro. Sem ferramenta paga no meio.

Este guia foi feito para você **baixar e entregar ao seu assistente de IA** (Claude Code ou Claude Desktop). Ele lê, faz a parte técnica e para quando precisar de você.

---

## Prompt para colar no seu assistente

Coloque este arquivo na conversa (ou na pasta do projeto) e cole o texto abaixo:

```text
Quero montar a automação "comenta PALAVRA → recebe DM" no meu Instagram.
Siga o arquivo comenta-dm-passo-a-passo.md, parte por parte, na ordem, um passo de cada vez.

Regras para você:
1. Quando o passo for no painel da Meta, no painel do Supabase ou no app do Instagram,
   me diga exatamente onde clicar e ESPERE eu confirmar que fiz antes de seguir.
2. Nunca me peça para colar token, chave secreta ou senha no chat. Nunca mostre esses valores.
   Eu colo direto no SQL Editor do Supabase, como o guia explica.
3. Antes de qualquer coisa que não dá para desfazer (publicar o app da Meta, apagar dados,
   mandar mensagem para alguém), me explique o que vai acontecer e espere meu "ok".
4. Se um resultado vier diferente do esperado, pare. Olhe a Parte 5 (Problemas comuns)
   antes de improvisar.
5. Fale comigo em português simples. Termo técnico, só com explicação.
6. Os nomes dos menus da Meta e do Supabase mudam de vez em quando. Se não achar um botão
   com o nome exato do guia, me descreva o que aparece na tela e a gente acha junto.
```

---

## Como funciona

```
Pessoa comenta "GUIA" no seu post
        │
        ▼
A Meta avisa a sua função na nuvem (webhook = aviso automático)
        │
        ▼
A função confere as regras ──── não bateu? ──► ignora
        │ bateu
        ▼
Anota no banco "estou atendendo este comentário" (trava contra DM em dobro)
        │
        ▼
Manda a DM ──── falhou? ──► anota o motivo, NÃO responde em público
        │ chegou
        ▼
Responde em público embaixo do comentário

E a cada 10 minutos: uma varredura relê os comentários dos posts cadastrados
e atende o que o aviso da Meta tiver deixado passar.
```

Regras que o sistema confere antes de mandar qualquer coisa:

- O post tem uma palavra cadastrada, e o comentário é **desse** post.
- O comentário tem a palavra **inteira**. Maiúscula, minúscula e acento não importam. Com a palavra "guia": "GUIA", "guia!" e "quero o guia" disparam. "guias" e "@maria_guia" não disparam.
- Quem comentou não é você. Os seus comentários são ignorados de propósito.
- O comentário não é resposta a outro comentário. Só vale comentário direto no post.
- O comentário tem no máximo 7 dias. É o prazo que a Meta dá para responder no direct a partir de um comentário.
- Essa pessoa ainda não recebeu DM nesse post. Uma DM por pessoa por post, garantida no banco.

---

## O que você precisa

- **Conta profissional no Instagram** (Comercial ou Criador de conteúdo). Conta pessoal não funciona com a API. Trocar é grátis e leva 2 minutos: no app do Instagram, perfil → menu ☰ → **Configurações e atividade** → **Tipo de conta e ferramentas** → **Mudar para conta profissional**. Conta profissional é sempre pública.
- **Conta no Facebook**, para entrar no painel de desenvolvedores da Meta (developers.facebook.com). Se for a primeira vez, a Meta pede para você se cadastrar como desenvolvedor. É grátis.
- **Conta no Supabase** (supabase.com), no **plano gratuito**. O Supabase é onde ficam o banco de dados e a função que conversa com o Instagram.
- **Conta no GitHub** (github.com), grátis, para publicar as três páginas que a Meta exige (privacidade, termos e exclusão de dados; passo 1.5). Se você já tem um site, pode usar ele.
- **Uma segunda conta do Instagram**, sua ou de alguém próximo, para testar. Você não consegue testar comentando no próprio post.
- **Cerca de 1 hora**, sem pressa.

**Quanto custa:** a Meta não cobra por essas chamadas da API. O plano gratuito do Supabase inclui o que este guia usa: o banco de dados, a Edge Function (a função na nuvem), o pg_cron (o agendador de tarefas) e o Vault (o cofre de senhas do banco).

> **Confira antes:** os limites do plano gratuito do Supabase mudam com o tempo. Veja na página de preços deles (supabase.com/pricing) os limites atuais e a regra de **pausa por inatividade**. Projeto pausado não atende comentário.

**Outros lugares:** a mesma ideia funciona em qualquer serviço que rode uma função na internet e tenha um banco de dados. Este guia usa o Supabase porque junta tudo num lugar só.

---

## Parte 1: o app da Meta

Para a API do Instagram responder você, é preciso ter um "app" no painel da Meta. Não é um app de celular. É só um cadastro que diz: "este sistema pode mexer nos comentários e mensagens da minha conta".

### 1.1 Criar um app NOVO, com um caso de uso só

1. Entre em **developers.facebook.com** → **Meus apps** → **Criar app**.
2. Dê um nome (ex.: "Minha automação de DM") e confirme o e-mail.
3. Em **casos de uso**, marque **só** "**Gerenciar mensagens e conteúdo no Instagram**".
4. Quando perguntar sobre **portfólio empresarial**, escolha a opção de **não conectar** agora.
5. Conclua a criação.

> **Por que um app novo e com um caso de uso só:** caso de uso não pode ser removido depois. Se o app tiver casos de uso de anúncios, Marketing API, Página ou Messenger, o botão **Publicar** trava pedindo verificação da empresa. Foi o que aconteceu com a gente. Um app novo, só com o caso de uso do Instagram e sem portfólio, publicou sem pedir nada. Se você já tem um app cheio de casos de uso, crie outro.

> **Portfólio empresarial:** não precisa. Ele serve para gerenciar contas de outras pessoas ou empresas. Para a sua própria conta, o app funciona sem ele.

### 1.2 Adicionar as permissões

No caso de uso do Instagram (**Casos de uso** → **Personalizar**, no caso de uso do Instagram), adicione estas três permissões:

- `instagram_business_basic`: ler o básico da conta e dos posts.
- `instagram_business_manage_comments`: ler e responder comentários.
- `instagram_business_manage_messages`: mandar mensagem no direct.

### 1.3 Colocar a sua conta como testadora

1. No painel do app: **Funções do app** → **Funções** → **Adicionar pessoas** → **Testador do Instagram**.
2. Digite o @ da sua conta profissional e envie o convite.
3. No app do Instagram, aceite o convite: **Configurações** → **Apps e sites** → **Convites de testador** → **Aceitar**. Se não achar no celular, abra o Instagram no navegador e procure **Apps e sites** nas configurações.

### 1.4 Liberar o acesso às mensagens no Instagram

No app do Instagram, na sua conta profissional:

**Configurações** → **Mensagens e respostas a stories** → **Controles de mensagens** → **Ferramentas conectadas** → ligue **Permitir acesso às mensagens**.

Sem isso, a API não consegue mandar DM.

### 1.5 Páginas de privacidade, termos e exclusão de dados

Para publicar o app, a Meta exige três links públicos:

- **Política de privacidade:** quais dados o sistema guarda (id do comentário, id do post, o número que identifica quem comentou, se a DM foi enviada e quando), para quê (mandar a DM uma vez só), por quanto tempo (90 dias, depois é apagado), quem tem acesso (só você) e como falar com você.
- **Termos de uso:** o que a automação faz, que ela é sua, sem garantia de funcionamento contínuo, e como a pessoa para de receber (é só não comentar a palavra).
- **Exclusão de dados:** como alguém pede para apagar os próprios dados (ex.: mandando DM ou e-mail para você) e em quanto tempo você apaga.

> **Para o assistente:** você pode escrever as três páginas em HTML simples, em português, com os dados acima. Um lugar gratuito para publicar é o **GitHub Pages** (um repositório público com os três arquivos). A pessoa cria a conta no GitHub; você prepara os arquivos.

Cole os três links no painel do app, em **Configurações do app** → **Básico**. Aproveite e preencha o que mais o painel pedir ali (ícone, categoria, e-mail de contato).

### 1.6 Publicar o app (a lição mais importante)

> **Em modo de desenvolvimento, a API devolve 0 comentários e o aviso de comentário não chega.** Mesmo com as permissões certas. Mesmo com o comentário do próprio dono da conta. A gente testou em sete posts: o Instagram mostrava os comentários e a API devolvia zero em todos (teste feito em 2026-10-15). Só funcionou depois de publicar o app.

1. No painel do app, clique em **Publicar** (o modo do app muda de **Desenvolvimento** para **Publicado**, também chamado de **Live**).
2. Se o painel listar alguma pendência, resolva e tente de novo.

**Não precisa de Revisão do App da Meta** para usar na sua própria conta. O app publicado continua com "acesso padrão", e o acesso padrão vale para contas com função no app, que é a sua (por isso o passo 1.3). Quem **comenta** pode ser qualquer pessoa: a regra vale para a conta conectada, não para quem comenta.

> **Para o assistente:** publicar é uma ação que muda o estado do app. Explique e espere o "ok" da pessoa.

O token (a chave de acesso à sua conta) você gera na Parte 2, quando o cofre do Supabase já existir.

---

## Parte 2: o Supabase

### 2.1 Criar o projeto

1. Em **supabase.com**, crie uma conta e um **projeto novo** no plano gratuito.
2. Escolha a região mais perto de você e guarde a senha do banco num lugar seu.
3. Anote o **ID do projeto** (Project ID, ou Reference ID). Ele aparece em **Project Settings** → **General** e também no endereço do painel. Neste guia ele aparece como `<seu-projeto>`.

### 2.2 Rodar o SQL (o banco inteiro de uma vez)

SQL é a linguagem para falar com o banco de dados.

1. No painel do Supabase: **SQL Editor** → **New query**.
2. Cole o bloco abaixo **inteiro**.
3. Troque `<seu-projeto>` pelo ID do seu projeto (aparece uma vez, perto do fim).
4. Clique em **Run**. Esperado: "Success". Pode rodar de novo sem problema.

```sql
-- Comenta PALAVRA → recebe DM: tudo o que o banco precisa.
-- Pode rodar mais de uma vez: só cria o que falta.

-- Agendador de tarefas (pg_cron) e chamadas pela internet (pg_net).
create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists comenta;
revoke all on schema comenta from public, anon, authenticated;

-- 1. Regras: uma linha por post.
create table if not exists comenta.regras (
  media_id   text primary key,                -- id do post na API
  palavra    text not null check (char_length(palavra) between 2 and 30 and palavra !~ '[[:space:][:punct:]]'),
  dm         text not null check (char_length(dm) between 1 and 1000),
  respostas  text[] not null check (cardinality(respostas) between 1 and 10),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- 2. Envios: um registro por comentário atendido.
-- A linha entra como 'processando' ANTES de mandar a DM: é a trava contra DM em dobro.
create table if not exists comenta.envios (
  comentario_id  text primary key,
  media_id       text not null,
  autor_id       text not null,                -- número que identifica quem comentou (não é o @)
  status         text not null check (status in ('processando', 'enviado', 'falhou')),
  tentativas     int not null default 0,
  erro           text,
  dm_em          timestamptz,
  resposta_em    timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (media_id, autor_id)                  -- uma DM por pessoa por post
);
create index if not exists envios_criado_em on comenta.envios (criado_em);

-- 3. Configuração (endereço da função, id da conta, último aviso).
create table if not exists comenta.config (
  chave text primary key,
  valor text
);

-- Ninguém de fora lê nem grava nessas tabelas. Só a função (pela conexão direta) e você (pelo SQL Editor).
alter table comenta.regras enable row level security;
alter table comenta.envios enable row level security;
alter table comenta.config enable row level security;
revoke all on all tables in schema comenta from public, anon, authenticated;

-- 4. Cofre (Vault): só estes quatro nomes podem ser lidos ou gravados.
create or replace function comenta.cofre(nome text) returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = nome and nome in ('ig_token', 'app_secret', 'webhook_token', 'cron_chave')
$$;

create or replace function comenta.guardar(nome text, valor text) returns void
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if nome is null or nome not in ('ig_token', 'app_secret', 'webhook_token', 'cron_chave') then
    raise exception 'nome não permitido no cofre: %', nome;
  end if;
  select id into v from vault.secrets where name = nome;
  if v is null then perform vault.create_secret(valor, nome);
  else perform vault.update_secret(v, valor);
  end if;
end $$;

revoke all on function comenta.cofre(text) from public, anon, authenticated;
revoke all on function comenta.guardar(text, text) from public, anon, authenticated;

-- 5. Chaves geradas aqui mesmo, sem ninguém digitar (só se ainda não existirem).
do $$
begin
  if comenta.cofre('cron_chave') is null then
    perform comenta.guardar('cron_chave', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  end if;
  if comenta.cofre('webhook_token') is null then
    perform comenta.guardar('webhook_token', replace(gen_random_uuid()::text, '-', ''));
  end if;
end $$;

-- 6. Endereço da função. TROQUE <seu-projeto> pelo ID do seu projeto.
insert into comenta.config (chave, valor)
values ('url_funcao', 'https://<seu-projeto>.supabase.co/functions/v1/comenta-dm')
on conflict (chave) do update set valor = excluded.valor;

-- 7. Atalho para chamar a função com a chave do cofre (usado pelo agendador e por você).
create or replace function comenta.chamar(rota text) returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select valor from comenta.config where chave = 'url_funcao') || '/' || rota,
    headers := jsonb_build_object('content-type', 'application/json', 'x-chave', comenta.cofre('cron_chave')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$;
revoke all on function comenta.chamar(text) from public, anon, authenticated;

-- 8. Tarefas automáticas. Tira as antigas (se existirem) e agenda de novo.
do $$
declare n text;
begin
  foreach n in array array['comenta-varrer', 'comenta-limpar', 'comenta-renovar-token'] loop
    if exists (select 1 from cron.job where jobname = n) then perform cron.unschedule(n); end if;
  end loop;
end $$;

-- A cada 10 minutos: relê os comentários dos posts cadastrados.
select cron.schedule('comenta-varrer', '*/10 * * * *', $$ select comenta.chamar('tarefas/varrer') $$);
-- Todo dia às 06:17 (UTC): apaga registros com mais de 90 dias.
select cron.schedule('comenta-limpar', '17 6 * * *', $$ select comenta.chamar('tarefas/limpar') $$);
-- Todo dia 1º às 07:23 (UTC): renova o token do Instagram.
select cron.schedule('comenta-renovar-token', '23 7 1 * *', $$ select comenta.chamar('tarefas/renovar') $$);
```

> Se der erro de permissão nas duas primeiras linhas, ligue **pg_cron** e **pg_net** em **Database** → **Extensions** e rode o bloco de novo. O **Vault** já vem ligado nos projetos do Supabase; se não estiver, ligue no mesmo lugar.

### 2.3 Guardar o token e a chave secreta do app no cofre

Aqui entram os dois dados sensíveis. **Quem cola é você, direto no SQL Editor.** Nunca no chat do assistente, nunca num arquivo do projeto.

**a) A chave secreta do app do Instagram**

1. No painel da Meta: caso de uso do Instagram → **Configuração da API com login do Instagram**.
2. No topo aparecem o **ID do app do Instagram** e a **Chave secreta do app do Instagram**. Clique em **Mostrar** e copie a chave secreta.
3. No SQL Editor, rode:

```sql
select comenta.guardar('app_secret', '<cole aqui a chave secreta do app do Instagram>');
```

**b) O token da sua conta**

O token é a chave de acesso que deixa a função agir na sua conta.

1. Na mesma página da Meta, na etapa **Gerar tokens de acesso**, clique em **Adicionar conta** e entre com a sua conta profissional do Instagram.
2. Clique em **Gerar token** ao lado da sua conta e copie o token.
3. No SQL Editor, rode:

```sql
select comenta.guardar('ig_token', '<cole aqui o token>');
```

Esperado nos dois: uma linha de resultado vazia, sem erro.

**Depois de rodar:** não salve essas consultas ("Save query" ou favoritos). Apague o texto do editor. Se a consulta ficou no histórico do SQL Editor, apague de lá também.

> **Validade do token:** cerca de 60 dias. A tarefa `comenta-renovar-token`, que o SQL já agendou, renova todo mês com a chamada oficial da Meta (`GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...`). Por segurança, coloque também um lembrete no seu calendário para daqui a 50 dias: "conferir o token do comenta→DM". Se o token for recusado, é só gerar outro no painel e rodar o `comenta.guardar('ig_token', ...)` de novo.

### 2.4 Publicar a função

A função é o código que recebe o aviso da Meta e manda a DM. É um arquivo só.

> **Para o assistente:** crie o arquivo `supabase/functions/comenta-dm/index.ts` na pasta de trabalho com o conteúdo abaixo, sem mudar a lógica. O nome `comenta-dm` aparece no código (constante `NOME`), no endereço do SQL e no comando de publicação: se mudar um, mude os três.

```ts
// supabase/functions/comenta-dm/index.ts
// Comenta PALAVRA → recebe DM no Instagram. Um arquivo só, para Supabase Edge Functions (Deno).
// Lê e grava no Postgres do próprio projeto (schema "comenta"). Sem supabase-js.
import postgres from 'npm:postgres@3.4.5';

const NOME = 'comenta-dm';                  // nome da função (o mesmo do deploy)
const API = 'https://graph.instagram.com/v25.0';
const DIA = 86_400_000;
const PRAZO_MS = 7 * DIA;                   // a Meta só aceita resposta no direct até 7 dias depois do comentário
const GUARDA_MS = 90 * DIA;                 // registros apagados depois de 90 dias (o que a política promete)
const PARADO_MS = 10 * 60_000;              // 'processando' há mais de 10 min = tentativa que travou
const MAX_TENTATIVAS = 3;
const MAX_POR_RODADA = 30;                  // DMs tentadas por varredura, para não estourar o tempo da função
const TEMPORARIOS = [1, 2, 4, 17, 32, 613]; // códigos de erro da Meta que valem nova tentativa

// SUPABASE_DB_URL já existe em toda Edge Function. prepare:false e max:1 = uma conexão simples por vez.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1, connect_timeout: 10, idle_timeout: 20 });

// ---------- Banco ----------
const cofre = async (nome: string): Promise<string | null> =>
  (await sql`select comenta.cofre(${nome}) as v`)[0]?.v ?? null;
const lerConfig = async (chave: string): Promise<string | null> =>
  (await sql`select valor from comenta.config where chave = ${chave}`)[0]?.valor ?? null;
const gravarConfig = async (chave: string, valor: string) => {
  await sql`insert into comenta.config (chave, valor) values (${chave}, ${valor})
            on conflict (chave) do update set valor = excluded.valor`;
};

// ---------- Instagram ----------
class ErroIG extends Error {
  constructor(mensagem: string, public status: number, public codigo?: number, public temporario = false) { super(mensagem); }
}
// Tira o token de qualquer mensagem antes de gravar ou mostrar.
const limpo = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/access_token=[^&\s)"]*/g, 'access_token=***');
// Token recusado ou vencido: não é culpa do comentário.
const semAcesso = (e: unknown) => e instanceof ErroIG && (e.codigo === 190 || e.status === 401);
const q = (p: Record<string, string>) => new URLSearchParams(p).toString();

async function chamar(url: string, init?: RequestInit): Promise<any> {
  let r: Response;
  try { r = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }); }
  catch { throw new ErroIG('falha de rede ao chamar o Instagram', 0, undefined, true); }
  const corpo: any = await r.json().catch(() => ({}));
  if (!r.ok || corpo?.error) {
    const e = corpo?.error ?? {};
    const temporario = r.status >= 500 || r.status === 429 || e.is_transient === true || TEMPORARIOS.includes(e.code);
    throw new ErroIG(e.message ?? `HTTP ${r.status}`, r.status, e.code, temporario);
  }
  return corpo;
}

type Ctx = { token: string; igUserId: string };
async function conexao(): Promise<Ctx | null> {
  const token = await cofre('ig_token');
  const igUserId = await lerConfig('ig_user_id');
  return token && igUserId ? { token, igUserId } : null;
}

// ---------- Regras da palavra ----------
// Minúsculas e sem acento.
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Palavra inteira: "GUIA!" e "#guia" casam; "guias" não. O '_' conta como parte da palavra
// (então "@maria_guia" não casa); ponto e outras pontuações separam.
function contemPalavra(texto: string, palavra: string): boolean {
  const p = normalizar(palavra).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!p) return false;
  return new RegExp(`(?<![\\p{L}\\p{N}_])${p}(?![\\p{L}\\p{N}_])`, 'u').test(normalizar(texto));
}

type Comentario = { id: string; mediaId: string; autorId: string; texto: string; parentId: string | null; criadoEm: number };

// Monta um comentário a partir do aviso ou da leitura da API. Faltou id, texto, autor ou post: descarta.
function montar(v: any, mediaId: unknown, criadoEm: number): Comentario | null {
  const s = (x: unknown) => (typeof x === 'string' && x ? x : null);
  const id = s(v?.id), texto = s(v?.text), autorId = s(v?.from?.id), media = s(mediaId);
  if (!id || !texto || !autorId || !media) return null;
  return { id, mediaId: media, autorId, texto, parentId: s(v?.parent_id), criadoEm };
}

// Aviso da Meta: { entry: [{ time, changes: [{ field: 'comments', value: {...} }] }] }
function comentariosDoAviso(payload: any): Comentario[] {
  const out: Comentario[] = [];
  for (const entrada of Array.isArray(payload?.entry) ? payload.entry : []) {
    const quando = typeof entrada?.time === 'number' ? entrada.time * 1000 : Date.now();
    for (const ch of Array.isArray(entrada?.changes) ? entrada.changes : []) {
      if (ch?.field !== 'comments') continue;
      const c = montar(ch.value, ch.value?.media?.id, quando);
      if (c) out.push(c);
    }
  }
  return out;
}

// ---------- Atender um comentário ----------
async function atender(c: Comentario, ctx: Ctx): Promise<'ignorado' | 'enviado' | 'falhou' | 'ja-atendido'> {
  // 1. Regras. Qualquer uma falhando, o comentário é ignorado.
  const [regra] = await sql`select palavra, dm, respostas from comenta.regras where media_id = ${c.mediaId} and ativo`;
  if (!regra) return 'ignorado';                          // post sem palavra cadastrada
  if (c.autorId === ctx.igUserId) return 'ignorado';      // comentário da própria conta
  if (c.parentId) return 'ignorado';                      // resposta a outro comentário
  if (Date.now() - c.criadoEm > PRAZO_MS) return 'ignorado';
  if (!contemPalavra(c.texto, regra.palavra)) return 'ignorado';

  // 2. Reserva ANTES de agir. Se a linha já existe (mesmo comentário, ou mesma pessoa no post), outro processo pegou.
  const reservado = (await sql`
    insert into comenta.envios (comentario_id, media_id, autor_id, status)
    values (${c.id}, ${c.mediaId}, ${c.autorId}, 'processando')
    on conflict do nothing returning comentario_id`).length > 0;
  if (!reservado) {
    // Só tenta de novo o que falhou (ou travou) e ainda tem tentativa. Atômico: só um processo vence.
    const paradoAntes = new Date(Date.now() - PARADO_MS).toISOString();
    const retomado = (await sql`
      update comenta.envios
      set status = 'processando', atualizado_em = now(),
          tentativas = tentativas + (case when status = 'processando' then 1 else 0 end)
      where comentario_id = ${c.id} and tentativas < ${MAX_TENTATIVAS}
        and (status = 'falhou' or (status = 'processando' and atualizado_em < ${paradoAntes}))
      returning comentario_id`).length > 0;
    if (!retomado) return 'ja-atendido';
  }

  // 3. Primeiro a DM (resposta privada ao comentário).
  try {
    await chamar(`${API}/${ctx.igUserId}/messages?${q({ access_token: ctx.token })}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: { comment_id: c.id }, message: { text: regra.dm } }),
    });
  } catch (e) {
    if (semAcesso(e)) {
      // Token com problema: não gasta tentativa. Quem chamou para a rodada.
      await sql`update comenta.envios set status = 'falhou', erro = ${limpo(e)}, atualizado_em = now() where comentario_id = ${c.id}`;
      throw e;
    }
    if (e instanceof ErroIG && !e.temporario) {
      // Definitivo (DM recusada, comentário apagado...): esgota as tentativas para não insistir.
      await sql`update comenta.envios set status = 'falhou', erro = ${limpo(e)}, tentativas = ${MAX_TENTATIVAS}, atualizado_em = now() where comentario_id = ${c.id}`;
    } else {
      await sql`update comenta.envios set status = 'falhou', erro = ${limpo(e)}, tentativas = tentativas + 1, atualizado_em = now() where comentario_id = ${c.id}`;
    }
    return 'falhou'; // DM falhou: NÃO sai resposta pública.
  }
  await sql`update comenta.envios set status = 'enviado', dm_em = now(), erro = null, atualizado_em = now() where comentario_id = ${c.id}`;

  // 4. Depois a resposta pública, alternando as variações (para não repetir o mesmo texto).
  try {
    const [{ n }] = await sql`select count(*)::int as n from comenta.envios where media_id = ${c.mediaId} and status = 'enviado'`;
    const respostas: string[] = regra.respostas;
    const texto = respostas[Math.max(0, n - 1) % respostas.length];
    await chamar(`${API}/${c.id}/replies`, { method: 'POST', body: new URLSearchParams({ message: texto, access_token: ctx.token }) });
    await sql`update comenta.envios set resposta_em = now() where comentario_id = ${c.id}`;
  } catch (e) {
    // A DM já chegou: continua 'enviado', só anota o motivo. Sem nova tentativa da resposta pública.
    await sql`update comenta.envios set erro = ${'resposta pública: ' + limpo(e)} where comentario_id = ${c.id}`;
  }
  return 'enviado';
}

// ---------- Varredura (a cada 10 min) ----------
async function varrer(ctx: Ctx) {
  const regras = await sql`select media_id from comenta.regras where ativo`;
  let enviados = 0, falhas = 0;
  const erros: string[] = [];
  for (const { media_id } of regras) {
    if (enviados + falhas >= MAX_POR_RODADA) break;
    let lista: any[];
    try {
      const url = `${API}/${media_id}/comments?${q({ fields: 'id,text,timestamp,from,parent_id', limit: '50', access_token: ctx.token })}`;
      lista = (await chamar(url)).data ?? [];
    } catch (e) {
      if (semAcesso(e)) throw e;
      erros.push(`post ${media_id}: ${limpo(e)}`);
      continue;
    }
    for (const bruto of lista) {
      if (enviados + falhas >= MAX_POR_RODADA) break;
      const t = Date.parse(bruto?.timestamp);
      const c = montar(bruto, media_id, Number.isFinite(t) ? t : Date.now());
      if (!c) continue;
      try {
        const r = await atender(c, ctx);
        if (r === 'enviado') enviados++;
        else if (r === 'falhou') falhas++;
      } catch (e) {
        if (semAcesso(e)) throw e;
        erros.push(`comentário ${c.id}: ${limpo(e)}`);
      }
    }
  }
  return { enviados, falhas, erros };
}

// ---------- Segurança ----------
// Compara textos sem vazar, pelo tempo, quantas letras bateram.
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

// Confere o X-Hub-Signature-256 ("sha256=<hex>"): HMAC-SHA256 do corpo cru com a chave secreta do app.
// crypto.subtle.verify compara em tempo constante.
async function assinaturaValida(corpo: string, cabecalho: string | null, chave: string): Promise<boolean> {
  if (!cabecalho?.startsWith('sha256=')) return false;
  const hex = cabecalho.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
  const esperado = new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', k, esperado, enc.encode(corpo));
}

// ---------- Rotas ----------
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const rota = url.pathname.replace(new RegExp(`^/${NOME}`), '') || '/';
  try {
    // Meta confere o endereço: devolve o hub.challenge se o token de verificação bater.
    if (req.method === 'GET' && rota === '/webhook') {
      const esperado = await cofre('webhook_token');
      const enviado = url.searchParams.get('hub.verify_token') ?? '';
      if (!esperado || !iguais(enviado, esperado)) return new Response('token inválido', { status: 403 });
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    }

    // Aviso de comentário novo.
    if (req.method === 'POST' && rota === '/webhook') {
      const corpo = await req.text(); // corpo cru: a assinatura é sobre os bytes exatos
      const chave = await cofre('app_secret');
      if (!chave || !(await assinaturaValida(corpo, req.headers.get('x-hub-signature-256'), chave))) {
        return json(401, { erro: 'assinatura inválida' });
      }
      await gravarConfig('ultimo_aviso', new Date().toISOString());
      // Daqui em diante, sempre 200: a Meta repete o que não for 2xx, e a varredura cobre o que ficar para trás.
      let payload: unknown;
      try { payload = JSON.parse(corpo); } catch { return json(200, { atendidos: 0 }); }
      const ctx = await conexao();
      if (!ctx) return json(200, { atendidos: 0 });
      let atendidos = 0;
      for (const c of comentariosDoAviso(payload)) {
        try {
          if ((await atender(c, ctx)) === 'enviado') atendidos++;
        } catch (e) {
          console.error('comenta-dm:', limpo(e));
          if (semAcesso(e)) { await gravarConfig('alerta', 'token recusado: gere outro e guarde no cofre'); break; }
        }
      }
      return json(200, { atendidos });
    }

    // Daqui para baixo, só com a chave do cofre (o agendador e você, pelo SQL Editor).
    const chaveCron = await cofre('cron_chave');
    if (!chaveCron || !iguais(req.headers.get('x-chave') ?? '', chaveCron)) return json(401, { erro: 'não autorizado' });

    // Uma vez: descobre o id da sua conta e assina o aviso de comentários.
    if (rota === '/inscrever') {
      const token = await cofre('ig_token');
      if (!token) return json(409, { erro: 'sem token no cofre (Parte 2.3)' });
      const eu = await chamar(`${API}/me?${q({ fields: 'user_id,username', access_token: token })}`);
      const igUserId = String(eu.user_id);
      await gravarConfig('ig_user_id', igUserId);
      const r = await chamar(`${API}/${igUserId}/subscribed_apps`, {
        method: 'POST', body: new URLSearchParams({ subscribed_fields: 'comments', access_token: token }),
      });
      return json(200, { conta: eu.username, ig_user_id: igUserId, inscrito: r.success === true });
    }

    const ctx = await conexao();
    if (!ctx && rota !== '/tarefas/limpar') return json(409, { erro: 'conta não conectada: rode a rota inscrever (Parte 2.6)' });

    // Os 10 posts mais recentes, para achar o media_id.
    if (rota === '/posts') {
      const r = await chamar(`${API}/${ctx!.igUserId}/media?${q({ fields: 'id,caption,permalink,timestamp', limit: '10', access_token: ctx!.token })}`);
      return json(200, (r.data ?? []).map((m: any) => ({ media_id: m.id, link: m.permalink, data: m.timestamp, legenda: String(m.caption ?? '').slice(0, 60) })));
    }
    if (rota === '/tarefas/varrer') return json(200, await varrer(ctx!));
    if (rota === '/tarefas/limpar') {
      const antes = new Date(Date.now() - GUARDA_MS).toISOString();
      const apagados = await sql`delete from comenta.envios where criado_em < ${antes} returning comentario_id`;
      return json(200, { apagados: apagados.length });
    }
    if (rota === '/tarefas/renovar') {
      const r = await chamar(`https://graph.instagram.com/refresh_access_token?${q({ grant_type: 'ig_refresh_token', access_token: ctx!.token })}`);
      await sql`select comenta.guardar('ig_token', ${r.access_token})`;
      await gravarConfig('token_renovado_em', new Date().toISOString());
      return json(200, { renovado: true, vale_por_dias: Math.round(r.expires_in / 86_400) });
    }
    return json(404, { erro: `rota desconhecida: ${req.method} ${rota}` });
  } catch (e) {
    console.error('comenta-dm:', limpo(e));
    if (semAcesso(e)) await gravarConfig('alerta', 'token recusado: gere outro e guarde no cofre').catch(() => {});
    if (e instanceof ErroIG) return json(502, { erro: limpo(e), codigo: e.codigo, temporario: e.temporario });
    return json(500, { erro: 'erro interno' });
  }
});
```

**Para publicar.** O jeito principal é o Supabase CLI (a ferramenta de linha de comando do Supabase). Precisa do Node instalado. Na pasta onde está a pasta `supabase/`:

```bash
npx supabase login
npx supabase functions deploy comenta-dm --project-ref <seu-projeto> --no-verify-jwt
```

- O `supabase login` abre o navegador para você entrar. Quem clica é você.
- O `--no-verify-jwt` é obrigatório. A Meta chama a função sem login do Supabase. A proteção é a assinatura do aviso (conferida com a chave secreta do app) e a `x-chave` nas outras rotas.
- Se o comando reclamar do Docker, acrescente `--use-api` no fim.
- Esperado: termina com "Deployed Functions".

**Sem terminal:** no painel do Supabase, **Edge Functions** → **Deploy a new function** → **Via Editor**. Dê o nome `comenta-dm`, cole o código e publique. Depois, nos detalhes da função, **desligue** a verificação de JWT (o nome é parecido com "Verify JWT" ou "Enforce JWT Verification").

### 2.5 Ligar o aviso da Meta (webhook)

1. Pegue o token de verificação que o SQL gerou. No SQL Editor, rode:

   ```sql
   select comenta.cofre('webhook_token');
   ```

   Copie o resultado. Ele não é a chave da sua conta, mas também não deve ir para o chat.

2. No painel da Meta: caso de uso do Instagram → **Configuração da API com login do Instagram** → **Configurar webhooks**.
3. **URL de callback:** `https://<seu-projeto>.supabase.co/functions/v1/comenta-dm/webhook`
4. **Token de verificação:** cole o texto do passo 1.
5. Clique em **Verificar e salvar**. Se der erro, confira se a função foi publicada (2.4) e se o texto é idêntico.
6. Na lista de campos, **assine `comments`** (ligue a chave ao lado de `comments`).

### 2.6 Inscrever a sua conta

Este passo descobre o número da sua conta (o `ig_user_id`) e liga o aviso de comentários para ela (`POST /{ig-user-id}/subscribed_apps?subscribed_fields=comments`). A chamada sai do próprio banco, com a chave do cofre. Ninguém precisa ver chave nenhuma.

No SQL Editor:

```sql
select comenta.chamar('inscrever');
```

Espere uns 5 segundos e veja a resposta:

```sql
select status_code, content from net._http_response order by id desc limit 1;
```

Esperado: `status_code` 200 e, no `content`, o seu @ e `"inscrito":true`.

> No painel da Meta, ao lado da sua conta na etapa de tokens, pode existir uma chave de "inscrição de webhook". Se existir, pode ligar também. Faz o mesmo que este passo.

---

## Parte 3: cadastrar um post

Cada post com a automação é uma linha na tabela `comenta.regras`: o id do post, a palavra, a DM e as respostas públicas.

**1. Ache o id do post (`media_id`).** Publique o post normalmente. Depois, no SQL Editor:

```sql
select comenta.chamar('posts');
```

Espere uns 5 segundos:

```sql
select content from net._http_response order by id desc limit 1;
```

Aparecem os seus 10 posts mais recentes, com `media_id`, link e o começo da legenda. A função usa a chamada `GET /{ig-user-id}/media?fields=id,permalink` da API. Copie o `media_id` do post certo.

**2. Cadastre a regra:**

```sql
insert into comenta.regras (media_id, palavra, dm, respostas) values (
  '<media_id do post>',
  'GUIA',
  'Oi! Aqui está o guia que eu prometi: https://seu-link-aqui
Qualquer dúvida, me chama por aqui.',
  array[
    'Te mandei no direct!',
    'Mandei agora no seu direct.',
    'Chegou aí? Se não achar, olha em Solicitações de mensagem.'
  ]
);
```

Regras do cadastro:

- **Palavra:** uma só, de 2 a 30 letras ou números, sem espaço nem pontuação.
- **DM:** curta e direta, com o link. O banco aceita até 1000 caracteres, que é o limite da Meta para mensagem. Fique bem abaixo disso.
- **Respostas públicas:** de 1 a 10 variações. Use pelo menos 3, para o Instagram não ver o mesmo texto repetido várias vezes. Cada uma com no máximo 300 caracteres.
- Na legenda do post, diga exatamente a palavra: "Comenta GUIA que eu te mando no direct".

**Comentário que chegou antes do cadastro também conta.** A varredura de 10 em 10 minutos lê os comentários do post e atende quem comentou a palavra nos últimos 7 dias.

**Mudar ou desligar:**

```sql
-- Corrigir o link da DM (vale para quem comentar depois; quem já recebeu não recebe de novo)
update comenta.regras set dm = '<texto novo>' where media_id = '<media_id>';

-- Desligar a automação de um post (o post continua normal)
update comenta.regras set ativo = false where media_id = '<media_id>';
```

Desligue os posts antigos. A varredura só lê posts com `ativo` ligado.

---

## Parte 4: testar

1. **Use outra conta.** Da sua segunda conta, comente a palavra no post cadastrado. Os seus próprios comentários são ignorados de propósito.
2. **Procure a DM em "Solicitações de mensagem".** Se a conta de teste não segue você, a DM não cai na caixa principal.
3. **Confira a resposta pública** embaixo do comentário.
4. **Comente de novo com a mesma conta.** Esperado: nada acontece. É uma DM por pessoa por post.
5. **Comente sem a palavra.** Esperado: nada acontece.
6. **Confira o banco:**

   ```sql
   -- O aviso da Meta chegou? (data e hora de agora = sim)
   select valor from comenta.config where chave = 'ultimo_aviso';

   -- Quem foi atendido e como
   select comentario_id, status, tentativas, erro, dm_em, resposta_em
   from comenta.envios order by criado_em desc limit 5;
   ```

7. **Comente a palavra com a sua própria conta.** Esperado: nenhuma linha nova em `comenta.envios`. Se aparecer, o sistema não está reconhecendo a sua conta: pare e veja a Parte 5.

Para testar de novo com a mesma conta, cadastre outro post.

---

## Parte 5: problemas comuns

Onde olhar primeiro: **Edge Functions** → **comenta-dm** → **Logs** (ou **Invocations**), no painel do Supabase. Procure as linhas `POST /webhook` e veja o status.

| O que acontece | Causa provável | O que fazer |
|---|---|---|
| A rota `posts` funciona, mas a API devolve **0 comentários** em posts que têm comentário | App da Meta em **modo de desenvolvimento** | Publique o app (1.6). Esse é o erro mais comum. |
| `POST /webhook` com status **401** | A Meta avisou, mas a assinatura não bateu: chave secreta errada no cofre | Confira se guardou a **Chave secreta do app do Instagram** (a da página da API do Instagram). Se continuar, teste a chave de **Configurações do app** → **Básico**. Guarde com `comenta.guardar('app_secret', ...)` e comente de novo. |
| **Nenhuma** linha `POST /webhook` nos logs | Aviso não assinado, ou conta não inscrita | Confira se `comments` está assinado no painel (2.5) e rode a inscrição de novo (2.6). Confira se o app está **Publicado**. Enquanto isso, a varredura atende em até 10 minutos. |
| "Verificar e salvar" dá erro no painel da Meta | Função não publicada, JWT ligado ou token de verificação diferente | Refaça 2.4 (com `--no-verify-jwt`) e copie de novo o `webhook_token` (2.5). |
| `erro` com código **190**, ou `alerta` preenchido em `comenta.config` | Token vencido ou recusado (troca de senha do Instagram também derruba) | Gere outro token no painel (2.3 b) e guarde com `comenta.guardar('ig_token', ...)`. |
| A DM falha e o erro fala de permissão de mensagem | "Permitir acesso às mensagens" desligado | Ligue no app do Instagram (1.4). |
| Funciona pelo aviso, mas a varredura não roda | Agendador desligado ou endereço errado | Rode `select * from cron.job_run_details order by start_time desc limit 5;` e confira o `url_funcao` em `comenta.config`. |
| Pessoa diz que não recebeu | DM foi para "Solicitações de mensagem", ou a pessoa já tinha recebido nesse post | Peça para olhar as solicitações. Confira a linha dela em `comenta.envios`. |
| A DM chegou, mas não teve resposta pública | A resposta pública falhou depois da DM | Normal: a DM é o que importa. O motivo fica na coluna `erro`. |

Para ver como foi a última varredura:

```sql
select comenta.chamar('tarefas/varrer');
-- uns 10 segundos depois:
select status_code, content from net._http_response order by id desc limit 1;
```

---

## Parte 6: privacidade (LGPD)

A LGPD é a lei brasileira de proteção de dados. Este sistema guarda o mínimo:

- **O que fica guardado:** o id do comentário, o id do post, o número que a Meta usa para identificar quem comentou (não é o @ nem o nome), se a DM foi enviada, quando, quantas tentativas e o motivo de uma falha.
- **O que não fica:** o texto do comentário, o @, o nome, a foto.
- **Por quanto tempo:** 90 dias. A tarefa `comenta-limpar` apaga todo dia o que passou disso.
- **Quem acessa:** só você. As tabelas ficam fechadas para acesso de fora (RLS ligado e permissões retiradas).
- **Para quê:** mandar a DM uma vez só e saber se deu certo.

Isso precisa estar escrito na sua página de privacidade (1.5), do jeito que é. Se alguém pedir para apagar os próprios dados, você roda no SQL Editor, com o id do comentário dessa pessoa:

```sql
delete from comenta.envios
where autor_id = (select autor_id from comenta.envios where comentario_id = '<id do comentário>');
```

Este guia não é orientação jurídica. Se o seu negócio lida com muitos dados, vale conversar com quem entende de LGPD.

---

## Perguntas frequentes

**Isso pode dar bloqueio ou banimento no Instagram?**
Não existe garantia, mas o risco é baixo se você usar do jeito que o guia monta. A automação usa a **API oficial da Meta**, a mesma porta que ferramentas como o ManyChat usam, por meio de um app seu, publicado no painel de desenvolvedores. Ela não pede sua senha, não usa robô que clica no aplicativo nem extensão de navegador. E só manda DM para quem comentou a palavra pedindo, uma vez por post. O que costuma dar problema é comportamento de spam: mandar mensagem para quem não pediu, prometer algo no post e não entregar, link suspeito na DM ou um volume muito fora do normal. A Meta também limita quantas chamadas a API aceita por hora; se passar, ela recusa por um tempo e o sistema anota a falha.

**Preciso pagar alguma coisa?**
A Meta não cobra pelas chamadas da API. O Supabase tem plano gratuito, com limites e pausa do projeto depois de um tempo parado (confira em supabase.com/pricing). O único custo possível é o assistente de IA, se o seu for pago.

**Preciso ligar o Instagram a uma página do Facebook?**
Não. O guia usa a API do Instagram com login do próprio Instagram, que não pede página do Facebook nem portfólio empresarial. O Facebook só serve para entrar no painel de desenvolvedores.

**A pessoa precisa me seguir para receber a DM?**
Não. Se ela não seguir você, a DM cai em **Solicitações de mensagem**. Vale avisar isso na resposta pública do comentário.

**Funciona em Reels, carrossel e post antigo?**
Funciona em qualquer post seu: Reel, carrossel ou foto. Em post antigo também, mas só para comentários novos: a Meta só deixa responder no direct comentários de até 7 dias.

**Posso usar uma palavra diferente em cada post?**
Pode. Cada post tem a sua palavra, e a palavra de um post não dispara em outro. Se a mesma pessoa comentar duas vezes no mesmo post, ela recebe uma DM só.

**Funciona no TikTok, no Facebook ou no Threads?**
Não, só no Instagram. Se você postar o mesmo vídeo em outra rede, troque o pedido de comentário por outro chamado (seguir, link na bio).

**Que dados das pessoas ficam guardados?**
O mínimo: o id do comentário, o id do post, o número que a Meta usa para identificar quem comentou e se a DM foi enviada. O texto do comentário, o @, o nome e a foto não ficam. Tudo é apagado depois de 90 dias, e só você tem acesso (Parte 6).

**Como desligo a automação de um post?**
É só tirar a regra desse post da tabela `comenta.regras` (o assistente mostra o comando e espera o seu OK). Os outros posts continuam funcionando.

---

## O que esta versão não faz

- Só Instagram. Não funciona no TikTok, no Facebook nem no Threads.
- Uma palavra por post.
- Não confere se a pessoa segue você.
- Não manda botão nem sequência de mensagens. É uma DM de texto.
- A varredura lê os 50 comentários mais recentes de cada post. Em post com muito comentário de uma vez, quem depende só da varredura pode ficar de fora. O aviso da Meta, quando está funcionando, pega todos.
- Não responde comentário com mais de 7 dias. É regra da Meta.

---

Feito por Ayrton Verçosa — Thecodifica · @ayrton.vercosa
