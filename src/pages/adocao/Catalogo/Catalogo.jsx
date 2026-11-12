import { useMemo, useRef, useState } from 'react'
import { AnimalCard } from '../AnimalCard.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from '../../../components/Icons/Icons.jsx'
import { FotoInteira } from '../../../components/ui/FotoInteira.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useFavorites } from '../../../hooks/useFavorites.js'
import { photoSrc } from '../../../utils/images.js'
import { FILTROS, sexoEspecie, visivelNoCatalogo } from '../../../utils/adocao.js'
import styles from './Catalogo.module.css'

/** Cartões por vez na grade; o botão "Mostrar mais" soma outro tanto. */
const POR_PAGINA = 12
export function Catalogo() {
  const { data, loading, error, reload } = useCollections(['animais'])
  const { isFavorite, toggle } = useFavorites()
  const [filtro, setFiltro] = useState('todos')
  const [slide, setSlide] = useState(0)
  const [mostrando, setMostrando] = useState(POR_PAGINA)
  const trackRef = useRef(null)

  const animais = useMemo(() => (data ? data.animais.filter(visivelNoCatalogo) : []), [data])
  const destaques = animais.filter((a) => a.status === 'Disponível').slice(0, 3)
  const ativo = FILTROS.find((f) => f.id === filtro)
  const lista = animais.filter(ativo.test)

  const goTo = (index) => {
    const track = trackRef.current
    if (!track || destaques.length === 0) return
    const next = (index + destaques.length) % destaques.length
    track.scrollTo({ left: track.children[next].offsetLeft - track.children[0].offsetLeft, behavior: 'smooth' })
    setSlide(next)
  }

  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    setSlide(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <Page
      title="Animais para adoção"
      subtitle="Filtre por espécie, idade ou sexo e toque no coração para guardar quem você quer rever."
      documentTitle="Adoção"
      width="largo"
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {destaques.length > 0 && (
        <section className={styles.carrossel} aria-roledescription="carrossel" aria-label="Animais em destaque">
          <div className={styles.trilho} ref={trackRef} onScroll={handleScroll}>
            {destaques.map((animal, index) => (
              <article
                key={animal.id}
                className={styles.slide}
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${destaques.length}`}
              >
                <div className={styles.slideTexto}>
                  <span className={styles.destaque}>
                    Destaque {index + 1} de {destaques.length}
                  </span>
                  <h2>{animal.nome}</h2>
                  <p className={styles.slideMeta}>
                    {sexoEspecie(animal)} · {animal.idade}
                    {animal.cidade && (
                      <>
                        {' · '}
                        <MapPinIcon size={14} />
                        {animal.cidade}
                      </>
                    )}
                  </p>
                  {animal.frase && <p className={styles.slideFrase}>“{animal.frase}”</p>}
                  <p className={styles.slideDescricao}>{animal.descricao}</p>
                  <PillButton
                    to={`/adocao/${animal.id}`}
                    tabIndex={index === slide ? 0 : -1}
                    className={styles.slideBotao}
                  >
                    Conhecer {animal.nome}
                    <ArrowRightIcon size={18} />
                  </PillButton>
                </div>
                <FotoInteira
                  src={photoSrc(animal.foto)}
                  alt={`Foto de ${animal.nome}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className={styles.slideFoto}
                />
              </article>
            ))}
          </div>
          {destaques.length > 1 && (
            <div className={styles.controles}>
              <button
                type="button"
                className={styles.seta}
                onClick={() => goTo(slide - 1)}
                aria-label="Destaque anterior"
              >
                <ChevronLeftIcon size={20} />
              </button>
              <div className={styles.pontos}>
                {destaques.map((animal, index) => (
                  <button
                    key={animal.id}
                    type="button"
                    className={`${styles.ponto} ${index === slide ? styles.pontoAtivo : ''}`}
                    onClick={() => goTo(index)}
                    aria-label={`Ir para o destaque ${index + 1}`}
                    aria-current={index === slide || undefined}
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles.seta}
                onClick={() => goTo(slide + 1)}
                aria-label="Próximo destaque"
              >
                <ChevronRightIcon size={20} />
              </button>
            </div>
          )}
        </section>
      )}

      {data && (
        <section aria-label="Animais para adoção">
          <div className={styles.filtros} role="group" aria-label="Filtrar animais">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.filtro} ${filtro === f.id ? styles.filtroAtivo : ''}`}
                onClick={() => {
                  setFiltro(f.id)
                  setMostrando(POR_PAGINA)
                }}
                aria-pressed={filtro === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>

          {lista.length === 0 ? (
            <EmptyState title="Nenhum animal nesse filtro">Tente outra categoria ou volte para “Todos”.</EmptyState>
          ) : (
            <>
              <div className={styles.grade}>
                {lista.slice(0, mostrando).map((animal) => (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    favorite={isFavorite(animal.id)}
                    onToggleFavorite={toggle}
                  />
                ))}
              </div>
              {lista.length > mostrando && (
                <div className={styles.mais}>
                  <p>
                    Mostrando {mostrando} de {lista.length} animais
                  </p>
                  <PillButton variant="contorno" size="lg" onClick={() => setMostrando((n) => n + POR_PAGINA)}>
                    Mostrar mais animais
                  </PillButton>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </Page>
  )
}
