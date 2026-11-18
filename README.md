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
├── pages/             auth/, panel/, adocao/, admin/, uma pasta por tela
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
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

Quando a API serve o site, ela já envia esses cabeçalhos.

### Vercel

O site fica na Vercel: **https://pawtinhas.vercel.app**. O `vercel.json` deste repositório faz o build com o Vite,
manda as rotas do React para o `index.html`, aplica os cabeçalhos acima e **repassa `/api` para a API no Railway**
(`https://api-production-68c6ec4d.up.railway.app`). Para o navegador, site e API ficam no mesmo domínio, e os cookies
de sessão (SameSite=Strict) funcionam.

Para publicar uma nova versão:

```bash
npx vercel deploy --prod
```

Se a API mudar de endereço, troque o destino de `/api/:caminho*` no `vercel.json`. Na API, `Frontend__Url` deve ser
o endereço do site e `ProxyReverso__Saltos` deve ser `2` (Vercel e Railway na frente dela).

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
| `medicamentos`, `racoes`, `profissionais`, `configuracoes`              | rotas com o mesmo nome                                               |
| `prescricoes`, `planosAlimentares`                                      | `/api/prescricoes`, `/api/planos-alimentares`                        |

O adaptador converte ids (texto na tela, número na API), junta data e hora em `dataHora`, envia fotos para
`/api/arquivos` antes de salvar e renomeia os campos dos erros de validação para os nomes da tela.
A edição usa `PUT` com o registro completo (ou a rota parcial de status/ativo).

Erros no formato `{ message, code, fields? }`, com `Retry-After` nas respostas 429.

## Equipe

Gustavo Silva Souza · Marcela Luiza Gonçalves Marques · Murilo Nunes Braga · Valdir Luciano Martins Souza Neto
