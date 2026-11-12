// Abre o site em https na rede local (porta 5174), para medir a prótese com a câmera do celular.
// A realidade aumentada do Chrome (WebXR) só funciona em https. Na primeira vez, gera um
// certificado próprio em certificados/ (fora do git). O celular mostra um aviso de "não seguro":
// toque em "Avançado" > "Continuar" uma vez.
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PORTA = 5174
const pasta = path.resolve('certificados')
const chave = path.join(pasta, 'chave.pem')
const certificado = path.join(pasta, 'certificado.pem')

const ipsDaRede = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address)

function acharOpenssl() {
  const candidatos = [
    'openssl',
    'C:/Program Files/Git/usr/bin/openssl.exe',
    'C:/Program Files/Git/mingw64/bin/openssl.exe',
  ]
  for (const c of candidatos) {
    try {
      execFileSync(c, ['version'], { stdio: 'ignore' })
      return c
    } catch {
      // tenta o próximo
    }
  }
  return null
}

// Gera de novo se faltar o certificado ou se o IP do computador mudou.
const marcador = path.join(pasta, 'ips.txt')
const ipsSalvos = fs.existsSync(marcador) ? fs.readFileSync(marcador, 'utf8') : ''
if (!fs.existsSync(certificado) || !fs.existsSync(chave) || ipsSalvos !== ipsDaRede.join(',')) {
  const openssl = acharOpenssl()
  if (!openssl) {
    console.error('Não achei o openssl. Instale o Git para Windows (ele já traz o openssl) e rode de novo.')
    process.exit(1)
  }
  fs.mkdirSync(pasta, { recursive: true })
  const nomes = ['DNS:localhost', 'IP:127.0.0.1', ...ipsDaRede.map((ip) => `IP:${ip}`)].join(',')
  execFileSync(
    openssl,
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '825',
      '-keyout',
      chave,
      '-out',
      certificado,
      '-subj',
      '/CN=Pawtinhas (desenvolvimento)',
      '-addext',
      `subjectAltName=${nomes}`,
    ],
    { stdio: 'ignore' },
  )
  fs.writeFileSync(marcador, ipsDaRede.join(','))
  console.log('Certificado local criado em certificados/.')
}

console.log('\nNo celular (mesmo Wi-Fi), abra no Chrome:')
for (const ip of ipsDaRede) console.log(`  https://${ip}:${PORTA}/protese-3d`)
console.log('')

const vite = spawn('npx', ['vite', '--host', '--port', String(PORTA), '--strictPort'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PAWTINHAS_HTTPS: '1' },
})
vite.on('exit', (codigo) => process.exit(codigo ?? 0))
