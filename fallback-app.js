(function(){
  if (window.__ff_dev_loaded) return; // don't run fallback if dev app already loaded
  if (window.__ff_fallback_loaded) return; // prevent double-run
  window.__ff_fallback_loaded = true;
  const root = document.getElementById('root');
  if(!root) return;
  document.title = 'F-fit (fallback)';

  // --- Mock API: intercept fetch requests to /api/* and respond from localStorage ---
  (function setupMockApi(){
    const initialExercises = [
      { id: 1, name: 'Supino Reto', muscleGroup: 'peito', description: 'Exercício para desenvolvimento do peitoral superior', video: 'https://www.youtube.com/embed/0G2_XV7slIg', videoType: 'url' },
      { id: 2, name: 'Agachamento', muscleGroup: 'pernas', description: 'Exercício fundamental para quadríceps e glúteos', video: 'https://www.youtube.com/embed/0tn5K9NlCfo', videoType: 'url' },
      { id: 3, name: 'Remada Curvada', muscleGroup: 'costas', description: 'Exercício para fortalecimento dos dorsais', video: 'https://www.youtube.com/embed/G8l_8chR5BE', videoType: 'url' }
    ];

    if (!localStorage.getItem('ff-exercises')) {
      localStorage.setItem('ff-exercises', JSON.stringify(initialExercises));
    }

    if (!localStorage.getItem('ff-completed-workouts')) localStorage.setItem('ff-completed-workouts', JSON.stringify([]));
    if (!localStorage.getItem('ff-workout-logs')) localStorage.setItem('ff-workout-logs', JSON.stringify([]));
    if (!localStorage.getItem('ff-workout-plans')) localStorage.setItem('ff-workout-plans', JSON.stringify([]));

    const realFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      try {
        const url = new URL(input, location.href);
        if (!url.pathname.startsWith('/api/')) return realFetch(input, init);

        // simple helper to build Response
        const json = (obj, status=200) => Promise.resolve(new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }));

        const pathname = url.pathname;
        const method = (init && init.method) ? init.method.toUpperCase() : 'GET';

        // Simulate network delay
        const delay = (res) => new Promise(resolve => setTimeout(() => resolve(res), 250));

        // GET /api/users
        if (pathname === '/api/users' && method === 'GET') {
          const users = JSON.parse(localStorage.getItem('ff-users') || '[]');
          const publicUsers = users.map(u => { const { password, ...rest } = u; return rest; });
          return delay(json(publicUsers));
        }

        // POST /api/users (register)
        if (pathname === '/api/users' && method === 'POST') {
          return (async () => {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const users = JSON.parse(localStorage.getItem('ff-users') || '[]');
            if (users.find(u => u.email === body.email)) return delay(json({ error: 'Email already exists' }, 400));
            const newUser = { id: Date.now(), ...body };
            users.push(newUser);
            localStorage.setItem('ff-users', JSON.stringify(users));
            const { password, ...rest } = newUser;
            return delay(json(rest, 201));
          })();
        }

        // POST /api/login
        if (pathname === '/api/login' && method === 'POST') {
          return (async () => {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const users = JSON.parse(localStorage.getItem('ff-users') || '[]');
            const found = users.find(u => u.email === body.email && u.password === body.password);
            if (!found) return delay(json({ success: false, message: 'Invalid credentials' }, 401));
            const { password, ...rest } = found;
            return delay(json({ success: true, user: rest }));
          })();
        }

        // GET /api/exercises
        if (pathname === '/api/exercises' && method === 'GET') {
          const exercises = JSON.parse(localStorage.getItem('ff-exercises') || '[]');
          return delay(json(exercises));
        }

        // GET /api/completed-workouts
        if (pathname === '/api/completed-workouts' && method === 'GET') {
          const data = JSON.parse(localStorage.getItem('ff-completed-workouts') || '[]');
          return delay(json(data));
        }

        // GET /api/workout-logs
        if (pathname === '/api/workout-logs' && method === 'GET') {
          const data = JSON.parse(localStorage.getItem('ff-workout-logs') || '[]');
          return delay(json(data));
        }

        // GET /api/workout-plans
        if (pathname === '/api/workout-plans' && method === 'GET') {
          const data = JSON.parse(localStorage.getItem('ff-workout-plans') || '[]');
          return delay(json(data));
        }

        // POST /api/workout-plans
        if (pathname === '/api/workout-plans' && method === 'POST') {
          return (async () => {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const plans = JSON.parse(localStorage.getItem('ff-workout-plans') || '[]');
            const newPlan = { id: Date.now(), ...body };
            plans.push(newPlan);
            localStorage.setItem('ff-workout-plans', JSON.stringify(plans));
            return delay(json(newPlan, 201));
          })();
        }

        // PUT /api/users/:id
        if (pathname.match(/^\/api\/users\/\d+$/) && method === 'PUT') {
          return (async () => {
            const id = Number(pathname.split('/').pop());
            const body = init && init.body ? JSON.parse(init.body) : {};
            const users = JSON.parse(localStorage.getItem('ff-users') || '[]');
            const idx = users.findIndex(u => u.id === id);
            if (idx === -1) return delay(json({ error: 'Not found' }, 404));
            users[idx] = { ...users[idx], ...body };
            localStorage.setItem('ff-users', JSON.stringify(users));
            const { password, ...rest } = users[idx];
            return delay(json(rest));
          })();
        }

        // Fallback: pass through
        return realFetch(input, init);
      } catch (err) {
        return realFetch(input, init);
      }
    };
  })();


  const style = document.createElement('style');
  style.textContent = `
    body{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; background:linear-gradient(180deg,#0f172a,#020617); color:#fff}
    .center{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);padding:28px;border-radius:16px;max-width:720px;width:100%}
    h1{font-size:44px;margin:0 0 8px}
    p{margin:0 0 18px;color:#cbd5e1}
    .btn{background:#6366f1;color:white;padding:12px 18px;border-radius:10px;border:0;cursor:pointer}
    .btn.secondary{background:#10b981}
    .muted{color:#9ca3af}
    input{width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#fff;margin-bottom:10px}
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="center">
      <div class="card">
        <h1>F-fit</h1>
        <p>Versão local (fallback). Recursos de API e upload não funcionam aqui.</p>
        <div id="main-area">
          <input id="email" placeholder="Email" type="email" />
          <input id="password" placeholder="Senha" type="password" />
          <div style="display:flex;gap:8px;margin-top:8px">
            <button id="btn-login" class="btn">Entrar</button>
            <button id="btn-register" class="btn secondary">Cadastrar</button>
          </div>
          <div id="demo-area" style="margin-top:16px"></div>
        </div>
        <p class="muted" style="margin-top:12px">Dica: para rodar o projeto completo, instale Node.js e execute <code>npm install</code> e <code>npm run dev</code>.</p>
      </div>
    </div>
  `;

  const renderProfile = (user) => {
    const main = document.getElementById('main-area');
    main.innerHTML = `
      <div class="glass-card p-5 sm:p-6 rounded-2xl" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0 0 6px;color:#fff">Bem-vindo, ${user.name}</h2>
            <p style="margin:0;color:rgba(255,255,255,0.75)">Tipo: ${user.type || 'aluno'}</p>
          </div>
          <div style="display:flex;gap:8px">
            <button id="btn-logout" class="btn-secondary p-3 rounded-xl">Sair</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
          <div class="glass-panel" style="padding:12px;border-radius:12px;color:#fff">Perfil<br/><strong>${user.name}</strong></div>
          <div class="glass-panel" style="padding:12px;border-radius:12px;color:#fff">Treinos<br/><strong>—</strong></div>
          <div class="glass-panel" style="padding:12px;border-radius:12px;color:#fff">Progresso<br/><strong>—</strong></div>
        </div>
      </div>
    `;

    document.getElementById('btn-logout').addEventListener('click', ()=>{
      localStorage.removeItem('ff-current');
      location.reload();
    });
  };

  // initial data (copied from src/data.ts)
  const initialUsers = [
    { id: 1, name: 'João Silva', email: 'joao@email.com', password: '123456', type: 'aluno', age: 25, objective: 'hipertrofia' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com', password: '123456', type: 'instrutor', age: 30 },
    { id: 3, name: 'Administrador F-fit', email: 'admin@ffit.com', password: 'admin123', type: 'admin', age: 35, role: 'Super Administrador', permissions: ['all'] }
  ];

  // ensure storage has initial users
  const existing = JSON.parse(localStorage.getItem('ff-users')||'null');
  if (!existing) localStorage.setItem('ff-users', JSON.stringify(initialUsers));

  document.getElementById('btn-register').addEventListener('click', ()=>{
    const name = prompt('Nome:');
    const email = prompt('Email:');
    const pwd = prompt('Senha:');
    if (!name || !email || !pwd) return alert('Cadastro cancelado');
    const all = JSON.parse(localStorage.getItem('ff-users')||'[]');
    if (all.find(u=>u.email===email)) return alert('Email já cadastrado (demo)');
    const user = { id:Date.now(), name, email, password:pwd, type: 'aluno' };
    all.push(user); localStorage.setItem('ff-users', JSON.stringify(all));
    alert('Registrado (demo). Agora faça login.');
  });

  document.getElementById('btn-login').addEventListener('click', ()=>{
    const email = document.getElementById('email').value;
    const pwd = document.getElementById('password').value;
    const all = JSON.parse(localStorage.getItem('ff-users')||'[]');
    const found = all.find(u=>u.email===email && u.password===pwd);
    if (!found) return alert('Credenciais inválidas (demo).');
    localStorage.setItem('ff-current', JSON.stringify(found));
    renderProfile(found);
  });

  const current = JSON.parse(localStorage.getItem('ff-current')||'null');
  if (current) renderProfile(current);

})();
