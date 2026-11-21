import { useEffect, useState } from 'react'
import pata1 from '../../../assets/images/pata-1.png'
import pata2 from '../../../assets/images/pata-2.png'
import pata3 from '../../../assets/images/pata-3.png'
import { FOTOS_CAROL } from './fotosCarol.js'
import styles from './CarrosselPolaroid.module.css'

const INTERVALO_MS = 4000

/** Fotos da Carol numa moldura de polaroid marrom com patinhas. Troca sozinho e pausa com o mouse em cima. */
export function CarrosselPolaroid() {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (pausado || semMovimento) return undefined
    const timer = setInterval(() => setAtual((i) => (i + 1) % FOTOS_CAROL.length), INTERVALO_MS)
    return () => clearInterval(timer)
  }, [pausado])

  return (
    <figure
      className={styles.polaroid}
      aria-roledescription="carrossel"
      aria-label="Fotos da Carol com os animais"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <img src={pata1} alt="" aria-hidden="true" className={`${styles.pata} ${styles.pataTopo}`} />
      <img src={pata2} alt="" aria-hidden="true" className={`${styles.pata} ${styles.pataLado}`} />
      <img src={pata3} alt="" aria-hidden="true" className={`${styles.pata} ${styles.pataBaixo}`} />

      <div className={styles.fotos}>
        {FOTOS_CAROL.map((foto, i) => (
          <img
            key={foto.src}
            src={foto.src}
            alt={foto.alt}
            aria-hidden={i !== atual}
            className={`${styles.foto} ${i === atual ? styles.visivel : ''}`}
            width="800"
            height="800"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>

      <figcaption className={styles.rodape}>
        <span className={styles.legenda}>
          <img src={pata2} alt="" aria-hidden="true" className={styles.pataMini} />
          Carol e seus pacientes
          <img src={pata2} alt="" aria-hidden="true" className={styles.pataMini} />
        </span>
        <span className={styles.pontos}>
          {FOTOS_CAROL.map((foto, i) => (
            <button
              key={foto.src}
              type="button"
              className={`${styles.ponto} ${i === atual ? styles.pontoAtivo : ''}`}
              aria-label={`Mostrar foto ${i + 1} de ${FOTOS_CAROL.length}`}
              aria-current={i === atual}
              onClick={() => setAtual(i)}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
