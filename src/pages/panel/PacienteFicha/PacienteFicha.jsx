import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Chip, StatusChip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ConfirmDialog } from '../../../components/ui/Dialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import {
  DownloadIcon,
  PawOutline,
  PencilIcon,
  PillIcon,
  RulerIcon,
  TrashIcon,
} from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { relatoriosService } from '../../../services/gestaoService.js'
import { formatDateBr } from '../../../utils/dates.js'
import { formatNumber, formatQuantidade } from '../../../utils/numbers.js'
import { Alimentacao, Medicoes, Tratamentos } from './CuidadosPaciente.jsx'
import styles from './PacienteFicha.module.css'

const HISTORY = [
  'consultas',
  'vacinas',
  'cirurgias',
  'banhos',
  'visitas',
  'emergencias',
  'medicoes',
  'prescricoes',
  'planosAlimentares',
]

function historyOf(data, petId) {
  if (!data) return []
  const rows = [
    ...data.consultas
      .filter((x) => x.petId === petId)
      .map((x) => ({ id: x.id, data: x.data, hora: x.hora, tipo: 'Consulta', texto: x.motivo, status: x.status })),
    ...data.vacinas
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.data,
        hora: x.hora,
        tipo: 'Vacina',
        texto: `${x.nome} · ${x.dose}`,
        status: x.status,
      })),
    ...data.cirurgias
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.data,
        hora: x.hora,
        tipo: 'Cirurgia',
        texto: x.procedimento,
        status: x.status,
      })),
    ...data.banhos
      .filter((x) => x.petId === petId)
      .map((x) => ({ id: x.id, data: x.data, hora: x.hora, tipo: 'Banho e tosa', texto: x.servico, status: x.status })),
    ...data.visitas
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.dataInicio,
        hora: x.hora,
        tipo: 'Visita de pet sitter',
        texto: x.servico,
        status: x.status,
      })),
    ...data.emergencias
      .filter((x) => x.petId === petId)
      .map((x) => ({ id: x.id, data: x.data, hora: x.hora, tipo: 'Emergência', texto: x.motivo, status: x.status })),
    ...data.medicoes
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.criadoEm.slice(0, 10),
        hora: x.criadoEm.slice(11, 16),
        tipo: 'Prótese 3D',
        texto: `Membro ${formatNumber(x.comprimentoMembro, 1)} cm · Altura ${formatNumber(x.alturaChao, 1)} cm · Pata ${formatNumber(x.larguraPata, 1)} cm`,
      })),
    ...data.prescricoes
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.criadoEm.slice(0, 10),
        hora: x.criadoEm.slice(11, 16),
        tipo: 'Prescrição',
        texto: `${x.medicamento} · ${formatQuantidade(x.quantidadePorDose, x.unidade)} a cada ${x.intervaloHoras} h por ${x.duracaoDias} ${x.duracaoDias === 1 ? 'dia' : 'dias'}`,
      })),
    ...data.planosAlimentares
      .filter((x) => x.petId === petId)
      .map((x) => ({
        id: x.id,
        data: x.criadoEm.slice(0, 10),
        hora: x.criadoEm.slice(11, 16),
        tipo: 'Plano alimentar',
        texto: `${formatNumber(x.gramasDia, x.gramasDia < 100 ? 1 : 0)} g/dia de ${x.racao}`,
      })),
  ]
  return rows.sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))
}

export function PacienteFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, loading, error, reload, lookup, patchLocal } = useClinic(HISTORY)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [baixando, setBaixando] = useState(false)

  const baixarFicha = async () => {
    setBaixando(true)
    try {
      await relatoriosService.pdfPaciente(id)
      toast.success('Ficha em PDF baixada.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBaixando(false)
    }
  }

  const pet = lookup.pet(id)
  const tutor = lookup.tutor(pet?.tutorId)
  const history = useMemo(() => historyOf(data, id), [data, id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await dataService.remove('pets', id)
      toast.success(`${pet.nome} foi removido(a) dos pacientes.`)
      navigate('/pacientes', { replace: true })
    } catch (err) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Page title="Ficha do paciente">
        <LoadingState />
      </Page>
    )
  }

  if (error || !pet) {
    return (
      <Page title="Ficha do paciente">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <EmptyState
            title="Paciente não encontrado"
            action={<PillButton to="/pacientes">Voltar aos pacientes</PillButton>}
          >
            Esse cadastro pode ter sido removido.
          </EmptyState>
        )}
      </Page>
    )
  }

  const info = [
    ['Espécie', pet.especie],
    ['Raça', pet.raca],
    ['Idade', pet.idade],
    ['Sexo', pet.sexo],
    ['Peso', pet.peso ? `${pet.peso} kg` : ''],
    ['Tutor(a)', tutor?.nome],
    ['Telefone', tutor?.telefone],
    ['Endereço', tutor?.endereco],
  ].filter(([, value]) => value)

  return (
    <Page title="Ficha do paciente">
      <section className={styles.perfil}>
        <div className={styles.foto}>
          {lookup.petPhoto(pet.id) ? (
            <img src={lookup.petPhoto(pet.id)} alt={`Foto de ${pet.nome}`} />
          ) : (
            <PawOutline className={styles.semFoto} />
          )}
        </div>
        <div className={styles.dados}>
          <div className={styles.nomeLinha}>
            <h2 className={styles.nome}>{pet.nome}</h2>
            {pet.idade && <Chip>{pet.idade}</Chip>}
          </div>
          <dl className={styles.info}>
            {info.map(([label, value]) => (
              <div key={label} className={label === 'Endereço' ? styles.infoLonga : undefined}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {pet.observacoes && <p className={styles.obs}>{pet.observacoes}</p>}
          <div className={styles.acoes}>
            <PillButton to={`/pacientes/${pet.id}/editar`}>
              <PencilIcon size={15} />
              Editar ficha
            </PillButton>
            <PillButton variant="contorno" to={`/calculadoras/dose?pet=${encodeURIComponent(pet.id)}`}>
              <PillIcon size={15} />
              Calcular dose
            </PillButton>
            <PillButton variant="contorno" to={`/protese-3d?pet=${encodeURIComponent(pet.id)}`}>
              <RulerIcon size={15} />
              Medir prótese 3D
            </PillButton>
            <PillButton variant="contorno" onClick={baixarFicha} loading={baixando}>
              <DownloadIcon size={15} />
              Ficha em PDF
            </PillButton>
            <PillButton variant="perigo" onClick={() => setConfirming(true)}>
              <TrashIcon size={15} />
              Excluir
            </PillButton>
          </div>
        </div>
      </section>

      <div className={styles.cuidados}>
        <Tratamentos
          pet={pet}
          prescricoes={data.prescricoes.filter((p) => p.petId === pet.id)}
          patchLocal={patchLocal}
        />
        <Alimentacao
          pet={pet}
          planos={data.planosAlimentares.filter((p) => p.petId === pet.id)}
          patchLocal={patchLocal}
        />
        <Medicoes pet={pet} medicoes={data.medicoes.filter((m) => m.petId === pet.id)} patchLocal={patchLocal} />
      </div>

      <section className={styles.historico} aria-labelledby="titulo-historico">
        <h2 id="titulo-historico" className={styles.subtitulo}>
          Histórico de atendimentos
        </h2>
        {history.length === 0 ? (
          <p className={styles.vazio}>Nenhum atendimento registrado para este paciente.</p>
        ) : (
          <ol className={styles.linhaTempo}>
            {history.map((item) => (
              <li key={`${item.tipo}-${item.id}`}>
                <span className={styles.quando}>
                  {formatDateBr(item.data)}
                  <small>{item.hora}</small>
                </span>
                <span className={styles.evento}>
                  <Chip tone="tag" size="xs">
                    {item.tipo}
                  </Chip>
                  <strong>{item.texto}</strong>
                </span>
                {item.status && <StatusChip status={item.status} />}
              </li>
            ))}
          </ol>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir ${pet.nome}?`}
        message="A ficha sai da lista de pacientes junto com as prescrições, planos alimentares e medições. Consultas, vacinas e demais agendamentos continuam nos registros da clínica."
        confirmLabel="Excluir paciente"
      />
    </Page>
  )
}
