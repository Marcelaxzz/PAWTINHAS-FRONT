// Aplica o tema salvo antes de a página aparecer (evita piscar claro no modo escuro).
try {
  if (localStorage.getItem('pawtinhas-tema') === 'escuro') document.documentElement.dataset.tema = 'escuro'
} catch {
  // Sem acesso ao armazenamento: fica no tema claro.
}
