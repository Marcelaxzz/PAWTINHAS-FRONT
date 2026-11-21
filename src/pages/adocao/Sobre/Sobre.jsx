import { Page } from '../../../layouts/Page/Page.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ClockIcon, HeartIcon, StethoscopeIcon, WhatsAppIcon } from '../../../components/Icons/Icons.jsx'
import { whatsappLink } from '../../../config.js'
import pata1 from '../../../assets/images/pata-1.png'
import pata2 from '../../../assets/images/pata-2.png'
import pata3 from '../../../assets/images/pata-3.png'
import { CarrosselPolaroid } from './CarrosselPolaroid.jsx'
import styles from './Sobre.module.css'

const ESPECIES = ['Cães', 'Gatos', 'Cavalos', 'Bois e bezerros']

const CARTOES = [
  {
    titulo: 'Adoção responsável',
    icone: HeartIcon,
    texto:
      'Cada animal tem ficha com idade, saúde e temperamento, e a adoção só acontece depois de uma conversa com a equipe.',
  },
  {
    titulo: 'Atendimento veterinário',
    icone: StethoscopeIcon,
    texto:
      'Consultas, vacinas, cirurgias, banho e tosa, visitas em casa e emergências, com o histórico de cada paciente guardado.',
    destaque: true,
  },
  {
    titulo: 'Alarmes de medicação',
    icone: ClockIcon,
    texto:
      'Cada remédio prescrito ganha um alarme no celular, no painel e na caixinha da clínica, para nenhuma dose passar.',
  },
]

// Rastro de patinhas no fundo: posição (em %), tamanho (px), giro e qual carimbo.
const RASTRO = [
  { x: 0, y: 0, t: 24, g: 100, p: pata1 },
  { x: 5, y: -4, t: 22, g: 96, p: pata2 },
  { x: 10, y: 1, t: 24, g: 104, p: pata3 },
  { x: 58, y: 18, t: 26, g: 168, p: pata1 },
  { x: 62, y: 31, t: 26, g: 176, p: pata2 },
  { x: 58, y: 44, t: 26, g: 164, p: pata3 },
  { x: 62, y: 57, t: 26, g: 172, p: pata1 },
  { x: 58, y: 70, t: 26, g: 168, p: pata2 },
  { x: 62, y: 83, t: 26, g: 178, p: pata3 },
]

const WHATSAPP = whatsappLink('Oi, Carol! Vim pelo site do Pawtinhas e queria falar com você.')

export function Sobre() {
  return (
    <Page title="Sobre nós" subtitle="Quem somos e por que o Pawtinhas existe.">
      <section className={styles.historia}>
        <div className={styles.rastro} aria-hidden="true">
          {RASTRO.map((r) => (
            <img
              key={`${r.x}-${r.y}`}
              src={r.p}
              alt=""
              style={{ left: `${r.x}%`, top: `${r.y}%`, width: r.t, transform: `rotate(${r.g}deg)` }}
            />
          ))}
        </div>

        <div className={styles.texto}>
          <p className={styles.sobretitulo}>Conheça a Carol</p>
          <h2 className={styles.historiaTitulo}>Nossa história</h2>
          <p className={styles.historiaTexto}>
            O Pawtinhas é o espaço da médica veterinária Carolina Gonçalves, que atende animais de pequeno e grande
            porte. Aqui ela organiza a agenda da clínica, acompanha cada paciente e mostra os animais que estão para
            adoção.
          </p>

          <div className={styles.especies}>
            <span className={styles.especiesRotulo}>Quem ela atende</span>
            <ul>
              {ESPECIES.map((especie, i) => (
                <li key={especie}>
                  <img src={[pata1, pata2, pata3][i % 3]} alt="" aria-hidden="true" />
                  {especie}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.acoes}>
            {WHATSAPP && (
              <PillButton href={WHATSAPP} size="lg">
                <WhatsAppIcon size={18} />
                Falar com a Carol
              </PillButton>
            )}
            <PillButton to="/adocao" variant="contorno" size="lg">
              Ver animais para adoção
            </PillButton>
          </div>
        </div>

        <CarrosselPolaroid />
      </section>

      <section className={styles.cartoes} aria-label="O que fazemos">
        {CARTOES.map(({ titulo, icone: Icone, texto, destaque }) => (
          <article key={titulo} className={`${styles.cartao} ${destaque ? styles.cartaoBranco : ''}`}>
            <span className={styles.cartaoIcone} aria-hidden="true">
              <Icone size={22} />
            </span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
            <img src={pata2} alt="" aria-hidden="true" className={styles.cartaoPata} />
          </article>
        ))}
      </section>
    </Page>
  )
}
