import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CakeIcon,
  GenderIcon,
  HeartIcon,
  MapPinIcon,
  RulerIcon,
  WhatsAppIcon,
} from '../../../components/Icons/Icons.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { useFavorites } from '../../../hooks/useFavorites.js'
import { dataService } from '../../../services/dataService.js'
import { photoSrc } from '../../../utils/images.js'
import { whatsappLink } from '../../../config.js'
import { categoria } from '../../../utils/adocao.js'
import styles from './AnimalDetalhe.module.css'

const STATUS_TEXTO = {
  Disponível: 'Disponível para adoção',
  'Em processo': 'Em processo de adoção',
  Adotado: 'Já encontrou um lar',
}

export function AnimalDetalhe() {
  const { id } = useParams()
  const [state, setState] = useState({ id: null, animal: null, error: '' })
  const { isFavorite, toggle } = useFavorites()

  useEffect(() => {
    let active = true
    dataService
      .get('animais', id)
      .then((animal) => active && setState({ id, animal, error: '' }))
      .catch((err) => active && setState({ id, animal: null, error: err.status === 404 ? '' : err.message }))
    return () => {
      active = false
    }
  }, [id])

  const loading = state.id !== id
  const { animal, error } = state

  if (loading || error || !animal) {
    return (
      <Page title="Adoção" subtitle="Conheça os animais disponíveis para adoção.">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && (
          <EmptyState title="Animal não encontrado" action={<PillButton to="/adocao">Ver outros animais</PillButton>}>
            Esse pet pode já ter encontrado um lar.
          </EmptyState>
        )}
      </Page>
    )
  }

  const foto = photoSrc(animal.foto)
  const favorito = isFavorite(animal.id)
  const whatsapp = whatsappLink(`Olá! Vi ${animal.nome} no Pawtinhas e gostaria de saber mais sobre a adoção.`)
  const infos = [
    { label: 'Idade', value: animal.idade, icon: <CakeIcon size={26} strokeWidth={1.6} /> },
    { label: 'Sexo', value: animal.sexo, icon: <GenderIcon sexo={animal.sexo} size={26} strokeWidth={1.6} /> },
    { label: 'Porte', value: animal.porte, icon: <RulerIcon size={26} strokeWidth={1.6} /> },
    { label: 'Cidade', value: animal.cidade, icon: <MapPinIcon size={26} strokeWidth={1.6} /> },
  ]
  const convivencia = [
    { label: 'Convive com outros animais', ok: animal.conviveAnimais },
    { label: 'Convive com crianças', ok: animal.conviveCriancas },
    { label: 'Vacinado', ok: animal.vacinado },
    { label: 'Castrado', ok: animal.castrado },
  ]

  return (
    <Page title={animal.nome} subtitle={categoria(animal)} documentTitle={`Conheça ${animal.nome}`}>
      <div className={styles.grade}>
        <div className={styles.coluna}>
          <figure className={styles.foto}>
            {foto && <img src={foto} alt={`Foto de ${animal.nome}`} />}
            <figcaption className={styles.status}>
              <span
                className={`${styles.bolinha} ${animal.status !== 'Disponível' ? styles.bolinhaOcupada : ''}`}
                aria-hidden="true"
              />
              <strong>{STATUS_TEXTO[animal.status] ?? animal.status}</strong>
              <span className={styles.cidade}>{animal.cidade}</span>
            </figcaption>
          </figure>

          {whatsapp ? (
            <section className={styles.contato} aria-labelledby="titulo-contato">
              <h2 id="titulo-contato">Quer saber mais sobre {animal.nome}?</h2>
              <p>
                Entre em contato pelo WhatsApp para tirar dúvidas, conhecer o animal e entender o processo de adoção.
              </p>
              <a className={styles.whatsapp} href={whatsapp} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={22} />
                Ir para o WhatsApp
              </a>
            </section>
          ) : (
            // Sem WhatsApp configurado, o visitante ainda tem um próximo passo.
            <section className={styles.contato} aria-labelledby="titulo-contato">
              <h2 id="titulo-contato">Quer adotar {animal.nome}?</h2>
              <p>Veja o que você precisa e como funciona cada etapa da adoção responsável.</p>
              <Link to="/como-adotar" className={styles.comoAdotar}>
                Como adotar
              </Link>
            </section>
          )}
        </div>

        <div className={styles.coluna}>
          <div className={styles.fraseLinha}>
            {animal.frase && <p className={styles.frase}>“{animal.frase}”</p>}
            <button
              type="button"
              className={`${styles.favorito} ${favorito ? styles.favoritado : ''}`}
              onClick={() => toggle(animal.id)}
              aria-pressed={favorito}
            >
              <HeartIcon size={18} filled={favorito} strokeWidth={2.2} />
              {favorito ? 'Nos favoritos' : 'Favoritar'}
            </button>
          </div>

          <dl className={styles.infos}>
            {infos.map((info) => (
              <div key={info.label} className={styles.info}>
                <span className={styles.infoIcone} aria-hidden="true">
                  {info.icon}
                </span>
                <dt>{info.label}</dt>
                <dd>{info.value || '-'}</dd>
              </div>
            ))}
          </dl>

          <section className={styles.cartao} aria-labelledby="titulo-sobre">
            <h2 id="titulo-sobre" className={styles.cartaoTitulo}>
              Sobre {animal.nome}
            </h2>
            <p className={styles.sobre}>{animal.sobre || animal.descricao}</p>
          </section>

          <section className={styles.cartao} aria-labelledby="titulo-info">
            <h2 id="titulo-info" className={styles.cartaoTitulo}>
              Informações
            </h2>
            <ul className={styles.lista}>
              {convivencia.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <span className={`${styles.resposta} ${item.ok ? '' : styles.respostaNao}`}>
                    {item.ok ? 'Sim' : 'Não'}
                  </span>
                </li>
              ))}
              <li>
                <span>Necessidades especiais</span>
                <span className={styles.necessidades}>{animal.necessidades || 'Nenhuma'}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Page>
  )
}
