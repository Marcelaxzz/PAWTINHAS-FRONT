import { useMemo } from 'react'
import { HeartIcon, MapPinIcon } from '../../../components/Icons/Icons.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { Chip } from '../../../components/ui/Chip.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useFavorites } from '../../../hooks/useFavorites.js'
import { photoSrc } from '../../../utils/images.js'
import { sexoEspecie } from '../../../utils/adocao.js'
import styles from './Favoritos.module.css'

export function Favoritos() {
  const { data, loading, error, reload } = useCollections(['animais'])
  const { ids, toggle } = useFavorites()

  const favoritos = useMemo(() => (data ? data.animais.filter((a) => ids.includes(a.id)) : []), [data, ids])

  return (
    <Page
      title="Meus favoritos"
      subtitle="Os animais que você marcou com o coração no catálogo."
      actions={
        data && (
          <span className={styles.contador}>
            <strong>{favoritos.length}</strong> {favoritos.length === 1 ? 'animal salvo' : 'animais salvos'}
          </span>
        )
      }
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && favoritos.length === 0 && (
        <EmptyState title="Nenhum favorito ainda" action={<PillButton to="/adocao">Conhecer os animais</PillButton>}>
          Toque no coração dos animais do catálogo para guardá-los aqui.
        </EmptyState>
      )}

      {favoritos.length > 0 && (
        <div className={styles.grade}>
          {favoritos.map((animal) => (
            <article key={animal.id} className={styles.card}>
              <div className={styles.foto}>
                {photoSrc(animal.foto) && (
                  <img src={photoSrc(animal.foto)} alt={`Foto de ${animal.nome}`} loading="lazy" />
                )}
                <span className={styles.selo}>{sexoEspecie(animal)}</span>
              </div>
              <div className={styles.corpo}>
                <div className={styles.linhaNome}>
                  <h2 className={styles.nome}>{animal.nome}</h2>
                  <span className={styles.idade}>{animal.idade}</span>
                  <Chip tone="tag" size="xs" className={styles.porte}>
                    Porte {animal.porte}
                  </Chip>
                </div>
                <p className={styles.local}>
                  <MapPinIcon size={15} />
                  {animal.cidade}
                </p>
                <p className={styles.descricao}>{animal.descricao}</p>
                <div className={styles.acoes}>
                  <PillButton to={`/adocao/${animal.id}`}>Ver detalhes</PillButton>
                  <button
                    type="button"
                    className={styles.remover}
                    onClick={() => toggle(animal.id)}
                    aria-label={`Remover ${animal.nome} dos favoritos`}
                  >
                    <HeartIcon size={18} filled />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  )
}
