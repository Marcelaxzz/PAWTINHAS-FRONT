# Pawtinhas Front-end

Interface web do **Pawtinhas**, plataforma de gestão veterinária e adoção responsável da
Dra. Carolina Gonçalves (Projeto Integrador V, Sistemas de Informação, UNIPAM).

Feito com **React 19 + Vite**, React Router e CSS Modules (um `.module.css` por componente).
As fontes (Lexend e Fraunces) são instaladas pelo npm e servidas pelo próprio app.

O app para celular (**Pawtinhas-Mobile**, Expo) reaproveita os módulos deste site que não dependem do navegador:

- contratos da API e validações;
- agenda e geometria da medição;
- gerador do STL, formulários, ícones e imagens.

Ao mudar algo aqui, rode `npm run sincronizar` no app (o `npm start` dele já faz isso). Veja o README do Pawtinhas-Mobile.

## Como rodar

O site consome a API do **Pawtinhas-Back** (C# / .NET + MySQL, base da equipe). Configure e suba a API primeiro,
seguindo o README dela (banco, chave do JWT, senha de app do Gmail e a conta da veterinária).

```bash
npm install
npm run dev        # http://localhost:5173 (o Vite repassa /api para a API em http://localhost:5135)
```

| Comando           | O que faz                            |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Servidor de desenvolvimento          |
| `npm run build`   | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve o build localmente             |
| `npm run lint`    | Analisa o código com ESLint          |
| `npm run format`  | Formata o código com Prettier        |

### Acesso

Existe um único login: **carolpawtinhas@gmail.com**, criado pelo comando `usuario` da API. Outro e-mail não entra.

1. e-mail + senha;
2. código de 6 dígitos enviado por **pawtinhas04@gmail.com** para o e-mail da veterinária;
3. sessão aberta (JWT em cookie `httpOnly`, renovada automaticamente enquanto o painel estiver em uso).

A área de adoção é pública e não exige conta. Para trocar a senha, use "Esqueceu a senha?" na tela de login.

Variáveis em `.env.local` (veja `.env.example`): `VITE_API_URL` (padrão `/api`), `VITE_API_PROXY` e `VITE_WHATSAPP`
(sem um número válido, os botões de WhatsApp da área de adoção ficam ocultos).

### Medição para prótese 3D

A medição é feita sobre uma foto do membro com um **cartão de tamanho padrão** (85,60 × 53,98 mm, o de banco ou
plano de saúde) encostado nele. A visão computacional roda no navegador com **OpenCV.js** (`@techstark/opencv-js`):

1. **Acha o cartão:** bordas de Canny em cores, retas de Hough e contornos. Cada quadrilátero candidato é conferido
   contra o gradiente da foto: um lado só conta se tiver borda forte na direção certa, o que descarta o pelo.
   Os candidatos saem em ordem e a tela deixa trocar de contorno ou marcar os 4 cantos à mão.
2. **Acerta os cantos:** na foto inteira, ajusta uma reta a cada lado (borda em subpixel, pontos fora descartados)
   e cruza as retas.
3. **Corrige a perspectiva:** uma homografia leva a foto para o plano do cartão, em centímetros
   (`visao/geometria.js`). A distância entre os dois pontos de cada medida sai direto em cm.
4. **Encaixa nas bordas:** opcional, leva as pontas da medida até a borda mais nítida ao longo da linha.

Sem cartão, dá para usar uma régua ou fita aparecendo na foto (dois pontos e a distância entre eles). Cada leitura
entra numa tabela; a ficha recebe a média, o membro medido, o método e o número de leituras. Leituras que variam
mais de 0,5 cm (ou 5%) geram aviso.

Em teste com foto sintética (cartão em perspectiva, medidas conhecidas), a medição deu 22,0 / 15,0 / 5,0 cm para
22 / 15 / 5 cm reais. A foto não sai do navegador: só os números vão para a API.

O OpenCV.js roda num **Web Worker** isolado (`visao/visao-worker.js`), sem acesso à página, aos cookies ou à rede.
O arquivo do OpenCV é servido num endereço fixo, `/vendor/opencv.js`, copiado de `node_modules` por
`scripts/copiar-opencv.mjs` antes do `dev` e do `build`. O app mobile carrega o mesmo arquivo.
Ele precisa compilar WebAssembly, então o arquivo do worker recebe uma CSP própria (veja Produção); a página
continua com a CSP restrita, sem `unsafe-eval`.

O navegador só libera a câmera em `https` ou em `localhost`. Pelo endereço da rede local (`http://192.168...`) a
câmera fica bloqueada; nesse caso use **Enviar foto** com uma foto tirada no celular.

### Modelo para impressão 3D

Em `/protese-3d/modelo` a medição salva vira uma prótese paramétrica (`impressao/modeloProtese.js`), de baixo para
cima:

| Peça                  | Dimensão                                                                                |
| --------------------- | --------------------------------------------------------------------------------------- |
| Base (apoio no chão)  | diâmetro = largura da pata, 8 mm de altura                                              |
| Haste                 | diâmetro = 30% do diâmetro externo do soquete (mínimo 12 mm)                            |
| Cone de 45°           | liga a haste ao soquete e dispensa suporte na impressão                                 |
| Soquete (copo aberto) | diâmetro interno = largura no encaixe + folga; o fundo fica na altura medida até o chão |

Folga, parede (mínimo 1,2 mm), profundidade do soquete (padrão 1,2 × o diâmetro) e material (PLA, PETG ou TPU)
são ajustáveis. A tela mostra a peça em 3D (arraste para inclinar, `impressao/vista3d.js`) ou em corte com as cotas.
Ela também mostra a massa e os metros de filamento de 1,75 mm, pela densidade da ficha técnica do material.

**Baixar arquivo STL** gera um STL binário com 1.440 triângulos, em milímetros, com z = 0 no chão. As 4 peças são
sólidos fechados com normais para fora (conferido com trimesh), e o fatiador une as partes sobrepostas.

Para imprimir:

1. Abra o arquivo no fatiador (PrusaSlicer, Cura, Bambu Studio...).
2. Deixe a peça de pé, com a base no prato.
3. Escolha preenchimento e material, fatie e envie o G-code para a impressora.

Confira o encaixe no animal antes do uso definitivo.

## Rotas

**Públicas**

| Rota                                                | Tela                                     |
| --------------------------------------------------- | ---------------------------------------- |
| `/`                                                 | Boas-vindas                              |
| `/login` e `/login/verificacao`                     | Entrar + código enviado por e-mail       |
| `/redefinir-senha` e `/redefinir-senha/verificacao` | Redefinir senha + verificação            |
| `/adocao`                                           | Catálogo de adoção (destaques e filtros) |
| `/adocao/:id`                                       | Detalhes do animal + WhatsApp            |
| `/favoritos`                                        | Meus favoritos                           |
| `/como-adotar`                                      | Como adotar                              |
| `/sobre`                                            | Sobre nós                                |

**Painel da veterinária** (exige login)

| Rota                                                 | Tela                                   |
| ---------------------------------------------------- | -------------------------------------- |
| `/inicio`                                            | Início                                 |
| `/agenda`                                            | Horários do Dia                        |
| `/agenda/consultas-vacinas`                          | Consultas & Vacinas                    |
| `/agenda/consultas/nova`, `/agenda/vacinas/nova`     | Nova Consulta / Nova Vacina            |
| `/agenda/cirurgias`, `/agenda/cirurgias/nova`        | Cirurgias do Dia / Nova Cirurgia       |
| `/agenda/banho-tosa`, `/agenda/banho-tosa/novo`      | Banho & Tosa / Novo agendamento        |
| `/agenda/pet-sitter`, `/agenda/pet-sitter/nova`      | Visitas Pet Sitter / Nova Visita       |
| `/agenda/emergencias`, `/agenda/emergencias/nova`    | Emergências / Nova Emergência          |
| `/alarmes`, `/alarmes/novo`, `/alarmes/:id/editar`   | Alarmes IoT (ESP32)                    |
| `/pacientes`, `/pacientes/novo`                      | Pacientes / Novo paciente              |
| `/pacientes/tutores`                                 | Tutores (editar contatos e excluir)    |
| `/pacientes/:id`, `/pacientes/:id/editar`            | Ficha do paciente (com histórico)      |
| `/configuracoes`                                     | Configurações                          |
| `/calculadoras/dose`, `/calculadoras/racao`          | Dose de medicamento e cálculo de ração |
| `/calculadoras/medicamentos`, `/calculadoras/racoes` | Catálogos usados pelas calculadoras    |
| `/protese-3d`, `/protese-3d/medicao`                 | Câmera e medição para prótese 3D       |
| `/protese-3d/modelo`                                 | Modelo para impressão 3D (arquivo STL) |
| `/protese-3d/como-funciona`, `/protese-3d/suporte`   | Como funciona / Suporte                |
| `/admin/adocoes`                                     | Gerenciamento de adoções               |
| `/admin/adocoes/novo`                                | Cadastrar novo animal                  |
| `/admin/adocoes/:id/editar`                          | Editar animal (modal)                  |

Os botões "Detalhes", "Ver Relatório", "Ver Painel", "Ver Histórico" e "Ver Detalhes do Dia"
abrem janelas com os dados reais: troca de status, edição, exclusão com confirmação, relatórios e linha do tempo.
Cada agendamento pode ser editado em `/agenda/{tipo}/:id/editar`.

As calculadoras recalculam no servidor enquanto você digita e salvam a prescrição ou o plano alimentar na ficha
do paciente (veja as fórmulas no README do Pawtinhas-Back).

## Estrutura

```
src/
├── assets/            Logo e ilustrações (WebP); as fotos dos pets vêm da API
├── components/        Componentes reutilizáveis (ui/, campos, ícones, cabeçalho, formulário genérico…)
├── context/           Sessão (AuthProvider) e avisos (ToastProvider)
├── hooks/             useAuth, useCollections, useClinic, useFavorites, useToast…
├── layouts/           Acesso (Auth), Painel, Adoção e estrutura padrão das páginas (Page)
├── pages/             auth/, panel/, protese/, adocao/, admin/, uma pasta por tela
├── routes/            PrivateRoute e GuestRoute
├── services/          Cliente HTTP (CSRF + renovação de sessão), autenticação e CRUD de dados
├── styles/global.css  Paleta, fontes e reset
└── utils/             Validações, datas, máscaras, imagens, agenda, adoção
```

## Segurança

- **Sessão em cookie `httpOnly`** definido pelo servidor: nenhum token no JavaScript. O JWT dura 15 min e,
  quando expira, o cliente renova a sessão uma única vez (mesmo com várias requisições simultâneas) e repete a chamada.
- **Login em duas etapas:** senha + código de 6 dígitos enviado por e-mail.
- **CSRF:** o cliente envia o cookie `XSRF-TOKEN` no cabeçalho `X-XSRF-TOKEN` em requisições que alteram dados.
- **Controle de acesso:** o painel e o admin exigem a sessão da veterinária. A checagem no front é só de
  interface; a API valida o token e o papel em cada requisição.
- **Lista de campos permitidos por recurso** (`services/resources.js`): propriedades inesperadas são descartadas antes de salvar.
- **Uploads de imagem validados:** tipo, tamanho (5 MB) e assinatura binária do arquivo; a imagem é
  re-codificada (remove metadados EXIF). Links de imagem só são aceitos com `https://`; fotos enviadas ficam na API (`/api/arquivos/…`).
- **Câmera** usada só durante a medição e desligada ao capturar ou sair da tela; a foto fica só na memória da aba.
- **OpenCV isolado** num Web Worker com CSP própria e `connect-src 'none'`: recebe pixels, devolve coordenadas.
- **Sem enumeração de usuários** no login e na redefinição de senha.
- **Política de senha forte** e `autocomplete` corretos para gerenciadores de senha.
- **Content-Security-Policy** restritiva no build (sem scripts inline nem origens externas),
  `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy` no dev/preview.
- **Redirecionamento seguro** após o login, links externos com `rel="noopener noreferrer"` e
  nenhum `dangerouslySetInnerHTML`/`eval`.

### Produção

O jeito mais simples é a própria API servir o site: copie o conteúdo de `dist/` para
`Pawtinhas-Back/src/Pawtinhas.Api/wwwroot/`. Assim site e API ficam no mesmo domínio (cookies de primeira parte, sem CORS).
Se hospedar o `dist/` em outro servidor, redirecione todas as rotas para `index.html`, repasse `/api` para a API e
configure os cabeçalhos:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()
```

E, **só** para os arquivos `assets/visao-worker-*.js` (o worker da medição):

```
Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'none'
```

Quando a API serve o site, ela já envia esses cabeçalhos.

### Railway

O `Dockerfile` deste repositório monta o site e o entrega pelo Caddy (`Caddyfile`). O Caddy aplica os cabeçalhos acima, manda as rotas do React para o `index.html` e repassa `/api` para a API pela rede interna do Railway. Assim, site e API ficam no mesmo domínio.

1. Suba primeiro o MySQL e a API (seção "Publicar no Railway" do README do Back).
2. _New_ > _GitHub Repo_ > `PAWTINHAS-FRONT`. Em _Variables_:

   | Variável        | Valor                                                                                                          |
   | --------------- | -------------------------------------------------------------------------------------------------------------- |
   | `API_INTERNA`   | `http://${{PAWTINHAS-BACK.RAILWAY_PRIVATE_DOMAIN}}:8080` (troque `PAWTINHAS-BACK` pelo nome do serviço da API) |
   | `VITE_WHATSAPP` | WhatsApp da clínica, só dígitos (opcional)                                                                     |
   | `PORT`          | `8080`                                                                                                         |

3. Em _Settings_ > _Networking_, gere o domínio público, com a porta **8080**. É esse endereço que vai em `Frontend__Url` na API e em `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SITE_URL` no app.

A medição da prótese pela câmera precisa de https, e o domínio do Railway já tem.

## API consumida

**Autenticação** (`/api/auth`)

| Método | Rota               | Corpo                                | Resposta                       |
| ------ | ------------------ | ------------------------------------ | ------------------------------ |
| POST   | `/login`           | `{ identifier, password, remember }` | `{ challengeId, resendIn }`    |
| POST   | `/login/verify`    | `{ challengeId, code }`              | `{ user }` + cookies de sessão |
| POST   | `/code/resend`     | `{ challengeId }`                    | `{ resendIn }`                 |
| POST   | `/password/forgot` | `{ email, password }`                | `{ challengeId, resendIn }`    |
| POST   | `/password/verify` | `{ challengeId, code }`              | `{ ok: true }`                 |
| POST   | `/refresh`         | -                                    | `{ user }` + cookies novos     |
| GET    | `/me`              | -                                    | `{ user }` ou 401              |
| POST   | `/logout`          | -                                    | `{ ok: true }`                 |

`user = { id, name, email, role }`, com `role` = `veterinaria`.

**Dados**: as telas usam nomes do dia a dia (`pets`, `tutores`, `consultas`...) e `src/services/adaptadores.js`
traduz cada um para os contratos da API da equipe:

| Tela                                                                    | Rota da API                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pets`                                                                  | `/api/animals` (pacientes)                                           |
| `tutores`                                                               | `/api/responsaveis`                                                  |
| `consultas`, `vacinas`, `cirurgias`, `banhos`, `visitas`, `emergencias` | `/api/eventos?tipo=...` (status em `PATCH /api/eventos/{id}/status`) |
| `animais` (adoção)                                                      | `/api/adocao` (listagem e detalhe públicos)                          |
| `alarmes`, `historicoAlarmes`                                           | `/api/alarmes`, `/api/alarmes/historico`                             |
| `medicoes`, `medicamentos`, `racoes`, `profissionais`, `configuracoes`  | rotas com o mesmo nome                                               |
| `prescricoes`, `planosAlimentares`                                      | `/api/prescricoes`, `/api/planos-alimentares`                        |

O adaptador converte ids (texto na tela, número na API), junta data e hora em `dataHora`, envia fotos para
`/api/arquivos` antes de salvar e renomeia os campos dos erros de validação para os nomes da tela.
A edição usa `PUT` com o registro completo (ou a rota parcial de status/ativo).

Erros no formato `{ message, code, fields? }`, com `Retry-After` nas respostas 429.

## Equipe

Gustavo Silva Souza · Marcela Luiza Gonçalves Marques · Murilo Nunes Braga · Valdir Luciano Martins Souza Neto
