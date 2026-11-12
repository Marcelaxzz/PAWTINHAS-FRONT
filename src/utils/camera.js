/**
 * Acesso à câmera para a medição da prótese 3D.
 * O navegador só libera a câmera em https ou em localhost; fora disso, navigator.mediaDevices nem existe.
 */

const MENSAGENS = {
  NotAllowedError: 'O acesso à câmera foi negado. Libere a permissão nas configurações do navegador para continuar.',
  SecurityError: 'O acesso à câmera foi bloqueado pelo navegador.',
  NotFoundError: 'Nenhuma câmera foi encontrada neste dispositivo.',
  NotReadableError: 'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.',
  AbortError: 'A câmera não respondeu. Tente de novo.',
}

export class ErroCamera extends Error {
  constructor(message, name = 'ErroCamera') {
    super(message)
    this.name = name
  }
}

/** Abre a câmera traseira quando existir; se não, qualquer câmera disponível (notebooks, webcams). */
export async function abrirCamera() {
  if (!window.isSecureContext) {
    throw new ErroCamera(
      'A câmera só funciona em conexão segura. Abra o sistema por https ou pelo endereço localhost.',
      'ContextoInseguro',
    )
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new ErroCamera(
      'Este navegador não permite acesso à câmera. Use uma versão atualizada do Chrome, Edge, Firefox ou Safari.',
      'SemSuporte',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      // Resolução alta ajuda a marcar os pontos com precisão na medição.
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
  } catch (error) {
    // Alguns navegadores recusam a preferência pela câmera traseira em vez de ignorá-la.
    if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    }
    throw error
  }
}

export function fecharCamera(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function mensagemErroCamera(error) {
  if (error instanceof ErroCamera) return error.message
  return MENSAGENS[error?.name] ?? 'Não foi possível acessar a câmera agora.'
}
