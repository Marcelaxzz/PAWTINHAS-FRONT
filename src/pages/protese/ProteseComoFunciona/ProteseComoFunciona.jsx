import { Link } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { proteseTabs } from '../proteseTabs.js'
import { usePetFromQuery } from '../usePetFromQuery.js'
import referencia from '../../../assets/images/medicao-cao.webp'
import shared from '../ProteseShared.module.css'
import styles from './ProteseComoFunciona.module.css'

const PASSOS = [
  { titulo: 'Abra a câmera', texto: 'Toque em “Abrir câmera” na aba Medição (Chrome no Android).' },
  { titulo: 'Toque nas duas pontas', texto: 'Mire no começo e toque no +. Mire no fim e toque de novo.' },
  { titulo: 'Salve na ficha', texto: 'Com as quatro medidas prontas, escolha o membro e salve.' },
]

const DICAS = [
  'Antes de medir, passe o celular devagar pelo chão e pelo pet, com boa luz. A mira fica branca quando acha a superfície.',
  'Se uma medida sair estranha, toque em “Desfazer” ou corrija o número antes de salvar.',
  'No iPhone, use o app Medida e digite os valores. Fita métrica também serve.',
]

export function ProteseComoFunciona() {
  const { query } = usePetFromQuery()

  return (
    <Page title="Como funciona" width="amplo" tabs={proteseTabs(query)} documentTitle="Como funciona a prótese 3D">
      <div className={styles.grade}>
        <section className={styles.hero}>
          <h2 className={styles.titulo}>Da medida à prótese sob medida</h2>
          <p className={styles.subtitulo}>
            A medição usa a câmera do celular com realidade aumentada: você toca nas pontas e as medidas saem em
            centímetros.
          </p>
          <div className={styles.acoes}>
            <Link to={`/protese-3d${query}`} className={`${shared.botaoPrimario} ${styles.cta}`}>
              Começar medição
            </Link>
            <Link to="/pacientes" className={`${shared.botaoSecundario} ${styles.cta}`}>
              Escolher paciente
            </Link>
          </div>

          <ol className={styles.passos} aria-label="Passo a passo">
            {PASSOS.map(({ titulo, texto }, index) => (
              <li key={titulo} className={styles.passo}>
                <span className={styles.numero}>{index + 1}</span>
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.lateral}>
          <img src={referencia} alt="Cachorro em pé, de lado para a câmera, na grama" className={styles.heroFoto} />
          <section className={styles.dicas} aria-labelledby="titulo-dicas">
            <h2 id="titulo-dicas">Para medir bem</h2>
            <ul>
              {DICAS.map((dica) => (
                <li key={dica}>{dica}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Page>
  )
}
