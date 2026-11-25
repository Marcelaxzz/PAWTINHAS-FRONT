import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { InfoLine, PetCard } from '../../../components/ui/PetCard.jsx'
import { Chip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { ReportDialog } from '../../../components/ui/RecordDialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { ChevronDownIcon, SearchIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { normalize } from '../../../utils/text.js'
import { aniversario, tomDaEspecie } from '../../../utils/enfeites.js'
import { PACIENTES_TABS } from '../pacientesTabs.js'
import lists from '../panelLists.module.css'
import styles from './Pacientes.module.css'

export function Pacientes() {
  const { data, loading, error, reload, lookup } = useClinic()
  const [params, setParams] = useSearchParams()
  const [especie, setEspecie] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const busca = params.get('busca') ?? ''

  const setBusca = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('busca', value.slice(0, 80))
    else next.delete('busca')
    setParams(next, { replace: true })
  }

  const pets = useMemo(() => data?.pets ?? [], [data])
  const especies = useMemo(() => [...new Set(pets.map((p) => p.especie))].sort(), [pets])

  const filtered = pets.filter((pet) => {
    const termo = normalize(busca)
    const texto = normalize(`${pet.nome} ${pet.raca} ${lookup.tutor(pet.tutorId)?.nome ?? ''}`)
    return (!termo || texto.includes(termo)) && (!especie || pet.especie === especie)
  })

  return (
    <Page title="Pacientes" subtitle="Todos os pawtinhas atendidos pela clínica." tabs={PACIENTES_TABS}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className={lists.filtros} role="search">
            <label className={lists.busca}>
              <SearchIcon size={15} />
              <span className="visualmente-oculto">Filtrar por nome, raça ou tutor</span>
              <input
                type="search"
                placeholder="Filtrar por nome, raça ou tutor..."
                value={busca}
                maxLength={80}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
            <label className={lists.selectFiltro}>
              <span className="visualmente-oculto">Espécie</span>
              <select value={especie} onChange={(event) => setEspecie(event.target.value)}>
                <option value="">Espécie: Todos</option>
                {especies.map((e) => (
                  <option key={e} value={e}>
                    Espécie: {e}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={14} />
            </label>
            <PillButton className={lists.filtroAcao} to="/pacientes/novo">
              + Novo paciente
            </PillButton>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={pets.length ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              action={!pets.length && <PillButton to="/pacientes/novo">Cadastrar paciente</PillButton>}
            >
              {pets.length
                ? 'Confira o nome digitado ou limpe os filtros.'
                : 'Cadastre o primeiro pawtinha da clínica.'}
            </EmptyState>
          ) : (
            <div className={lists.grade2}>
              {filtered.map((pet) => (
                <PetCard
                  key={pet.id}
                  avatar={96}
                  photo={lookup.petPhoto(pet.id)}
                  especie={pet.especie}
                  title={pet.nome}
                  badges={<EtiquetasDoPet pet={pet} />}
                  actions={
                    <PillButton variant="contorno" size="lg" to={`/pacientes/${pet.id}`} className={styles.ficha}>
                      Abrir ficha
                    </PillButton>
                  }
                >
                  <InfoLine label="Raça:">{pet.raca || '-'}</InfoLine>
                  <InfoLine label="Tutor(a):">{lookup.tutor(pet.tutorId)?.nome ?? '-'}</InfoLine>
                </PetCard>
              ))}
            </div>
          )}

          <SummaryBar
            actions={
              <PillButton variant="contorno" onClick={() => setReportOpen(true)}>
                Relatório
              </PillButton>
            }
          >
            <strong>{pets.length}</strong> {pets.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}.
          </SummaryBar>

          <ReportDialog
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            title="Relatório de pacientes"
            stats={[
              { label: 'Pacientes', value: pets.length },
              ...especies.map((e) => ({ label: `${e}s`, value: pets.filter((p) => p.especie === e).length })),
              { label: 'Tutores', value: new Set(pets.map((p) => p.tutorId)).size },
            ]}
            items={[...pets]
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((p) => ({
                id: p.id,
                when: p.especie,
                title: p.nome,
                detail: `${p.raca} · ${p.idade} · Tutor(a): ${lookup.tutor(p.tutorId)?.nome ?? '-'}`,
              }))}
          />
        </>
      )}
    </Page>
  )
}

/** Espécie na cor dela, idade e, na semana do aniversário, um bolinho. */
function EtiquetasDoPet({ pet }) {
  const festa = aniversario(pet.dataNascimento)
  return (
    <>
      {pet.especie && (
        <Chip size="sm" tone={tomDaEspecie(pet.especie)}>
          {pet.especie}
        </Chip>
      )}
      {pet.idade && <Chip size="sm">{pet.idade}</Chip>}
      {festa && (
        <Chip size="sm" tone="rosa">
          <span aria-hidden="true">🎂</span> {festa.texto}
        </Chip>
      )}
    </>
  )
}
