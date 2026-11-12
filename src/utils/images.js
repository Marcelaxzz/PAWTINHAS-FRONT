import { API_URL } from '../services/http.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i

/**
 * Só aceita imagens de origens seguras: data URL de PNG/JPEG/WebP ou link https.
 * Qualquer outra coisa (javascript:, http:, svg com script…) é descartada.
 */
export function safeImageSrc(value) {
  if (typeof value !== 'string') return null
  if (DATA_URL_RE.test(value)) return value
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

// Fotos enviadas ficam no servidor: "/api/arquivos/<32 hex>.<ext>".
const API_FILE_RE = /^\/api\/arquivos\/[a-f0-9]{32}\.(jpg|png|webp)$/

/** Resolve a foto de um registro: arquivo salvo na API, data URL de upload ou link https. */
export function photoSrc(value) {
  if (typeof value !== 'string' || !value) return null
  if (API_FILE_RE.test(value)) return new URL(value, new URL(API_URL, window.location.origin)).href
  return safeImageSrc(value)
}

export function isHttpsImageUrl(value) {
  if (!value.trim()) return true
  return safeImageSrc(value.trim())?.startsWith('https://') ?? false
}

async function hasImageSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  return isPng || isJpeg || isWebp
}

/** Valida tipo, tamanho e assinatura binária do arquivo antes de aceitá-lo. */
export async function readImageFile(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!file) throw new Error('Selecione uma imagem.')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Envie uma imagem PNG, JPG ou WebP.')
  if (file.size > maxBytes) throw new Error(`A imagem deve ter até ${Math.round(maxBytes / 1024 / 1024)}MB.`)
  if (!(await hasImageSignature(file))) throw new Error('O arquivo não parece ser uma imagem válida.')

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
  return downscale(dataUrl)
}

/** Reduz a imagem para no máximo 960px, re-codificando o arquivo (descarta metadados EXIF). */
function downscale(dataUrl, maxSide = 960) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('O arquivo não parece ser uma imagem válida.'))
    img.src = dataUrl
  })
}
