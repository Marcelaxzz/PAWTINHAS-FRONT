import { useEffect, useState } from 'react'
import { PawFilled } from '../../../components/Icons/Icons.jsx'
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
      <PawFilled className={`${styles.pata} ${styles.pataTopo}`} />
      <PawFilled className={`${styles.pata} ${styles.pataLado}`} />
      <PawFilled className={`${styles.pata} ${styles.pataBaixo}`} />

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
          <PawFilled className={styles.pataMini} />
          Carol e seus pacientes
          <PawFilled className={styles.pataMini} />
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
