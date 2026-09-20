document.getElementById('formLogin').addEventListener('submit', async function(e){
  e.preventDefault();
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erroBox = document.getElementById('erroBox');
  erroBox.innerHTML = '';

  try{
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    const dados = await resp.json();
    if(!resp.ok){
      erroBox.innerHTML = '<div class="erro">' + (dados.erro || 'Não foi possível entrar.') + '</div>';
      return;
    }
    window.location.href = 'dashboard.html';
  }catch(err){
    erroBox.innerHTML = '<div class="erro">Erro de conexão com o servidor.</div>';
  }
});
