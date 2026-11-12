import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { PhotoPicker } from '../../../components/PhotoPicker/PhotoPicker.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { photoSrc } from '../../../utils/images.js'
import { maskPhone } from '../../../utils/masks.js'
import { formatDateBr, idadeDe, maskDate, parseDateBr, todayIso } from '../../../utils/dates.js'
import { validatePhone } from '../../../utils/validators.js'
import formStyles from '../../../components/ResourceForm/ResourceForm.module.css'
import styles from './PacienteForm.module.css'

const NEW_TUTOR = '__novo_tutor'
const ESPECIES = ['Cachorro', 'Gato', 'Coelho', 'Ave', 'Roedor', 'Réptil', 'Outro']

export function PacienteForm() {
  const { id } = useParams()
  const { data, loading, error, reload } = useClinic()
  const pet = data?.pets.find((p) => p.id === id)
  const editing = Boolean(id)

  return (
    <Page
      title={editing ? 'Editar paciente' : 'Novo paciente'}
      subtitle={
        editing
          ? 'Atualize as informações da ficha do pawtinha.'
          : 'Preencha a ficha para cadastrar um novo pawtinha na clínica.'
      }
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && editing && !pet && (
        <EmptyState
          title="Paciente não encontrado"
          action={<PillButton to="/pacientes">Voltar aos pacientes</PillButton>}
        />
      )}
      {data && (!editing || pet) && <PacienteFormContent key={id ?? 'novo'} pet={pet} tutoresIniciais={data.tutores} />}
    </Page>
  )
}

function PacienteFormContent({ pet, tutoresIniciais }) {
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef(null)
  const [tutores, setTutores] = useState(tutoresIniciais)
  const [values, setValues] = useState(() => ({
    nome: pet?.nome ?? '',
    especie: pet?.especie ?? 'Cachorro',
    raca: pet?.raca ?? '',
    nascimento: formatDateBr(pet?.dataNascimento),
    sexo: pet?.sexo ?? 'Macho',
    peso: pet?.peso ?? '',
    tutorId: pet?.tutorId ?? '',
    tutorNome: '',
    tutorTelefone: '',
    tutorEndereco: '',
    observacoes: pet?.observacoes ?? '',
    foto: pet?.foto ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const newTutor = values.tutorId === NEW_TUTOR

  const set =
    (field, transform = (v) => v) =>
    (event) => {
      setValues((prev) => ({ ...prev, [field]: transform(event.target.value) }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
      nome: values.nome.trim() ? '' : 'Informe o nome do paciente.',
      raca: values.raca.trim() ? '' : 'Informe a raça (ou SRD).',
      tutorId: values.tutorId ? '' : 'Selecione o tutor responsável.',
      tutorNome: newTutor && !values.tutorNome.trim() ? 'Informe o nome do tutor.' : '',
      tutorTelefone: newTutor ? validatePhone(values.tutorTelefone) : '',
      peso: values.peso && !/^\d{1,3}([.,]\d{1,2})?$/.test(values.peso.trim()) ? 'Use apenas números (ex: 12,5).' : '',
      nascimento: !values.nascimento
        ? ''
        : !parseDateBr(values.nascimento)
          ? 'Use o formato dd/mm/aaaa.'
          : parseDateBr(values.nascimento) > todayIso()
            ? 'A data não pode estar no futuro.'
            : '',
    }
    setErrors(nextErrors)
    const first = Object.keys(nextErrors).find((key) => nextErrors[key])
    if (first) {
      formRef.current?.elements.namedItem(first)?.focus()
      return
    }

    setSaving(true)
    try {
      let tutorId = values.tutorId
      if (newTutor) {
        const tutor = await dataService.create('tutores', {
          nome: values.tutorNome.trim(),
          telefone: values.tutorTelefone,
          endereco: values.tutorEndereco.trim(),
        })
        tutorId = tutor.id
        // Se o cadastro do pet falhar, tentar de novo não cria o tutor duas vezes.
        setTutores((prev) => [...prev, tutor])
        setValues((prev) => ({ ...prev, tutorId }))
      }
      const payload = {
        nome: values.nome.trim(),
        especie: values.especie,
        raca: values.raca.trim(),
        dataNascimento: values.nascimento ? parseDateBr(values.nascimento) : '',
        sexo: values.sexo,
        peso: values.peso.trim().replace('.', ','),
        tutorId,
        observacoes: values.observacoes.trim(),
        foto: values.foto,
      }
      const saved = pet ? await dataService.update('pets', pet.id, payload) : await dataService.create('pets', payload)
      toast.success(pet ? 'Ficha atualizada!' : `${saved.nome} foi cadastrado(a)!`)
      navigate(`/pacientes/${saved.id}`, { replace: true })
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} className={formStyles.cartao} onSubmit={handleSubmit} noValidate>
      <div className={styles.foto}>
        <span className={styles.rotulo}>Foto do paciente</span>
        <PhotoPicker
          value={photoSrc(values.foto)}
          onChange={(foto) => setValues((prev) => ({ ...prev, foto }))}
          label="Enviar foto do paciente"
        />
      </div>

      <FieldGrid>
        <Field
          name="nome"
          label="Nome do paciente"
          required
          placeholder="Ex.: Rex, Luna, Simba..."
          maxLength={60}
          value={values.nome}
          onChange={set('nome')}
          error={errors.nome}
        />
        <Field
          name="especie"
          label="Espécie"
          as="select"
          options={ESPECIES.map((e) => ({ value: e, label: e }))}
          value={values.especie}
          onChange={set('especie')}
        />
        <Field
          name="raca"
          label="Raça"
          required
          placeholder="Ex.: Golden, Siamês, SRD..."
          maxLength={60}
          value={values.raca}
          onChange={set('raca')}
          error={errors.raca}
        />
        <Field
          name="nascimento"
          label="Data de nascimento"
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          maxLength={10}
          value={values.nascimento}
          onChange={set('nascimento', maskDate)}
          error={errors.nascimento}
          hint={
            parseDateBr(values.nascimento)
              ? `Idade: ${idadeDe(parseDateBr(values.nascimento))}`
              : 'Se não souber o dia exato, use uma data aproximada.'
          }
        />
        <Field
          name="sexo"
          label="Sexo"
          as="select"
          options={['Macho', 'Fêmea'].map((s) => ({ value: s, label: s }))}
          value={values.sexo}
          onChange={set('sexo')}
        />
        <Field
          name="peso"
          label="Peso (kg)"
          placeholder="Ex.: 12"
          inputMode="decimal"
          maxLength={6}
          value={values.peso}
          onChange={set('peso')}
          error={errors.peso}
        />
        <Field
          name="tutorId"
          label="Tutor/Responsável"
          as="select"
          required
          span={2}
          placeholder="Selecione o tutor"
          options={[
            ...[...tutores].sort((a, b) => a.nome.localeCompare(b.nome)).map((t) => ({ value: t.id, label: t.nome })),
            { value: NEW_TUTOR, label: '+ Cadastrar novo tutor' },
          ]}
          value={values.tutorId}
          onChange={set('tutorId')}
          error={errors.tutorId}
        />
        {newTutor && (
          <>
            <Field
              name="tutorNome"
              label="Nome do tutor"
              required
              maxLength={100}
              autoComplete="off"
              value={values.tutorNome}
              onChange={set('tutorNome')}
              error={errors.tutorNome}
            />
            <Field
              name="tutorTelefone"
              label="Telefone do tutor"
              required
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              maxLength={15}
              value={values.tutorTelefone}
              onChange={set('tutorTelefone', maskPhone)}
              error={errors.tutorTelefone}
            />
            <Field
              name="tutorEndereco"
              label="Endereço do tutor"
              span={2}
              maxLength={160}
              placeholder="Rua, número, bairro"
              value={values.tutorEndereco}
              onChange={set('tutorEndereco')}
            />
          </>
        )}
        <Field
          name="observacoes"
          label="Observações"
          as="textarea"
          span={2}
          maxLength={1000}
          placeholder="Alergias, medicações de uso contínuo, comportamento durante o atendimento..."
          value={values.observacoes}
          onChange={set('observacoes')}
        />
      </FieldGrid>

      <div className={formStyles.acoes}>
        <button
          type="button"
          className={formStyles.cancelar}
          onClick={() => navigate(pet ? `/pacientes/${pet.id}` : '/pacientes')}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className={formStyles.enviar} disabled={saving} aria-busy={saving || undefined}>
          {saving ? 'Salvando…' : pet ? 'Salvar alterações' : 'Cadastrar paciente'}
        </button>
      </div>
    </form>
  )
}
