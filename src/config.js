/**
 * WhatsApp da clínica, definido por VITE_WHATSAPP (somente dígitos, com DDI e DDD,
 * ex.: 5534999990000). Sem um número válido, os botões de WhatsApp não aparecem.
 */
const whatsapp = (import.meta.env.VITE_WHATSAPP ?? '').replace(/\D/g, '')
const WHATSAPP = whatsapp.length >= 12 && whatsapp.length <= 13 ? whatsapp : ''

/** Link do WhatsApp com a mensagem pronta, ou null se o número não foi configurado. */
export function whatsappLink(message) {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}` : null
}
