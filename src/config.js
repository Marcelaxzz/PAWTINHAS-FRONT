/**
 * WhatsApp da clínica, definido por VITE_WHATSAPP (somente dígitos, com DDI e DDD,
 * ex.: 5534999990000). Sem um número válido, os botões de WhatsApp não aparecem.
 */
// Padrão: o WhatsApp da clínica, (34) 99882-0471.
const whatsapp = (import.meta.env.VITE_WHATSAPP || '5534998820471').replace(/\D/g, '')
const WHATSAPP = whatsapp.length >= 12 && whatsapp.length <= 13 ? whatsapp : ''

/**
 * Link do WhatsApp da clínica (código QR). Vale enquanto o número não está em VITE_WHATSAPP: abre a
 * conversa, mas esse tipo de link não leva texto, então a página oferece a mensagem para copiar.
 */
const WHATSAPP_QR = (import.meta.env.VITE_WHATSAPP_QR ?? 'https://wa.me/qr/Q3DOO4QNN3FHO1').trim()

/** true quando o link já abre o WhatsApp com a mensagem escrita (número configurado). */
export const whatsappLevaMensagem = Boolean(WHATSAPP)

/** Link do WhatsApp com a mensagem pronta (ou o link do QR da clínica), ou null se nenhum foi configurado. */
export function whatsappLink(message) {
  if (WHATSAPP) return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`
  return WHATSAPP_QR || null
}
