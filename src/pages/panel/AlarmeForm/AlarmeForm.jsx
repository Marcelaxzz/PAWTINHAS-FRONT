import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { ConfirmDialog } from '../../../components/ui/Dialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ClockIcon, TrashIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { formatDateBr, isValidTime, maskDate, maskTime, parseDateBr, todayIso } from '../../../utils/dates.js'
import { OPCOES_RECORRENCIA, RECORRENCIAS, proximoToque, resumoDoAlarme, textoDoToque } from '../../../utils/alarmes.js'
import formStyles from '../../../components/ResourceForm/ResourceForm.module.css'
import styles from './AlarmeForm.module.css'
import { avisarAlarmesMudaram } from '../../../components/AlarmesNoNavegador/alarmesNoNavegador.js'

export function AlarmeForm() {
  const { id } = useParams()
  const { data, loading, error, reload } = useClinic(['alarmes'])
  const editing = Boolean(id)
  const alarme = data?.alarmes.find((a) => a.id === id)
  const title = editing ? 'Editar alarme' : 'Novo alarme'

  return (
    <Page
      title={title}
      subtitle={
        editing
          ? 'Atualize o lembrete. O ESP32 e o app recebem a mudança em instantes.'
          : 'Toca no ESP32, no app do celular e no painel aberto no navegador.'
      }
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && editing && !alarme && (
        <EmptyState title="Alarme não encontrado" action={<PillButton to="/alarmes">Voltar aos alarmes</PillButton>}>
          Ele pode ter sido excluído.
        </EmptyState>
      )}
      {data && (!editing || alarme) && <AlarmeFormContent key={id ?? 'novo'} pets={data.pets} alarme={alarme} />}
    </Page>
  )
}

function AlarmeFormContent({ pets, alarme }) {
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef(null)
  const [values, setValues] = useState(() => ({
    nome: alarme?.nome ?? '',
    petId: alarme?.petId ?? '',
    hora: alarme?.hora ?? '',
    recorrencia: alarme?.recorrencia ?? RECORRENCIAS[0],
    inicio: formatDateBr(alarme?.inicio || todayIso()),
    descricao: alarme?.descricao ?? '',
    ativo: alarme?.ativo ?? true,
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Prévia de quando vai tocar, com as mesmas regras do ESP32 e do app.
  const inicioIso = parseDateBr(values.inicio)
  const previa =
    isValidTime(values.hora) && inicioIso
      ? (() => {
          const rascunho = { hora: values.hora, recorrencia: values.recorrencia, inicio: inicioIso }
          const proximo = proximoToque(rascunho, new Date(), 400)
          return `${resumoDoAlarme(rascunho)}. ${proximo ? `Próximo: ${textoDoToque(proximo)}.` : 'Esse dia e horário já passaram.'}`
        })()
      : undefined

  const set = (field) => (event) => {
    const mascara = { hora: maskTime, inicio: maskDate }[field]
    const value = mascara ? mascara(event.target.value) : event.target.value
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
      nome: values.nome.trim() ? '' : 'Dê um nome ao alarme.',
      petId: values.petId ? '' : 'Selecione o pet.',
      hora: isValidTime(values.hora) ? '' : 'Informe um horário válido (hh:mm).',
      inicio: parseDateBr(values.inicio) ? '' : 'Informe a data no formato dd/mm/aaaa.',
    }
    setErrors(nextErrors)
    const first = Object.keys(nextErrors).find((key) => nextErrors[key])
    if (first) {
      formRef.current?.elements.namedItem(first)?.focus()
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...values,
        nome: values.nome.trim(),
        descricao: values.descricao.trim(),
        inicio: parseDateBr(values.inicio),
      }
      if (alarme) await dataService.update('alarmes', alarme.id, payload)
      else await dataService.create('alarmes', payload)
      avisarAlarmesMudaram()
      toast.success(alarme ? 'Alarme atualizado!' : 'Alarme salvo! O ESP32 e o app recebem em instantes.')
      navigate('/alarmes', { replace: true })
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await dataService.remove('alarmes', alarme.id)
      avisarAlarmesMudaram()
      toast.success('Alarme excluído.')
      navigate('/alarmes', { replace: true })
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} className={`${formStyles.cartao} ${styles.cartao}`} onSubmit={handleSubmit} noValidate>
      <FieldGrid>
        <Field
          name="nome"
          label="Nome do alarme"
          variant="creme"
          placeholder="Ex.: Antibiótico da Hayley"
          maxLength={60}
          value={values.nome}
          onChange={set('nome')}
          error={errors.nome}
        />
        <Field
          name="petId"
          label="Paciente"
          as="select"
          placeholder="Selecione o pet correspondente"
          options={[...pets].sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => ({ value: p.id, label: p.nome }))}
          value={values.petId}
          onChange={set('petId')}
          error={errors.petId}
        />
        <Field
          name="hora"
          label="Horário"
          variant="creme"
          icon={ClockIcon}
          placeholder="Ex.: 14:00"
          inputMode="numeric"
          value={values.hora}
          onChange={set('hora')}
          error={errors.hora}
        />
        <Field
          name="recorrencia"
          label="Recorrência / Data"
          as="select"
          options={OPCOES_RECORRENCIA}
          value={values.recorrencia}
          onChange={set('recorrencia')}
        />
        <Field
          name="inicio"
          label={values.recorrencia === 'Somente hoje' ? 'Dia do alarme' : 'Começa em'}
          variant="creme"
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          value={values.inicio}
          onChange={set('inicio')}
          error={errors.inicio}
          hint={previa}
        />
        <Field
          name="descricao"
          label="Descrição"
          span={2}
          variant="creme"
          placeholder="Ex.: Antibiótico a cada 8h, dar junto com a ração"
          maxLength={140}
          value={values.descricao}
          onChange={set('descricao')}
        />
      </FieldGrid>

      <fieldset className={styles.status}>
        <legend>Situação inicial</legend>
        <button
          type="button"
          role="switch"
          aria-checked={values.ativo}
          className={`${styles.chave} ${values.ativo ? styles.ligada : ''}`}
          onClick={() => setValues((prev) => ({ ...prev, ativo: !prev.ativo }))}
        >
          <span className={styles.bolinha} aria-hidden="true" />
          <span className={styles.chaveTexto}>{values.ativo ? 'Ativo (toca no horário)' : 'Pausado (não toca)'}</span>
        </button>
      </fieldset>

      <div className={formStyles.acoes}>
        {alarme && (
          <PillButton variant="perigo" className={styles.excluir} onClick={() => setConfirming(true)} disabled={saving}>
            <TrashIcon size={15} />
            Excluir alarme
          </PillButton>
        )}
        <button type="button" className={formStyles.cancelar} onClick={() => navigate('/alarmes')} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className={formStyles.enviar} disabled={saving} aria-busy={saving || undefined}>
          {saving ? 'Salvando…' : 'Salvar alarme'}
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        loading={saving}
        title="Excluir alarme?"
        message="O lembrete some do painel, do app e do ESP32."
        confirmLabel="Excluir"
      />
    </form>
  )
}
