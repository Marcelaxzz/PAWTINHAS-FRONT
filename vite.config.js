import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Cabeçalhos de segurança aplicados no servidor de desenvolvimento e no preview.
// Em produção, replique-os no servidor (Nginx, Vercel etc.). Veja o README.
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

function buildCsp(apiUrl) {
  let apiOrigin
  try {
    // URL relativa ("/api") já é coberta por 'self'.
    apiOrigin = apiUrl && /^https?:/.test(apiUrl) ? new URL(apiUrl).origin : ''
  } catch {
    apiOrigin = ''
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

// Injeta a Content-Security-Policy somente no build: o servidor de
// desenvolvimento do Vite precisa de scripts inline para o HMR.
function cspPlugin(apiUrl) {
  return {
    name: 'pawtinhas-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<!-- csp -->', `<meta http-equiv="Content-Security-Policy" content="${buildCsp(apiUrl)}" />`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), cspPlugin(env.VITE_API_URL)],
    server: {
      headers: securityHeaders,
      // "npm run dev:celular": https com o certificado local, para a câmera de realidade aumentada.
      https: process.env.PAWTINHAS_HTTPS
        ? { key: fs.readFileSync('certificados/chave.pem'), cert: fs.readFileSync('certificados/certificado.pem') }
        : undefined,
      // Em desenvolvimento a API (Pawtinhas-Back) fica atrás do mesmo endereço do site,
      // então os cookies de sessão são de primeira parte e não há CORS.
      proxy: { '/api': { target: env.VITE_API_PROXY || 'http://localhost:5135', changeOrigin: false } },
    },
    preview: { headers: securityHeaders },
    build: {
      sourcemap: false,
      // Evita data: URIs para manter a CSP restrita.
      assetsInlineLimit: 0,
    },
  }
})
