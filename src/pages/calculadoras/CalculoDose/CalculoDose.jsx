import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { AlertIcon, ClockIcon, InfoIcon, PillIcon } from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useSimulation } from '../../../hooks/useSimulation.js'
import { useToast } from '../../../hooks/useToast.js'
import { clinicService } from '../../../services/clinicService.js'
import { dataService } from '../../../services/dataService.js'
import { formatDateBr, isValidTime, maskDate, maskTime, parseDateBr, todayIso } from '../../../utils/dates.js'
import { formatNumber, formatQuantidade, intervaloLabel, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { CALCULADORAS_TABS } from '../calculadorasTabs.js'
import { Pendencias } from '../Pendencias.jsx'
import styles from '../Calculadoras.module.css'

const MANUAL = '__manual'
const INTERVALOS = [4, 6, 8, 12, 24, 48, 72]
const ALARME_INTERVALOS = [8, 12, 24]
const UNIDADES = [
  { value: 'comprimido', label: 'Comprimido (mg por comprimido)' },
  { value: 'cápsula', label: 'Cápsula (mg por cápsula)' },
  { value: 'mL', label: 'Líquido (mg por mL)' },
  { value: 'gota', label: 'Gotas (mg por gota)' },
]
const CONCENTRACAO = { comprimido: 'mg/comprimido', cápsula: 'mg/cápsula', mL: 'mg/mL', gota: 'mg/gota' }

function proximaHoraCheia() {
  const hora = (new Date().getHours() + 1) % 24
  return `${String(hora).padStart(2, '0')}:00`
}

function faixaTexto(min, max) {
  if (min == null && max == null) return null
  if (min != null && max != null && min === max) return `${formatNumber(min, 3)} mg/kg`
  if (min != null && max != null) return `${formatNumber(min, 3)} a ${formatNumber(max, 3)} mg/kg`
  return min != null ? `mínimo ${formatNumber(min, 3)} mg/kg` : `máximo ${formatNumber(max, 3)} mg/kg`
}

export function CalculoDose() {
  const { data, loading, error, reload } = useCollections(['pets', 'medicamentos'])

  return (
    <Page title="Dose de medicamento" width="amplo" tabs={CALCULADORAS_TABS}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <DoseForm pets={data.pets} medicamentos={data.medicamentos} />}
    </Page>
  )
}

function DoseForm({ pets, medicamentos }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()

  const [values, setValues] = useState(() => {
    const pet = pets.find((p) => p.id === params.get('pet'))
    return {
      petId: pet?.id ?? '',
      especie: pet?.especie ?? 'Cachorro',
      pesoKg: pet?.peso ?? '',
      medicamentoId: '',
      medicamento: '',
      unidade: 'comprimido',
      concentracao: '',
      fracionavel: true,
      via: 'Oral',
      doseMgKg: '',
      intervaloHoras: '',
      duracaoDias: '7',
      inicio: formatDateBr(todayIso()),
      horaPrimeiraDose: proximaHoraCheia(),
      observacoes: '',
      criarAlarme: false,
      atualizarPeso: false,
    }
  })
  const [confirmadoPara, setConfirmadoPara] = useState('')
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const pet = pets.find((p) => p.id === values.petId)
  const manual = values.medicamentoId === MANUAL
  const med = medicamentos.find((m) => m.id === values.medicamentoId)
  const especie = pet?.especie ?? values.especie
  // Exemplo do campo de dose: o mínimo da faixa do medicamento para a espécie, quando houver.
  const doseExemplo = med && (especie === 'Gato' ? med.doseMinGato : especie === 'Cachorro' ? med.doseMinCao : null)
  const unidade = med?.unidade ?? values.unidade
  const intervalo = Number(values.intervaloHoras) || null
  const pesoDiferente = pet && parseDecimal(values.pesoKg) !== parseDecimal(pet.peso)

  const set = (campo, valor) => {
    setValues((prev) => ({ ...prev, [campo]: valor }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
  }

  const escolherPet = (id) => {
    const escolhido = pets.find((p) => p.id === id)
    setValues((prev) => ({
      ...prev,
      petId: id,
      especie: escolhido?.especie ?? prev.especie,
      pesoKg: escolhido?.peso || prev.pesoKg,
      atualizarPeso: false,
    }))
  }

  const escolherMedicamento = (id) => {
    const escolhido = medicamentos.find((m) => m.id === id)
    setValues((prev) => ({
      ...prev,
      medicamentoId: id,
      intervaloHoras: escolhido?.intervaloPadraoHoras ? String(escolhido.intervaloPadraoHoras) : prev.intervaloHoras,
      via: escolhido?.via ?? prev.via,
    }))
  }

  const payload = {
    petId: values.petId || null,
    especie,
    pesoKg: parseDecimal(values.pesoKg),
    medicamentoId: manual ? null : values.medicamentoId || null,
    medicamento: manual ? values.medicamento.trim() : (med?.nome ?? ''),
    unidade,
    concentracao: manual ? parseDecimal(values.concentracao) : null,
    fracionavel: manual ? values.unidade === 'comprimido' && values.fracionavel : undefined,
    via: values.via,
    doseMgKg: parseDecimal(values.doseMgKg),
    intervaloHoras: intervalo,
    duracaoDias: Number(values.duracaoDias) || null,
  }

  const pronto = Boolean(
    payload.pesoKg &&
    payload.doseMgKg &&
    payload.intervaloHoras &&
    payload.duracaoDias &&
    (payload.medicamentoId || (manual && payload.concentracao)),
  )
  const { result, error, fields, loading } = useSimulation(clinicService.simularDose, payload, pronto)

  const alertasChave = result?.alertas?.join('|') ?? ''
  const confirmado = Boolean(alertasChave) && confirmadoPara === alertasChave
  const precisaConfirmar = Boolean(result?.alertas?.length) && !confirmado
  const alarmePossivel = ALARME_INTERVALOS.includes(intervalo)
  const errosCampo = { ...fields, ...erros }

  const salvar = async () => {
    const proximos = {
      petId: values.petId ? '' : 'Selecione o paciente para salvar a prescrição.',
      medicamento: manual && !values.medicamento.trim() ? 'Informe o nome do medicamento.' : '',
      inicio: parseDateBr(values.inicio) ? '' : 'Informe uma data válida (dd/mm/aaaa).',
      horaPrimeiraDose: isValidTime(values.horaPrimeiraDose) ? '' : 'Informe um horário válido (hh:mm).',
    }
    setErros(proximos)
    if (Object.values(proximos).some(Boolean) || !result || precisaConfirmar) return

    setSalvando(true)
    try {
      await dataService.create('prescricoes', {
        ...payload,
        inicio: parseDateBr(values.inicio),
        horaPrimeiraDose: values.horaPrimeiraDose,
        observacoes: values.observacoes.trim(),
        confirmarAlertas: confirmado,
        criarAlarme: alarmePossivel && values.criarAlarme,
        atualizarPesoPaciente: Boolean(pesoDiferente && values.atualizarPeso),
      })
      toast.success(
        values.criarAlarme && alarmePossivel
          ? 'Prescrição salva e alarme criado no ESP32!'
          : 'Prescrição salva na ficha do paciente!',
      )
      navigate(`/pacientes/${encodeURIComponent(values.petId)}`)
    } catch (err) {
      if (err.fields) setErros(err.fields)
      toast.error(err.message)
      setSalvando(false)
    }
  }

  const faixa = med && result ? faixaTexto(result.doseMinMgKg, result.doseMaxMgKg) : null

  return (
    <div className={styles.layout}>
      <section className={`${styles.cartao} ${styles.formulario}`} aria-labelledby="dados-dose">
        <div className={styles.secao}>
          <h2 id="dados-dose" className={styles.secaoTitulo}>
            Paciente
          </h2>
          <FieldGrid>
            <Field
              name="petId"
              label="Paciente"
              as="select"
              span={2}
              options={[
                { value: '', label: 'Sem paciente (apenas simular)' },
                ...[...pets]
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((p) => ({ value: p.id, label: `${p.nome} · ${p.especie}` })),
              ]}
              value={values.petId}
              onChange={(e) => escolherPet(e.target.value)}
              error={errosCampo.petId}
            />
            {pet ? (
              <Field label="Espécie" value={pet.especie} readOnly variant="areia" />
            ) : (
              <Field
                label="Espécie"
                as="select"
                options={['Cachorro', 'Gato', 'Outra'].map((v) => ({ value: v, label: v }))}
                value={values.especie}
                onChange={(e) => set('especie', e.target.value)}
              />
            )}
            <Field
              name="pesoKg"
              label="Peso (kg)"
              required
              inputMode="decimal"
              placeholder="Ex.: 12,5"
              value={values.pesoKg}
              onChange={(e) => set('pesoKg', maskDecimal(e.target.value, 6))}
              error={errosCampo.pesoKg}
              hint={pet && !pet.peso ? 'Este paciente ainda não tem peso na ficha.' : undefined}
            />
          </FieldGrid>
          {pesoDiferente && (
            <div className={styles.checks}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={values.atualizarPeso}
                  onChange={(e) => set('atualizarPeso', e.target.checked)}
                />
                <span>
                  Atualizar o peso na ficha de {pet.nome}
                  <small>Na ficha: {pet.peso ? `${pet.peso} kg` : 'sem peso'}</small>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Medicamento</h2>
          <FieldGrid>
            <Field
              name="medicamentoId"
              label="Medicamento"
              as="select"
              span={2}
              placeholder="Selecione do catálogo…"
              options={[
                ...medicamentos.map((m) => ({ value: m.id, label: m.nome })),
                { value: MANUAL, label: 'Outro (informar a concentração)' },
              ]}
              value={values.medicamentoId}
              onChange={(e) => escolherMedicamento(e.target.value)}
              error={errosCampo.medicamentoId}
            />
            {manual && (
              <>
                <Field
                  name="medicamento"
                  label="Nome do medicamento"
                  required
                  span={2}
                  maxLength={80}
                  value={values.medicamento}
                  onChange={(e) => set('medicamento', e.target.value)}
                  error={errosCampo.medicamento}
                />
                <Field
                  label="Apresentação"
                  as="select"
                  options={UNIDADES}
                  value={values.unidade}
                  onChange={(e) => set('unidade', e.target.value)}
                />
                <Field
                  name="concentracao"
                  label={`Concentração (${CONCENTRACAO[values.unidade]})`}
                  required
                  inputMode="decimal"
                  value={values.concentracao}
                  onChange={(e) => set('concentracao', maskDecimal(e.target.value, 9))}
                  error={errosCampo.concentracao}
                />
                <Field
                  label="Via"
                  as="select"
                  options={['Oral', 'Subcutânea', 'Intramuscular', 'Intravenosa'].map((v) => ({ value: v, label: v }))}
                  value={values.via}
                  onChange={(e) => set('via', e.target.value)}
                />
              </>
            )}
          </FieldGrid>
          {manual && values.unidade === 'comprimido' && (
            <div className={styles.checks}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={values.fracionavel}
                  onChange={(e) => set('fracionavel', e.target.checked)}
                />
                <span>
                  Comprimido sulcado (pode ser partido)
                  <small>A dose é arredondada para 1/4 de comprimido; sem sulco, para o comprimido inteiro.</small>
                </span>
              </label>
            </div>
          )}
          {med && (
            <p className={styles.info}>
              <span>
                <strong>{formatNumber(med.concentracao, 3)}</strong> {CONCENTRACAO[med.unidade]}
              </span>
              <span>Via {med.via.toLowerCase()}</span>
              {med.unidade === 'comprimido' && <span>{med.fracionavel ? 'Sulcado' : 'Não partir'}</span>}
              <span>
                Faixa ({especie === 'Gato' ? 'gatos' : especie === 'Cachorro' ? 'cães' : especie.toLowerCase()}):{' '}
                <strong>
                  {faixaTexto(
                    especie === 'Gato' ? med.doseMinGato : especie === 'Cachorro' ? med.doseMinCao : null,
                    especie === 'Gato' ? med.doseMaxGato : especie === 'Cachorro' ? med.doseMaxCao : null,
                  ) ?? 'não cadastrada'}
                </strong>
              </span>
            </p>
          )}
          {med?.observacoes && (
            <div className={styles.referencia}>
              <p>{med.observacoes}</p>
            </div>
          )}
          {medicamentos.length === 0 && (
            <p className={styles.info}>
              O catálogo está vazio. <Link to="/calculadoras/medicamentos">Cadastre os medicamentos da clínica</Link> ou
              use “Outro”.
            </p>
          )}
        </div>

        <div className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Posologia</h2>
          <FieldGrid className={styles.gradeLarga}>
            <Field
              name="doseMgKg"
              label="Dose (mg/kg)"
              required
              inputMode="decimal"
              placeholder={doseExemplo ? `Ex.: ${formatNumber(doseExemplo, 3)}` : 'Ex.: 12,5'}
              value={values.doseMgKg}
              onChange={(e) => set('doseMgKg', maskDecimal(e.target.value, 8))}
              error={errosCampo.doseMgKg}
            />
            <Field
              name="duracaoDias"
              label="Duração (dias)"
              required
              inputMode="numeric"
              value={values.duracaoDias}
              onChange={(e) => set('duracaoDias', e.target.value.replace(/\D/g, '').slice(0, 3))}
              error={errosCampo.duracaoDias}
            />
            <Field
              name="intervaloHoras"
              label="Intervalo entre as doses"
              as="select"
              required
              span={2}
              className={styles.campoDuplo}
              placeholder="Selecione…"
              options={INTERVALOS.map((h) => ({ value: String(h), label: intervaloLabel(h) }))}
              value={values.intervaloHoras}
              onChange={(e) => set('intervaloHoras', e.target.value)}
              error={errosCampo.intervaloHoras}
            />
            <Field
              name="inicio"
              label="Início"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={values.inicio}
              onChange={(e) => set('inicio', maskDate(e.target.value))}
              error={errosCampo.inicio}
            />
            <Field
              name="horaPrimeiraDose"
              label="Hora da 1ª dose"
              icon={ClockIcon}
              inputMode="numeric"
              placeholder="hh:mm"
              value={values.horaPrimeiraDose}
              onChange={(e) => set('horaPrimeiraDose', maskTime(e.target.value))}
              error={errosCampo.horaPrimeiraDose}
            />
          </FieldGrid>
        </div>
      </section>

      <aside className={`${styles.cartao} ${styles.resultado}`} aria-live="polite" aria-labelledby="resultado-dose">
        <h2 id="resultado-dose" className="visualmente-oculto">
          Resultado do cálculo
        </h2>
        {!pronto && (
          <Pendencias
            icone={PillIcon}
            titulo="Resultado"
            itens={[
              { rotulo: 'Peso', ok: Boolean(payload.pesoKg) },
              { rotulo: 'Medicamento', ok: Boolean(payload.medicamentoId || (manual && payload.concentracao)) },
              { rotulo: 'Dose (mg/kg)', ok: Boolean(payload.doseMgKg) },
              { rotulo: 'Intervalo entre as doses', ok: Boolean(payload.intervaloHoras) },
              { rotulo: 'Duração', ok: Boolean(payload.duracaoDias) },
            ]}
          />
        )}
        {pronto && error && !result && (
          <p className={styles.erro}>
            <AlertIcon size={16} />
            {error}
          </p>
        )}
        {pronto && result && (
          <div className={loading ? styles.carregando : undefined}>
            <p className={styles.rotuloResultado}>Administrar por dose</p>
            <p className={styles.destaque}>{formatQuantidade(result.quantidadePorDose, unidade)}</p>
            <p className={styles.destaqueApoio}>
              {formatNumber(result.doseRealMg, 2)} mg · {formatNumber(result.doseRealMgKg, 2)} mg/kg ·{' '}
              {intervaloLabel(intervalo)}
            </p>

            <dl className={styles.numeros}>
              <div className={styles.numero}>
                <dt>Dose calculada</dt>
                <dd>{formatNumber(result.doseMg, 2)} mg</dd>
              </div>
              <div className={styles.numero}>
                <dt>Quantidade exata</dt>
                <dd>
                  {formatNumber(result.quantidadeExata, 3)} {unidade}
                </dd>
              </div>
              <div className={styles.numero}>
                <dt>Diferença do arredondamento</dt>
                <dd>{formatNumber(result.desvioPercentual, 1)}%</dd>
              </div>
              <div className={styles.numero}>
                <dt>Total de doses</dt>
                <dd>{result.totalDoses}</dd>
              </div>
              <div className={`${styles.numero} ${styles.numeroInteiro}`}>
                <dt>Quantidade para o tratamento todo</dt>
                <dd>{formatQuantidade(result.quantidadeTotal, unidade)}</dd>
              </div>
              {faixa && (
                <div className={`${styles.numero} ${styles.numeroInteiro}`}>
                  <dt>Faixa de referência do catálogo</dt>
                  <dd>{faixa}</dd>
                </div>
              )}
            </dl>

            {(result.alertas.length > 0 || result.avisos.length > 0) && (
              <div className={styles.mensagens}>
                {result.alertas.map((alerta) => (
                  <p key={alerta} className={styles.alerta} role="alert">
                    <AlertIcon size={16} />
                    {alerta}
                  </p>
                ))}
                {result.avisos.map((aviso) => (
                  <p key={aviso} className={styles.aviso}>
                    {aviso}
                  </p>
                ))}
              </div>
            )}

            {result.alertas.length > 0 && (
              <div className={styles.checks}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={confirmado}
                    onChange={(e) => setConfirmadoPara(e.target.checked ? alertasChave : '')}
                  />
                  <span>Revisei os alertas e confirmo esta prescrição.</span>
                </label>
              </div>
            )}

            <div className={styles.salvarExtras}>
              <Field
                name="observacoes"
                label="Observações"
                as="textarea"
                rows={2}
                maxLength={500}
                placeholder="Ex.: administrar com alimento, reavaliar em 7 dias…"
                value={values.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
              />
              <div className={styles.checks}>
                <label className={`${styles.check} ${alarmePossivel ? '' : styles.checkDesativado}`}>
                  <input
                    type="checkbox"
                    checked={alarmePossivel && values.criarAlarme}
                    disabled={!alarmePossivel}
                    onChange={(e) => set('criarAlarme', e.target.checked)}
                  />
                  <span>
                    Criar alarme no dispositivo ESP32
                    <small>
                      {alarmePossivel
                        ? 'O lembrete toca a partir do horário da 1ª dose e é desativado ao suspender a prescrição.'
                        : 'Disponível para intervalos de 8, 12 ou 24 horas.'}
                    </small>
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.acoes}>
              <PillButton size="lg" onClick={salvar} loading={salvando} disabled={precisaConfirmar || loading}>
                Salvar prescrição na ficha
              </PillButton>
            </div>
            {errosCampo.petId && <p className={styles.formula}>{errosCampo.petId}</p>}

            <details className={styles.comoCalcula}>
              <summary>Como foi calculado</summary>
              <p className={styles.formula}>
                Dose (mg) = peso × dose (mg/kg). Quantidade = dose ÷ concentração, arredondada para o que dá para
                administrar: 1/4 de comprimido sulcado, cápsula ou gota inteira, 0,01 mL abaixo de 1 mL e 0,1 mL acima.
                Confira sempre a bula do produto.
              </p>
            </details>
          </div>
        )}
      </aside>
    </div>
  )
}
