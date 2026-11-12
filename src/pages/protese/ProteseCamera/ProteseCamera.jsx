import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { proteseTabs } from '../proteseTabs.js'
import { photoSrc } from '../../../utils/images.js'
import { abrirCamera, fecharCamera, mensagemErroCamera } from '../../../utils/camera.js'
import { usePetFromQuery } from '../usePetFromQuery.js'
import fundo from '../../../assets/images/consultorio-desfocado.webp'
import shared from '../ProteseShared.module.css'
import styles from './ProteseCamera.module.css'

export function ProteseCamera() {
  const navigate = useNavigate()
  const { petId, pet, query } = usePetFromQuery()
  const [status, setStatus] = useState('pergunta')
  const [message, setMessage] = useState('')

  const requestCamera = async () => {
    setStatus('aguardando')
    try {
      // A câmera é reaberta na tela de medição; aqui só confirmamos a permissão.
      fecharCamera(await abrirCamera())
      navigate(`/protese-3d/medicao${query}`, { state: { camera: true } })
    } catch (error) {
      setStatus('erro')
      setMessage(mensagemErroCamera(error))
    }
  }

  const backTo = petId ? `/pacientes/${encodeURIComponent(petId)}` : '/pacientes'

  return (
    <Page
      title="Medição para prótese 3D"
      subtitle="Com a câmera liberada, você fotografa o membro e o sistema calcula as medidas."
      tabs={proteseTabs(query)}
    >
      {pet && (
        <span className={shared.paciente}>
          {photoSrc(pet.foto) && <img src={photoSrc(pet.foto)} alt="" />}
          Paciente: {pet.nome}
        </span>
      )}

      <section className={styles.palco} aria-labelledby="titulo-camera">
        <img src={fundo} alt="" className={styles.fundo} />
        <div className={styles.cartao}>
          <h2 id="titulo-camera" className={styles.pergunta}>
            Podemos usar sua câmera?
          </h2>
          <p className={styles.texto}>
            {status === 'erro'
              ? message
              : 'A câmera serve para fotografar o membro com o cartão encostado. A foto fica só neste aparelho.'}
          </p>

          <button
            type="button"
            className={shared.botaoPrimario}
            onClick={requestCamera}
            disabled={status === 'aguardando'}
          >
            {status === 'aguardando'
              ? 'Aguardando permissão…'
              : status === 'erro'
                ? 'Tentar novamente'
                : 'Permitir acesso'}
          </button>
          {status === 'erro' ? (
            <Link to={`/protese-3d/medicao${query}`} className={shared.botaoSecundario}>
              Enviar uma foto
            </Link>
          ) : (
            <button type="button" className={shared.botaoSecundario} onClick={() => navigate(backTo)}>
              Agora não
            </button>
          )}
        </div>
      </section>
    </Page>
  )
}
