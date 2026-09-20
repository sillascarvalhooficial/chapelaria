/* ==========================================================================
   ASSISTENTE DE CONTATO — captura o que a pessoa digitou e já monta o link
   do WhatsApp com essa mensagem. Mais simples que o OAK Assist: aqui não
   tenta responder perguntas, só transforma "o que a pessoa quer" em um
   contato pronto pra enviar. Sem custo de API, sem backend.
   Módulo autocontido: só precisa deste arquivo carregado depois de app.js
   (usa loja, linkWhatsApp e escapeHtml).
   ========================================================================== */

const ATELIE_SUGESTOES = [
  'Quero um orçamento de restauração',
  'Tenho um chapéu pra vender',
  'Quero saber sobre customização'
];

function atelieMontarLinkWhats(texto){
  const mensagem = 'Olá! Vim pelo site do ' + loja.nome + '.\n\n' + texto.trim();
  return linkWhatsApp(mensagem);
}

function atelieAtualizarBotao(){
  const texto = document.getElementById('atelieInput').value.trim();
  const btn = document.getElementById('atelieBotaoEnviar');
  if(texto){
    btn.href = atelieMontarLinkWhats(texto);
    btn.classList.remove('atelie-btn-desabilitado');
  } else {
    btn.href = '#';
    btn.classList.add('atelie-btn-desabilitado');
  }
}

function atelieCriarWidget(){
  const estilo = document.createElement('style');
  estilo.textContent = `
    .atelie-bubble{position:fixed; right:18px; bottom:18px; width:58px; height:58px; border-radius:50%;
      background:var(--cor-principal,#C7A15A); color:#1a1712; display:flex; align-items:center; justify-content:center;
      font-size:26px; box-shadow:0 8px 24px rgba(0,0,0,.28); cursor:pointer; z-index:300; border:none;}
    .atelie-panel{position:fixed; right:18px; bottom:86px; width:320px; max-width:calc(100vw - 36px);
      background:#fff; border-radius:18px; box-shadow:0 14px 44px rgba(0,0,0,.28); overflow:hidden; z-index:300; font-family:inherit;}
    .atelie-head{background:var(--cor-secundaria,#1C1A17); color:#fff; padding:14px 16px; position:relative;}
    .atelie-head strong{font-size:14px; display:block;}
    .atelie-head span{font-size:11.5px; opacity:.7;}
    .atelie-head button{position:absolute; top:10px; right:12px; background:none; border:none; color:#fff; font-size:18px; cursor:pointer;}
    .atelie-corpo{padding:16px;}
    .atelie-corpo p{font-size:12.5px; color:#6b6357; margin-bottom:10px;}
    .atelie-sugestoes{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;}
    .atelie-sugestoes button{font-size:11px; border:1px solid #E9E2D6; background:#FAF8F5; border-radius:999px; padding:6px 11px; cursor:pointer; text-align:left;}
    .atelie-textarea{width:100%; border:1.5px solid #E9E2D6; border-radius:10px; padding:10px 12px; font-size:13px; min-height:72px; resize:vertical; outline:none; box-sizing:border-box;}
    .atelie-textarea:focus{border-color:var(--cor-principal,#C7A15A);}
    .atelie-botao{display:flex; align-items:center; justify-content:center; gap:8px; margin-top:12px; width:100%;
      background:#25D366; color:#fff; border:none; border-radius:999px; padding:12px; font-weight:700; font-size:13px;}
    .atelie-btn-desabilitado{pointer-events:none; opacity:.5;}
  `;
  document.head.appendChild(estilo);

  const bolha = document.createElement('button');
  bolha.className = 'atelie-bubble';
  bolha.setAttribute('aria-label', 'Falar sobre um chapéu');
  bolha.textContent = '🤠';

  const painel = document.createElement('div');
  painel.className = 'atelie-panel';
  painel.hidden = true;
  painel.innerHTML =
    '<div class="atelie-head"><strong>Fale sobre seu chapéu</strong><span>Responde direto no WhatsApp</span>' +
      '<button id="atelieFechar" aria-label="Fechar">×</button></div>' +
    '<div class="atelie-corpo">' +
      '<p>Conta rapidinho o que você precisa — eu já preparo a mensagem pro WhatsApp:</p>' +
      '<div class="atelie-sugestoes">' + ATELIE_SUGESTOES.map(s => '<button type="button" data-sugestao="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>').join('') + '</div>' +
      '<textarea id="atelieInput" class="atelie-textarea" placeholder="Ex: quero remodelar a aba de um chapéu de pelo..."></textarea>' +
      '<a id="atelieBotaoEnviar" class="atelie-botao atelie-btn-desabilitado" href="#" target="_blank" rel="noopener">' + ic('chat',16) + ' Enviar no WhatsApp</a>' +
    '</div>';

  document.body.appendChild(bolha);
  document.body.appendChild(painel);

  bolha.addEventListener('click', function(){ painel.hidden = !painel.hidden; });
  document.getElementById('atelieFechar').addEventListener('click', function(){ painel.hidden = true; });
  document.getElementById('atelieInput').addEventListener('input', atelieAtualizarBotao);
  painel.querySelectorAll('[data-sugestao]').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.getElementById('atelieInput').value = btn.dataset.sugestao + ': ';
      document.getElementById('atelieInput').focus();
      atelieAtualizarBotao();
    });
  });
}

document.addEventListener('DOMContentLoaded', atelieCriarWidget);
