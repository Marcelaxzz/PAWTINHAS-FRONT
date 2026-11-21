import { useMemo, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { AGENDA_TABS } from '../agendaTabs.js'
import { InfoLine, PetCard } from '../../../components/ui/PetCard.jsx'
import { Chip, StatusChip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { RecordDialog, ReportDialog } from '../../../components/ui/RecordDialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { ChevronDownIcon, SearchIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useRecordActions } from '../../../hooks/useRecordActions.js'
import { formatDateBr, relativeDayLabel } from '../../../utils/dates.js'
import { normalize } from '../../../utils/text.js'
import lists from '../panelLists.module.css'
import { relatoriosService } from '../../../services/gestaoService.js'

const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica']
const STATUS = ['Em atendimento', 'Estabilizado', 'Alta médica']
const PESO = { 'Em atendimento': 0, Estabilizado: 1, 'Alta médica': 2 }

function entryLabel(e) {
  const day = relativeDayLabel(e.data)
  return day === 'Hoje' ? e.hora : `${day.toLowerCase()} ${e.hora}`
}

export function Emergencias() {
  const { data, loading, error, reload, lookup, patchLocal } = useClinic(['emergencias'])
  const { update, remove } = useRecordActions('emergencias', patchLocal)
  const [busca, setBusca] = useState('')
  const [gravidade, setGravidade] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)

  const all = useMemo(
    () =>
      data
        ? [...data.emergencias].sort(
            (a, b) => PESO[a.status] - PESO[b.status] || `${b.data}${b.hora}`.localeCompare(`${a.data}${a.hora}`),
          )
        : [],
    [data],
  )

  const filtered = all.filter((e) => {
    const termo = normalize(busca)
    const petNome = lookup.pet(e.petId)?.nome ?? e.petNome
    const tutor = lookup.tutor(e.tutorId)?.nome ?? ''
    const okBusca = !termo || normalize(`${petNome} ${tutor}`).includes(termo)
    return okBusca && (!gravidade || e.prioridade === gravidade)
  })

  const count = (status) => all.filter((e) => e.status === status).length
  const selected = data?.emergencias.find((e) => e.id === selectedId)
  const petName = (e) => lookup.pet(e.petId)?.nome || e.petNome || 'Pet não cadastrado'

  return (
    <Page title="Emergências" subtitle="Atendimentos de urgência em andamento e recentes." tabs={AGENDA_TABS}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className={lists.filtros} role="search">
            <label className={lists.busca}>
              <SearchIcon size={15} />
              <span className="visualmente-oculto">Filtrar por nome do pet ou tutor</span>
              <input
                type="search"
                placeholder="Filtrar por nome do pet ou tutor..."
                value={busca}
                maxLength={60}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
            <label className={lists.selectFiltro}>
              <span className="visualmente-oculto">Gravidade</span>
              <select value={gravidade} onChange={(event) => setGravidade(event.target.value)}>
                <option value="">Gravidade: Todos</option>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    Gravidade: {p}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={14} />
            </label>
            <PillButton className={lists.filtroAcao} to="/agenda/emergencias/nova">
              + Registrar emergência
            </PillButton>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title={all.length ? 'Nenhum resultado' : 'Nenhuma emergência registrada'}>
              {all.length ? 'Tente outro nome ou gravidade.' : 'Que bom! Nenhum pawtinha em emergência.'}
            </EmptyState>
          ) : (
            <div className={lists.lista}>
              {filtered.map((e) => {
                const pet = lookup.pet(e.petId)
                return (
                  <PetCard
                    key={e.id}
                    photo={lookup.photoOf(e)}
                    title={petName(e)}
                    badges={
                      <>
                        {pet?.raca && <Chip size="sm">{pet.raca}</Chip>}
                        <StatusChip status={e.status} />
                      </>
                    }
                    actions={
                      <PillButton size="lg" onClick={() => setSelectedId(e.id)}>
                        Detalhes
                      </PillButton>
                    }
                  >
                    <InfoLine label="Caso:">{e.motivo}</InfoLine>
                    <InfoLine label="Tutor(a):">{lookup.tutor(e.tutorId)?.nome ?? 'Não informado'}</InfoLine>
                    <InfoLine label="Entrada:" tone="cafe">
                      {entryLabel(e)}
                    </InfoLine>
                  </PetCard>
                )
              })}
            </div>
          )}

          <SummaryBar
            actions={
              <PillButton variant="contorno" onClick={() => setReportOpen(true)}>
                Relatório
              </PillButton>
            }
          >
            Resumo: {count('Em atendimento')} {count('Em atendimento') === 1 ? 'emergência' : 'emergências'} em
            atendimento, {count('Estabilizado')} {count('Estabilizado') === 1 ? 'estabilizada' : 'estabilizadas'},{' '}
            {count('Alta médica')} com alta médica.
          </SummaryBar>

          {selected && (
            <RecordDialog
              open={Boolean(selectedId)}
              eventoId={selectedId}
              onClose={() => setSelectedId(null)}
              title={petName(selected)}
              subtitle={`Caso: ${selected.motivo}`}
              photo={lookup.photoOf(selected)}
              status={selected.status}
              statusOptions={STATUS}
              onStatusChange={(status) => update(selected.id, { status }, 'Status da emergência atualizado.')}
              onDelete={async () => {
                await remove(selected.id, 'Registro de emergência excluído.')
                setSelectedId(null)
              }}
              editTo={`/agenda/emergencias/${selected.id}/editar`}
              deleteLabel="Excluir registro"
              rows={[
                { label: 'Entrada', value: `${formatDateBr(selected.data)} às ${selected.hora}` },
                { label: 'Prioridade', value: selected.prioridade },
                { label: 'Tutor(a)', value: lookup.tutor(selected.tutorId)?.nome },
                { label: 'Telefone do tutor', value: lookup.tutor(selected.tutorId)?.telefone },
                { label: 'Observações de triagem', value: selected.observacoes || 'Sem observações.' },
              ]}
            />
          )}

          <ReportDialog
            open={reportOpen}
            pdf={(p) => relatoriosService.pdfAgenda({ ...p, tipo: 'Emergencia' })}
            onClose={() => setReportOpen(false)}
            title="Relatório de emergências"
            stats={STATUS.map((s) => ({ label: s, value: count(s) }))}
            items={all.map((e) => ({
              id: e.id,
              when: `${formatDateBr(e.data).slice(0, 5)} ${e.hora}`,
              title: `${petName(e)} · ${e.prioridade}`,
              detail: e.motivo,
              status: e.status,
            }))}
          />
        </>
      )}
    </Page>
  )
}
