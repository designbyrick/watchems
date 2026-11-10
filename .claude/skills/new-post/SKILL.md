---
name: new-post
description: Cria um post de tráfego orgânico do Watchems em /learn/<slug> (pesquisa no Keyword Planner e no Google, mapa de cobertura, texto em content/posts/<slug>/index.mdx com fatos de fonte citada, capa gerada pela OpenAI, travas de originalidade e profundidade, testes e navegador). Use quando o dono pedir "novo post", "artigo", "conteúdo para SEO" ou "tráfego orgânico", ou passar um tema ou uma busca. Modos: /new-post teste, /new-post aprovar <slug>, /new-post diario.
---

# Novo post (tráfego orgânico)

Responda ao dono em português do Brasil. O post é escrito em inglês simples, para leitores dos EUA e de outros países de língua inglesa. Um post por execução. O objetivo é chegar ao topo do Google para a busca escolhida: o post precisa ser a resposta mais útil da primeira página, não só mais uma.

## Onde fica cada coisa

- Texto: `content/posts/<slug>/index.mdx`. A pasta é o registro: não existe lista para editar. Página em `/learn/<slug>` (`app/learn/[slug]/page.tsx`), índice em `/learn`, sitemap automático.
- Molde: `.claude/skills/new-post/template.mdx` (copie com `cp`, troque todo `«...»`; o teste reprova marcador esquecido).
- Componentes do MDX (`components/post/PostMdx.tsx`): `<SpecTable columns rows caption />` (não há sintaxe de tabela no markdown), `<Note title>` (erro comum com a correção), `<Figure src alt caption />` (imagem no meio do texto, ver "Imagens") e `<Affiliate href>` (link de afiliado; travado, ver abaixo).
- Regras automáticas: `lib/postRules.ts` e `tests/lib/posts.test.ts`.
- Backlog de buscas: `docs/seo/backlog.md`.
- Scripts: `scripts/post-image.mjs` (capa pela OpenAI, paga) e `scripts/check-post-diff.mjs` (trava do deploy).
- O post não usa o banco do Watchems (decisão do dono, 2026-11-02).

## Modos

- **Interativo** (sem argumento ou com uma busca): etapas 0 a 5, com o "ok" do dono no briefing (etapa 2). Commit, push e capa paga só com pedido do dono.
- **`/new-post teste`**: faz a pesquisa, o texto e a verificação (D1 a D4) numa worktree `post-<slug>` e para antes do commit. A capa fica no dry run, a não ser que o dono autorize a chamada paga naquele pedido; sem capa, use um arquivo provisório cinza só para ver a página e diga isso no relatório. No fim, deixe o `preview_start` "web-3001" aberto em `/learn/<slug>` e mostre a página a 1280 px e a 390 px, com as notas e a lista de profundidade. Para publicar: `/new-post aprovar <slug>`.
- **`/new-post aprovar <slug>`**: publica um post que o teste ou o diário deixou numa branch `posts/<slug>`. Ver a seção própria.
- **`/new-post diario`**: a tarefa agendada `posts-diario`. Ver a seção própria.

## 0. Ler antes

- `CLAUDE.md` e `PROJECT_CONTEXT.md`: o Watchems é uma biblioteca de fotos reais de pulso, não um site social.
- `content/posts/*/index.mdx` (posts publicados), `lib/guides/*.ts` (guias de compra) e `docs/seo/backlog.md`. Uma busca é uma página só.
- **Canibalização.** Cada tipo de busca tem um dono fixo:
  - "best watches under $X" e faixas de preço: `/buying-guide/<slug>`. Post nunca disputa essa busca (o teste reprova).
  - Nome puro de um relógio ou de uma marca ("omega seamaster 300m", "tudor watches"): `/w/<watchId>` e `/brand/<brand>`.
  - Estilo puro ("dive watches"): `/style/<style>`.
  - Dúvida, comparação e explicação ("how big should a watch be", "seamaster vs black bay", "what is a gmt watch"): o post.
  Se a busca já tem dono, melhore aquela página em vez de criar outra, ou descarte a busca.

## 1. Pesquisa da busca

Carregue o skill `seo-aeo-geo-ultimate:seo-research`. Internet só pelo Claude in Chrome (skill `anthropic-skills:chrome-browser`), nunca pelo navegador embutido.

- **Keyword Planner** do Google Ads (`https://ads.google.com/aw/keywordplanner/home`), conta **666-334-7691** (a mesma do ZimSpeak, confirmada pelo dono em 2026-11-02; login já aberto no Chrome do dono): escolha essa conta no seletor e use "Discover new keywords". Nunca entre com senha nem mude nada na conta. Sem sessão aberta ou sem acesso: pare e avise.
- A pesquisa é do **nicho inteiro**: escolher e comprar relógio, tamanho e caimento no pulso, comparações entre modelos, tipos de relógio e de movimento explicados, pulseiras e cuidados, relógio para uma ocasião. Várias sementes amplas e também "Start with a website" em `watchems.com`. Local Estados Unidos (pode somar Canadá, Reino Unido e Austrália), idioma inglês, últimos 12 meses.
- Fique com buscas de quem quer aprender ou decidir (não de quem quer comprar numa loja específica nem conserto local), com volume e concorrência que um site pequeno consegue disputar. Prefira cauda longa com volume real.
- Para cada candidata, veja no Google (EUA, inglês) as sugestões, o "People also ask" e os **5 primeiros resultados**: é artigo, lista, loja, fórum ou vídeo? Só loja ou só vídeo no topo: descarte. Só sites enormes (marcas, revistas grandes) nos 5: prefira outra busca, a não ser que todos sejam rasos.
- **Mapa de cobertura.** Leia inteiros os **5 primeiros resultados em texto** (pule vídeo, anúncio, loja pura e página fora do ar; fórum bloqueado vale pelo trecho do Google) e anote, para cada um: os H2, os formatos (tabela, lista, passo a passo, calculadora), quanto explica e o que falta ou está fraco. Daí saem duas listas: **obrigatório** (decisão do dono, 2026-11-02: **todos os pontos principais** de cada um desses artigos, isto é, cada seção ou ideia que ocupa um H2 ou um bloco próprio, mesmo que só um deles tenha; e os **formatos**: se o topo tem tabela de pulso por tamanho de caixa, o post precisa da sua própria; se o topo responde com número, o post responde com número) e **ganho de informação** (o que nenhum dos três tem e muda a decisão do leitor). O mapa diz **do que** o leitor precisa (temas, perguntas, situações), nunca **como** escrever: exemplos, comparações, tabelas, frases e a ordem das seções saem do zero, sem olhar o texto do concorrente na hora de escrever. A originalidade vale para o conteúdo, não para o formato: ter uma tabela como a do concorrente é obrigatório quando o topo tem; copiar os números, a fonte ou a montagem dela, não.
- Escolha uma busca principal e de 3 a 6 secundárias, e a intenção (`how-to`, `list`, `comparison`, `definition`, `buying-advice`, `problem`) pelo formato do topo. Registre numa linha do backlog com o volume, a concorrência, a fonte e a data.

## 2. Briefing

Mostre no chat, curto: busca principal e intenção, título (até 49 caracteres, porque o layout soma " | Watchems"), descrição (70 a 160), slug (`kebab-case`, inglês, sem ano), os H2 com o que cada um entrega, a FAQ (perguntas reais), o mapa de cobertura (ganho de informação, com o primeiro colocado como régua, e o **obrigatório como lista de conferência**: cada ponto principal do topo com as URLs que o trazem e o H2 do post que o cobre), a cena da capa e as páginas do Watchems que vão linkar. **No modo interativo, espere o "ok" do dono.** No teste e no diário, siga e ponha o briefing no relatório.

## 3. Escrever

- Copie o molde para `content/posts/<slug>/index.mdx`. Todas as datas entre aspas (`"2026-11-02"`).
- **`coverage` no frontmatter**: um item por ponto principal do obrigatório, com `point` (o ponto, em palavras próprias), `sources` (as URLs dos artigos do topo que o trazem) e `section` (o H2 exato do post que o cobre, ou `"FAQ"`). O teste reprova menos de 6 pontos, menos de 3 URLs, ponto sem `section` e `section` que não é um H2 do post. Um ponto pode ser coberto de forma melhor que o concorrente, mas não pode ser pulado.
- **Fatos.** Tudo o que o post diz sobre um relógio (preço, referência, medida, movimento, resistência à água) vem de fonte citada, nunca da memória.
  - Medidas e especificações: o site oficial da marca. Sem ele, uma revista de relógio estabelecida (Hodinkee, Worn & Wound, WatchTime). Nunca fórum.
  - Preço: o site da marca ou uma loja autorizada, com a data.
  - Não achou fonte: tire do texto.
  - Todo número com unidade (mm, m, $, %, horas, gramas) que aparece no post precisa estar em `facts`, com o mesmo texto e a URL de onde foi lido; o teste reprova o que faltar.
- **Responda a busca nas duas primeiras frases** do texto, sem aquecimento. Uma ideia por parágrafo, até 90 palavras.
- **Autoria própria** (decisão do dono, 2026-11-02): o post é obra original do Watchems, escrito por um editor que entende de relógio. Os artigos do topo servem só para a pesquisa (saber o que o leitor precisa e conferir fatos); o texto não junta, resume nem cita o que eles dizem.
  - No texto, nunca mencione outro site, guia, artigo ou o guia de tamanho de uma marca ("X's size guide says", "according to", "most guides", "other charts", "this guide"). Marcas aparecem só como exemplos de relógio.
  - Regras práticas, tabelas e conselhos saem como do Watchems ("The Watchems rule of thumb"), na nossa voz. As URLs das medidas ficam só em `facts` no frontmatter, nunca no texto visível.
  - Nada de comentário sobre a concorrência ("the one most guides leave out", "most charts skip this"): mostre a ideia direto.
  - O teste reprova essas frases e o nome de qualquer site listado em `coverage.sources`.
- **Tom descontraído** (decisão do dono, 2026-11-02): conversa de quem gosta de relógio, leve e sem rigidez, não um manual nem um relatório técnico.
  - Poucos números no texto corrido: no máximo dois por parágrafo. O resto vai para as tabelas. Prefira "the high 30s to the low 40s" a uma lista de medidas.
  - Pode brincar de leve ("the actual runway a watch gets to sit on", "will let your sleeve know it's there") e falar direto com o leitor ("Got a small wrist and a soft spot for dive watches?"). Sem exagero nem palavra de hype.
  - Parágrafos curtos, de duas a quatro frases. Quando uma seção virar lista de especificações, transforme em conversa com um exemplo.
  - **Anônimo** (decisão do dono, 2026-11-02): a assinatura é "Watchems Editorial". Nada de primeira pessoa do autor ("I", "my wrist", "when I tried") nem experiência pessoal, real ou inventada. "Our" só para falar das páginas do site ("our under $1,000 guide").
  - Comece por uma situação real do leitor ("A 38 mm watch can look neat on one wrist and oversized on the next...") e responda logo em seguida.
  - Use contrações (it's, don't, you'll, that's) e "you" o tempo todo. Varie o tamanho das frases: algumas curtíssimas ("The rule is simple."), outras mais longas.
  - Transições faladas ("Here's the fun part.", "Then measure across.", "That's why...") no lugar de rótulos ("This is your X.", "Here is the rule to remember.", "Look at the first two rows.").
  - **Títulos de seção diretos**: pelo menos metade dos H2 é a própria busca secundária ou a pergunta do "People also ask", escrita de forma natural ("How to measure your wrist for a watch", "What is lug width?", "Watch size chart by wrist size"), porque o Google usa esses títulos para escolher trechos de destaque. A busca principal fica no H1. A voz vai no texto, não nos títulos; um ou dois H2 com voz ("So how big is too big?") estão ok.
  - Opinião prática quando ajuda a decidir ("the Hamilton is the easier one to live with"), sempre apoiada num fato citado.
  - Teste final: leia em voz alta. Se soar como definição de dicionário ou lista de instruções, reescreva o trecho.
- **Palavras simples.** Sem sigla nem jargão sem explicação na mesma frase, na primeira vez que aparece: "lug-to-lug (the distance from the top tip of the case to the bottom tip)", "COSC (a Swiss lab that tests accuracy)". Prefira a palavra comum ao termo técnico. O teste confere siglas e uma lista de termos de relógio (`JARGON` em `lib/postRules.ts`; acrescente termos novos lá).
- **Menções ao Watchems.** De 2 a 3 parágrafos curtos no meio do texto, cada um logo depois de um ponto em que ver o relógio em pulsos reais ajuda o leitor ("see how it looks on real wrists"), com link para `/w/<watchId>`, `/brand/` ou `/style/` (confira no site que a página existe). Nenhuma no primeiro parágrafo. O teste conta.
- **Links.** Pelo menos dois internos (`/w/`, `/brand/`, `/style/`, `/buying-guide/` ou outro post). Acrescente também um link para o post novo num post antigo relacionado.
- **Afiliados.** O `CLAUDE.md` permite, mas o site ainda diz "no affiliate links" na home, no `llms.txt`, no About e nas descrições de marca e estilo. Enquanto essa frase existir em `app/page.tsx`, o teste reprova qualquer `<Affiliate>`. Só com URL real de programa ativo, nunca inventada.
- **Exemplos que o leitor reconhece.** Pelo menos 6 modelos reais citados no post, espalhados pelas seções (não só numa tabela). Nas tabelas e comparações, prefira modelos conhecidos de quem mora nos EUA (os que aparecem em revistas e lojas grandes), de qualquer marca. A escolha não depende de o modelo estar ou não na galeria do Watchems (decisão do dono, 2026-11-02). Medidas que a marca não publica (lug-to-lug é a mais comum) podem vir de uma revista estabelecida, com a URL. Um modelo desconhecido só entra se ensina algo que os famosos não ensinam.
- **Profundidade.** Ensina em vez de listar: cada item diz quando importa e por quê, com um exemplo concreto. Comparação pede `<SpecTable>` datada e justa. Erro comum vai em `<Note>`.
- **Capa.** Mostra o assunto do post, nunca uma imagem genérica (teste: se a mesma imagem serviria para outro post, troque). Escreva `cover.scene` com o momento concreto do post (a medição, as duas pulseiras lado a lado, o relógio no pulso pequeno). **Nunca uma marca ou um modelo real**: relógio só genérico, sem logo nem texto (o teste reprova nomes de marca). Antes de rodar, confira na documentação da OpenAI o modelo de imagem atual e atualize `MODEL` e `PRICE` no script. Dry run (`node --env-file=.env.local scripts/post-image.mjs <slug>`) e, só com autorização para a chamada paga (cerca de US$0,03 a 0,05), `--execute`. Olhe a imagem: se tiver texto, logo, mão deformada ou cara de um modelo conhecido, ajuste a cena e rode com `--force`. No máximo 3 chamadas por post.

- **Imagens no meio do texto.** O post não pode ser só texto: de 3 a 5 `<Figure>`, uma a cada uma ou duas seções, logo depois do trecho que ela explica.
  - **Diagramas** (grátis, o principal): SVG escrito à mão em `public/posts/<slug>/<nome>.svg`, 1536x864, com as cores do site (`#161616`, `#5A5A58`, `#EEEEEC`, `#D2D2CF`, acento `#C2410C`, verde `#16A34A`). Rótulos curtos e grandes (no mínimo 44 px; títulos 76 px), porque no celular a imagem encolhe para cerca de um quarto. Frase explicativa vai na `caption`, nunca dentro do SVG. Medidas só de `facts`. Confira a 390 px antes de seguir.
  - **Fotos da OpenAI** (pagas, cerca de US$0,03 cada, no máximo 2 por post além da capa): entrada em `figures` do frontmatter (`src: "/posts/<slug>/<nome>.webp"`, `alt`, `scene`), mesmas regras da capa, e `node --env-file=.env.local scripts/post-image.mjs <slug> --figure <nome> --execute` só com autorização da chamada paga.
  - O teste reprova `<Figure>` fora de `/posts/<slug>/`, sem `alt` descritivo, arquivo ausente, ou foto `.webp` sem `figures` com cena (ou com marca real).

## 4. Revisão

Duas passadas no texto:
1. **Padrões óbvios**: palavras de hype (`HYPE_WORDS`), perguntas-gancho falsas, frases de marketing, afirmações sem apoio.
2. **Sinais sutis**: frases seguidas começando igual, transições fracas ("Additionally", "Moreover"), parágrafo longo, travessão (proibido: use ponto, vírgula ou dois-pontos; faixas com "to", nunca "–").

Depois rode, nesta ordem, e corrija o que for real: `seo-aeo-geo-ultimate:seo-content`, `seo-aeo-geo-ultimate:seo-aeo` e `seo-aeo-geo-ultimate:seo-schema`.

**Trava de originalidade** (antes da lista; falhou, reescreva aquele trecho do zero). Ponha lado a lado cada exemplo, comparação, tabela, frase de efeito, exercício e título de seção com os três textos do mapa. Se a escolha de relógios, os números, a sequência, a ideia de um exemplo ou uma frase repetir ou parafrasear um concorrente, reescreva com outro exemplo. O formato (ter uma tabela, uma lista de passos, uma calculadora) pode repetir; o que vai dentro dele, não. Diga no relatório que a trava passou e contra quais URLs.

**Lista de profundidade.** Marque sim ou não e diga qual faltou. **Publica com 5 ou mais de 6.**
1. Cobre todos os pontos principais do topo (`coverage` sem item vazio) e os formatos, com conteúdo próprio: confira item por item. **Este item não pode faltar**: sem ele o post não publica, mesmo com 5 de 6.
2. **Ganho de informação 1:** uma ferramenta de decisão que nenhum dos três tem e que o leitor usa na hora (ex.: um passo a passo para testar em casa, como a tira de papel; uma calculadora simples; uma tabela que cruza duas medidas que o topo só mostra separadas).
3. **Ganho de informação 2:** outro item que nenhum dos três tem (ex.: erros comuns de quem compra, com a correção; a mesma escolha explicada para dois perfis de leitor; uma comparação lado a lado que os concorrentes fazem só em texto).
4. Um exemplo concreto para cada situação importante da busca, comentado.
5. Responde às buscas secundárias e ao "People also ask", para o leitor não voltar ao Google. Pergunta com número ("If my wrist is 7 inches, what size watch should I get?") recebe resposta com número, com fonte.
6. Sem repetição nem enchimento.

Nota de 1 a 5 em **soa humano**, em **fatos conferidos** e em **bate com o topo** (a busca é respondida no mesmo formato que o Google já premia, com o nosso ganho de informação por cima). Abaixo de 4 em qualquer uma, o item 1 faltando, ou menos de 5 itens da lista: reescreva (no máximo duas vezes), depois pare.

## 5. Verificar

- `npm run typecheck`, `npm run lint` e `npm test` sem nenhuma falha. O `tests/lib/posts.test.ts` reprova título ou descrição fora do tamanho, slug inválido, menos de dois links internos, palavra de hype, travessão, parágrafo com mais de 90 palavras, três frases seguidas com o mesmo início, sigla ou jargão sem explicação, número fora de `facts` ou sem URL, ponto principal do topo sem seção no `coverage`, menções ao Watchems fora de 2 a 3, capa ausente ou com marca real, post fora do backlog, busca de guia de compra e afiliado com o site ainda dizendo que não tem.
- Navegador local: o `.env.local` local tem chaves falsas, então o site não abre com o "web-3001" puro. Para ver a página, suba o Next na porta 3001 com `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` trocada por uma chave falsa de formato `pk_live_` (base64 de `clerk.example.com$`), só no ambiente daquele processo (uma configuração temporária no `.claude/launch.json`, apagada no fim). Confira `/learn/<slug>` a 1280 px e a 390 px, sem rolagem lateral; o sumário leva a cada seção; `/learn` lista o post; `/sitemap.xml` tem a URL.

## `/new-post diario`

Tarefa agendada `posts-diario`. **Não publica sozinha**: deixa o post pronto num PR em rascunho e avisa o dono. Exceção registrada no `CLAUDE.md`: esta tarefa pode fazer commit e push só em branches `posts/<slug>` e abrir PR em rascunho; nunca na `master`.

Pasta principal: `/Users/ricardobrandao/Documents/GitHub/watchems`; nunca mude a branch dela. Todo commit começa com `post(auto):`. Nada de banco, componentes, páginas, estilos ou config. Qualquer trava que falhar: pare, deixe o que houver na branch (linha `rascunho` no backlog) e diga o motivo no relatório. **Chamada paga:** só a capa, e só se o `CLAUDE.md` tiver a autorização permanente do dono para ela; sem essa autorização, pare antes do commit e avise.

- **D1. Busca.** A primeira linha `pronta` do backlog cujo slug não existe em `content/posts/` nem tem branch `posts/<slug>` (`git -C <pasta principal> ls-remote --heads origin "posts/*"`). Sem nenhuma: etapa 1 inteira. A busca só serve se passar pela canibalização da etapa 0 e tiver artigo entre os 5 primeiros; se não, marque `descartada` com o motivo e tente outra, no máximo três.
- **D2. Worktree.** `git -C <pasta principal> fetch origin master` e `git -C <pasta principal> worktree add .claude/worktrees/post-<slug> -b posts/<slug> origin/master`. Na worktree: `npm ci` e `ln -s <pasta principal>/.env.local .env.local` (para a chave da OpenAI; nunca copie nem mostre o conteúdo).
- **D3. Escrever.** Mapa de cobertura da etapa 1 (também quando a busca veio pronta), briefing no relatório, etapas 3 e 4 inteiras.
- **D4. Verificar.** Etapa 5 inteira.
- **D5. Trava do diff.** `node scripts/check-post-diff.mjs <slug>`. Falhou (arquivo fora do post): pare, sem commit.
- **D6. Commit e PR.** Backlog `rascunho` com o caminho, um commit `post(auto): <slug>`, `git push -u origin posts/<slug>` e `gh pr create --draft --base master --title "post(auto): <slug>"` com o briefing, as notas, a lista de profundidade e a trava de originalidade no corpo. Nunca `merge`, nunca push na `master`.
- **D7. Aviso.** Mande ao dono uma notificação (PushNotification) com o título, a URL do PR e "aprovar com /new-post aprovar <slug>". Pare o servidor local. A worktree e a branch ficam para o aprovar.
- **D8. Relatório** (até 10 linhas): título, busca e intenção, URL do PR, CI do PR (verde, vermelho ou rodando), notas, itens de profundidade (quantos de 6 e qual faltou), a lista do obrigatório conferida, chamadas pagas da capa, o que não foi conferido.

## `/new-post aprovar <slug>`

O pedido do dono vale como autorização para o merge **deste** post na `master` (que publica na hora pela Vercel) e para a capa paga dele, e só dele.

1. Na worktree `post-<slug>` (ou recrie a partir da branch `posts/<slug>`), leia o post inteiro e mostre ao dono qualquer problema antes de seguir. Se o teste não fez commit, faça agora: `post(auto): <slug>`.
2. Capa ainda no dry run ou provisória: `--execute`, olhe a imagem.
3. `git fetch origin master` e `git rebase origin/master`. Conflito em qualquer arquivo: `git rebase --abort` e pare.
4. Etapa 5 inteira de novo e `node scripts/check-post-diff.mjs <slug>`. Falhou: pare.
5. Backlog `publicada`, commit, `git push --force-with-lease origin posts/<slug>`. Sem PR: `gh pr create --base master`. Tire do rascunho (`gh pr ready`) e espere o CI do PR ficar verde; vermelho: pare e mostre o erro.
6. `gh pr merge --squash --delete-branch`. Só esse PR; nunca push direto na `master`.
7. Confira na Vercel (MCP `list_deployments`) que o deploy do merge ficou "Ready" (até 10 minutos) e abra `https://watchems.com/learn/<slug>` no Claude in Chrome.
8. Limpeza: `git -C <pasta principal> worktree remove .claude/worktrees/post-<slug>` (sem `--force`; se recusar, avise) e `git -C <pasta principal> pull --ff-only` só se a pasta principal estiver na `master` e limpa.

**Primeiro post publicado:** o `/learn` fica fora da busca (`noindex`) e sem link no rodapé enquanto não há post. Depois do primeiro, proponha ao dono um PR à parte com o link "Learn" no `components/Footer.tsx`; a trava do diff não deixa isso ir junto com um post.

Indexação no Search Console só se o dono pedir.
