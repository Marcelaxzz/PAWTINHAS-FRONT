import { useMemo, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { AGENDA_TABS } from '../agendaTabs.js'
import { PetCard } from '../../../components/ui/PetCard.jsx'
import { Chip, StatusChip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { Dialog } from '../../../components/ui/Dialog.jsx'
import { RecordDialog } from '../../../components/ui/RecordDialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PawOutline, ShieldCheckIcon, StethoscopeIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useRecordActions } from '../../../hooks/useRecordActions.js'
import { compareSchedule, formatDateBr, relativeDayLabel, todayIso } from '../../../utils/dates.js'
import styles from './ConsultasVacinas.module.css'

const STATUS_CONSULTA = ['Agendado', 'Em andamento', 'Concluído', 'Cancelado']
const STATUS_VACINA = ['Agendado', 'Pendente', 'Aplicada', 'Cancelado']

export function ConsultasVacinas() {
  const { data, loading, error, reload, lookup, patchLocal } = useClinic(['consultas', 'vacinas'])
  const consultaActions = useRecordActions('consultas', patchLocal)
  const vacinaActions = useRecordActions('vacinas', patchLocal)
  const [consultaId, setConsultaId] = useState(null)
  const [comprovanteId, setComprovanteId] = useState(null)
  const [vacinaId, setVacinaId] = useState(null)
  const [aplicando, setAplicando] = useState(null)

  const hoje = todayIso()
  const consultas = useMemo(
    () => (data ? data.consultas.filter((c) => c.data >= hoje).sort(compareSchedule) : []),
    [data, hoje],
  )
  const vacinas = useMemo(
    () => (data ? data.vacinas.filter((v) => v.data >= hoje).sort(compareSchedule) : []),
    [data, hoje],
  )
  const consultasHoje = consultas.filter((c) => c.data === hoje && c.status !== 'Cancelado')
  const vacinasPendentes = vacinas.filter(
    (v) => v.data === hoje && v.status !== 'Cancelado' && v.status !== 'Aplicada',
  ).length

  const consulta = data?.consultas.find((c) => c.id === consultaId)
  const comprovante = data?.vacinas.find((v) => v.id === comprovanteId)
  const vacina = data?.vacinas.find((v) => v.id === vacinaId)

  const registrarAplicacao = async (vacina) => {
    setAplicando(vacina.id)
    try {
      const agora = new Date()
      const stamp = `${hoje}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
      await vacinaActions.update(vacina.id, { status: 'Aplicada', aplicadaEm: stamp }, 'Aplicação registrada!')
    } catch {
      /* aviso já exibido */
    } finally {
      setAplicando(null)
    }
  }

  const petTitle = (petId) => {
    const pet = lookup.pet(petId)
    return pet ? `${pet.nome}, ${pet.idade}` : 'Pet removido'
  }

  return (
    <Page
      title="Consultas & Vacinas"
      subtitle="Consultas e aplicações de vacina do dia."
      tabs={AGENDA_TABS}
      width="largo"
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className={styles.colunas}>
            <section aria-labelledby="titulo-consultas" id="consultas" className={styles.coluna}>
              <h2 id="titulo-consultas" className={styles.subtitulo}>
                <StethoscopeIcon size={22} />
                Consultas de hoje
              </h2>
              {consultas.length === 0 ? (
                <EmptyState title="Sem consultas">Nenhuma consulta agendada.</EmptyState>
              ) : (
                consultas.map((c) => (
                  <PetCard
                    key={c.id}
                    avatar={80}
                    variant="branco"
                    titleSize="sm"
                    photo={lookup.photoOf(c)}
                    title={petTitle(c.petId)}
                    badges={c.status !== 'Agendado' ? <StatusChip status={c.status} /> : null}
                    actions={
                      <PillButton
                        variant="contorno"
                        size="sm"
                        className={styles.botaoDetalhe}
                        onClick={() => setConsultaId(c.id)}
                      >
                        Detalhes
                      </PillButton>
                    }
                  >
                    <p className={styles.dono}>Dono(a): {lookup.tutor(c.tutorId)?.nome ?? '-'}</p>
                    <div className={styles.meta}>
                      <Chip tone="tag" size="xs">
                        {c.motivo}
                      </Chip>
                      <span className={styles.hora}>
                        {c.data === hoje ? c.hora : `${relativeDayLabel(c.data)} ${c.hora}`}
                      </span>
                    </div>
                  </PetCard>
                ))
              )}
            </section>

            <section aria-labelledby="titulo-vacinas" id="vacinas" className={styles.coluna}>
              <h2 id="titulo-vacinas" className={styles.subtitulo}>
                <ShieldCheckIcon size={22} />
                Vacinas de hoje
              </h2>
              {vacinas.length === 0 ? (
                <EmptyState title="Sem vacinas">Nenhuma vacina agendada.</EmptyState>
              ) : (
                vacinas.map((v) => (
                  <PetCard
                    key={v.id}
                    avatar={80}
                    titleSize="sm"
                    photo={lookup.photoOf(v)}
                    title={petTitle(v.petId)}
                    actions={
                      <div className={styles.acoesVacina}>
                        {v.status === 'Aplicada' ? (
                          <PillButton variant="contorno" size="sm" onClick={() => setComprovanteId(v.id)}>
                            Ver comprovante
                          </PillButton>
                        ) : (
                          <PillButton
                            size="sm"
                            loading={aplicando === v.id}
                            onClick={() => registrarAplicacao(v)}
                            disabled={v.status === 'Cancelado'}
                          >
                            Registrar aplicação
                          </PillButton>
                        )}
                        <PillButton variant="fantasma" size="sm" onClick={() => setVacinaId(v.id)}>
                          Detalhes
                        </PillButton>
                      </div>
                    }
                  >
                    <p className={styles.dono}>Dono(a): {lookup.tutor(v.tutorId)?.nome ?? '-'}</p>
                    <div className={styles.meta}>
                      <Chip tone="neutro" size="xs">
                        {v.nome}
                      </Chip>
                      <span className={`${styles.status} ${styles[`status${v.status}`] ?? ''}`}>
                        {v.data === hoje ? v.status : `${v.status} · ${relativeDayLabel(v.data)}`}
                      </span>
                    </div>
                  </PetCard>
                ))
              )}
            </section>
          </div>

          <div className={styles.rodape}>
            <SummaryBar
              className={styles.resumo}
              actions={
                <PillButton size="sm" to="/agenda/consultas/nova">
                  Agendar consulta
                </PillButton>
              }
            >
              {consultasHoje.length === 0
                ? 'Nenhuma consulta hoje.'
                : `${consultasHoje.length} ${consultasHoje.length === 1 ? 'consulta' : 'consultas'} hoje.`}
            </SummaryBar>
            <SummaryBar
              className={styles.resumo}
              actions={
                <PillButton size="sm" to="/agenda/vacinas/nova">
                  Agendar vacina
                </PillButton>
              }
            >
              {vacinasPendentes === 0
                ? 'Nenhuma vacina pendente hoje.'
                : `${vacinasPendentes} ${vacinasPendentes === 1 ? 'vacina pendente' : 'vacinas pendentes'} hoje.`}
            </SummaryBar>
          </div>

          {consulta && (
            <RecordDialog
              open={Boolean(consultaId)}
              eventoId={consultaId}
              onClose={() => setConsultaId(null)}
              title={lookup.pet(consulta.petId)?.nome ?? 'Consulta'}
              subtitle={consulta.motivo}
              photo={lookup.photoOf(consulta)}
              status={consulta.status}
              statusOptions={STATUS_CONSULTA}
              onStatusChange={(status) =>
                consultaActions.update(consulta.id, { status }, 'Status da consulta atualizado.')
              }
              onDelete={async () => {
                await consultaActions.remove(consulta.id, 'Consulta excluída.')
                setConsultaId(null)
              }}
              editTo={`/agenda/consultas/${consulta.id}/editar`}
              rows={[
                { label: 'Data', value: `${formatDateBr(consulta.data)} às ${consulta.hora}` },
                { label: 'Veterinário(a)', value: lookup.staff(consulta.veterinarioId)?.nome },
                { label: 'Tutor(a)', value: lookup.tutor(consulta.tutorId)?.nome },
                { label: 'Telefone do tutor', value: lookup.tutor(consulta.tutorId)?.telefone },
                { label: 'Observações', value: consulta.observacoes || 'Sem observações.' },
              ]}
            />
          )}

          {vacina && (
            <RecordDialog
              open={Boolean(vacinaId)}
              eventoId={vacinaId}
              onClose={() => setVacinaId(null)}
              title={lookup.pet(vacina.petId)?.nome ?? 'Vacina'}
              subtitle={`${vacina.nome} · ${vacina.dose}`}
              photo={lookup.photoOf(vacina)}
              status={vacina.status}
              statusOptions={STATUS_VACINA}
              onStatusChange={(status) => vacinaActions.update(vacina.id, { status }, 'Status da vacina atualizado.')}
              onDelete={async () => {
                await vacinaActions.remove(vacina.id, 'Vacina excluída.')
                setVacinaId(null)
              }}
              editTo={`/agenda/vacinas/${vacina.id}/editar`}
              rows={[
                { label: 'Data', value: `${formatDateBr(vacina.data)} às ${vacina.hora}` },
                { label: 'Profissional', value: lookup.staff(vacina.profissionalId)?.nome },
                { label: 'Tutor(a)', value: lookup.tutor(vacina.tutorId)?.nome },
                { label: 'Telefone do tutor', value: lookup.tutor(vacina.tutorId)?.telefone },
                { label: 'Observações', value: vacina.observacoes || 'Sem observações.' },
              ]}
            />
          )}

          {comprovante && (
            <Dialog
              open={Boolean(comprovanteId)}
              onClose={() => setComprovanteId(null)}
              title="Comprovante de vacinação"
              footer={
                <>
                  <PillButton variant="contorno" onClick={() => window.print()}>
                    Imprimir
                  </PillButton>
                  <PillButton onClick={() => setComprovanteId(null)}>Fechar</PillButton>
                </>
              }
            >
              <div className={styles.comprovante}>
                <PawOutline className={styles.comprovanteMarca} />
                <p className={styles.comprovanteClinica}>Clínica Pawtinhas</p>
                <dl>
                  <div>
                    <dt>Paciente</dt>
                    <dd>{lookup.pet(comprovante.petId)?.nome}</dd>
                  </div>
                  <div>
                    <dt>Tutor(a)</dt>
                    <dd>{lookup.tutor(comprovante.tutorId)?.nome}</dd>
                  </div>
                  <div>
                    <dt>Vacina</dt>
                    <dd>
                      {comprovante.nome} · {comprovante.dose}
                    </dd>
                  </div>
                  <div>
                    <dt>Aplicada em</dt>
                    <dd>
                      {comprovante.aplicadaEm
                        ? `${formatDateBr(comprovante.aplicadaEm.slice(0, 10))} às ${comprovante.aplicadaEm.slice(11, 16)}`
                        : formatDateBr(comprovante.data)}
                    </dd>
                  </div>
                  <div>
                    <dt>Responsável</dt>
                    <dd>{lookup.staff(comprovante.profissionalId)?.nome}</dd>
                  </div>
                  {comprovante.observacoes && (
                    <div>
                      <dt>Observações</dt>
                      <dd>{comprovante.observacoes}</dd>
                    </div>
                  )}
                </dl>
                <StatusChip status="Aplicada" size="md" />
              </div>
            </Dialog>
          )}
        </>
      )}
    </Page>
  )
}
