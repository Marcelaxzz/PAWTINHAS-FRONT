import { useState } from 'react'
import { Toggle } from '../ui/Toggle.jsx'
import { PillButton } from '../ui/PillButton.jsx'
import { ClockIcon } from '../Icons/Icons.jsx'
import { useToast } from '../../hooks/useToast.js'
import {
  bipeDeTeste,
  definirTocarNoNavegador,
  liberarSom,
  notificacaoSuportada,
  pedirPermissaoNotificacao,
  permissaoNotificacao,
  tocarNoNavegador,
} from './alarmesNoNavegador.js'
import styles from '../../pages/panel/Alarmes/Alarmes.module.css'

/** Cartão "Neste navegador" da tela de alarmes (o app tem o "Neste celular"). */
export function NesteNavegador() {
  const toast = useToast()
  const [ligado, setLigado] = useState(tocarNoNavegador)
  const [permissao, setPermissao] = useState(permissaoNotificacao)

  const alternar = async (valor) => {
    liberarSom()
    if (valor && notificacaoSuportada()) setPermissao(await pedirPermissaoNotificacao())
    definirTocarNoNavegador(valor)
    setLigado(valor)
    toast.success(valor ? 'Os alarmes vão tocar neste navegador.' : 'Os alarmes não vão mais tocar neste navegador.')
  }

  const pedirNotificacao = async () => setPermissao(await pedirPermissaoNotificacao())

  return (
    <section className={styles.iot} aria-label="Alarmes neste navegador">
      <span className={styles.iotIcone} aria-hidden="true">
        <ClockIcon size={22} />
      </span>
      <div className={styles.iotTexto}>
        <Toggle
          label="Tocar os alarmes neste navegador"
          description="Com o painel aberto, mesmo em outra aba, os alarmes ativos tocam aqui também."
          checked={ligado}
          onChange={alternar}
        />
        {ligado && permissao === 'denied' && (
          <p>As notificações estão bloqueadas neste navegador. O som e o aviso na tela continuam funcionando.</p>
        )}
      </div>
      <div className={styles.iotAcoes}>
        <PillButton
          variant="contorno"
          size="lg"
          onClick={() => {
            liberarSom()
            bipeDeTeste()
          }}
        >
          Testar som
        </PillButton>
        {ligado && permissao === 'default' && (
          <PillButton variant="contorno" size="lg" onClick={pedirNotificacao}>
            Permitir notificações
          </PillButton>
        )}
      </div>
    </section>
  )
}
