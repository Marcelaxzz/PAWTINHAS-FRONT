import { Link } from 'react-router-dom'
import logo from '../../assets/images/logo-pawtinhas.webp'
import pets from '../../assets/images/pets-boas-vindas.webp'
import styles from './AuthLayout.module.css'

/**
 * Moldura das telas de acesso ao painel (login, verificação e redefinição de senha):
 * painel café com os pets à esquerda e o formulário à direita, ocupando quase toda a tela.
 */
export function AuthLayout({ children }) {
  return (
    <div className={styles.pagina}>
      <main className={styles.cartao}>
        <aside className={styles.painel}>
          <Link to="/" className={styles.marca} aria-label="Voltar para a página inicial">
            <span className={styles.selo}>
              <img src={logo} alt="" width="374" height="490" />
            </span>
            <span className={styles.marcaNome}>Pawtinhas</span>
          </Link>

          <p className={styles.titulo}>Que bom ter você de volta!</p>

          <div className={styles.ilustracao} aria-hidden="true">
            <img src={pets} alt="" className={styles.pets} width="1240" height="771" />
          </div>
        </aside>

        <section className={styles.formulario}>
          <div className={styles.formularioConteudo}>{children}</div>
        </section>
      </main>
    </div>
  )
}
