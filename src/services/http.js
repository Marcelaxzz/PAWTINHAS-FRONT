export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const TIMEOUT_MS = 15000
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'erro_desconhecido', retryAfter = null, fields = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.fields = fields
  }
}

const GENERIC_MESSAGES = {
  0: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  400: 'Confira os dados informados e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Recurso não encontrado.',
  408: 'O servidor demorou para responder. Tente novamente.',
  429: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  500: 'Algo deu errado do nosso lado. Tente novamente em instantes.',
}

function readCookie(name) {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

function messageFor(status, serverMessage) {
  // Mensagens do servidor só são exibidas para erros de validação/regra (4xx),
  // nunca para 5xx, para não vazar detalhes internos.
  if (status >= 400 && status < 500 && typeof serverMessage === 'string' && serverMessage.length <= 200) {
    return serverMessage
  }
  return GENERIC_MESSAGES[status] ?? GENERIC_MESSAGES[status >= 500 ? 500 : 400]
}

// Rotas de autenticação nunca disparam a renovação automática (evita laço).
const NO_REFRESH = /^\/auth\/(login|code|password|refresh|logout)/

/** Disparado quando a sessão não pode mais ser renovada (o AuthContext volta ao login). */
export const SESSION_EXPIRED_EVENT = 'pawtinhas:sessao-expirada'

let refreshing = null

/** Renova a sessão uma única vez, mesmo que várias requisições recebam 401 ao mesmo tempo. */
function refreshSession() {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/**
 * Requisição JSON para a API.
 * A sessão trafega em cookies httpOnly definidos pelo servidor, então nenhum token
 * fica acessível ao JavaScript. O token de acesso dura poucos minutos: quando expira,
 * a sessão é renovada e a requisição repetida uma vez.
 */
export async function request(path, options = {}) {
  try {
    return await send(path, options)
  } catch (error) {
    if (error.status !== 401 || NO_REFRESH.test(path)) throw error
    if (!(await refreshSession())) {
      if (path !== '/auth/me') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      throw error
    }
    return send(path, options)
  }
}

/** Nome do arquivo no Content-Disposition (filename*=UTF-8'' tem prioridade, por causa dos acentos). */
function nomeDoArquivo(disposicao, padrao = 'arquivo') {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposicao ?? '')
  if (utf8) return decodeURIComponent(utf8[1])
  const simples = /filename="?([^";]+)"?/i.exec(disposicao ?? '')
  return simples ? simples[1] : padrao
}

/** arquivo: true devolve { conteudo (ArrayBuffer), nome, tipo } (PDF dos relatórios). */
async function send(path, { method = 'GET', body, signal, arquivo = false } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true })

  const headers = {
    Accept: arquivo ? 'application/pdf, application/json' : 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  // FormData (envio de foto) define o próprio Content-Type, com o boundary do multipart.
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (UNSAFE_METHODS.has(method)) {
    const csrf = readCookie('XSRF-TOKEN')
    if (csrf) headers['X-XSRF-TOKEN'] = csrf
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: controller.signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    const status = controller.signal.aborted ? 408 : 0
    throw new ApiError(GENERIC_MESSAGES[status], { status, code: status ? 'timeout' : 'rede' })
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 204) return null

  if (arquivo && response.ok) {
    return {
      conteudo: await response.arrayBuffer(),
      nome: nomeDoArquivo(response.headers.get('content-disposition')),
      tipo: response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const retryAfterHeader = Number(response.headers.get('Retry-After'))
    throw new ApiError(messageFor(response.status, data?.message), {
      status: response.status,
      code: typeof data?.code === 'string' ? data.code : 'erro_http',
      retryAfter: Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : null,
      fields: data?.fields && typeof data.fields === 'object' ? data.fields : null,
    })
  }

  return data
}
