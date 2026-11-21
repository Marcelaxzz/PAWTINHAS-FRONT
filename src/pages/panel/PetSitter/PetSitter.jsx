import { useMemo, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { AGENDA_TABS } from '../agendaTabs.js'
import { InfoLine, PetCard } from '../../../components/ui/PetCard.jsx'
import { Chip, StatusChip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { RecordDialog, ReportDialog } from '../../../components/ui/RecordDialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { CheckIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useRecordActions } from '../../../hooks/useRecordActions.js'
import { compareSchedule, formatDateBr, todayIso } from '../../../utils/dates.js'
import lists from '../panelLists.module.css'
import styles from './PetSitter.module.css'
import { relatoriosService } from '../../../services/gestaoService.js'

export function PetSitter() {
  const { data, loading, error, reload, lookup, patchLocal } = useClinic(['visitas'])
  const { update, remove } = useRecordActions('visitas', patchLocal)
  const [reportOpen, setReportOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const hoje = todayIso()
  const visitas = useMemo(
    () =>
      data
        ? data.visitas
            .filter((v) => v.dataFim >= hoje)
            .sort((a, b) => compareSchedule({ data: a.dataInicio, hora: a.hora }, { data: b.dataInicio, hora: b.hora }))
        : [],
    [data, hoje],
  )
  const selected = data?.visitas.find((v) => v.id === selectedId)
  const deHoje = visitas.filter((v) => v.dataInicio <= hoje && v.status !== 'Cancelado')
  const concluidas = deHoje.filter((v) => v.status === 'Concluída').length

  const toggle = async (visita) => {
    setBusyId(visita.id)
    const concluida = visita.status === 'Concluída'
    try {
      await update(
        visita.id,
        { status: concluida ? 'Pendente' : 'Concluída' },
        concluida ? 'Visita marcada como pendente.' : 'Visita marcada como concluída!',
      )
    } catch {
      /* aviso já exibido */
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Page title="Visitas Pet Sitter" subtitle="Visitas domiciliares de cuidado e companhia." tabs={AGENDA_TABS}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          {visitas.length === 0 ? (
            <EmptyState
              title="Nenhuma visita agendada"
              action={<PillButton to="/agenda/pet-sitter/nova">Agendar visita</PillButton>}
            >
              As visitas domiciliares aparecem aqui.
            </EmptyState>
          ) : (
            <div className={lists.lista}>
              {visitas.map((visita) => {
                const pet = lookup.pet(visita.petId)
                const concluida = visita.status === 'Concluída'
                const futura = visita.dataInicio > hoje
                return (
                  <PetCard
                    key={visita.id}
                    avatar={100}
                    titleSize="md"
                    photo={lookup.photoOf(visita)}
                    title={pet ? `${pet.nome}, ${pet.raca}` : 'Pet removido'}
                    badges={
                      <>
                        {pet?.idade && <Chip size="sm">{pet.idade}</Chip>}
                        <StatusChip status={visita.status} size="xs" />
                        {futura && (
                          <Chip tone="tag" size="xs">
                            A partir de {formatDateBr(visita.dataInicio)}
                          </Chip>
                        )}
                      </>
                    }
                    actions={
                      <div className={styles.acoes}>
                        <button
                          type="button"
                          className={`${styles.marcar} ${concluida ? styles.marcado : ''}`}
                          onClick={() => toggle(visita)}
                          disabled={busyId === visita.id || futura}
                          aria-pressed={concluida}
                        >
                          <span className={styles.caixa} aria-hidden="true">
                            {concluida && <CheckIcon size={12} strokeWidth={3.2} />}
                          </span>
                          {concluida ? 'Concluída' : 'Marcar como visitada'}
                        </button>
                        <PillButton variant="fantasma" size="sm" onClick={() => setSelectedId(visita.id)}>
                          Detalhes
                        </PillButton>
                      </div>
                    }
                  >
                    <InfoLine label="Tutor(a):">{lookup.tutor(visita.tutorId)?.nome ?? '-'}</InfoLine>
                    <InfoLine label="Endereço:" truncate>
                      {visita.endereco}
                    </InfoLine>
                    <div className={lists.metaLinha}>
                      <Chip tone="tag" size="xs">
                        {visita.servico}
                      </Chip>
                      <span className={lists.horario}>Horário: {visita.hora}</span>
                    </div>
                  </PetCard>
                )
              })}
            </div>
          )}

          <SummaryBar
            actions={
              <>
                <PillButton size="sm" onClick={() => setReportOpen(true)}>
                  Relatório
                </PillButton>
                <PillButton size="sm" to="/agenda/pet-sitter/nova">
                  Agendar visita
                </PillButton>
              </>
            }
          >
            {deHoje.length === 0
              ? 'Nenhuma visita hoje.'
              : `${concluidas} de ${deHoje.length} ${deHoje.length === 1 ? 'visita concluída' : 'visitas concluídas'} hoje.`}
          </SummaryBar>

          {selected && (
            <RecordDialog
              open={Boolean(selectedId)}
              eventoId={selectedId}
              onClose={() => setSelectedId(null)}
              title={lookup.pet(selected.petId)?.nome ?? 'Visita'}
              subtitle={selected.servico}
              photo={lookup.photoOf(selected)}
              status={selected.status}
              statusOptions={['Pendente', 'Concluída', 'Cancelado']}
              onStatusChange={(status) => update(selected.id, { status }, 'Status da visita atualizado.')}
              onDelete={async () => {
                await remove(selected.id, 'Visita excluída.')
                setSelectedId(null)
              }}
              editTo={`/agenda/pet-sitter/${selected.id}/editar`}
              rows={[
                {
                  label: 'Período',
                  value: `${formatDateBr(selected.dataInicio)} a ${formatDateBr(selected.dataFim)} · ${selected.periodo}`,
                },
                { label: 'Horário', value: selected.hora },
                { label: 'Tutor(a)', value: lookup.tutor(selected.tutorId)?.nome },
                { label: 'Telefone do tutor', value: lookup.tutor(selected.tutorId)?.telefone },
                { label: 'Endereço', value: selected.endereco },
                { label: 'Observações', value: selected.observacoes || 'Sem observações.' },
              ]}
            />
          )}

          <ReportDialog
            open={reportOpen}
            pdf={(p) => relatoriosService.pdfAgenda({ ...p, tipo: 'PetSitter' })}
            onClose={() => setReportOpen(false)}
            title="Relatório de visitas"
            description="Visitas domiciliares de hoje e próximas."
            stats={[
              { label: 'Visitas hoje', value: deHoje.length },
              { label: 'Concluídas', value: concluidas },
              { label: 'Pendentes', value: deHoje.length - concluidas },
            ]}
            items={visitas.map((v) => ({
              id: v.id,
              when: `${formatDateBr(v.dataInicio).slice(0, 5)} ${v.hora}`,
              title: `${lookup.pet(v.petId)?.nome ?? 'Pet'} · ${v.periodo}`,
              detail: `${v.servico} · ${v.endereco}`,
              status: v.status,
            }))}
          />
        </>
      )}
    </Page>
  )
}
