import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { Chip } from '../../../components/ui/Chip.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { HouseIcon, PencilIcon, PhoneIcon, SearchIcon, TrashIcon } from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { maskCpf, maskPhone } from '../../../utils/masks.js'
import { normalize } from '../../../utils/text.js'
import { validateCpf, validateOptionalEmail, validatePhone } from '../../../utils/validators.js'
import { PACIENTES_TABS } from '../pacientesTabs.js'
import lists from '../panelLists.module.css'
import styles from './Tutores.module.css'

export function Tutores() {
  const toast = useToast()
  const { data, loading, error, reload, patchLocal } = useCollections(['tutores', 'pets'])
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const petsDe = (tutorId) => (data?.pets ?? []).filter((p) => p.tutorId === tutorId)
  const termo = normalize(busca)
  const lista = (data?.tutores ?? []).filter(
    (t) =>
      !termo ||
      normalize(
        `${t.nome} ${t.telefone} ${petsDe(t.id)
          .map((p) => p.nome)
          .join(' ')}`,
      ).includes(termo),
  )
  const petsDoExcluido = excluindo ? petsDe(excluindo.id) : []

  const excluir = async () => {
    setOcupado(true)
    try {
      await dataService.remove('tutores', excluindo.id)
      toast.success(`${excluindo.nome} foi removido(a).`)
      setExcluindo(null)
      // Os pets desse tutor ficam sem tutor no servidor: recarrega para refletir.
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Page title="Tutores" subtitle="Contatos dos responsáveis pelos pawtinhas." tabs={PACIENTES_TABS}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <div className={lists.filtros} role="search">
            <label className={lists.busca}>
              <SearchIcon size={15} />
              <span className="visualmente-oculto">Filtrar por nome, telefone ou pet</span>
              <input
                type="search"
                placeholder="Filtrar por nome, telefone ou pet..."
                value={busca}
                maxLength={80}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>
            <PillButton className={lists.filtroAcao} onClick={() => setEditando({})}>
              + Novo tutor
            </PillButton>
          </div>

          {lista.length === 0 ? (
            <EmptyState title={data.tutores.length ? 'Nenhum tutor encontrado' : 'Nenhum tutor cadastrado'}>
              {data.tutores.length
                ? 'Confira o nome digitado.'
                : 'Os tutores também podem ser cadastrados junto com o paciente.'}
            </EmptyState>
          ) : (
            <div className={styles.grade}>
              {lista.map((t) => {
                const pets = petsDe(t.id)
                return (
                  <article key={t.id} className={styles.card}>
                    <h2 className={styles.nome}>{t.nome}</h2>
                    <p className={styles.linha}>
                      <PhoneIcon size={15} />
                      <a href={`tel:${t.telefone.replace(/\D/g, '')}`}>{t.telefone}</a>
                    </p>
                    {t.endereco && (
                      <p className={styles.linha}>
                        <HouseIcon size={15} />
                        {t.endereco}
                      </p>
                    )}
                    <div className={styles.pets}>
                      {pets.length === 0 ? (
                        <Chip size="xs">Sem pets cadastrados</Chip>
                      ) : (
                        pets.map((p) => (
                          <Link key={p.id} to={`/pacientes/${p.id}`}>
                            <Chip tone="tag" size="xs">
                              {p.nome}
                            </Chip>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className={styles.acoes}>
                      <PillButton variant="contorno" size="sm" onClick={() => setEditando(t)}>
                        <PencilIcon size={14} />
                        Editar
                      </PillButton>
                      <PillButton variant="perigo" size="sm" onClick={() => setExcluindo(t)}>
                        <TrashIcon size={14} />
                        Excluir
                      </PillButton>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {editando && (
        <TutorDialog
          tutor={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={(salvo) => {
            patchLocal('tutores', salvo)
            setEditando(null)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        onConfirm={excluir}
        loading={ocupado}
        title={`Excluir ${excluindo?.nome ?? ''}?`}
        message={
          petsDoExcluido.length
            ? `${petsDoExcluido.map((p) => p.nome).join(', ')} ${petsDoExcluido.length === 1 ? 'ainda está' : 'ainda estão'} com este tutor. Escolha outro tutor na ficha antes de excluir.`
            : 'O contato será removido.'
        }
        confirmLabel="Excluir tutor"
      />
    </Page>
  )
}

function TutorDialog({ tutor, onClose, onSaved }) {
  const toast = useToast()
  const formId = useId()
  const [values, setValues] = useState({
    nome: tutor?.nome ?? '',
    telefone: tutor?.telefone ?? '',
    cpf: tutor?.cpf ?? '',
    email: tutor?.email ?? '',
    endereco: tutor?.endereco ?? '',
    cidade: tutor?.cidade ?? '',
    uf: tutor?.uf ?? '',
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const set =
    (campo, transform = (v) => v) =>
    (e) => {
      setValues((prev) => ({ ...prev, [campo]: transform(e.target.value) }))
      if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
    }

  const salvar = async (event) => {
    event.preventDefault()
    const proximos = {
      nome: values.nome.trim() ? '' : 'Informe o nome do tutor.',
      telefone: validatePhone(values.telefone),
      cpf: validateCpf(values.cpf),
      email: validateOptionalEmail(values.email),
      uf: values.uf && !/^[A-Za-z]{2}$/.test(values.uf.trim()) ? 'Use a sigla do estado (ex.: MG).' : '',
    }
    setErros(proximos)
    if (Object.values(proximos).some(Boolean)) return

    setSalvando(true)
    try {
      const payload = {
        nome: values.nome.trim(),
        telefone: values.telefone,
        cpf: values.cpf,
        email: values.email.trim(),
        endereco: values.endereco.trim(),
        cidade: values.cidade.trim(),
        uf: values.uf.trim().toUpperCase(),
      }
      const salvo = tutor
        ? await dataService.update('tutores', tutor.id, payload)
        : await dataService.create('tutores', payload)
      toast.success(tutor ? 'Tutor atualizado!' : `${salvo.nome} foi cadastrado(a)!`)
      onSaved(salvo)
    } catch (err) {
      if (err.fields) setErros(err.fields)
      toast.error(err.message)
      setSalvando(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={tutor ? 'Editar tutor' : 'Cadastrar tutor'}
      footer={
        <>
          <PillButton variant="contorno" onClick={onClose} disabled={salvando}>
            Cancelar
          </PillButton>
          <PillButton type="submit" form={formId} loading={salvando}>
            Salvar
          </PillButton>
        </>
      }
    >
      <form id={formId} onSubmit={salvar} noValidate>
        <FieldGrid>
          <Field
            label="Nome"
            required
            span={2}
            maxLength={100}
            autoComplete="off"
            value={values.nome}
            onChange={set('nome')}
            error={erros.nome}
          />
          <Field
            label="Telefone"
            required
            type="tel"
            inputMode="tel"
            placeholder="(34) 99999-9999"
            maxLength={15}
            value={values.telefone}
            onChange={set('telefone', maskPhone)}
            error={erros.telefone}
          />
          <Field
            label="CPF"
            inputMode="numeric"
            placeholder="Opcional"
            maxLength={14}
            value={values.cpf}
            onChange={set('cpf', maskCpf)}
            error={erros.cpf}
          />
          <Field
            label="E-mail"
            type="email"
            span={2}
            maxLength={150}
            placeholder="Opcional"
            value={values.email}
            onChange={set('email')}
            error={erros.email}
          />
          <Field
            label="Endereço"
            span={2}
            maxLength={160}
            placeholder="Rua, número, bairro"
            value={values.endereco}
            onChange={set('endereco')}
            error={erros.endereco}
          />
          <Field label="Cidade" maxLength={100} value={values.cidade} onChange={set('cidade')} error={erros.cidade} />
          <Field
            label="UF"
            maxLength={2}
            placeholder="MG"
            value={values.uf}
            onChange={set('uf', (v) => v.toUpperCase())}
            error={erros.uf}
          />
        </FieldGrid>
      </form>
    </Dialog>
  )
}
