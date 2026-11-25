const CORES = ['#d8a16b', '#d4566a', '#6f8f62', '#5b7f99', '#d9a441', '#8a76b0', '#c8573c']

/**
 * Chuva de confete por cima da tela (um animal foi adotado!).
 * Não bloqueia cliques, some sozinha em ~4 s e não roda para quem pediu menos movimento.
 */
export function soltarConfete() {
  if (typeof document === 'undefined' || !document.body?.animate) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const camada = document.createElement('div')
  camada.setAttribute('aria-hidden', 'true')
  Object.assign(camada.style, { position: 'fixed', inset: '0', zIndex: '300', overflow: 'hidden', pointerEvents: 'none' })

  const altura = window.innerHeight
  for (let i = 0; i < 110; i += 1) {
    const peca = document.createElement('span')
    const pata = i % 9 === 0
    const largura = 7 + Math.random() * 7
    Object.assign(
      peca.style,
      pata
        ? { position: 'absolute', top: '-30px', left: `${Math.random() * 100}%`, fontSize: '20px', lineHeight: '1' }
        : {
            position: 'absolute',
            top: '-20px',
            left: `${Math.random() * 100}%`,
            width: `${largura}px`,
            height: `${largura * (0.45 + Math.random() * 0.6)}px`,
            borderRadius: Math.random() < 0.3 ? '50%' : '2px',
            background: CORES[i % CORES.length],
          },
    )
    if (pata) peca.textContent = '🐾'
    camada.append(peca)
    const desvio = (Math.random() - 0.5) * 240
    peca.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { opacity: 1, offset: 0.75 },
        { transform: `translate(${desvio}px, ${altura + 60}px) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0 },
      ],
      { duration: 2200 + Math.random() * 1600, delay: Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
    )
  }

  document.body.append(camada)
  setTimeout(() => camada.remove(), 4600)
}
