(function(){
  const root = document.getElementById('root');
  if(!root) return;

  document.title = 'F-fit (fallback)';

  const style = document.createElement('style');
  style.textContent = `
    body{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; background:linear-gradient(180deg,#0f172a,#020617); color:#fff}
    .center{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);padding:28px;border-radius:16px;max-width:720px;width:100%}
    h1{font-size:44px;margin:0 0 8px}
    p{margin:0 0 18px;color:#cbd5e1}
    .btn{background:#6366f1;color:white;padding:12px 18px;border-radius:10px;border:0;cursor:pointer}
    .muted{color:#9ca3af}
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="center">
      <div class="card">
        <h1>F-fit</h1>
        <p>Fallback estático carregado — o ambiente atual não tem Node/Vite. Algumas funcionalidades (API e upload) não funcionarão aqui.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button id="open-sample" class="btn">Abrir demo</button>
          <button id="install-node" class="btn" style="background:#10b981">Instruções: instalar Node</button>
        </div>
        <p class="muted" style="margin-top:16px">Dica: para rodar o projeto completo, instale Node.js e execute <code>npm install</code> e <code>npm run dev</code>.</p>
        <div id="demo-area" style="margin-top:18px"></div>
      </div>
    </div>
  `;

  document.getElementById('open-sample').addEventListener('click', ()=>{
    const demo = document.getElementById('demo-area');
    demo.innerHTML = `
      <h3 style="margin:0 0 8px">Demo rápido</h3>
      <p style="margin:0 0 12px">Aqui está uma versão simplificada do painel inicial.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;min-width:160px">Perfil: <strong>Visitante</strong></div>
        <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;min-width:160px">Treinos: <strong>0</strong></div>
        <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;min-width:160px">Progresso: <strong>—</strong></div>
      </div>
    `;
  });

  document.getElementById('install-node').addEventListener('click', ()=>{
    const demo = document.getElementById('demo-area');
    demo.innerHTML = `
      <h3 style="margin:0 0 8px">Instalar Node (Windows)</h3>
      <ol style="margin:0 0 12px;padding-left:20px;color:#cbd5e1">
        <li>Abra o PowerShell como Administrador.</li>
        <li>Execute: <code>winget install OpenJS.NodeJS.LTS</code></li>
        <li>Depois, no projeto: <code>npm install</code> e <code>npm run dev</code></li>
      </ol>
    `;
  });
})();
