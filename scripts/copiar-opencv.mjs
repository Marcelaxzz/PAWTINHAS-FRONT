// Copia o OpenCV.js para public/vendor, com endereço fixo (/vendor/opencv.js): o site e o app
// mobile (Pawtinhas-Mobile) carregam o mesmo arquivo. Roda sozinho antes do "dev" e do "build".
import fs from 'node:fs'
import path from 'node:path'

const origem = path.resolve('node_modules/@techstark/opencv-js/dist/opencv.js')
const destino = path.resolve('public/vendor/opencv.js')

fs.mkdirSync(path.dirname(destino), { recursive: true })
if (!fs.existsSync(destino) || fs.statSync(destino).size !== fs.statSync(origem).size) {
  fs.copyFileSync(origem, destino)
  console.log('OpenCV.js copiado para public/vendor/opencv.js')
}
