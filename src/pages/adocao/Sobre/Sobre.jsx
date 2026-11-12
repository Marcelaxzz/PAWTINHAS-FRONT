import { Page } from '../../../layouts/Page/Page.jsx'
import cachorro from '../../../assets/images/sobre-cachorro.webp'
import styles from './Sobre.module.css'

const CARTOES = [
  {
    titulo: 'Adoção responsável',
    texto:
      'Cada animal tem ficha com idade, saúde e temperamento, e a adoção só acontece depois de uma conversa com a equipe.',
  },
  {
    titulo: 'Atendimento veterinário',
    texto:
      'Consultas, vacinas, cirurgias, banho e tosa, visitas em casa e emergências, com o histórico de cada paciente guardado.',
    destaque: true,
  },
  {
    titulo: 'Próteses sob medida',
    texto: 'Para animais que perderam um membro, a Dra. Carolina mede pela foto e imprime a prótese em 3D, sob medida.',
  },
]

export function Sobre() {
  return (
    <Page title="Sobre nós" subtitle="Quem somos e por que o Pawtinhas existe.">
      <section className={styles.historia}>
        <div>
          <h2 className={styles.historiaTitulo}>Nossa história</h2>
          <p className={styles.historiaTexto}>
            O Pawtinhas é o espaço da médica veterinária Carolina Gonçalves, que atende animais de pequeno e grande
            porte. Aqui ela organiza a agenda da clínica, acompanha cada paciente e mostra os animais que estão para
            adoção.
          </p>
        </div>
        <img
          src={cachorro}
          alt="Cachorro sorrindo enquanto recebe carinho na cabeça"
          className={styles.foto}
          width="462"
          height="344"
        />
      </section>

      <section className={styles.cartoes} aria-label="O que fazemos">
        {CARTOES.map((cartao) => (
          <article key={cartao.titulo} className={`${styles.cartao} ${cartao.destaque ? styles.cartaoBranco : ''}`}>
            <h3>{cartao.titulo}</h3>
            <p>{cartao.texto}</p>
          </article>
        ))}
      </section>
    </Page>
  )
}
