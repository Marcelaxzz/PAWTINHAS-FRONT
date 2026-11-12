/* global importScripts */
/**
 * Visão computacional da medição (OpenCV.js), isolada num Web Worker.
 * O worker não enxerga a página, os cookies nem a rede: recebe pixels e devolve coordenadas.
 * Em produção ele tem uma CSP própria (veja CabecalhosSeguranca no Pawtinhas-Back), porque
 * o OpenCV.js precisa compilar WebAssembly, o que a CSP da página não permite.
 */

let cv = null

async function iniciar(url) {
  importScripts(url)
  let modulo = self.cv
  if (modulo instanceof Promise) modulo = await modulo
  if (!modulo.Mat) {
    await new Promise((pronto) => {
      modulo.onRuntimeInitialized = pronto
    })
  }
  cv = modulo
}

/** Libera as Mats do OpenCV (memória do WebAssembly não passa pelo coletor de lixo). */
function liberar(...mats) {
  mats.forEach((m) => m && !m.isDeleted() && m.delete())
}

const PROPORCAO_CARTAO = 8.56 / 5.398
const GRAU = Math.PI / 180

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** Lado longo e lado curto de um quadrilátero, pela média dos lados opostos. */
function lados(q) {
  const parA = (dist(q[0], q[1]) + dist(q[2], q[3])) / 2
  const parB = (dist(q[1], q[2]) + dist(q[3], q[0])) / 2
  return { longo: Math.max(parA, parB), curto: Math.min(parA, parB) }
}

function convexo(q) {
  let sinal = 0
  for (let i = 0; i < 4; i++) {
    const [a, b, c] = [q[i], q[(i + 1) % 4], q[(i + 2) % 4]]
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(z) < 1e-6) return false
    if (sinal === 0) sinal = Math.sign(z)
    else if (Math.sign(z) !== sinal) return false
  }
  return true
}

/** Gradiente mínimo (Sobel 3×3) para contar como borda: um degrau de uns 10 tons de cinza. */
const GRADIENTE_MINIMO = 40

/**
 * Gradiente de cor: em cada pixel, o canal (R, G ou B) com a borda mais forte.
 * Um cartão azul sobre pelo caramelo quase some em tons de cinza, mas não nas cores.
 */
function gradienteCor(gx3, gy3) {
  const n = gx3.rows * gx3.cols
  const gx = new Float32Array(n)
  const gy = new Float32Array(n)
  const ax = gx3.data32F
  const ay = gy3.data32F
  for (let p = 0; p < n; p++) {
    let melhor = -1
    for (let c = 0; c < 3; c++) {
      const i = p * 3 + c
      const m = ax[i] * ax[i] + ay[i] * ay[i]
      if (m > melhor) {
        melhor = m
        gx[p] = ax[i]
        gy[p] = ay[i]
      }
    }
  }
  return { gx, gy, w: gx3.cols, h: gx3.rows }
}

/**
 * Quanto de cada lado do quadrilátero está sobre uma borda reta de verdade (0 a 1).
 * Um ponto só conta se o gradiente for forte e apontar para fora do lado: pelo e textura
 * também têm bordas, mas em direções aleatórias. É o que separa o cartão de retas soltas.
 * Para no primeiro lado fraco (devolve null), o que deixa a busca rápida.
 */
function apoio(q, { gx, gy, w, h }) {
  const porLado = []
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const comprimento = dist(a, b)
    const nx = -(b.y - a.y) / comprimento
    const ny = (b.x - a.x) / comprimento
    const n = Math.max(8, Math.round(comprimento / 2))
    let acertos = 0
    let total = 0
    for (let k = Math.round(n * 0.08); k <= Math.round(n * 0.92); k++) {
      const px = a.x + ((b.x - a.x) * k) / n
      const py = a.y + ((b.y - a.y) * k) / n
      total++
      // Tolera 1,5 px de folga para os lados do contorno.
      for (const o of [0, -0.75, 0.75, -1.5, 1.5]) {
        const x = Math.round(px + nx * o)
        const y = Math.round(py + ny * o)
        if (x < 0 || y < 0 || x >= w || y >= h) continue
        const gxv = gx[y * w + x]
        const gyv = gy[y * w + x]
        const projecao = Math.abs(gxv * nx + gyv * ny)
        if (projecao >= GRADIENTE_MINIMO && projecao >= 0.8 * Math.hypot(gxv, gyv)) {
          acertos++
          break
        }
      }
    }
    const fracao = total ? acertos / total : 0
    if (fracao < 0.6) return null
    porLado.push(fracao)
  }
  return porLado.reduce((s, v) => s + v, 0) / 4
}

/** Nota de um candidato: lados apoiados em bordas retas, formato de cartão e tamanho. */
function nota(q, gradiente, areaImagem) {
  if (q.some((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y)) || !convexo(q)) return -1
  const { longo, curto } = lados(q)
  if (curto < 14) return -1
  const area = longo * curto
  if (area < areaImagem * 0.0015 || area > areaImagem * 0.4) return -1
  const erro = Math.abs(longo / curto - PROPORCAO_CARTAO) / PROPORCAO_CARTAO
  if (erro > 0.25) return -1
  const media = apoio(q, gradiente)
  if (media === null || media < 0.75) return -1
  // A proporção do cartão (85,6 × 54 mm) pesa mais que tudo: outros retângulos da cena
  // (celular, livro, azulejo) costumam ter bordas até mais nítidas, mas outro formato.
  return media ** 2 * Math.exp(-((erro / 0.06) ** 2)) * (area / areaImagem) ** 0.25
}

/** Candidatos por contornos fechados: rápido quando o cartão se destaca bem do fundo. */
function porContornos(binaria) {
  const contornos = new cv.MatVector()
  const hierarquia = new cv.Mat()
  const achados = []
  cv.findContours(binaria, contornos, hierarquia, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
  for (let i = 0; i < contornos.size(); i++) {
    const c = contornos.get(i)
    if (cv.contourArea(c) > 300) {
      const aprox = new cv.Mat()
      cv.approxPolyDP(c, aprox, 0.03 * cv.arcLength(c, true), true)
      if (aprox.rows === 4) {
        achados.push([0, 1, 2, 3].map((k) => ({ x: aprox.data32S[k * 2], y: aprox.data32S[k * 2 + 1] })))
      }
      aprox.delete()
    }
    c.delete()
  }
  liberar(contornos, hierarquia)
  return achados
}

function intersecao(r, s) {
  const d = (r.x1 - r.x2) * (s.y1 - s.y2) - (r.y1 - r.y2) * (s.x1 - s.x2)
  if (Math.abs(d) < 1e-9) return null
  const a = r.x1 * r.y2 - r.y1 * r.x2
  const b = s.x1 * s.y2 - s.y1 * s.x2
  return { x: (a * (s.x1 - s.x2) - (r.x1 - r.x2) * b) / d, y: (a * (s.y1 - s.y2) - (r.y1 - r.y2) * b) / d }
}

/** Distância do meio de um segmento até a reta de outro. */
function distanciaRetas(r, s) {
  const mx = (s.x1 + s.x2) / 2
  const my = (s.y1 + s.y2) / 2
  return Math.abs((r.y2 - r.y1) * mx - (r.x2 - r.x1) * my + r.x2 * r.y1 - r.y2 * r.x1) / r.len
}

/**
 * Candidatos por retas (Hough): acha o cartão mesmo quando a borda dele encosta no pelo
 * ou em outro objeto, situação em que o contorno fechado se mistura com o fundo.
 */
function porRetas(bordas, ladoImagem) {
  const linhas = new cv.Mat()
  cv.HoughLinesP(bordas, linhas, 1, GRAU, 25, Math.max(18, ladoImagem * 0.025), 6)
  const segs = []
  for (let i = 0; i < linhas.rows; i++) {
    const [x1, y1, x2, y2] = linhas.data32S.slice(i * 4, i * 4 + 4)
    const len = Math.hypot(x2 - x1, y2 - y1)
    segs.push({ x1, y1, x2, y2, len, ang: (Math.atan2(y2 - y1, x2 - x1) + Math.PI) % Math.PI })
  }
  linhas.delete()
  const top = segs.sort((a, b) => b.len - a.len).slice(0, 150)
  const diferenca = (a, b) => {
    const d = Math.abs(a - b)
    return Math.min(d, Math.PI - d)
  }

  // Pares de lados opostos: quase paralelos (a perspectiva tira um pouco do paralelismo).
  const pares = []
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      if (diferenca(top[i].ang, top[j].ang) > 12 * GRAU) continue
      const d = (distanciaRetas(top[i], top[j]) + distanciaRetas(top[j], top[i])) / 2
      if (d >= 12) pares.push({ a: top[i], b: top[j], ang: top[i].ang, d })
    }
  }

  const quads = []
  for (let i = 0; i < pares.length; i++) {
    for (let j = i + 1; j < pares.length; j++) {
      const p = pares[i]
      const r = pares[j]
      if (diferenca(p.ang, r.ang) < 60 * GRAU) continue
      const razao = Math.max(p.d, r.d) / Math.min(p.d, r.d)
      if (Math.abs(razao - PROPORCAO_CARTAO) / PROPORCAO_CARTAO > 0.3) continue
      const q = [intersecao(p.a, r.a), intersecao(p.a, r.b), intersecao(p.b, r.b), intersecao(p.b, r.a)]
      if (q.some((c) => !c)) continue
      // Os segmentos precisam cobrir boa parte dos lados que formam (senão são retas soltas).
      const perimetro = q.reduce((s, c, k) => s + dist(c, q[(k + 1) % 4]), 0)
      if (p.a.len + p.b.len + r.a.len + r.b.len >= perimetro * 0.45) quads.push(q)
    }
  }
  return quads
}

const centro = (q) => ({ x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4 })

/**
 * Encontra o cartão de referência. Junta candidatos de três leituras da imagem
 * (retas de Hough, contornos das bordas e limiar de Otsu) e confere cada um contra
 * o gradiente de cor da foto. Devolve até 5 contornos, do mais provável ao menos provável.
 */
function detectarCartao({ imagem }) {
  const src = cv.matFromImageData(imagem)
  const rgb = new cv.Mat()
  const suave = new cv.Mat()
  const cinza = new cv.Mat()
  const gx = new cv.Mat()
  const gy = new cv.Mat()
  const bordas = new cv.Mat()
  const bordasLargas = new cv.Mat()
  const limiar = new cv.Mat()
  const nucleo = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
  const areaImagem = imagem.width * imagem.height
  const lado = Math.max(imagem.width, imagem.height)

  try {
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
    cv.GaussianBlur(rgb, suave, new cv.Size(5, 5), 0)
    cv.cvtColor(suave, cinza, cv.COLOR_RGB2GRAY)
    cv.Sobel(suave, gx, cv.CV_32F, 1, 0, 3)
    cv.Sobel(suave, gy, cv.CV_32F, 0, 1, 3)
    const gradiente = gradienteCor(gx, gy)

    const avaliados = []
    const avaliar = (quads) =>
      quads.forEach((q) => {
        const n = nota(q, gradiente, areaImagem)
        if (n > 0) avaliados.push({ q, nota: n })
      })

    // Canny em cores: em cada pixel vale o canal com a borda mais forte.
    cv.Canny(suave, bordas, 40, 120)
    cv.dilate(bordas, bordasLargas, nucleo)
    avaliar([...porRetas(bordas, lado), ...porContornos(bordasLargas)])

    // Otsu separa cartão claro de fundo escuro (e o contrário).
    cv.threshold(cinza, limiar, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    avaliar(porContornos(limiar))
    cv.bitwise_not(limiar, limiar)
    avaliar(porContornos(limiar))

    avaliados.sort((a, b) => b.nota - a.nota)

    // O mesmo cartão aparece por vários caminhos: fica só o melhor de cada posição.
    const unicos = []
    for (const c of avaliados) {
      if (!unicos.some((u) => dist(centro(u.q), centro(c.q)) < lados(c.q).curto * 0.3)) unicos.push(c)
      if (unicos.length === 5) break
    }
    return { contornos: unicos.map((c) => c.q) }
  } finally {
    liberar(src, rgb, suave, cinza, gx, gy, bordas, bordasLargas, limiar, nucleo)
  }
}

/** Valor de um mapa de gradiente fora da grade de pixels (interpolação bilinear). */
function amostrar(mapa, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 2 || y > h - 2) return 0
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const i = y0 * w + x0
  return (
    mapa[i] * (1 - fx) * (1 - fy) +
    mapa[i + 1] * fx * (1 - fy) +
    mapa[i + w] * (1 - fx) * fy +
    mapa[i + w + 1] * fx * fy
  )
}

/** Reta que melhor passa pelos pontos (mínimos quadrados ortogonais): centro e direção. */
function ajustarReta(pontos) {
  const cx = pontos.reduce((s, p) => s + p.x, 0) / pontos.length
  const cy = pontos.reduce((s, p) => s + p.y, 0) / pontos.length
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of pontos) {
    sxx += (p.x - cx) ** 2
    syy += (p.y - cy) ** 2
    sxy += (p.x - cx) * (p.y - cy)
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  return { cx, cy, dx: Math.cos(ang), dy: Math.sin(ang) }
}

const distanciaReta = (r, p) => Math.abs((p.x - r.cx) * r.dy - (p.y - r.cy) * r.dx)

function cruzar(r, s) {
  const d = r.dx * s.dy - r.dy * s.dx
  if (Math.abs(d) < 1e-9) return null
  const t = ((s.cx - r.cx) * s.dy - (s.cy - r.cy) * s.dx) / d
  return { x: r.cx + r.dx * t, y: r.cy + r.dy * t }
}

/**
 * Acerta os cantos do cartão na foto em resolução cheia. Em cada lado, procura a borda
 * com precisão de subpixel em dezenas de pontos, ajusta uma reta e descarta os pontos
 * fora dela (pelo encostado, reflexo). Os cantos saem do cruzamento das retas, o que
 * é bem mais preciso que olhar só a vizinhança de cada canto.
 */
function refinarCartao({ imagem, cantos }) {
  const src = cv.matFromImageData(imagem)
  const rgb = new cv.Mat()
  const gx3 = new cv.Mat()
  const gy3 = new cv.Mat()
  try {
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
    cv.GaussianBlur(rgb, rgb, new cv.Size(3, 3), 0)
    cv.Sobel(rgb, gx3, cv.CV_32F, 1, 0, 3)
    cv.Sobel(rgb, gy3, cv.CV_32F, 0, 1, 3)
    const { gx, gy, w, h } = gradienteCor(gx3, gy3)

    const retas = []
    for (let i = 0; i < 4; i++) {
      const a = cantos[i]
      const b = cantos[(i + 1) % 4]
      const comprimento = dist(a, b)
      const nx = -(b.y - a.y) / comprimento
      const ny = (b.x - a.x) / comprimento
      const pontos = []
      for (let t = 0.1; t <= 0.9; t += 1 / comprimento) {
        const px = a.x + (b.x - a.x) * t
        const py = a.y + (b.y - a.y) * t
        let melhor = 0
        let deslocamento = 0
        for (let o = -4; o <= 4; o += 0.25) {
          const x = px + nx * o
          const y = py + ny * o
          const projecao = Math.abs(amostrar(gx, w, h, x, y) * nx + amostrar(gy, w, h, x, y) * ny)
          if (projecao > melhor) {
            melhor = projecao
            deslocamento = o
          }
        }
        if (melhor >= GRADIENTE_MINIMO) pontos.push({ x: px + nx * deslocamento, y: py + ny * deslocamento })
      }
      if (pontos.length < 10) return { cantos }

      let reta = ajustarReta(pontos)
      const residuos = pontos.map((p) => distanciaReta(reta, p)).sort((m, n) => m - n)
      const tolerancia = Math.max(0.75, 2.5 * residuos[Math.floor(residuos.length / 2)])
      const bons = pontos.filter((p) => distanciaReta(reta, p) <= tolerancia)
      if (bons.length >= 10) reta = ajustarReta(bons)
      retas.push(reta)
    }

    // O canto i fica entre o lado i-1 e o lado i.
    const refinados = retas.map((r, i) => cruzar(retas[(i + 3) % 4], r))
    const confiavel = refinados.every((c, i) => c && dist(c, cantos[i]) < 8)
    return { cantos: confiavel ? refinados : cantos }
  } finally {
    liberar(src, rgb, gx3, gy3)
  }
}

/**
 * Encaixa as duas pontas de uma medida na borda mais forte ao longo da própria linha.
 * Recebe só o recorte da foto em volta da linha (origem = canto do recorte).
 */
function encaixarBordas({ imagem, a, b }) {
  const src = cv.matFromImageData(imagem)
  const cinza = new cv.Mat()
  const gx = new cv.Mat()
  const gy = new cv.Mat()

  try {
    cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(cinza, cinza, new cv.Size(3, 3), 0)
    cv.Sobel(cinza, gx, cv.CV_32F, 1, 0, 3)
    cv.Sobel(cinza, gy, cv.CV_32F, 0, 1, 3)

    const comprimento = Math.hypot(b.x - a.x, b.y - a.y)
    const dx = (b.x - a.x) / comprimento
    const dy = (b.y - a.y) / comprimento
    const raio = Math.max(10, Math.min(60, comprimento * 0.15))
    const { width: w, height: h } = imagem

    // Gradiente na direção da linha: é a borda que a linha atravessa.
    const forca = (x, y) => {
      const xi = Math.round(x)
      const yi = Math.round(y)
      if (xi < 1 || yi < 1 || xi >= w - 1 || yi >= h - 1) return 0
      const i = yi * w + xi
      return Math.abs(gx.data32F[i] * dx + gy.data32F[i] * dy)
    }

    const ajustar = (p) => {
      const amostras = []
      for (let t = -raio; t <= raio; t += 0.5) amostras.push({ t, f: forca(p.x + dx * t, p.y + dy * t) })
      const ordenadas = amostras.map((s) => s.f).sort((m, n) => m - n)
      const mediana = ordenadas[Math.floor(ordenadas.length / 2)]
      // Leve preferência pelo ponto original, para não pular para uma borda distante.
      const melhor = amostras.reduce(
        (m, s) => {
          const nota = s.f * (1 - (0.35 * Math.abs(s.t)) / raio)
          return nota > m.nota ? { ...s, nota } : m
        },
        { t: 0, f: 0, nota: -1 },
      )
      // Sem uma borda nítida (bem acima do fundo), o ponto fica onde está.
      if (melhor.f < 40 || melhor.f < mediana * 2.5) return { ...p, movido: false }
      return { x: p.x + dx * melhor.t, y: p.y + dy * melhor.t, movido: true }
    }

    return { a: ajustar(a), b: ajustar(b) }
  } finally {
    liberar(src, cinza, gx, gy)
  }
}

const TAREFAS = { detectarCartao, refinarCartao, encaixarBordas }

self.onmessage = async ({ data }) => {
  const { id, tipo, dados } = data
  try {
    if (tipo === 'iniciar') {
      await iniciar(dados.url)
      self.postMessage({ id, ok: true })
      return
    }
    if (!cv) throw new Error('OpenCV ainda não carregou.')
    if (!Object.hasOwn(TAREFAS, tipo)) throw new Error(`Tarefa desconhecida: ${tipo}`)
    self.postMessage({ id, ok: true, resultado: TAREFAS[tipo](dados) })
  } catch (erro) {
    self.postMessage({ id, ok: false, erro: String(erro?.message ?? erro) })
  }
}
