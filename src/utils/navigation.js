/** Aceita apenas caminhos internos ("/algo"), bloqueando redirecionamentos abertos ("//site", "\\site", URLs). */
export function safeRedirect(path, fallback = '/inicio') {
  if (typeof path !== 'string') return fallback
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes(':')) return fallback
  return path
}
