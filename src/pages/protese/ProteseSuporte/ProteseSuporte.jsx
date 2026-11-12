import { ChevronDownIcon, ClockIcon, MailIcon, PhoneIcon } from '../../../components/Icons/Icons.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { proteseTabs } from '../proteseTabs.js'
import { usePetFromQuery } from '../usePetFromQuery.js'
import shared from '../ProteseShared.module.css'
import styles from './ProteseSuporte.module.css'

const EMAIL = 'suporte@pawtinhas.com.br'
const TELEFONE = '(34) 3823-0300'

const PERGUNTAS = [
  {
    pergunta: 'O botão “Abrir câmera” não aparece. Por quê?',
    resposta:
      'A medição pela câmera precisa do Chrome num celular Android com o “Google Play Services para RA” (instalado pela Play Store) e do site aberto em https. No computador e no iPhone ela não aparece: meça com fita métrica ou, no iPhone, com o app Medida, e digite os valores.',
  },
  {
    pergunta: 'A mira não fica branca. O que faço?',
    resposta:
      'Mexa o celular devagar, de um lado para o outro, mostrando o chão e o pet, com boa luz. A câmera precisa de alguns segundos para entender o ambiente.',
  },
  {
    pergunta: 'A medida da câmera é confiável?',
    resposta:
      'Fica perto da fita métrica, com diferença de poucos milímetros, se o celular estiver a uns 30 a 50 cm do membro. Os números podem ser corrigidos antes de salvar.',
  },
  {
    pergunta: 'A câmera fica gravando?',
    resposta:
      'Não. Nada da câmera é salvo nem enviado. Só as medidas, o membro e o método vão para a ficha do paciente.',
  },
  {
    pergunta: 'Onde vejo as medições anteriores?',
    resposta: 'Na ficha do paciente, em “Prótese 3D”. Cada medição mostra a data, o membro e o método.',
  },
]

export function ProteseSuporte() {
  const { query } = usePetFromQuery()

  return (
    <Page
      title="Suporte"
      subtitle="Tire dúvidas sobre a medição e fale com a equipe do Pawtinhas."
      tabs={proteseTabs(query)}
    >
      <div className={styles.layout}>
        <section aria-labelledby="titulo-faq">
          <h2 id="titulo-faq" className={styles.secao}>
            Perguntas frequentes
          </h2>
          <div className={styles.faq}>
            {PERGUNTAS.map((item) => (
              <details key={item.pergunta} className={styles.item}>
                <summary>
                  {item.pergunta}
                  <ChevronDownIcon size={18} />
                </summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className={styles.contato} aria-labelledby="titulo-contato">
          <h2 id="titulo-contato" className={styles.secao}>
            Fale com a gente
          </h2>
          <ul>
            <li>
              <span className={styles.icone} aria-hidden="true">
                <MailIcon size={18} />
              </span>
              <span>
                <small>E-mail</small>
                <strong>
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </strong>
              </span>
            </li>
            <li>
              <span className={styles.icone} aria-hidden="true">
                <PhoneIcon size={18} />
              </span>
              <span>
                <small>Telefone</small>
                <strong>
                  <a href={`tel:+55${TELEFONE.replace(/\D/g, '')}`}>{TELEFONE}</a>
                </strong>
              </span>
            </li>
            <li>
              <span className={styles.icone} aria-hidden="true">
                <ClockIcon size={18} />
              </span>
              <span>
                <small>Atendimento</small>
                <strong>Seg. a sex., das 8h às 18h</strong>
              </span>
            </li>
          </ul>
          <a
            className={`${shared.botaoPrimario} ${styles.email}`}
            href={`mailto:${EMAIL}?subject=${encodeURIComponent('Suporte - Prótese 3D')}`}
          >
            Escrever e-mail
          </a>
        </aside>
      </div>
    </Page>
  )
}
