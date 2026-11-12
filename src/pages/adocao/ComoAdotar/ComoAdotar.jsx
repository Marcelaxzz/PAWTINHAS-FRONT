import { Link } from 'react-router-dom'
import { WhatsAppIcon } from '../../../components/Icons/Icons.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { whatsappLink } from '../../../config.js'
import styles from './ComoAdotar.module.css'

const WHATSAPP_DUVIDAS = whatsappLink('Olá! Gostaria de saber mais sobre o processo de adoção do Pawtinhas.')

const PASSOS = [
  {
    titulo: 'Escolha seu pawtinha',
    texto:
      'Navegue pelo catálogo, filtre por espécie, idade ou sexo e toque no coração para guardar os que quiser rever.',
  },
  {
    titulo: 'Converse com a gente',
    texto: WHATSAPP_DUVIDAS
      ? 'Na página do animal, toque em “Ir para o WhatsApp”. Tiramos dúvidas e contamos tudo sobre a rotina dele.'
      : 'Fale com a equipe da clínica. Tiramos dúvidas e contamos tudo sobre a rotina dele.',
  },
  {
    titulo: 'Visita e entrevista',
    texto: 'Agendamos um encontro para vocês se conhecerem e conversamos sobre o espaço e a rotina da sua casa.',
  },
  {
    titulo: 'Termo de adoção',
    texto: 'Com tudo certo, você assina o termo de adoção responsável e leva o animal para casa.',
  },
]

const REQUISITOS = [
  'Ter 18 anos ou mais e apresentar documento com foto.',
  'Comprovante de residência atualizado.',
  'Concordância de todos os moradores da casa.',
  'Compromisso com vacinação, vermifugação e castração.',
  'Disponibilidade para o acompanhamento pós-adoção.',
]

export function ComoAdotar() {
  return (
    <Page title="Como adotar" subtitle="São quatro passos, do catálogo até a ida para casa.">
      <ol className={styles.passos}>
        {PASSOS.map(({ titulo, texto }, index) => (
          <li key={titulo} className={styles.passo}>
            <span className={styles.numero}>{index + 1}</span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </li>
        ))}
      </ol>

      <section className={styles.requisitos} aria-labelledby="titulo-requisitos">
        <div>
          <h2 id="titulo-requisitos" className={styles.secaoTitulo}>
            O que você precisa
          </h2>
          <ul>
            {REQUISITOS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className={styles.cta}>
          <p className={styles.ctaTitulo}>Quer adotar?</p>
          <p className={styles.ctaTexto}>
            A página de cada animal mostra se ele já é vacinado e castrado. O resto a equipe explica na conversa.
          </p>
          <Link to="/adocao" className={styles.ctaBotao}>
            Ver animais disponíveis
          </Link>
          {WHATSAPP_DUVIDAS && (
            <a className={styles.ctaLink} href={WHATSAPP_DUVIDAS} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={18} />
              Tirar dúvidas pelo WhatsApp
            </a>
          )}
        </div>
      </section>
    </Page>
  )
}
