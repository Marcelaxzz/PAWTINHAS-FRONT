import { useEffect, useRef, useState } from 'react'
import styles from './FotoMedicao.module.css'

const ZOOM_LUPA = 3
const LADO_LUPA = 132

/**
 * Foto congelada com as marcações por cima. Só a camada ativa recebe pontos novos e pode ser
 * arrastada; as outras ficam visíveis para referência. Coordenadas sempre em pixels da foto.
 *
 * camadas: [{ id, pontos, total, cor, fechada?, rotulo? }]
 */
export function FotoMedicao({ foto, camadas, ativa, onPontos }) {
  const svgRef = useRef(null)
  const lupaRef = useRef(null)
  const [arrasto, setArrasto] = useState(null) // { camada, indice }
  const [escala, setEscala] = useState(1) // pixels da foto por pixel de tela
  const [focado, setFocado] = useState(null)

  const camadaAtiva = camadas.find((c) => c.id === ativa)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const observar = new ResizeObserver(([e]) => setEscala(foto.width / Math.max(1, e.contentRect.width)))
    observar.observe(svg)
    return () => observar.disconnect()
  }, [foto.width])

  // Lupa: desenha o entorno do ponto sendo arrastado, ampliado, com a mira no centro.
  const pontoLupa = arrasto ? camadas.find((c) => c.id === arrasto.camada)?.pontos[arrasto.indice] : null
  useEffect(() => {
    const lupa = lupaRef.current
    if (!lupa || !pontoLupa) return
    const ctx = lupa.getContext('2d')
    const origem = LADO_LUPA / ZOOM_LUPA
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#36241a'
    ctx.fillRect(0, 0, LADO_LUPA, LADO_LUPA)
    ctx.drawImage(
      foto.canvas,
      pontoLupa.x - origem / 2,
      pontoLupa.y - origem / 2,
      origem,
      origem,
      0,
      0,
      LADO_LUPA,
      LADO_LUPA,
    )
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(LADO_LUPA / 2, 0)
    ctx.lineTo(LADO_LUPA / 2, LADO_LUPA)
    ctx.moveTo(0, LADO_LUPA / 2)
    ctx.lineTo(LADO_LUPA, LADO_LUPA / 2)
    ctx.stroke()
  }, [pontoLupa, foto.canvas])

  const paraFoto = (evento) => {
    const svg = svgRef.current
    const p = svg.createSVGPoint()
    p.x = evento.clientX
    p.y = evento.clientY
    const local = p.matrixTransform(svg.getScreenCTM().inverse())
    return { x: Math.min(foto.width, Math.max(0, local.x)), y: Math.min(foto.height, Math.max(0, local.y)) }
  }

  const mover = (camadaId, indice, ponto) => {
    const camada = camadas.find((c) => c.id === camadaId)
    onPontos(
      camadaId,
      camada.pontos.map((p, i) => (i === indice ? ponto : p)),
    )
  }

  const aoPressionar = (evento) => {
    if (!camadaAtiva || evento.button > 0) return
    const alvo = evento.target.dataset
    svgRef.current.setPointerCapture(evento.pointerId)
    if (alvo.camada === ativa) {
      setArrasto({ camada: ativa, indice: Number(alvo.indice) })
      return
    }
    if (camadaAtiva.pontos.length >= camadaAtiva.total) return
    // Ponto novo já nasce em arrasto: dá para ajustar sem soltar o dedo.
    onPontos(ativa, [...camadaAtiva.pontos, paraFoto(evento)])
    setArrasto({ camada: ativa, indice: camadaAtiva.pontos.length })
  }

  const aoMover = (evento) => {
    if (arrasto) mover(arrasto.camada, arrasto.indice, paraFoto(evento))
  }

  const soltar = () => setArrasto(null)

  // Setas movem o ponto focado 1 px (com Shift, 10 px): ajuste fino sem mouse.
  const aoTeclar = (evento, camadaId, indice, ponto) => {
    const passo = evento.shiftKey ? 10 : 1
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[evento.key]
    if (!delta) return
    evento.preventDefault()
    mover(camadaId, indice, {
      x: Math.min(foto.width, Math.max(0, ponto.x + delta[0] * passo)),
      y: Math.min(foto.height, Math.max(0, ponto.y + delta[1] * passo)),
    })
  }

  const r = 9 * escala
  const traco = 2.5 * escala
  const lupaADireita = pontoLupa && pontoLupa.x < foto.width * 0.4 && pontoLupa.y < foto.height * 0.4

  return (
    <div className={styles.area}>
      <svg
        ref={svgRef}
        className={`${styles.svg} ${camadaAtiva && camadaAtiva.pontos.length < camadaAtiva.total ? styles.marcando : ''}`}
        viewBox={`0 0 ${foto.width} ${foto.height}`}
        style={{ aspectRatio: `${foto.width} / ${foto.height}` }}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        role="group"
        aria-label="Foto do paciente com as marcações da medição"
      >
        <image href={foto.url} width={foto.width} height={foto.height} />

        {camadas.map((c) => {
          const ativo = c.id === ativa
          const pts = c.pontos
          const opacidade = ativo || !ativa ? 1 : 0.55
          return (
            <g key={c.id} opacity={opacidade} style={{ color: c.cor }}>
              {c.fechada && pts.length === c.total ? (
                <polygon
                  points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="currentColor"
                  fillOpacity="0.18"
                  stroke="currentColor"
                  strokeWidth={traco}
                />
              ) : (
                pts.length > 1 && (
                  <polyline
                    points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={traco}
                    strokeDasharray={c.tracejada ? `${8 * escala} ${6 * escala}` : undefined}
                  />
                )
              )}
              {c.rotulo && pts.length === 2 && (
                <text
                  x={(pts[0].x + pts[1].x) / 2 + 12 * escala}
                  y={(pts[0].y + pts[1].y) / 2 - 10 * escala}
                  className={styles.rotulo}
                  fontSize={15 * escala}
                  strokeWidth={4 * escala}
                >
                  {c.rotulo}
                </text>
              )}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={focado === `${c.id}-${i}` ? r * 1.25 : r}
                  className={ativo ? styles.ponto : styles.pontoInativo}
                  strokeWidth={2.5 * escala}
                  data-camada={c.id}
                  data-indice={i}
                  tabIndex={ativo ? 0 : -1}
                  role="button"
                  aria-label={`${c.nome}, ponto ${i + 1}. Use as setas para ajustar.`}
                  onKeyDown={(e) => aoTeclar(e, c.id, i, p)}
                  onFocus={() => setFocado(`${c.id}-${i}`)}
                  onBlur={() => setFocado(null)}
                />
              ))}
            </g>
          )
        })}
      </svg>

      {pontoLupa && (
        <canvas
          ref={lupaRef}
          width={LADO_LUPA}
          height={LADO_LUPA}
          className={`${styles.lupa} ${lupaADireita ? styles.lupaDireita : ''}`}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
