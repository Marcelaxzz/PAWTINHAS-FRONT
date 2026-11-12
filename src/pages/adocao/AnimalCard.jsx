import { Link } from 'react-router-dom'
import { ArrowRightIcon, HeartIcon, MapPinIcon } from '../../components/Icons/Icons.jsx'
import { FotoInteira } from '../../components/ui/FotoInteira.jsx'
import { photoSrc } from '../../utils/images.js'
import { sexoEspecie } from '../../utils/adocao.js'
import styles from './AnimalCard.module.css'

/** Card vertical do catálogo público. */
export function AnimalCard({ animal, favorite, onToggleFavorite }) {
  return (
    <article className={styles.card}>
      <FotoInteira src={photoSrc(animal.foto)} alt={`Foto de ${animal.nome}`} className={styles.foto}>
        <button
          type="button"
          className={`${styles.favorito} ${favorite ? styles.favoritado : ''}`}
          onClick={() => onToggleFavorite(animal.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Remover ${animal.nome} dos favoritos` : `Adicionar ${animal.nome} aos favoritos`}
        >
          <HeartIcon size={20} filled={favorite} strokeWidth={2.2} />
        </button>
        <span className={styles.selo}>{sexoEspecie(animal)}</span>
        {animal.status === 'Em processo' && <span className={styles.processo}>Em processo de adoção</span>}
      </FotoInteira>
      <div className={styles.corpo}>
        <div className={styles.topo}>
          <h3 className={styles.nome}>{animal.nome}</h3>
          <span className={styles.idade}>{animal.idade}</span>
        </div>
        <p className={styles.local}>
          <MapPinIcon size={15} />
          {animal.cidade}
          {animal.porte && <span className={styles.porte}>Porte {animal.porte.toLowerCase()}</span>}
        </p>
        <p className={styles.descricao}>{animal.descricao}</p>
        <Link to={`/adocao/${animal.id}`} className={styles.botao}>
          Conhecer {animal.nome}
          <ArrowRightIcon size={18} />
        </Link>
      </div>
    </article>
  )
}
