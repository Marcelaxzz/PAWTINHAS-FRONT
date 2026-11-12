import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../ui/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../ui/States.jsx'
import { PillButton } from '../ui/PillButton.jsx'
import { ClockIcon } from '../Icons/Icons.jsx'
import { useClinic } from '../../hooks/useClinic.js'
import { useToast } from '../../hooks/useToast.js'
import { dataService } from '../../services/dataService.js'
import { formatDateBr, isValidTime, maskDate, maskTime, parseDateBr, todayIso } from '../../utils/dates.js'
import { NEW_PET } from './constants.js'
import styles from './ResourceForm.module.css'

function optionsFor(field, data) {
  if (field.type === 'pet') {
    const pets = [...(data?.pets ?? [])].sort((a, b) => a.nome.localeCompare(b.nome))
    const options = pets.map((p) => ({ value: p.id, label: `${p.nome} · ${p.especie}` }))
    return field.allowUnregistered ? [...options, { value: NEW_PET, label: 'Pet não cadastrado' }] : options
  }
  if (field.type === 'tutor') {
    return [...(data?.tutores ?? [])]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((t) => ({ value: t.id, label: t.nome }))
  }
  if (field.type === 'staff') {
    return (data?.profissionais ?? [])
      .filter((s) => !field.roles || field.roles.includes(s.funcao))
      .map((s) => ({ value: s.id, label: `${s.nome} · ${s.funcao}` }))
  }
  return (field.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
}

function validate(field, value, values, editing) {
  const text = typeof value === 'string' ? value.trim() : value
  if (field.when && !field.when(values)) return ''
  if (field.required && !text) return field.requiredMessage ?? 'Campo obrigatório.'
  if (!text) return ''
  if (field.type === 'date') {
    const iso = parseDateBr(text)
    if (!iso) return 'Informe uma data válida (dd/mm/aaaa).'
    // Na edição, um agendamento antigo pode manter a data original.
    if (field.future && !editing && iso < todayIso()) return 'A data não pode estar no passado.'
    if (field.after && values[field.after]) {
      const start = parseDateBr(values[field.after])
      if (start && iso < start) return 'A data final deve ser depois da inicial.'
    }
  }
  if (field.type === 'time' && !isValidTime(text)) return 'Informe um horário válido (hh:mm).'
  if (field.type === 'datetime') {
    const [date, time] = text.split(' - ')
    if (!parseDateBr(date ?? '') || !isValidTime(time ?? '')) return 'Use o formato dd/mm/aaaa - hh:mm.'
  }
  if (field.maxLength && text.length > field.maxLength) return `Use no máximo ${field.maxLength} caracteres.`
  if (field.validate) return field.validate(text, values)
  return ''
}

function maskDateTime(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  const date = maskDate(digits.slice(0, 8))
  if (digits.length <= 8) return date
  return `${date} - ${maskTime(digits.slice(8))}`
}

/** Valores do formulário a partir de um registro salvo (datas ISO viram dd/mm/aaaa). */
function defaultFromRecord(record, fields) {
  return Object.fromEntries(
    fields.map((f) => [
      f.name,
      f.type === 'date' ? formatDateBr(record[f.name]) : (record[f.name] ?? f.defaultValue ?? ''),
    ]),
  )
}

/**
 * Formulário de agendamento configurável por campos. Com `recordId`, edita o registro.
 * fields: [{ name, label, type, placeholder, required, span, options, roles, ... }]
 * toPayload(values, ctx): monta o objeto salvo no recurso.
 * fromRecord(record): valores iniciais na edição (padrão: mesmos nomes dos campos).
 */
export function ResourceForm({
  title,
  subtitle,
  resource,
  recordId,
  fromRecord,
  extraResources = [],
  redirectTo,
  ...props
}) {
  const editing = Boolean(recordId)
  const clinic = useClinic(editing ? [...extraResources, resource] : extraResources)
  const { data, loading, error, reload } = clinic
  const record = editing ? data?.[resource]?.find((r) => r.id === recordId) : null

  return (
    <Page title={title} subtitle={subtitle}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && editing && !record && (
        <EmptyState title="Registro não encontrado" action={<PillButton to={redirectTo}>Voltar</PillButton>}>
          Ele pode ter sido excluído.
        </EmptyState>
      )}
      {data && (!editing || record) && (
        <ResourceFormContent
          key={recordId ?? 'novo'}
          {...props}
          resource={resource}
          redirectTo={redirectTo}
          clinic={clinic}
          record={record}
          initialValues={
            record ? (fromRecord ?? ((r) => defaultFromRecord(r, props.fields)))(record) : props.initialValues
          }
        />
      )}
    </Page>
  )
}

function ResourceFormContent({
  resource,
  fields,
  initialValues,
  toPayload,
  submitLabel,
  successMessage,
  redirectTo,
  footerExtra,
  clinic,
  record,
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const { data, lookup } = clinic
  const formRef = useRef(null)
  const editing = Boolean(record)

  const [values, setValues] = useState(() => {
    const base = Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? '']))
    const fromQuery = params.get('pet')
    return { ...base, ...(fromQuery && 'petId' in base ? { petId: fromQuery } : {}), ...initialValues }
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const optionMap = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, optionsFor(f, data)])), [fields, data])

  const set = (field, raw) => {
    let value = raw
    if (field.type === 'date') value = maskDate(raw)
    if (field.type === 'time') value = maskTime(raw)
    if (field.type === 'datetime') value = maskDateTime(raw)

    setValues((prev) => {
      const next = { ...prev, [field.name]: value }
      // Ao escolher o pet, preenche o tutor responsável automaticamente.
      if (field.type === 'pet' && 'tutorId' in prev) {
        const tutorId = lookup.pet(value)?.tutorId
        if (tutorId) next.tutorId = tutorId
      }
      if (field.type === 'pet' && field.fillAddress && 'endereco' in prev) {
        const endereco = lookup.tutorOfPet(value)?.endereco
        if (endereco && !prev.endereco) next.endereco = endereco
      }
      return next
    })
    if (errors[field.name])
      setErrors((prev) => ({
        ...prev,
        [field.name]: validate(field, value, { ...values, [field.name]: value }, editing),
      }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    const nextErrors = Object.fromEntries(fields.map((f) => [f.name, validate(f, values[f.name], values, editing)]))
    setErrors(nextErrors)
    const firstInvalid = fields.find((f) => nextErrors[f.name])
    if (firstInvalid) {
      formRef.current?.elements.namedItem(firstInvalid.name)?.focus()
      return
    }

    setSaving(true)
    try {
      const payload = toPayload(values, { lookup })
      if (editing) await dataService.update(resource, record.id, payload)
      else await dataService.create(resource, payload)
      toast.success(editing ? 'Alterações salvas!' : successMessage)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err.fields) setErrors((prev) => ({ ...prev, ...err.fields }))
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} className={styles.cartao} onSubmit={handleSubmit} noValidate>
      <FieldGrid>
        {fields
          .filter((field) => !field.when || field.when(values))
          .map((field) => {
            const isSelect = ['pet', 'tutor', 'staff', 'select'].includes(field.type)
            return (
              <Field
                key={field.name}
                name={field.name}
                label={field.label}
                as={isSelect ? 'select' : field.type === 'textarea' ? 'textarea' : 'input'}
                options={optionMap[field.name]}
                placeholder={field.placeholder}
                required={field.required}
                span={field.span}
                icon={field.type === 'time' && field.withIcon ? ClockIcon : undefined}
                inputMode={['date', 'time', 'datetime'].includes(field.type) ? 'numeric' : undefined}
                autoComplete="off"
                maxLength={field.maxLength}
                value={values[field.name]}
                error={errors[field.name]}
                hint={field.hint}
                onChange={(event) => set(field, event.target.value)}
              />
            )
          })}
      </FieldGrid>

      {footerExtra?.(values, setValues)}

      <div className={styles.acoes}>
        <button type="button" className={styles.cancelar} onClick={() => navigate(redirectTo)} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className={styles.enviar} disabled={saving} aria-busy={saving || undefined}>
          {saving ? 'Salvando…' : editing ? 'Salvar alterações' : submitLabel}
        </button>
      </div>
    </form>
  )
}
