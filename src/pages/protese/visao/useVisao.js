import { useCallback, useEffect, useRef, useState } from 'react'

/** OpenCV.js com endereço fixo (copiado por scripts/copiar-opencv.mjs); o app mobile usa o mesmo arquivo. */
const OPENCV_URL = '/vendor/opencv.js'

/** Lado maior da imagem enviada para a detecção do cartão (mais que isso só deixa lento). */
const LADO_DETECCAO = 1000

/**
 * Sobe o worker do OpenCV e expõe as duas operações da medição. As operações esperam o
 * carregamento terminar, então podem ser chamadas logo que a foto chega.
 * estado: 'carregando' | 'pronto' | 'erro'. Com erro, a medição continua à mão.
 */
export function useVisao() {
  const worker = useRef(null)
  const pendentes = useRef(new Map())
  const proximoId = useRef(1)
  const pronto = useRef(null) // promessa resolvida quando o OpenCV termina de carregar
  const [estado, setEstado] = useState('carregando')

  const chamar = useCallback((tipo, dados, transferir = []) => {
    if (!worker.current) return Promise.reject(new Error('Visão computacional indisponível.'))
    const id = proximoId.current++
    return new Promise((resolve, reject) => {
      pendentes.current.set(id, { resolve, reject })
      worker.current.postMessage({ id, tipo, dados }, transferir)
    })
  }, [])

  useEffect(() => {
    const w = new Worker(new URL('./visao-worker.js', import.meta.url), { name: 'visao-worker' })
    const mapa = pendentes.current
    worker.current = w
    w.onmessage = ({ data }) => {
      const pendente = mapa.get(data.id)
      if (!pendente) return
      mapa.delete(data.id)
      if (data.ok) pendente.resolve(data.resultado)
      else pendente.reject(new Error(data.erro))
    }
    w.onerror = () => {
      setEstado('erro')
      mapa.forEach(({ reject }) => reject(new Error('A análise da foto falhou.')))
      mapa.clear()
    }

    pronto.current = chamar('iniciar', { url: new URL(OPENCV_URL, location.href).href })
    pronto.current.then(
      () => setEstado('pronto'),
      () => setEstado('erro'),
    )

    return () => {
      w.terminate()
      worker.current = null
      mapa.forEach(({ reject }) => reject(new Error('Medição encerrada.')))
      mapa.clear()
    }
  }, [chamar])

  /** Procura o cartão de referência na foto inteira. Devolve os contornos prováveis (4 cantos, px da foto). */
  const detectarCartao = useCallback(
    async (foto) => {
      const fator = Math.min(1, LADO_DETECCAO / Math.max(foto.width, foto.height))
      const reduzida = document.createElement('canvas')
      reduzida.width = Math.round(foto.width * fator)
      reduzida.height = Math.round(foto.height * fator)
      const ctx = reduzida.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(foto, 0, 0, reduzida.width, reduzida.height)
      const imagem = ctx.getImageData(0, 0, reduzida.width, reduzida.height)

      await pronto.current
      const { contornos } = await chamar('detectarCartao', { imagem }, [imagem.data.buffer])

      // A busca roda na foto reduzida; o acerto fino dos cantos, na foto inteira.
      const original = foto.getContext('2d', { willReadFrequently: true })
      const refinados = []
      for (const q of contornos) {
        const cantos = q.map((p) => ({ x: p.x / fator, y: p.y / fator }))
        const x0 = Math.max(0, Math.floor(Math.min(...cantos.map((c) => c.x)) - 16))
        const y0 = Math.max(0, Math.floor(Math.min(...cantos.map((c) => c.y)) - 16))
        const x1 = Math.min(foto.width, Math.ceil(Math.max(...cantos.map((c) => c.x)) + 16))
        const y1 = Math.min(foto.height, Math.ceil(Math.max(...cantos.map((c) => c.y)) + 16))
        const recorte = original.getImageData(x0, y0, x1 - x0, y1 - y0)
        const r = await chamar(
          'refinarCartao',
          { imagem: recorte, cantos: cantos.map((c) => ({ x: c.x - x0, y: c.y - y0 })) },
          [recorte.data.buffer],
        )
        refinados.push(r.cantos.map((c) => ({ x: c.x + x0, y: c.y + y0 })))
      }
      return refinados
    },
    [chamar],
  )

  /** Leva as pontas de uma medida até a borda mais nítida ao longo da linha. */
  const encaixarBordas = useCallback(
    async (foto, a, b) => {
      const comprimento = Math.hypot(b.x - a.x, b.y - a.y)
      const margem = Math.max(10, Math.min(60, comprimento * 0.15)) + 6
      const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - margem))
      const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - margem))
      const x1 = Math.min(foto.width, Math.ceil(Math.max(a.x, b.x) + margem))
      const y1 = Math.min(foto.height, Math.ceil(Math.max(a.y, b.y) + margem))
      const imagem = foto.getContext('2d', { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0)

      await pronto.current
      const r = await chamar(
        'encaixarBordas',
        { imagem, a: { x: a.x - x0, y: a.y - y0 }, b: { x: b.x - x0, y: b.y - y0 } },
        [imagem.data.buffer],
      )
      const volta = (p) => ({ x: p.x + x0, y: p.y + y0, movido: p.movido })
      return { a: volta(r.a), b: volta(r.b) }
    },
    [chamar],
  )

  return { estado, detectarCartao, encaixarBordas }
}
