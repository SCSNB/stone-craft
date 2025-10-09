(function(){
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:5080' : window.location.origin;
  const form = document.getElementById('loginForm');
  const statusEl = document.getElementById('loginStatus');
  const tokenKey = 'sc_admin_token';

  async function onSubmit(e){
    e.preventDefault();
    statusEl.textContent = '';
    const fd = new FormData(form);
    const payload = {
      username: fd.get('username')?.toString() || '',
      password: fd.get('password')?.toString() || ''
    };
    try{
      const res = await fetch(`${API_BASE}/api/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok){
        statusEl.style.color = '#e74c3c';
        statusEl.textContent = 'Невалидни данни за вход';
        return;
      }
      const data = await res.json();
      if (data && data.token){
        localStorage.setItem(tokenKey, data.token);
        window.location.href = 'admin.html';
      } else {
        statusEl.style.color = '#e74c3c';
        statusEl.textContent = 'Грешка при вход';
      }
    } catch(err){
      console.error(err);
      statusEl.style.color = '#e74c3c';
      statusEl.textContent = 'Грешка при връзка с API';
    }
  }

  if (form){
    form.addEventListener('submit', onSubmit);
  }
})();
