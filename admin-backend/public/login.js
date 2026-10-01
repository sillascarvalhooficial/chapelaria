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

/* ---------- esqueci minha senha (redefine com a senha mestre) ---------- */
const formLogin = document.getElementById('formLogin');
const formResetar = document.getElementById('formResetarSenha');
const erroBox = document.getElementById('erroBox');

document.getElementById('btnEsqueciSenha').addEventListener('click', function(){
  erroBox.innerHTML = '';
  formLogin.hidden = true;
  this.hidden = true;
  document.querySelector('.credenciais-padrao').hidden = true;
  document.getElementById('resetUsuario').value = document.getElementById('usuario').value.trim();
  formResetar.hidden = false;
});
document.getElementById('btnCancelarReset').addEventListener('click', function(){
  erroBox.innerHTML = '';
  formResetar.hidden = true;
  formLogin.hidden = false;
  document.getElementById('btnEsqueciSenha').hidden = false;
  document.querySelector('.credenciais-padrao').hidden = false;
});

formResetar.addEventListener('submit', async function(e){
  e.preventDefault();
  const usuario = document.getElementById('resetUsuario').value.trim();
  const senhaMestre = document.getElementById('resetSenhaMestre').value;
  const novaSenha = document.getElementById('resetNovaSenha').value;
  erroBox.innerHTML = '';

  try{
    const resp = await fetch('/api/senha/resetar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senhaMestre, novaSenha })
    });
    const dados = await resp.json();
    if(!resp.ok){
      erroBox.innerHTML = '<div class="erro">' + (dados.erro || 'Não foi possível redefinir a senha.') + '</div>';
      return;
    }
    erroBox.innerHTML = '<div class="sucesso">Senha redefinida! Já pode entrar com a senha nova.</div>';
    formResetar.reset();
    formResetar.hidden = true;
    formLogin.hidden = false;
    document.getElementById('btnEsqueciSenha').hidden = false;
    document.querySelector('.credenciais-padrao').hidden = false;
    document.getElementById('usuario').value = usuario;
  }catch(err){
    erroBox.innerHTML = '<div class="erro">Erro de conexão com o servidor.</div>';
  }
});
