import { timingSafeEqual, createHash } from 'node:crypto'
import nodemailer from 'nodemailer'

/**
 * Envio dos e-mails da API (códigos de acesso e avisos) pelo Gmail da clínica.
 *
 * O Railway bloqueia SMTP fora do plano Pro, então a API manda cada e-mail para esta função da
 * Vercel por HTTPS, e ela entrega ao Gmail com a senha de app da conta. Só aceita pedidos com o
 * token combinado (EMAIL_TOKEN, o mesmo de Email__TokenEnvio na API).
 */

const iguais = (a, b) =>
  timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest())

// Valores colados no painel às vezes chegam com quebra de linha no fim.
const env = (nome) => (process.env[nome] ?? '').trim()

let transporte = null
function gmail() {
  transporte ??= nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: env('EMAIL_USUARIO'), pass: env('EMAIL_SENHA') },
  })
  return transporte
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).send('metodo')

  const token = env('EMAIL_TOKEN')
  const d = req.body ?? {}
  if (!token || token.length < 32 || !d.token || !iguais(d.token, token)) return res.status(401).send('negado')

  const para = String(d.para ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para) || para.length > 200) return res.status(400).send('destinatario')

  try {
    await gmail().sendMail({
      from: { name: String(d.nome || 'Pawtinhas').slice(0, 80), address: env('EMAIL_USUARIO') },
      to: para,
      subject: String(d.assunto ?? '').slice(0, 200),
      text: String(d.texto ?? ''),
      html: d.html ? String(d.html) : undefined,
    })
    return res.status(200).send('ok')
  } catch (erro) {
    console.error('Falha no envio pelo Gmail:', erro.code || erro.message)
    return res.status(502).send('falha no envio')
  }
}
