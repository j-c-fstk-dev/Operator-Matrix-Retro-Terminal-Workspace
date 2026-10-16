// Marca que o JS está ativo antes da pintura: as animações de entrada só escondem
// conteúdo sob html.js, então sem JS a página aparece completa.
document.documentElement.classList.add('js');
