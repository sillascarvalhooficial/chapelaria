require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');
const cloudinary = require('cloudinary').v2;

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'atelie.sqlite');
const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const ASSETS_JS_DIR = path.join(ASSETS_DIR, 'js');
const INDEX_HTML = path.join(PROJECT_ROOT, 'index.html');

fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_ADMIN_USER = process.env.ADMIN_USER || 'admin';
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.log('[admin-backend] Aviso: SESSION_SECRET não definido no .env — usando um valor aleatório só desta execução.');
}

/* ==========================================================================
   BANCO DE DADOS (libSQL — @libsql/client)
   Em desenvolvimento, sem TURSO_DATABASE_URL configurado, usa um arquivo
   local (mesmo formato SQLite de sempre). Em produção (Render free, por
   exemplo, que não tem disco persistente), configure TURSO_DATABASE_URL e
   TURSO_AUTH_TOKEN com um banco Turso (libSQL hospedado, free tier sem
   cartão) — o código é o mesmo, só muda pra onde ele aponta.
   ========================================================================== */
const TURSO_URL = process.env.TURSO_DATABASE_URL || ('file:' + DB_FILE.replace(/\\/g, '/'));
const db = createClient({
  url: TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number'
});

function linhasParaObjetos(resultSet) {
  return resultSet.rows.map(linha => {
    const obj = {};
    resultSet.columns.forEach((coluna, i) => { obj[coluna] = linha[i]; });
    return obj;
  });
}
async function dbGet(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return linhasParaObjetos(rs)[0];
}
async function dbAll(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return linhasParaObjetos(rs);
}
async function dbRun(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid };
}

/* ==========================================================================
   ARMAZENAMENTO DE IMAGENS (Cloudinary — free tier, sem disco local)
   ========================================================================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const CLOUDINARY_CONFIGURADO = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (!CLOUDINARY_CONFIGURADO) {
  console.log('[admin-backend] Aviso: credenciais do Cloudinary não configuradas — upload de fotos vai falhar até configurar CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET no .env.');
}

function uploadParaCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, invalidate: true, resource_type: 'image' },
      (erro, resultado) => erro ? reject(erro) : resolve(resultado)
    );
    stream.end(buffer);
  });
}
async function apagarImagemCloudinary(publicId) {
  if (!CLOUDINARY_CONFIGURADO) return;
  try { await cloudinary.uploader.destroy(publicId); } catch (_) { /* pode não existir ainda, ok ignorar */ }
}

/* ---------- schema ---------- */
async function criarSchema() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      usuario TEXT NOT NULL,
      senhaHash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS loja (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome TEXT, slug TEXT, slogan TEXT, logo TEXT,
      whatsapp TEXT, whatsappExibicao TEXT, telefoneExibicao TEXT,
      instagram TEXT, facebook TEXT,
      corPrincipal TEXT, corSecundaria TEXT,
      endereco TEXT, linkMapa TEXT,
      heroTexto TEXT, sobreTitulo TEXT, sobreTexto TEXT, fraseMuralVazio TEXT
    );
    CREATE TABLE IF NOT EXISTS horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dias TEXT NOT NULL, abre TEXT NOT NULL, fecha TEXT NOT NULL, texto TEXT NOT NULL,
      ordem INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL, descricao TEXT, emoji TEXT NOT NULL DEFAULT '🤠',
      ativo INTEGER NOT NULL DEFAULT 1, ordem INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS antes_depois (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL, descricao TEXT,
      fotoAntes TEXT, fotoDepois TEXT,
      ativo INTEGER NOT NULL DEFAULT 1, ordem INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS achados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL, descricao TEXT, categoria TEXT, preco REAL NOT NULL DEFAULT 0,
      imagem TEXT, ativo INTEGER NOT NULL DEFAULT 1, ordem INTEGER NOT NULL
    );
  `);
}

/* ---------- seed inicial (só roda se o banco ainda não tem admin) ---------- */
async function seedInicial() {
  const adminExistente = await dbGet('SELECT id FROM admin WHERE id = 1');
  if (adminExistente) return;

  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASS, 10);
  await dbRun('INSERT INTO admin (id, usuario, senhaHash) VALUES (1, ?, ?)', [DEFAULT_ADMIN_USER, hash]);
  console.log('\n[admin-backend] Usuário admin criado -> usuario: "' + DEFAULT_ADMIN_USER + '" | senha: "' + DEFAULT_ADMIN_PASS + '"');
  console.log('[admin-backend] Troque essa senha na primeira vez que entrar no painel.\n');

  await dbRun(`INSERT INTO loja (id, nome, slug, slogan, logo, whatsapp, whatsappExibicao, telefoneExibicao,
    instagram, facebook, corPrincipal, corSecundaria, endereco, linkMapa, heroTexto, sobreTitulo, sobreTexto, fraseMuralVazio)
    VALUES (1, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?)`, [
    'Ateliê do Chapéu', 'atelie-do-chapeu', 'Modelagem e restauração artesanal', '',
    '5500000000000', '(00) 00000-0000', '(00) 0000-0000',
    '@ateliedochapeu', '', '#C7A15A', '#1C1A17',
    'Atendimento sob agendamento', '', '',
    'Sobre o ateliê', 'Trabalho artesanal dedicado à cultura country — cada chapéu é tratado como único, com técnica de modelagem, curva de aba e acabamento que respeitam a identidade da peça e de quem usa.',
    'O próximo grande achado está sendo negociado... volte em breve!'
  ]);

  const horariosSeed = [
    { dias: [2, 3, 4, 5, 6], abre: '09:00', fecha: '18:00', texto: 'Ter a Sáb: 09:00 - 18:00 (com agendamento)' }
  ];
  for (let i = 0; i < horariosSeed.length; i++) {
    const h = horariosSeed[i];
    await dbRun('INSERT INTO horarios (dias, abre, fecha, texto, ordem) VALUES (?,?,?,?,?)', [JSON.stringify(h.dias), h.abre, h.fecha, h.texto, i]);
  }

  const servicosSeed = [
    ['Modelagem', 'Ajuste completo da forma do chapéu, respeitando o estilo original ou criando um novo.', '✂️'],
    ['Curvar abas', 'Curva de aba personalizada, no ponto certo pra cada rosto e estilo.', '🌀'],
    ['Ajustar copa', 'Ajuste de altura e formato da copa.', '🎩'],
    ['Aplicar goma', 'Goma artesanal pra dar rigidez e durabilidade à peça.', '💧'],
    ['Customização', 'Fitas, emblemas, plumas e detalhes que deixam o chapéu com a sua cara.', '🎨'],
    ['Limpeza', 'Limpeza profissional que devolve a aparência original do chapéu.', '🧽']
  ];
  for (let i = 0; i < servicosSeed.length; i++) {
    const s = servicosSeed[i];
    await dbRun('INSERT INTO servicos (nome, descricao, emoji, ativo, ordem) VALUES (?,?,?,1,?)', [s[0], s[1], s[2], i]);
  }
}

/* ---------- helpers de leitura ---------- */
async function lerLoja() {
  const row = await dbGet('SELECT * FROM loja WHERE id = 1');
  return Object.assign({}, row, { horarios: await lerHorarios() });
}
async function lerHorarios() {
  const rows = await dbAll('SELECT * FROM horarios ORDER BY ordem ASC');
  return rows.map(h => Object.assign({}, h, { dias: JSON.parse(h.dias) }));
}
async function lerServicos() {
  const rows = await dbAll('SELECT * FROM servicos ORDER BY ordem ASC');
  return rows.map(s => Object.assign({}, s, { ativo: !!s.ativo }));
}
async function lerAntesDepois() {
  const rows = await dbAll('SELECT * FROM antes_depois ORDER BY ordem ASC');
  return rows.map(a => Object.assign({}, a, { ativo: !!a.ativo }));
}
async function lerAchados() {
  const rows = await dbAll('SELECT * FROM achados ORDER BY ordem ASC');
  return rows.map(a => Object.assign({}, a, { ativo: !!a.ativo }));
}

async function salvarLoja(campos) {
  const atual = await dbGet('SELECT * FROM loja WHERE id = 1');
  const colunas = ['nome', 'slug', 'slogan', 'logo', 'whatsapp', 'whatsappExibicao', 'telefoneExibicao', 'instagram', 'facebook',
    'corPrincipal', 'corSecundaria', 'endereco', 'linkMapa', 'heroTexto', 'sobreTitulo', 'sobreTexto', 'fraseMuralVazio'];
  const novo = Object.assign({}, atual, campos);
  const valores = colunas.map(c => novo[c]);
  await dbRun(`UPDATE loja SET ${colunas.map(c => c + ' = ?').join(', ')} WHERE id = 1`, valores);
}

/* ---------- regeneração dos arquivos públicos ---------- */
async function regenerarConfigJs() {
  const loja = await lerLoja();
  const conteudo =
    '/* Arquivo gerado automaticamente pelo painel admin em ' + new Date().toLocaleString('pt-BR') + '. Não edite manualmente. */\n\n' +
    'const loja = ' + JSON.stringify(loja, null, 2) + ';\n';
  fs.writeFileSync(path.join(ASSETS_JS_DIR, 'config.js'), conteudo);
}
async function regenerarServicosJs() {
  const conteudo =
    '/* Arquivo gerado automaticamente pelo painel admin em ' + new Date().toLocaleString('pt-BR') + '. Não edite manualmente. */\n\n' +
    'const servicos = ' + JSON.stringify(await lerServicos(), null, 2) + ';\n';
  fs.writeFileSync(path.join(ASSETS_JS_DIR, 'servicos.js'), conteudo);
}
async function regenerarAntesDepoisJs() {
  const conteudo =
    '/* Arquivo gerado automaticamente pelo painel admin em ' + new Date().toLocaleString('pt-BR') + '. Não edite manualmente. */\n\n' +
    'const antesDepois = ' + JSON.stringify(await lerAntesDepois(), null, 2) + ';\n';
  fs.writeFileSync(path.join(ASSETS_JS_DIR, 'antesDepois.js'), conteudo);
}
async function regenerarAchadosJs() {
  const conteudo =
    '/* Arquivo gerado automaticamente pelo painel admin em ' + new Date().toLocaleString('pt-BR') + '. Não edite manualmente. */\n\n' +
    'const achados = ' + JSON.stringify(await lerAchados(), null, 2) + ';\n';
  fs.writeFileSync(path.join(ASSETS_JS_DIR, 'achados.js'), conteudo);
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4, secure: process.env.NODE_ENV === 'production' }
}));

function asyncHandler(fn) {
  return (req, res, next) => { fn(req, res, next).catch(next); };
}

const tentativasLogin = new Map();
function ipBloqueado(ip) { const i = tentativasLogin.get(ip); return i && i.bloqueadoAte && i.bloqueadoAte > Date.now(); }
function registrarFalha(ip) {
  const i = tentativasLogin.get(ip) || { count: 0, bloqueadoAte: 0 };
  i.count += 1;
  if (i.count >= 5) { i.bloqueadoAte = Date.now() + 60 * 1000; i.count = 0; }
  tentativasLogin.set(ip, i);
}
function limparFalhas(ip) { tentativasLogin.delete(ip); }
function requireAuth(req, res, next) {
  if (req.session && req.session.autenticado) return next();
  return res.status(401).json({ erro: 'Não autenticado.' });
}

/* ---------- auth ---------- */
app.post('/api/login', asyncHandler(async (req, res) => {
  const ip = req.ip;
  if (ipBloqueado(ip)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 1 minuto.' });
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });

  const admin = await dbGet('SELECT * FROM admin WHERE id = 1');
  const ok = admin && usuario === admin.usuario && bcrypt.compareSync(senha, admin.senhaHash);
  if (!ok) { registrarFalha(ip); return res.status(401).json({ erro: 'Usuário ou senha inválidos.' }); }

  limparFalhas(ip);
  req.session.autenticado = true;
  req.session.usuario = admin.usuario;
  res.json({ ok: true, usuario: admin.usuario });
}));
app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get('/api/session', (req, res) => {
  res.json({ autenticado: !!(req.session && req.session.autenticado), usuario: req.session ? req.session.usuario : null });
});
app.put('/api/senha', requireAuth, asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ erro: 'Informe a senha atual e uma nova senha com pelo menos 6 caracteres.' });
  }
  const admin = await dbGet('SELECT * FROM admin WHERE id = 1');
  if (!bcrypt.compareSync(senhaAtual, admin.senhaHash)) return res.status(401).json({ erro: 'Senha atual incorreta.' });
  await dbRun('UPDATE admin SET senhaHash = ? WHERE id = 1', [bcrypt.hashSync(novaSenha, 10)]);
  res.json({ ok: true });
}));

/* ---------- loja ---------- */
app.get('/api/loja', requireAuth, asyncHandler(async (req, res) => res.json(await lerLoja())));
app.put('/api/loja', requireAuth, asyncHandler(async (req, res) => {
  await salvarLoja(req.body || {});
  await regenerarConfigJs();
  res.json({ ok: true, loja: await lerLoja() });
}));

/* ---------- horários ---------- */
app.get('/api/horarios', requireAuth, asyncHandler(async (req, res) => res.json(await lerHorarios())));
app.post('/api/horarios', requireAuth, asyncHandler(async (req, res) => {
  const { dias, abre, fecha, texto } = req.body || {};
  if (!Array.isArray(dias) || dias.length === 0 || !abre || !fecha) {
    return res.status(400).json({ erro: 'Informe os dias, abertura e fechamento.' });
  }
  const maxRow = await dbGet('SELECT COALESCE(MAX(ordem), -1) AS m FROM horarios');
  await dbRun('INSERT INTO horarios (dias, abre, fecha, texto, ordem) VALUES (?,?,?,?,?)', [JSON.stringify(dias), abre, fecha, texto || '', maxRow.m + 1]);
  await regenerarConfigJs();
  res.json({ ok: true, horarios: await lerHorarios() });
}));
app.put('/api/horarios/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM horarios WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Horário não encontrado.' });
  const { dias, abre, fecha, texto } = req.body || {};
  await dbRun('UPDATE horarios SET dias=?, abre=?, fecha=?, texto=? WHERE id=?', [
    JSON.stringify(Array.isArray(dias) ? dias : JSON.parse(atual.dias)), abre || atual.abre, fecha || atual.fecha, texto != null ? texto : atual.texto, id
  ]);
  await regenerarConfigJs();
  res.json({ ok: true });
}));
app.delete('/api/horarios/:id', requireAuth, asyncHandler(async (req, res) => {
  const info = await dbRun('DELETE FROM horarios WHERE id = ?', [Number(req.params.id)]);
  if (info.changes === 0) return res.status(404).json({ erro: 'Horário não encontrado.' });
  await regenerarConfigJs();
  res.json({ ok: true });
}));

/* ---------- serviços ---------- */
app.get('/api/servicos', requireAuth, asyncHandler(async (req, res) => res.json(await lerServicos())));
app.post('/api/servicos', requireAuth, asyncHandler(async (req, res) => {
  const { nome, descricao, emoji } = req.body || {};
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'Informe o nome do serviço.' });
  const maxRow = await dbGet('SELECT COALESCE(MAX(ordem), -1) AS m FROM servicos');
  await dbRun('INSERT INTO servicos (nome, descricao, emoji, ativo, ordem) VALUES (?,?,?,1,?)', [nome.trim(), (descricao || '').trim(), (emoji || '🤠').trim(), maxRow.m + 1]);
  await regenerarServicosJs();
  res.json({ ok: true, servicos: await lerServicos() });
}));
app.put('/api/servicos/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM servicos WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Serviço não encontrado.' });
  const c = req.body || {};
  await dbRun('UPDATE servicos SET nome=?, descricao=?, emoji=?, ativo=? WHERE id=?', [
    c.nome != null ? c.nome : atual.nome, c.descricao != null ? c.descricao : atual.descricao,
    c.emoji != null ? c.emoji : atual.emoji, c.ativo != null ? (c.ativo ? 1 : 0) : atual.ativo, id
  ]);
  await regenerarServicosJs();
  res.json({ ok: true });
}));
app.delete('/api/servicos/:id', requireAuth, asyncHandler(async (req, res) => {
  const info = await dbRun('DELETE FROM servicos WHERE id = ?', [Number(req.params.id)]);
  if (info.changes === 0) return res.status(404).json({ erro: 'Serviço não encontrado.' });
  await regenerarServicosJs();
  res.json({ ok: true });
}));

/* ---------- antes e depois ---------- */
app.get('/api/antes-depois', requireAuth, asyncHandler(async (req, res) => res.json(await lerAntesDepois())));
app.post('/api/antes-depois', requireAuth, asyncHandler(async (req, res) => {
  const { titulo, descricao } = req.body || {};
  const maxRow = await dbGet('SELECT COALESCE(MAX(ordem), -1) AS m FROM antes_depois');
  await dbRun('INSERT INTO antes_depois (titulo, descricao, fotoAntes, fotoDepois, ativo, ordem) VALUES (?,?,?,?,1,?)', [
    (titulo || 'Novo trabalho').trim(), (descricao || '').trim(), '', '', maxRow.m + 1
  ]);
  await regenerarAntesDepoisJs();
  res.json({ ok: true, itens: await lerAntesDepois() });
}));
app.put('/api/antes-depois/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM antes_depois WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });
  const c = req.body || {};
  await dbRun('UPDATE antes_depois SET titulo=?, descricao=?, ativo=? WHERE id=?', [
    c.titulo != null ? c.titulo : atual.titulo, c.descricao != null ? c.descricao : atual.descricao,
    c.ativo != null ? (c.ativo ? 1 : 0) : atual.ativo, id
  ]);
  await regenerarAntesDepoisJs();
  res.json({ ok: true });
}));
app.delete('/api/antes-depois/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM antes_depois WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });
  await apagarImagemCloudinary(`atelie-chapeu/antes-depois/ad-${id}-antes`);
  await apagarImagemCloudinary(`atelie-chapeu/antes-depois/ad-${id}-depois`);
  await dbRun('DELETE FROM antes_depois WHERE id = ?', [id]);
  await regenerarAntesDepoisJs();
  res.json({ ok: true });
}));

/* ---------- mural de achados ---------- */
app.get('/api/achados', requireAuth, asyncHandler(async (req, res) => res.json(await lerAchados())));
app.post('/api/achados', requireAuth, asyncHandler(async (req, res) => {
  const maxRow = await dbGet('SELECT COALESCE(MAX(ordem), -1) AS m FROM achados');
  const c = req.body || {};
  await dbRun('INSERT INTO achados (nome, descricao, categoria, preco, imagem, ativo, ordem) VALUES (?,?,?,?,?,1,?)', [
    (c.nome || 'Novo achado').trim(), (c.descricao || '').trim(), (c.categoria || '').trim(), c.preco || 0, '', maxRow.m + 1
  ]);
  await regenerarAchadosJs();
  res.json({ ok: true, itens: await lerAchados() });
}));
app.put('/api/achados/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM achados WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Achado não encontrado.' });
  const c = req.body || {};
  await dbRun('UPDATE achados SET nome=?, descricao=?, categoria=?, preco=?, ativo=? WHERE id=?', [
    c.nome != null ? c.nome : atual.nome, c.descricao != null ? c.descricao : atual.descricao,
    c.categoria != null ? c.categoria : atual.categoria, c.preco != null ? c.preco : atual.preco,
    c.ativo != null ? (c.ativo ? 1 : 0) : atual.ativo, id
  ]);
  await regenerarAchadosJs();
  res.json({ ok: true });
}));
app.delete('/api/achados/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await dbGet('SELECT * FROM achados WHERE id = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Achado não encontrado.' });
  await apagarImagemCloudinary(`atelie-chapeu/achados/achado-${id}`);
  await dbRun('DELETE FROM achados WHERE id = ?', [id]);
  await regenerarAchadosJs();
  res.json({ ok: true });
}));

/* ---------- upload de fotos (Cloudinary) ---------- */
const EXTENSOES_PERMITIDAS = { 'image/jpeg': true, 'image/png': true, 'image/webp': true };
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => EXTENSOES_PERMITIDAS[file.mimetype] ? cb(null, true) : cb(new Error('Formato inválido. Use JPG, PNG ou WEBP.'))
});

app.post('/api/achados/:id/imagem', requireAuth, (req, res) => {
  uploadMem.single('imagem')(req, res, async (erro) => {
    if (erro) return res.status(400).json({ erro: erro.message || 'Falha no upload.' });
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    if (!CLOUDINARY_CONFIGURADO) return res.status(500).json({ erro: 'Upload de imagens não configurado no servidor (faltam as credenciais do Cloudinary).' });
    try {
      const id = Number(req.params.id);
      const atual = await dbGet('SELECT * FROM achados WHERE id = ?', [id]);
      if (!atual) return res.status(404).json({ erro: 'Achado não encontrado.' });
      const resultado = await uploadParaCloudinary(req.file.buffer, `atelie-chapeu/achados/achado-${id}`);
      await dbRun('UPDATE achados SET imagem = ? WHERE id = ?', [resultado.secure_url, id]);
      await regenerarAchadosJs();
      res.json({ ok: true, imagem: resultado.secure_url });
    } catch (e) { res.status(500).json({ erro: 'Falha ao enviar imagem: ' + e.message }); }
  });
});

app.post('/api/antes-depois/:id/foto/:tipo', requireAuth, (req, res) => {
  const tipo = req.params.tipo;
  if (!['antes', 'depois'].includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido.' });
  uploadMem.single('imagem')(req, res, async (erro) => {
    if (erro) return res.status(400).json({ erro: erro.message || 'Falha no upload.' });
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    if (!CLOUDINARY_CONFIGURADO) return res.status(500).json({ erro: 'Upload de imagens não configurado no servidor (faltam as credenciais do Cloudinary).' });
    try {
      const id = Number(req.params.id);
      const atual = await dbGet('SELECT * FROM antes_depois WHERE id = ?', [id]);
      if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });
      const coluna = tipo === 'antes' ? 'fotoAntes' : 'fotoDepois';
      const resultado = await uploadParaCloudinary(req.file.buffer, `atelie-chapeu/antes-depois/ad-${id}-${tipo}`);
      await dbRun(`UPDATE antes_depois SET ${coluna} = ? WHERE id = ?`, [resultado.secure_url, id]);
      await regenerarAntesDepoisJs();
      res.json({ ok: true, imagem: resultado.secure_url });
    } catch (e) { res.status(500).json({ erro: 'Falha ao enviar imagem: ' + e.message }); }
  });
});

/* ---------- site público ---------- */
app.get('/', (req, res) => res.sendFile(INDEX_HTML));
app.use('/assets', express.static(ASSETS_DIR));

/* ---------- painel do dono ---------- */
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));
app.use('/admin', express.static(path.join(__dirname, 'public')));

/* ---------- erro genérico (pega qualquer exceção das rotas async) ---------- */
app.use((err, req, res, next) => {
  console.error('[admin-backend] Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORTA = process.env.PORT || 5700;

async function iniciar() {
  await criarSchema();
  await seedInicial();
  await regenerarConfigJs();
  await regenerarServicosJs();
  await regenerarAntesDepoisJs();
  await regenerarAchadosJs();

  app.listen(PORTA, () => {
    console.log('[admin-backend] Site publicado em http://localhost:' + PORTA + '/');
    console.log('[admin-backend] Painel do dono em http://localhost:' + PORTA + '/admin');
    console.log('[admin-backend] Banco de dados: ' + TURSO_URL);
    console.log('[admin-backend] Imagens: ' + (CLOUDINARY_CONFIGURADO ? 'Cloudinary configurado' : 'Cloudinary NÃO configurado (upload de fotos vai falhar)'));
  });
}
iniciar().catch(err => { console.error('[admin-backend] Falha ao iniciar:', err); process.exit(1); });
