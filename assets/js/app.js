/* ==========================================================================
   ATELIÊ DO CHAPÉU — lógica de renderização do site
   Lê os dados de config.js, servicos.js, antesDepois.js e achados.js.
   Não deveria ser necessário mexer aqui só para trocar de cliente.
   ========================================================================== */

/* ---------- helpers ---------- */
function formatBRL(n){ return 'R$ ' + Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function escapeHtml(str){ return String(str==null?'':str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function initials(nome){ return nome.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function hexToRgb(hex){
  hex = (hex||'').replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex,16) || 0;
  return [(num>>16)&255, (num>>8)&255, num&255].join(',');
}
function linkWhatsApp(mensagem){ return 'https://wa.me/'+loja.whatsapp+'?text='+encodeURIComponent(mensagem); }

const ICONS = {
  instagram:'<path d="M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5Z"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  facebook:'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>',
  chat:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>'
};
function ic(name, size){ size = size || 16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[name]||'')+'</svg>'; }

/* ---------- tema ---------- */
function aplicarTema(){
  const root = document.documentElement;
  root.style.setProperty('--cor-principal', loja.corPrincipal);
  root.style.setProperty('--cor-principal-rgb', hexToRgb(loja.corPrincipal));
  root.style.setProperty('--cor-secundaria', loja.corSecundaria);
  root.style.setProperty('--cor-secundaria-rgb', hexToRgb(loja.corSecundaria));
  document.title = loja.nome + ' | ' + loja.slogan;
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc) metaDesc.setAttribute('content', loja.slogan + ' Fale direto pelo WhatsApp.');
}

/* ---------- A. topbar ---------- */
function renderTopbar(){
  document.getElementById('topbarContato').textContent = (loja.telefoneExibicao || loja.whatsappExibicao || '') + (loja.endereco ? '  ·  ' + loja.endereco : '');
  const redes = [];
  if(loja.instagram) redes.push({icon:'instagram', href:'https://instagram.com/'+loja.instagram.replace('@','')});
  if(loja.facebook) redes.push({icon:'facebook', href:loja.facebook});
  document.getElementById('topbarRedes').innerHTML = redes.map(r=>(
    '<a href="'+r.href+'" target="_blank" rel="noopener">'+ic(r.icon,13)+'</a>'
  )).join('');
}

/* ---------- B. header ---------- */
function renderHeader(){
  document.getElementById('marcaNome').textContent = loja.nome;
  document.getElementById('marcaSlogan').textContent = loja.slogan;
  document.getElementById('logoBadge').innerHTML = loja.logo ? '<img src="'+loja.logo+'" alt="'+escapeHtml(loja.nome)+'">' : initials(loja.nome);
  const linkWhats = linkWhatsApp('Olá! Vim pelo site e queria falar sobre um serviço.');
  document.getElementById('btnWhatsHeader').href = linkWhats;
  document.getElementById('btnWhatsHero').href = linkWhats;
  if(loja.heroTexto) document.getElementById('heroTexto').textContent = loja.heroTexto;
}

/* ---------- E. serviços ---------- */
function renderServicos(){
  const ativos = servicos.filter(s=>s.ativo).sort((a,b)=>(a.ordem||0)-(b.ordem||0));
  document.getElementById('servicosGrid').innerHTML = ativos.map(s=>(
    '<div class="servico-card">'+
      '<div class="servico-icone">'+(s.emoji||'🤠')+'</div>'+
      '<h3>'+escapeHtml(s.nome)+'</h3>'+
      '<p>'+escapeHtml(s.descricao)+'</p>'+
    '</div>'
  )).join('') || '<p style="text-align:center; color:var(--muted);">Serviços em breve.</p>';
}

/* ---------- F. antes e depois ---------- */
function renderAntesDepois(){
  const ativos = antesDepois.filter(a=>a.ativo).sort((a,b)=>(a.ordem||0)-(b.ordem||0));
  const secao = document.getElementById('antes-depois');
  const btnHero = document.getElementById('btnVerAntesDepois');
  if(ativos.length===0){ secao.hidden = true; if(btnHero) btnHero.hidden = true; return; }
  secao.hidden = false;
  if(btnHero) btnHero.hidden = false;
  document.getElementById('adGrid').innerHTML = ativos.map(a=>(
    '<div class="ad-card">'+
      '<div class="ad-fotos">'+
        '<div class="ad-foto-wrap"><span>Antes</span>'+(a.fotoAntes?'<img src="'+a.fotoAntes+'" alt="Antes">':'')+'</div>'+
        '<div class="ad-foto-wrap"><span>Depois</span>'+(a.fotoDepois?'<img src="'+a.fotoDepois+'" alt="Depois">':'')+'</div>'+
      '</div>'+
      '<div class="ad-corpo"><h3>'+escapeHtml(a.titulo)+'</h3>'+(a.descricao?'<p>'+escapeHtml(a.descricao)+'</p>':'')+'</div>'+
    '</div>'
  )).join('');
}

/* ---------- G. mural de achados ---------- */
function renderAchados(){
  const ativos = achados.filter(a=>a.ativo).sort((a,b)=>(a.ordem||0)-(b.ordem||0));
  const container = document.getElementById('achadosConteudo');
  if(ativos.length===0){
    container.innerHTML =
      '<div class="mural-vazio">'+
        '<div class="mural-vazio-icone">🔎</div>'+
        '<h3>Nada por aqui ainda</h3>'+
        '<p>'+escapeHtml(loja.fraseMuralVazio || 'O próximo grande achado está sendo negociado... volte em breve!')+'</p>'+
      '</div>';
    return;
  }
  container.innerHTML = '<div class="achados-grid">' + ativos.map(a=>{
    const linkItem = linkWhatsApp('Olá! Vi o "'+a.nome+'" no Mural de Achados e quero saber mais.');
    return (
      '<div class="achado-card">'+
        '<div class="achado-tile">'+(a.imagem?'<img src="'+a.imagem+'" alt="'+escapeHtml(a.nome)+'">':'🤠')+'</div>'+
        '<div class="achado-corpo">'+
          (a.categoria?'<div class="achado-categoria">'+escapeHtml(a.categoria)+'</div>':'')+
          '<div class="achado-nome">'+escapeHtml(a.nome)+'</div>'+
          (a.descricao?'<div class="achado-desc">'+escapeHtml(a.descricao)+'</div>':'')+
          '<div class="achado-preco">'+formatBRL(a.preco)+'</div>'+
          '<a class="achado-cta" href="'+linkItem+'" target="_blank" rel="noopener">Falar sobre esse</a>'+
        '</div>'+
      '</div>'
    );
  }).join('') + '</div>';
}

/* ---------- H. sobre ---------- */
function renderSobre(){
  if(loja.sobreTitulo) document.getElementById('sobreTitulo').textContent = loja.sobreTitulo;
  if(loja.sobreTexto) document.getElementById('sobreTexto').textContent = loja.sobreTexto;
}

/* ---------- I. contato ---------- */
function renderContato(){
  const linkWhats = linkWhatsApp('Olá! Vim pelo site e queria falar sobre um serviço.');
  document.getElementById('infoWhats').href = linkWhats;
  document.getElementById('infoWhats').textContent = loja.whatsappExibicao || loja.whatsapp;
  if(loja.instagram){
    document.getElementById('infoInstagram').href = 'https://instagram.com/'+loja.instagram.replace('@','');
    document.getElementById('infoInstagram').textContent = loja.instagram;
  }
  document.getElementById('infoEndereco').textContent = loja.endereco || 'Atendimento sob agendamento.';
  document.getElementById('infoHorarios').innerHTML = (loja.horarios||[]).map(h=>(
    '<div class="horario-linha"><span>'+escapeHtml(h.texto)+'</span></div>'
  )).join('') || '<div class="horario-linha"><span>Combine o melhor horário pelo WhatsApp.</span></div>';
}

/* ---------- J. rodapé ---------- */
function renderRodape(){
  document.getElementById('footerNome').textContent = loja.nome;
  document.getElementById('footerSlogan').textContent = loja.slogan;
  document.getElementById('footerAno').textContent = new Date().getFullYear();
  const redes = [];
  if(loja.instagram) redes.push({nome:'Instagram', href:'https://instagram.com/'+loja.instagram.replace('@','')});
  if(loja.facebook) redes.push({nome:'Facebook', href:loja.facebook});
  redes.push({nome:'WhatsApp', href:linkWhatsApp('Olá! Vim pelo site e queria falar sobre um serviço.')});
  document.getElementById('footerRedes').innerHTML = redes.map(r=>'<li><a href="'+r.href+'" target="_blank" rel="noopener">'+r.nome+'</a></li>').join('');
}

/* ---------- modal / toast (usados pelo assistente) ---------- */
function abrirModal(html){
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
function fecharModal(){
  document.getElementById('overlay').hidden = true;
  document.getElementById('modalBox').innerHTML = '';
  document.body.style.overflow = '';
}
function showToast(msg, type){
  type = type || '';
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = (type==='success' ? ic('check',14) : type==='error' ? ic('x',14) : '') + ' ' + escapeHtml(msg);
  c.appendChild(el);
  setTimeout(function(){ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(function(){ el.remove(); }, 300); }, 2600);
}

document.addEventListener('click', function(e){
  if(e.target.closest('[data-action="fechar-modal"]')) fecharModal();
  if(e.target.id === 'overlay') fecharModal();
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && !document.getElementById('overlay').hidden) fecharModal();
});

/* ---------- init ---------- */
function init(){
  aplicarTema();
  renderTopbar();
  renderHeader();
  renderServicos();
  renderAntesDepois();
  renderAchados();
  renderSobre();
  renderContato();
  renderRodape();
}
document.addEventListener('DOMContentLoaded', init);
