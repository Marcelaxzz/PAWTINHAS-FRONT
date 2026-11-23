import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { AlertIcon, BowlIcon } from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useSimulation } from '../../../hooks/useSimulation.js'
import { useToast } from '../../../hooks/useToast.js'
import { clinicService } from '../../../services/clinicService.js'
import { dataService } from '../../../services/dataService.js'
import { formatNumber, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { CALCULADORAS_TABS } from '../calculadorasTabs.js'
import { Pendencias } from '../Pendencias.jsx'
import styles from '../Calculadoras.module.css'

const MANUAL = '__manual'
const PERSONALIZADO = 'personalizado'
const ESPECIES_CALCULO = ['Cachorro', 'Gato']

/** "1,6" ou "1,4 a 1,6", como a fonte publica. */
const faixa = (f) =>
  f.fatorMin === f.fatorMax
    ? formatNumber(f.fator, 1)
    : `${formatNumber(f.fatorMin, 1)} a ${formatNumber(f.fatorMax, 1)}`

export function CalculoRacao() {
  const { data, loading, error, reload } = useCollections(['pets', 'racoes'])
  const [fatores, setFatores] = useState({ lista: null, erro: '' })

  useEffect(() => {
    let ativo = true
    clinicService
      .fatores()
      .then((r) => ativo && setFatores({ lista: r.fatores, erro: '' }))
      .catch((err) => ativo && setFatores({ lista: null, erro: err.message }))
    return () => {
      ativo = false
    }
  }, [])

  const erro = error || fatores.erro

  return (
    <Page title="Cálculo de ração" width="amplo" tabs={CALCULADORAS_TABS}>
      {(loading || (!fatores.lista && !erro)) && <LoadingState />}
      {erro && <ErrorState message={erro} onRetry={reload} />}
      {data && fatores.lista && <RacaoForm pets={data.pets} racoes={data.racoes} fatores={fatores.lista} />}
    </Page>
  )
}

function RacaoForm({ pets, racoes, fatores }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()

  const [values, setValues] = useState(() => {
    const pet = pets.find((p) => p.id === params.get('pet'))
    return {
      petId: pet?.id ?? '',
      especie: ESPECIES_CALCULO.includes(pet?.especie) ? pet.especie : 'Cachorro',
      pesoAtualKg: pet?.peso ?? '',
      pesoMetaKg: '',
      condicao: '',
      fatorPersonalizado: '',
      racaoId: '',
      racao: '',
      kcalPorKg: '',
      refeicoes: '2',
      observacoes: '',
      atualizarPeso: false,
    }
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const pet = pets.find((p) => p.id === values.petId)
  const especie = pet?.especie ?? values.especie
  const especieValida = ESPECIES_CALCULO.includes(especie)
  const condicoes = fatores.filter((f) => f.especie === especie)
  const condicao = condicoes.find((f) => f.chave === values.condicao)
  const personalizado = values.condicao === PERSONALIZADO
  // Condição com faixa publicada (ex.: lactação 3,0 a 6,0): a veterinária pode ajustar dentro dela.
  const ajustavel = condicao && condicao.fatorMin < condicao.fatorMax
  const usaMeta = condicao?.usaPesoMeta || personalizado
  const manual = values.racaoId === MANUAL
  const racao = racoes.find((r) => r.id === values.racaoId)
  const racoesDaEspecie = racoes.filter((r) => r.especie === 'Ambos' || r.especie === especie)
  const pesoDiferente = pet && parseDecimal(values.pesoAtualKg) !== parseDecimal(pet.peso)

  const set = (campo, valor) => {
    setValues((prev) => ({ ...prev, [campo]: valor }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
  }

  const escolherPet = (id) => {
    const escolhido = pets.find((p) => p.id === id)
    setValues((prev) => ({
      ...prev,
      petId: id,
      especie: ESPECIES_CALCULO.includes(escolhido?.especie) ? escolhido.especie : prev.especie,
      pesoAtualKg: escolhido?.peso || prev.pesoAtualKg,
      // A condição e a ração dependem da espécie.
      condicao: escolhido && escolhido.especie !== especie ? '' : prev.condicao,
      racaoId: escolhido && escolhido.especie !== especie ? '' : prev.racaoId,
      atualizarPeso: false,
    }))
  }

  const payload = {
    petId: values.petId || null,
    especie,
    pesoAtualKg: parseDecimal(values.pesoAtualKg),
    pesoMetaKg: usaMeta ? parseDecimal(values.pesoMetaKg) : null,
    condicao: values.condicao,
    fatorPersonalizado: personalizado || ajustavel ? parseDecimal(values.fatorPersonalizado) : null,
    racaoId: manual ? null : values.racaoId || null,
    racao: manual ? values.racao.trim() : (racao?.nome ?? ''),
    kcalPorKg: manual ? parseDecimal(values.kcalPorKg) : null,
    refeicoes: Number(values.refeicoes) || 2,
  }

  const pronto = Boolean(
    especieValida &&
    payload.pesoAtualKg &&
    payload.condicao &&
    (!condicao?.usaPesoMeta || payload.pesoMetaKg) &&
    (!personalizado || payload.fatorPersonalizado) &&
    (payload.racaoId || (manual && payload.kcalPorKg)),
  )
  const { result, error, fields, loading } = useSimulation(clinicService.simularAlimentacao, payload, pronto)
  const errosCampo = { ...fields, ...erros }

  const salvar = async () => {
    const proximos = {
      petId: values.petId ? '' : 'Selecione o paciente para salvar o plano.',
      racao: manual && !values.racao.trim() ? 'Informe o nome da ração.' : '',
    }
    setErros(proximos)
    if (Object.values(proximos).some(Boolean) || !result) return

    setSalvando(true)
    try {
      await dataService.create('planosAlimentares', {
        ...payload,
        observacoes: values.observacoes.trim(),
        atualizarPesoPaciente: Boolean(pesoDiferente && values.atualizarPeso),
      })
      toast.success('Plano alimentar salvo na ficha do paciente!')
      navigate(`/pacientes/${encodeURIComponent(values.petId)}`)
    } catch (err) {
      if (err.fields) setErros(err.fields)
      toast.error(err.message)
      setSalvando(false)
    }
  }

  return (
    <div className={styles.layout}>
      <section className={`${styles.cartao} ${styles.formulario}`} aria-labelledby="dados-racao">
        <div className={styles.secao}>
          <h2 id="dados-racao" className={styles.secaoTitulo}>
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
                options={ESPECIES_CALCULO.map((v) => ({ value: v, label: v }))}
                value={values.especie}
                onChange={(e) => setValues((prev) => ({ ...prev, especie: e.target.value, condicao: '', racaoId: '' }))}
              />
            )}
            <Field
              name="pesoAtualKg"
              label="Peso atual (kg)"
              required
              inputMode="decimal"
              placeholder="Ex.: 12,5"
              value={values.pesoAtualKg}
              onChange={(e) => set('pesoAtualKg', maskDecimal(e.target.value, 6))}
              error={errosCampo.pesoAtualKg}
            />
            {usaMeta && (
              <Field
                name="pesoMetaKg"
                label={personalizado ? 'Peso para o cálculo (kg)' : 'Peso ideal (kg)'}
                required={!personalizado}
                inputMode="decimal"
                placeholder="Ex.: 10"
                hint={
                  personalizado
                    ? 'Opcional. Em branco, usa o peso atual.'
                    : 'Para perder peso, a conta usa o peso ideal.'
                }
                value={values.pesoMetaKg}
                onChange={(e) => set('pesoMetaKg', maskDecimal(e.target.value, 6))}
                error={errosCampo.pesoMetaKg}
              />
            )}
          </FieldGrid>
          {!especieValida && (
            <p className={styles.info}>O cálculo de ração por energia está disponível para cães e gatos.</p>
          )}
          {pesoDiferente && especieValida && (
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

        {especieValida && (
          <>
            <div className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Condição</h2>
              <FieldGrid>
                <Field
                  name="condicao"
                  label="Fase e condição corporal"
                  as="select"
                  span={2}
                  required
                  placeholder="Selecione…"
                  options={[
                    ...condicoes.map((f) => ({ value: f.chave, label: `${f.rotulo} (× ${faixa(f)})` })),
                    { value: PERSONALIZADO, label: 'Fator personalizado' },
                  ]}
                  value={values.condicao}
                  onChange={(e) => setValues((prev) => ({ ...prev, condicao: e.target.value, fatorPersonalizado: '' }))}
                  error={errosCampo.condicao}
                />
                {ajustavel && (
                  <Field
                    name="fatorPersonalizado"
                    label={`Fator (${faixa(condicao)})`}
                    inputMode="decimal"
                    placeholder={formatNumber(condicao.fator, 1)}
                    hint={`Em branco, usa ${formatNumber(condicao.fator, 1)}.`}
                    value={values.fatorPersonalizado}
                    onChange={(e) => set('fatorPersonalizado', maskDecimal(e.target.value, 4))}
                    error={errosCampo.fatorPersonalizado}
                  />
                )}
                {personalizado && (
                  <Field
                    name="fatorPersonalizado"
                    label="Fator (0,5 a 8)"
                    required
                    inputMode="decimal"
                    placeholder="Ex.: 1,3"
                    value={values.fatorPersonalizado}
                    onChange={(e) => set('fatorPersonalizado', maskDecimal(e.target.value, 4))}
                    error={errosCampo.fatorPersonalizado}
                  />
                )}
              </FieldGrid>
            </div>

            <div className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Ração</h2>
              <FieldGrid className={styles.gradeLarga}>
                <Field
                  name="racaoId"
                  label="Ração"
                  as="select"
                  span={2}
                  className={styles.campoTriplo}
                  required
                  placeholder="Selecione do catálogo…"
                  options={[
                    ...racoesDaEspecie.map((r) => ({
                      value: r.id,
                      label: `${r.nome} · ${formatNumber(r.kcalPorKg, 0)} kcal/kg`,
                    })),
                    { value: MANUAL, label: 'Outra (informar a energia do rótulo)' },
                  ]}
                  value={values.racaoId}
                  onChange={(e) => set('racaoId', e.target.value)}
                  error={errosCampo.racaoId}
                />
                {manual && (
                  <>
                    <Field
                      name="racao"
                      label="Nome da ração"
                      required
                      maxLength={80}
                      value={values.racao}
                      onChange={(e) => set('racao', e.target.value)}
                      error={errosCampo.racao}
                    />
                    <Field
                      name="kcalPorKg"
                      label="Energia metabolizável (kcal/kg)"
                      required
                      inputMode="decimal"
                      placeholder="Ex.: 3800"
                      hint="No rótulo, em “Energia metabolizável”."
                      value={values.kcalPorKg}
                      onChange={(e) => set('kcalPorKg', maskDecimal(e.target.value, 6))}
                      error={errosCampo.kcalPorKg}
                    />
                  </>
                )}
                <Field
                  name="refeicoes"
                  label="Refeições por dia"
                  as="select"
                  options={[1, 2, 3, 4, 5, 6].map((n) => ({
                    value: String(n),
                    label: `${n} ${n === 1 ? 'refeição' : 'refeições'}`,
                  }))}
                  value={values.refeicoes}
                  onChange={(e) => set('refeicoes', e.target.value)}
                />
              </FieldGrid>
              {racoesDaEspecie.length === 0 && (
                <p className={styles.info}>
                  Nenhuma ração para esta espécie no catálogo.{' '}
                  <Link to="/calculadoras/racoes">Cadastre as rações da clínica</Link> ou use “Outra”.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <aside className={`${styles.cartao} ${styles.resultado}`} aria-live="polite" aria-labelledby="resultado-racao">
        <h2 id="resultado-racao" className="visualmente-oculto">
          Resultado do cálculo
        </h2>
        {!pronto && (
          <Pendencias
            icone={BowlIcon}
            titulo="Quantidade diária"
            itens={[
              { rotulo: 'Peso atual', ok: Boolean(payload.pesoAtualKg) },
              { rotulo: 'Fase e condição corporal', ok: Boolean(payload.condicao) },
              ...(condicao?.usaPesoMeta && !personalizado
                ? [{ rotulo: 'Peso ideal', ok: Boolean(payload.pesoMetaKg) }]
                : []),
              ...(personalizado ? [{ rotulo: 'Fator', ok: Boolean(payload.fatorPersonalizado) }] : []),
              { rotulo: 'Ração', ok: Boolean(payload.racaoId || (manual && payload.kcalPorKg)) },
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
            <p className={styles.rotuloResultado}>Quantidade por dia</p>
            <p className={styles.destaque}>{formatNumber(result.gramasDia, result.gramasDia < 100 ? 1 : 0)} g</p>
            <p className={styles.destaqueApoio}>
              {Number(values.refeicoes)} × {formatNumber(result.gramasPorRefeicao, 1)} g por refeição
            </p>

            <dl className={styles.numeros}>
              <div className={styles.numero}>
                <dt>RER (repouso)</dt>
                <dd>{formatNumber(result.rer, 0)} kcal/dia</dd>
              </div>
              <div className={styles.numero}>
                <dt>MER (manutenção)</dt>
                <dd>{formatNumber(result.mer, 0)} kcal/dia</dd>
              </div>
              <div className={styles.numero}>
                <dt>Fator aplicado</dt>
                <dd>× {formatNumber(result.fator, 2)}</dd>
              </div>
              <div className={styles.numero}>
                <dt>Peso usado</dt>
                <dd>{formatNumber(result.pesoCalculoKg, 2)} kg</dd>
              </div>
              <div className={styles.numero}>
                <dt>Petiscos (máx. 10%)</dt>
                <dd>{formatNumber(result.kcalPetiscosMax, 0)} kcal/dia</dd>
              </div>
              <div className={styles.numero}>
                <dt>Água (manutenção)</dt>
                <dd>
                  {formatNumber(result.aguaMinMlDia, 0)} a {formatNumber(result.aguaMaxMlDia, 0)} mL/dia
                </dd>
              </div>
            </dl>

            <div className={styles.salvarExtras}>
              <Field
                name="observacoes"
                label="Observações"
                as="textarea"
                rows={2}
                maxLength={500}
                placeholder="Ex.: reavaliar peso em 30 dias, transição gradual de ração…"
                value={values.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
              />
            </div>

            <div className={styles.acoes}>
              <PillButton size="lg" onClick={salvar} loading={salvando} disabled={loading}>
                Salvar plano na ficha
              </PillButton>
            </div>
            {errosCampo.petId && <p className={styles.formula}>{errosCampo.petId}</p>}

            <details className={styles.comoCalcula}>
              <summary>Como foi calculado</summary>
              <p className={styles.formula}>
                Gramas por dia = MER ÷ energia da ração (kcal/kg) × 1.000. O resultado é um ponto de partida: ajuste a
                quantidade acompanhando o peso e o escore corporal.
              </p>
            </details>
          </div>
        )}
      </aside>
    </div>
  )
}
