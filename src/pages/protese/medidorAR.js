/**
 * Medidor com realidade aumentada (WebXR), no estilo do app Medida do iPhone: a mira fica no centro
 * da tela, o celular acha a superfície embaixo dela e cada toque marca uma ponta. A distância sai em
 * centímetros reais, sem cartão nem régua, porque o próprio celular calcula a escala pelos sensores.
 *
 * Funciona no Chrome do Android com ARCore (Google Play Services para AR) e precisa de HTTPS.
 * Nada é desenhado em 3D: os pontos são projetados na tela e a interface é HTML (dom-overlay).
 */

/** O aparelho e o navegador conseguem abrir a câmera com realidade aumentada? */
export async function arDisponivel() {
  if (typeof window === 'undefined' || !window.isSecureContext || !navigator.xr?.isSessionSupported) return false
  try {
    return await navigator.xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

const copiar = (p) => ({ x: p.x, y: p.y, z: p.z })
const distanciaCm = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) * 100

/** Posição de um ponto 3D (espaço "local") na tela, em pixels; null se estiver atrás da câmera. */
function projetar(ponto, vista, largura, altura) {
  const v = vista.transform.inverse.matrix
  const p = vista.projectionMatrix
  const x = ponto.x
  const y = ponto.y
  const z = ponto.z
  // Matrizes em ordem de coluna (WebGL): primeiro a câmera (v), depois a projeção (p).
  const cx = v[0] * x + v[4] * y + v[8] * z + v[12]
  const cy = v[1] * x + v[5] * y + v[9] * z + v[13]
  const cz = v[2] * x + v[6] * y + v[10] * z + v[14]
  const px = p[0] * cx + p[4] * cy + p[8] * cz + p[12]
  const py = p[1] * cx + p[5] * cy + p[9] * cz + p[13]
  const pw = p[3] * cx + p[7] * cy + p[11] * cz + p[15]
  if (pw <= 0) return null
  return { x: ((px / pw + 1) / 2) * largura, y: ((1 - py / pw) / 2) * altura }
}

/**
 * Abre a câmera em realidade aumentada. Precisa ser chamado direto de um toque do usuário.
 * raiz: elemento HTML que vira a interface por cima da câmera.
 * aoQuadro({ mira, distancia, inicioTela, centro }): chamado a cada quadro (mira = achou superfície).
 * aoFechar(): chamado quando a sessão termina (pelo botão, pelo "voltar" do Android ou por erro).
 */
export async function abrirMedidor(raiz, { aoQuadro, aoFechar }) {
  const sessao = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: raiz },
  })

  let fonte = null
  let encerrada = false
  let atual = null // ponto embaixo da mira
  let inicio = null // primeira ponta marcada

  sessao.addEventListener('end', () => {
    encerrada = true
    fonte?.cancel()
    aoFechar()
  })

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl', { xrCompatible: true, alpha: true })
    await sessao.updateRenderState({ baseLayer: new XRWebGLLayer(sessao, gl) })
    const espaco = await sessao.requestReferenceSpace('local')
    const olhar = await sessao.requestReferenceSpace('viewer')
    // "point" usa os pontos de textura do ARCore (pelo, pele), não só superfícies planas.
    try {
      fonte = await sessao.requestHitTestSource({ space: olhar, entityTypes: ['point', 'plane'] })
    } catch {
      fonte = await sessao.requestHitTestSource({ space: olhar })
    }

    const quadro = (_tempo, frame) => {
      if (encerrada) return
      sessao.requestAnimationFrame(quadro)
      const camada = sessao.renderState.baseLayer
      gl.bindFramebuffer(gl.FRAMEBUFFER, camada.framebuffer)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const resultados = frame.getHitTestResults(fonte)
      const pose = resultados[0]?.getPose(espaco)
      atual = pose ? copiar(pose.transform.position) : null

      let inicioTela = null
      const vista = frame.getViewerPose(espaco)?.views[0]
      if (inicio && vista) inicioTela = projetar(inicio, vista, raiz.clientWidth, raiz.clientHeight)
      aoQuadro({
        mira: Boolean(atual),
        distancia: inicio && atual ? distanciaCm(inicio, atual) : null,
        inicioTela,
        centro: { x: raiz.clientWidth / 2, y: raiz.clientHeight / 2 },
      })
    }
    sessao.requestAnimationFrame(quadro)
  } catch (erro) {
    sessao.end().catch(() => {})
    throw erro
  }

  return {
    /** Marca uma ponta. Devolve null (sem superfície), { tipo: 'inicio' } ou { tipo: 'fim', cm }. */
    marcar() {
      if (!atual) return null
      if (!inicio) {
        inicio = { ...atual }
        return { tipo: 'inicio' }
      }
      const cm = distanciaCm(inicio, atual)
      inicio = null
      return { tipo: 'fim', cm }
    },
    /** Solta a primeira ponta marcada. */
    desfazer() {
      inicio = null
    },
    fechar() {
      if (!encerrada) sessao.end().catch(() => {})
    },
  }
}
