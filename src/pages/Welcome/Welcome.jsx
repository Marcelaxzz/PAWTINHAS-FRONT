import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../../components/Icons/Icons.jsx'
import { usePageTitle } from '../../hooks/usePageTitle.js'
import logo from '../../assets/images/logo-pawtinhas.webp'
import coelho from '../../assets/images/coelho-oculos.webp'
import gato from '../../assets/images/gato-oculos.webp'
import styles from './Welcome.module.css'

const LETRAS = [
  { letra: 'P', tom: 'escuro' },
  { letra: 'A', tom: 'medio' },
  { letra: 'W', tom: 'cafe' },
  { letra: 'T', tom: 'caramelo' },
  { letra: 'I', tom: 'claro' },
  { letra: 'N', tom: 'caramelo' },
  { letra: 'H', tom: 'cafe' },
  { letra: 'A', tom: 'medio' },
  { letra: 'S', tom: 'escuro' },
  { letra: '!', tom: 'escuro' },
]

export function Welcome() {
  usePageTitle('Bem-vindo(a)')

  return (
    <div className={styles.pagina}>
      <img src={logo} alt="Pawtinhas" className={styles.logo} width="187" height="245" />
      <img src={coelho} alt="" className={styles.coelho} width="601" height="451" />
      <img src={gato} alt="" className={styles.gato} width="606" height="404" />

      <main className={styles.conteudo}>
        <div className={styles.bloco}>
          <h1 className={styles.titulo}>
            <span className={styles.saudacao}>Bem-vindo(a) ao</span>
            <span className={styles.marca}>
              <span className="visualmente-oculto">Pawtinhas!</span>
              <span aria-hidden="true">
                {LETRAS.map(({ letra, tom }, index) => (
                  <span key={index} className={styles[tom]}>
                    {letra}
                  </span>
                ))}
              </span>
            </span>
          </h1>

          <nav className={styles.acoes} aria-label="Acesso rápido">
            <div className={styles.botoes}>
              <Link to="/adocao" className={styles.botaoCatalogo}>
                Ver catálogo de adoções
                <ArrowRightIcon size={18} strokeWidth={2.2} />
              </Link>
              <Link to="/login" className={styles.botaoLogin}>
                Fazer login
              </Link>
            </div>
            <Link to="/sobre" className={styles.linkSobre}>
              Sobre nós
            </Link>
          </nav>
        </div>
      </main>
    </div>
  )
}
