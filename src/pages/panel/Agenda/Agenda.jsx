import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ReportDialog } from '../../../components/ui/RecordDialog.jsx'
import { ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import {
  AlertIcon,
  HouseIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StethoscopeIcon,
} from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { agendaSummaries, petsInNext12Hours, todaysTimeline } from '../../../utils/agenda.js'
import { AGENDA_TABS } from '../agendaTabs.js'
import styles from './Agenda.module.css'
import { relatoriosService } from '../../../services/gestaoService.js'

const RESOURCES = ['consultas', 'vacinas', 'cirurgias', 'banhos', 'visitas', 'emergencias']

const CARDS = [
  {
    key: 'consultas',
    title: 'Consultas',
    to: '/agenda/consultas-vacinas#consultas',
    icon: StethoscopeIcon,
    tom: 'ceu',
  },
  { key: 'cirurgias', title: 'Cirurgias', to: '/agenda/cirurgias', icon: ScissorsIcon, tom: 'lavanda' },
  { key: 'vacinas', title: 'Vacinas', to: '/agenda/consultas-vacinas#vacinas', icon: ShieldCheckIcon, tom: 'salvia' },
  { key: 'banhos', title: 'Banho e tosa', to: '/agenda/banho-tosa', icon: SparkleIcon, tom: 'mel' },
  { key: 'visitas', title: 'Pet sitter', to: '/agenda/pet-sitter', icon: HouseIcon, tom: 'rosa' },
  { key: 'emergencias', title: 'Emergências', to: '/agenda/emergencias', icon: AlertIcon, tom: 'terracota' },
]

export function Agenda() {
  const { data, loading, error, reload, lookup } = useClinic(RESOURCES)
  const [dayOpen, setDayOpen] = useState(false)

  const summaries = useMemo(() => (data ? agendaSummaries(data) : null), [data])
  const timeline = useMemo(() => (data ? todaysTimeline(data, lookup) : []), [data, lookup])
  const nextPets = useMemo(() => petsInNext12Hours(timeline), [timeline])

  return (
    <Page
      title="Agenda de hoje"
      subtitle="Consultas, cirurgias, banhos, visitas e emergências do dia."
      tabs={AGENDA_TABS}
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {summaries && (
        <>
          <nav className={styles.grade} aria-label="Categorias da agenda">
            {CARDS.map(({ key, title, to, icon: Icon, tom }) => (
              <Link key={key} to={to} className={`${styles.cartao} ${styles[tom]}`}>
                <span className={styles.icone}>
                  <Icon size={24} strokeWidth={1.9} />
                </span>
                <span className={styles.titulo}>{title}</span>
                <span className={styles.texto}>{summaries[key]}</span>
              </Link>
            ))}
          </nav>

          <SummaryBar
            className={styles.resumo}
            actions={
              <PillButton size="sm" onClick={() => setDayOpen(true)}>
                Ver o dia completo
              </PillButton>
            }
          >
            Nas próximas 12 horas: <strong>{nextPets}</strong>{' '}
            {nextPets === 1 ? 'paciente com horário marcado' : 'pacientes com horário marcado'}.
          </SummaryBar>

          <ReportDialog
            open={dayOpen}
            pdf={relatoriosService.pdfAgenda}
            onClose={() => setDayOpen(false)}
            title="Detalhes do dia"
            description="Todos os compromissos de hoje, em ordem de horário."
            stats={[
              { label: 'Compromissos hoje', value: timeline.length },
              {
                label: 'Pendentes',
                value: timeline.filter((i) => ['Agendado', 'Pendente', 'Em atendimento'].includes(i.status)).length,
              },
              {
                label: 'Concluídos',
                value: timeline.filter((i) => ['Concluída', 'Concluído', 'Aplicada', 'Alta médica'].includes(i.status))
                  .length,
              },
            ]}
            items={timeline.map((item) => ({
              id: `${item.tipo}-${item.id}`,
              when: `${item.hora} · ${item.tipo}`,
              title: item.pet,
              detail: item.detalhe,
              status: item.status,
            }))}
          />
        </>
      )}
    </Page>
  )
}
