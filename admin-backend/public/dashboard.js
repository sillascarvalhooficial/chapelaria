function escapeHtml(str){ return String(str==null?'':str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function formatBRL(n){ return 'R$ ' + Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fotoSrc(caminho){ if(!caminho) return ''; return (/^https?:\/\//.test(caminho) ? caminho : '/'+caminho) + '?t='+Date.now(); }

function mostrarMensagem(texto, tipo){
  const box = document.getElementById('mensagemGeral');
  box.innerHTML = '<div class="' + (tipo==='erro'?'erro':'sucesso') + '">' + escapeHtml(texto) + '</div>';
  setTimeout(()=>{ box.innerHTML=''; }, 3500);
}

async function api(metodo, url, corpo){
  const resp = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  if(resp.status === 401){ window.location.href = 'login.html'; throw new Error('não autenticado'); }
  const dados = await resp.json().catch(()=>({}));
  if(!resp.ok) throw new Error(dados.erro || 'Erro na requisição.');
  return dados;
}

/* ---------- 1. dados do ateliê ---------- */
async function carregarLoja(){
  const loja = await api('GET', '/api/loja');
  document.getElementById('tituloLoja').textContent = loja.nome + ' · Painel';
  document.getElementById('lojaNome').value = loja.nome || '';
  document.getElementById('lojaSlogan').value = loja.slogan || '';
  document.getElementById('lojaWhatsapp').value = loja.whatsapp || '';
  document.getElementById('lojaWhatsappExibicao').value = loja.whatsappExibicao || '';
  document.getElementById('lojaTelefoneExibicao').value = loja.telefoneExibicao || '';
  document.getElementById('lojaInstagram').value = loja.instagram || '';
  document.getElementById('lojaFacebook').value = loja.facebook || '';
  document.getElementById('lojaEndereco').value = loja.endereco || '';
  document.getElementById('lojaHeroTexto').value = loja.heroTexto || '';
  document.getElementById('lojaSobreTitulo').value = loja.sobreTitulo || '';
  document.getElementById('lojaSobreTexto').value = loja.sobreTexto || '';
  document.getElementById('lojaFraseMuralVazio').value = loja.fraseMuralVazio || '';
}
document.getElementById('btnSalvarLoja').addEventListener('click', async function(){
  try{
    await api('PUT', '/api/loja', {
      nome: document.getElementById('lojaNome').value.trim(),
      slogan: document.getElementById('lojaSlogan').value.trim(),
      whatsapp: document.getElementById('lojaWhatsapp').value.trim(),
      whatsappExibicao: document.getElementById('lojaWhatsappExibicao').value.trim(),
      telefoneExibicao: document.getElementById('lojaTelefoneExibicao').value.trim(),
      instagram: document.getElementById('lojaInstagram').value.trim(),
      facebook: document.getElementById('lojaFacebook').value.trim(),
      endereco: document.getElementById('lojaEndereco').value.trim(),
      heroTexto: document.getElementById('lojaHeroTexto').value.trim(),
      sobreTitulo: document.getElementById('lojaSobreTitulo').value.trim(),
      sobreTexto: document.getElementById('lojaSobreTexto').value.trim(),
      fraseMuralVazio: document.getElementById('lojaFraseMuralVazio').value.trim()
    });
    mostrarMensagem('Dados do ateliê salvos.');
    carregarLoja();
  }catch(err){ mostrarMensagem(err.message, 'erro'); }
});

/* ---------- 2. horários ---------- */
let horariosAtual = [];
const NOMES_DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

async function carregarHorarios(){
  horariosAtual = await api('GET', '/api/horarios');
  renderHorarios();
}
function renderHorarios(){
  const lista = document.getElementById('listaHorarios');
  lista.innerHTML = horariosAtual.map(h => (
    '<div class="card-item" data-id="'+h.id+'">' +
      '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">' +
        NOMES_DIAS.map((nome, idx) => (
          '<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; border:1.5px solid '+(h.dias.includes(idx)?'var(--cor-secundaria)':'var(--border)')+'; background:'+(h.dias.includes(idx)?'var(--cor-secundaria)':'#fff')+'; color:'+(h.dias.includes(idx)?'#fff':'var(--text)')+'; border-radius:999px; padding:5px 10px; cursor:pointer;">' +
            '<input type="checkbox" class="campo-dia" value="'+idx+'" '+(h.dias.includes(idx)?'checked':'')+' style="display:none;">'+nome+
          '</label>'
        )).join('') +
      '</div>' +
      '<div class="grid-2">' +
        '<div class="campo"><label>Abre</label><input type="time" class="campo-abre" value="'+h.abre+'"></div>' +
        '<div class="campo"><label>Fecha</label><input type="time" class="campo-fecha" value="'+h.fecha+'"></div>' +
      '</div>' +
      '<div class="campo"><label>Texto exibido</label><input type="text" class="campo-texto" value="'+escapeHtml(h.texto)+'"></div>' +
      '<div class="rodape-painel">' +
        '<button class="icon-btn btn-salvar-horario">💾</button>' +
        '<button class="icon-btn btn-remover-horario">🗑️</button>' +
      '</div>' +
    '</div>'
  )).join('') || '<p class="desc">Nenhum horário cadastrado.</p>';
}
document.getElementById('listaHorarios').addEventListener('click', function(e){
  const item = e.target.closest('.card-item'); if(!item) return;
  const id = item.dataset.id;
  const chip = e.target.closest('label');
  if(chip && chip.querySelector('.campo-dia')){
    const cb = chip.querySelector('.campo-dia');
    cb.checked = !cb.checked;
    chip.style.background = cb.checked ? 'var(--cor-secundaria)' : '#fff';
    chip.style.color = cb.checked ? '#fff' : 'var(--text)';
    chip.style.borderColor = cb.checked ? 'var(--cor-secundaria)' : 'var(--border)';
    e.preventDefault();
    return;
  }
  if(e.target.classList.contains('btn-salvar-horario')){
    const dias = Array.from(item.querySelectorAll('.campo-dia:checked')).map(i=>Number(i.value));
    api('PUT', '/api/horarios/'+id, {
      dias, abre: item.querySelector('.campo-abre').value, fecha: item.querySelector('.campo-fecha').value,
      texto: item.querySelector('.campo-texto').value.trim()
    }).then(()=>{ mostrarMensagem('Horário salvo.'); carregarHorarios(); }).catch(err=>mostrarMensagem(err.message,'erro'));
  }
  if(e.target.classList.contains('btn-remover-horario')){
    if(!confirm('Remover este horário?')) return;
    api('DELETE', '/api/horarios/'+id).then(()=>{ mostrarMensagem('Horário removido.'); carregarHorarios(); }).catch(err=>mostrarMensagem(err.message,'erro'));
  }
});
document.getElementById('btnNovoHorario').addEventListener('click', async function(){
  try{
    await api('POST', '/api/horarios', { dias:[2,3,4,5,6], abre:'09:00', fecha:'18:00', texto:'Ter a Sáb: 09:00 - 18:00' });
    await carregarHorarios();
    mostrarMensagem('Horário criado — ajuste e salve.');
  }catch(err){ mostrarMensagem(err.message, 'erro'); }
});

/* ---------- 3. serviços ---------- */
let servicosAtual = [];
async function carregarServicos(){
  servicosAtual = await api('GET', '/api/servicos');
  renderServicos();
}
function renderServicos(){
  document.getElementById('corpoServicos').innerHTML = servicosAtual.map(s => (
    '<tr data-id="'+s.id+'">' +
      '<td><input type="text" class="campo-emoji" value="'+escapeHtml(s.emoji)+'" style="width:50px; text-align:center;" maxlength="4"></td>' +
      '<td><input type="text" class="campo-nome" value="'+escapeHtml(s.nome)+'"></td>' +
      '<td><input type="text" class="campo-descricao" value="'+escapeHtml(s.descricao||'')+'"></td>' +
      '<td><label class="switch"><input type="checkbox" class="campo-ativo" '+(s.ativo?'checked':'')+'><span class="slider"></span></label></td>' +
      '<td class="acoes"><button class="icon-btn btn-salvar">💾</button><button class="icon-btn btn-remover">🗑️</button></td>' +
    '</tr>'
  )).join('') || '<tr><td colspan="5" class="desc">Nenhum serviço cadastrado.</td></tr>';
}
document.getElementById('corpoServicos').addEventListener('click', function(e){
  const tr = e.target.closest('tr'); if(!tr || !tr.dataset.id) return;
  const id = tr.dataset.id;
  if(e.target.classList.contains('btn-salvar')){
    api('PUT', '/api/servicos/'+id, {
      nome: tr.querySelector('.campo-nome').value.trim(),
      descricao: tr.querySelector('.campo-descricao').value.trim(),
      emoji: tr.querySelector('.campo-emoji').value.trim(),
      ativo: tr.querySelector('.campo-ativo').checked
    }).then(()=>mostrarMensagem('Serviço salvo.')).catch(err=>mostrarMensagem(err.message,'erro'));
  }
  if(e.target.classList.contains('btn-remover')){
    if(!confirm('Remover este serviço?')) return;
    api('DELETE', '/api/servicos/'+id).then(()=>{ mostrarMensagem('Serviço removido.'); carregarServicos(); }).catch(err=>mostrarMensagem(err.message,'erro'));
  }
});
document.getElementById('corpoServicos').addEventListener('change', function(e){
  if(!e.target.classList.contains('campo-ativo')) return;
  const tr = e.target.closest('tr');
  api('PUT', '/api/servicos/'+tr.dataset.id, { ativo: e.target.checked })
    .then(()=>mostrarMensagem('Serviço atualizado.')).catch(err=>mostrarMensagem(err.message,'erro'));
});
document.getElementById('btnNovoServico').addEventListener('click', async function(){
  await api('POST', '/api/servicos', { nome: 'Novo serviço', descricao: '', emoji: '🤠' });
  await carregarServicos();
  mostrarMensagem('Serviço criado — edite e salve.');
});

/* ---------- 4. antes e depois ---------- */
let adAtual = [];
async function carregarAD(){
  adAtual = await api('GET', '/api/antes-depois');
  renderAD();
}
function renderAD(){
  document.getElementById('listaAntesDepois').innerHTML = adAtual.map(a => (
    '<div class="card-item" data-id="'+a.id+'">' +
      '<div class="card-item-topo">' +
        '<div class="card-item-campos">' +
          '<input type="text" class="campo-titulo" placeholder="Título" value="'+escapeHtml(a.titulo)+'">' +
          '<input type="text" class="campo-descricao" placeholder="Descrição (opcional)" value="'+escapeHtml(a.descricao||'')+'">' +
          '<label class="switch" style="margin-top:4px;"><input type="checkbox" class="campo-ativo" '+(a.ativo?'checked':'')+'><span class="slider"></span></label>' +
        '</div>' +
      '</div>' +
      '<div class="card-item-fotos">' +
        '<div class="card-item-foto"><label>Antes</label>' +
          '<div class="foto-wrap">' + (a.fotoAntes ? '<img class="foto-preview" src="'+fotoSrc(a.fotoAntes)+'">' : '<div class="foto-preview">📷</div>') +
          '<input type="file" class="foto-input campo-foto-antes" accept="image/png,image/jpeg,image/webp"></div>' +
        '</div>' +
        '<div class="card-item-foto"><label>Depois</label>' +
          '<div class="foto-wrap">' + (a.fotoDepois ? '<img class="foto-preview" src="'+fotoSrc(a.fotoDepois)+'">' : '<div class="foto-preview">📷</div>') +
          '<input type="file" class="foto-input campo-foto-depois" accept="image/png,image/jpeg,image/webp"></div>' +
        '</div>' +
      '</div>' +
      '<div class="rodape-painel">' +
        '<button class="icon-btn btn-salvar-ad" title="Salvar">💾</button>' +
        '<button class="icon-btn btn-remover-ad" title="Remover">🗑️</button>' +
      '</div>' +
    '</div>'
  )).join('') || '<p class="desc">Nenhum antes/depois cadastrado ainda.</p>';
}
document.getElementById('listaAntesDepois').addEventListener('click', function(e){
  const item = e.target.closest('.card-item'); if(!item) return;
  const id = item.dataset.id;
  if(e.target.classList.contains('btn-salvar-ad')){
    api('PUT', '/api/antes-depois/'+id, {
      titulo: item.querySelector('.campo-titulo').value.trim(),
      descricao: item.querySelector('.campo-descricao').value.trim(),
      ativo: item.querySelector('.campo-ativo').checked
    }).then(()=>mostrarMensagem('Salvo.')).catch(err=>mostrarMensagem(err.message,'erro'));
  }
  if(e.target.classList.contains('btn-remover-ad')){
    if(!confirm('Remover este antes/depois?')) return;
    api('DELETE', '/api/antes-depois/'+id).then(()=>{ mostrarMensagem('Removido.'); carregarAD(); }).catch(err=>mostrarMensagem(err.message,'erro'));
  }
});
document.getElementById('listaAntesDepois').addEventListener('change', function(e){
  const item = e.target.closest('.card-item'); if(!item) return;
  const id = item.dataset.id;
  let tipo = null;
  if(e.target.classList.contains('campo-foto-antes')) tipo = 'antes';
  if(e.target.classList.contains('campo-foto-depois')) tipo = 'depois';
  if(!tipo || !e.target.files[0]) return;
  const formData = new FormData();
  formData.append('imagem', e.target.files[0]);
  fetch('/api/antes-depois/'+id+'/foto/'+tipo, { method:'POST', body: formData })
    .then(r => { if(r.status===401){ window.location.href='login.html'; return; } return r.json(); })
    .then(d => { if(d && !d.ok && d.erro) throw new Error(d.erro); mostrarMensagem('Foto atualizada.'); carregarAD(); })
    .catch(err => mostrarMensagem(err.message, 'erro'));
});
document.getElementById('btnNovoAD').addEventListener('click', async function(){
  await api('POST', '/api/antes-depois', { titulo: 'Novo trabalho', descricao: '' });
  await carregarAD();
  mostrarMensagem('Item criado — adicione as fotos e salve.');
});

/* ---------- 5. mural de achados ---------- */
let achadosAtual = [];
async function carregarAchados(){
  achadosAtual = await api('GET', '/api/achados');
  renderAchados();
}
function renderAchados(){
  document.getElementById('listaAchados').innerHTML = achadosAtual.map(a => (
    '<div class="card-item" data-id="'+a.id+'">' +
      '<div class="card-item-topo">' +
        '<div class="foto-wrap">' + (a.imagem ? '<img class="foto-preview" src="'+fotoSrc(a.imagem)+'">' : '<div class="foto-preview">🤠</div>') +
          '<input type="file" class="foto-input campo-foto" accept="image/png,image/jpeg,image/webp"></div>' +
        '<div class="card-item-campos">' +
          '<input type="text" class="campo-nome" placeholder="Nome" value="'+escapeHtml(a.nome)+'">' +
          '<input type="text" class="campo-categoria" placeholder="Categoria (ex: Chapéu de pelo)" value="'+escapeHtml(a.categoria||'')+'">' +
          '<div class="grid-2">' +
            '<input type="number" step="0.01" class="campo-preco" placeholder="Preço" value="'+a.preco+'">' +
            '<label class="switch" style="align-self:center;"><input type="checkbox" class="campo-ativo" '+(a.ativo?'checked':'')+'><span class="slider"></span></label>' +
          '</div>' +
          '<input type="text" class="campo-descricao" placeholder="Descrição curta" value="'+escapeHtml(a.descricao||'')+'">' +
        '</div>' +
      '</div>' +
      '<div class="rodape-painel">' +
        '<button class="icon-btn btn-salvar-achado" title="Salvar">💾</button>' +
        '<button class="icon-btn btn-remover-achado" title="Remover">🗑️</button>' +
      '</div>' +
    '</div>'
  )).join('') || '<p class="desc">Nenhum achado no mural agora — o site vai mostrar a frase configurada na seção 1.</p>';
}
document.getElementById('listaAchados').addEventListener('click', function(e){
  const item = e.target.closest('.card-item'); if(!item) return;
  const id = item.dataset.id;
  if(e.target.classList.contains('btn-salvar-achado')){
    api('PUT', '/api/achados/'+id, {
      nome: item.querySelector('.campo-nome').value.trim(),
      categoria: item.querySelector('.campo-categoria').value.trim(),
      preco: Number(item.querySelector('.campo-preco').value) || 0,
      descricao: item.querySelector('.campo-descricao').value.trim(),
      ativo: item.querySelector('.campo-ativo').checked
    }).then(()=>mostrarMensagem('Achado salvo.')).catch(err=>mostrarMensagem(err.message,'erro'));
  }
  if(e.target.classList.contains('btn-remover-achado')){
    if(!confirm('Remover este achado?')) return;
    api('DELETE', '/api/achados/'+id).then(()=>{ mostrarMensagem('Achado removido.'); carregarAchados(); }).catch(err=>mostrarMensagem(err.message,'erro'));
  }
});
document.getElementById('listaAchados').addEventListener('change', function(e){
  const item = e.target.closest('.card-item'); if(!item) return;
  const id = item.dataset.id;
  if(e.target.classList.contains('campo-foto') && e.target.files[0]){
    const formData = new FormData();
    formData.append('imagem', e.target.files[0]);
    fetch('/api/achados/'+id+'/imagem', { method:'POST', body: formData })
      .then(r => { if(r.status===401){ window.location.href='login.html'; return; } return r.json(); })
      .then(d => { if(d && !d.ok && d.erro) throw new Error(d.erro); mostrarMensagem('Foto atualizada.'); carregarAchados(); })
      .catch(err => mostrarMensagem(err.message, 'erro'));
  }
});
document.getElementById('btnNovoAchado').addEventListener('click', async function(){
  await api('POST', '/api/achados', { nome: 'Novo achado', descricao: '', categoria: '', preco: 0 });
  await carregarAchados();
  mostrarMensagem('Achado criado — edite os campos e salve.');
});

/* ---------- senha ---------- */
document.getElementById('btnTrocarSenha').addEventListener('click', async function(){
  const senhaAtual = document.getElementById('senhaAtual').value;
  const novaSenha = document.getElementById('novaSenha').value;
  try{
    await api('PUT', '/api/senha', { senhaAtual, novaSenha });
    document.getElementById('senhaAtual').value = '';
    document.getElementById('novaSenha').value = '';
    mostrarMensagem('Senha alterada com sucesso.');
  }catch(err){ mostrarMensagem(err.message, 'erro'); }
});

document.getElementById('btnSair').addEventListener('click', async function(){
  await api('POST', '/api/logout');
  window.location.href = 'login.html';
});

/* ---------- init ---------- */
(async function init(){
  try{
    const sessao = await api('GET', '/api/session');
    if(!sessao.autenticado){ window.location.href = 'login.html'; return; }
    document.getElementById('usuarioLogado').textContent = '· ' + sessao.usuario;
    await carregarLoja();
    await carregarHorarios();
    await carregarServicos();
    await carregarAD();
    await carregarAchados();
  }catch(err){
    console.error(err);
  }
})();
