/* =========================
   STATE (mock) + persistência local
   ========================= */
   const LS_KEY = 'ONEFIT_PRO_V1';
   const ORDERS_STORAGE = 'ONEFIT_ORDERS';
   const PRODUCT_REVIEWS_STORAGE = 'ONEFIT_PRODUCT_REVIEWS_V1';

   let state = {
     pro: {
       name: 'Rodrigo Mielli',
       role: 'Personal Trainer',
     },
   
    contract: {
      start: '01/01/2026',
      end: '31/12/2026'
    },
   
     hours: {
       goalMonth: 160,
       entries: [
         { date: '03/03/2026', hours: 6.0, source: 'Ponto', note: 'Turno manhã' },
         { date: '04/03/2026', hours: 7.5, source: 'Ponto', note: 'Manhã + tarde' }
       ]
     },
   
     punches: [
       // { id, dateISO, type: 'IN'|'OUT', timeHHMM, note }
     ],
   
     salaries: [
       { compet: '01/2026', value: 2800.00, paidOn: '05/02/2026', status: 'PAGO' },
       { compet: '02/2026', value: 2950.00, paidOn: '05/03/2026', status: 'PAGO' },
       { compet: '03/2026', value: 3000.00, paidOn: '', status: 'PENDENTE' }
     ],
   
     students: [
       { id: uid(), name: 'Ana Paula', phone: '(11) 99999-1111', plan: 'Mensal', status: 'ATIVO', fee: 250.00, note: '2x/semana' },
       { id: uid(), name: 'Bruno Silva', phone: '(11) 98888-2222', plan: 'Trimestral', status: 'ATIVO', fee: 220.00, note: 'Foco emagrecimento' }
     ],
   
     agenda: {
       events: [
         { id: uid(), studentId: null, title: 'Reunião equipe', type: 'AULA', dateISO: addDaysISO(1), time: '08:30', place:'Recepção', note:'' },
         { id: uid(), studentId: null, title: 'Treino interno', type: 'PERSONAL', dateISO: addDaysISO(1), time: '18:00', place:'Box', note:'Treino funcional' },
         { id: uid(), studentId: null, title: 'Acompanhamento', type: 'AVALIAÇÃO', dateISO: addDaysISO(2), time: '10:00', place:'Sala 1', note:'' }
       ]
     },
   
     cashback: {
       balance: 125.40,
       goal: 300.00,
       history: [
         { date: '10/02/2026', origin: 'Venda', desc: 'Plano mensal (comissão)', value: 25.00 },
         { date: '25/02/2026', origin: 'Meta', desc: 'Bônus presença alunos', value: 40.00 },
         { date: '03/03/2026', origin: 'Venda', desc: 'Avaliação física', value: 60.40 }
       ]
     },
   
     orders: [
       {
         id: uid(),
         code: '#OF10231',
         product: 'Why Protein ONE FIT',
         category: 'Suplemento',
         price: 129.90,
         status: 'DEVOLVIDO', // AGUARDANDO | ENTREGUE | CANCELADO | DEVOLVIDO
         purchaseDate: '2026-02-10',
         deliveryDate: '2026-02-14',
         invoiceUrl: '#',
         supportUrl: '#',
         thumb: '',
         trackStep: 2
       },
       {
         id: uid(),
         code: '#OF10245',
         product: 'Camiseta DryFit ONE FIT',
         category: 'Roupas',
         price: 79.90,
         status: 'AGUARDANDO',
         purchaseDate: '2026-03-01',
         deliveryDate: '',
         invoiceUrl: '#',
         supportUrl: '#',
         thumb: '',
         trackStep: 2
       }
     ],
   
     ui: {
       monthCursor: new Date(2026, 2, 1), // Março/2026
       viewMeta: {
         "view-resumo":   { title:"Resumo", sub:"Acompanhe rapidamente contrato, horas, ponto, salários, agenda e cashback." },
         "view-contrato": { title:"Contrato", sub:"Status de contrato com a academia." },
         "view-carga":    { title:"Carga horária", sub:"Horas do mês e detalhamento." },
         "view-ponto":    { title:"Cartão de ponto", sub:"Bata entrada/saída e acompanhe registros." },
         "view-salarios": { title:"Salários", sub:"Histórico de pagamentos de salário." },
         "view-agenda":   { title:"Minha agenda", sub:"Agenda particular com alunos: adicionar, editar ou remover (agora em lista)." },
         "view-cashback": { title:"Meu cashback", sub:"Saldo, meta e extrato." },
         "view-compras":  { title:"Minhas compras", sub:"Acompanhe pedidos, entregas e pós-venda dos seus pedidos." }
       }
     }
   };
   
  function saveLS(){
    try{
      if (state.contract && 'status' in state.contract) delete state.contract.status;
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    }catch(e){}
  }
   
   function loadLS(){
     try{
       const raw = localStorage.getItem(LS_KEY);
       if (!raw) return;
   
       const parsed = JSON.parse(raw);
       if (parsed && typeof parsed === 'object'){
         const mc = parsed.ui?.monthCursor;
         if (mc) parsed.ui.monthCursor = new Date(mc);
   
         if (!parsed.orders) parsed.orders = state.orders;
   
        state = parsed;
        if (state.contract && 'status' in state.contract) delete state.contract.status;
      }
    }catch(e){}
  }
   
   /* =========================
      UTIL
      ========================= */
   function uid(){
     return Math.random().toString(16).slice(2) + Date.now().toString(16);
   }
   
   function pad2(n){
     return String(n).padStart(2, '0');
   }
   
   function formatBRL(n){
     return Number(n || 0).toLocaleString('pt-BR', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
     });
   }
   
   function escHtml(s){
     return String(s ?? '')
       .replaceAll('&','&amp;')
       .replaceAll('<','&lt;')
       .replaceAll('>','&gt;')
       .replaceAll('"','&quot;')
       .replaceAll("'","&#039;");
   }
   
   function toISODate(d){
     return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
   }
   
   function todayISO(){
     return toISODate(new Date());
   }
   
   function addDaysISO(n){
     const d = new Date();
     d.setDate(d.getDate() + n);
     return toISODate(d);
   }
   
   function parseBRDate(s){
     const [dd, mm, yyyy] = (s || '').split('/').map(Number);
     if (!dd || !mm || !yyyy) return null;
     return new Date(yyyy, mm - 1, dd);
   }
   
   function formatDateBRFromISO(iso){
     const [y, m, d] = (iso || '').split('-').map(Number);
     if (!y || !m || !d) return '—';
     return `${pad2(d)}/${pad2(m)}/${y}`;
   }
  
  function formatTimeDisplay(time){
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return '—';
    const [hh, mm] = String(time).split(':');
    return `${hh} : ${mm}`;
  }
   
   function niceDateLabelISO(iso){
     const [y, m, d] = (iso || '').split('-').map(Number);
     if (!y || !m || !d) return '—';
     const dt = new Date(y, m - 1, d);
     return dt.toLocaleDateString('pt-BR', {
       weekday:'short',
       day:'2-digit',
       month:'2-digit',
       year:'numeric'
     });
   }
   
   function monthLabel(d){
     return d.toLocaleDateString('pt-BR', {
       month:'long',
       year:'numeric'
     });
   }
   
   function downloadText(filename, content){
     const blob = new Blob([content], { type:'text/plain;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = filename;
     document.body.appendChild(a);
     a.click();
     a.remove();
     URL.revokeObjectURL(url);
   }
   
   /* =========================
      SAIR -> login.html
      ========================= */
   function logout(){
     window.location.href = './login.html';
   }
   
   /* =========================
      MICROINTERAÇÕES (ripple)
      ========================= */
   function bindRipple(){
     document.querySelectorAll('.btn-anim, .icon-only, .order-action-btn').forEach(btn => {
       if (btn.dataset.rippleBound === '1') return;
       btn.dataset.rippleBound = '1';
   
       btn.addEventListener('click', function(e){
         const rect = this.getBoundingClientRect();
         const size = Math.max(rect.width, rect.height);
         const x = e.clientX - rect.left;
         const y = e.clientY - rect.top;
   
         const s = document.createElement('span');
         s.className = 'ripple-span';
         s.style.width = s.style.height = size + 'px';
         s.style.left = (x - size/2) + 'px';
         s.style.top = (y - size/2) + 'px';
         this.appendChild(s);
   
         setTimeout(() => s.remove(), 650);
       });
     });
   }
   
   /* =========================
      NAVEGAÇÃO
      ========================= */
   function setStageMeta(viewId){
     const meta = state.ui.viewMeta[viewId] || { title:"Área do Profissional", sub:"" };
     const t = document.getElementById('stageTitle');
     const s = document.getElementById('stageSub');
     if (t) t.textContent = meta.title;
     if (s) s.textContent = meta.sub;
   }
   
   function activateNav(viewId){
     document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
   
     const el = document.getElementById(viewId);
     if (el) el.classList.add('is-active');
   
     document.querySelectorAll('.nav-itemx').forEach(b => {
       b.classList.toggle('is-active', b.dataset.view === viewId);
     });
   
     setStageMeta(viewId);
   
     if (location.hash.replace('#', '') !== viewId) {
       location.hash = viewId;
     }
   
     el?.querySelectorAll?.('.js-stagger')?.forEach?.((node, i) => {
       node.classList.remove('in');
       setTimeout(() => node.classList.add('in'), 80 * i);
     });
   
     if (viewId === 'view-resumo') setTimeout(renderResumo, 60);
     if (viewId === 'view-contrato') setTimeout(renderContrato, 60);
     if (viewId === 'view-carga') setTimeout(renderHours, 60);
     if (viewId === 'view-ponto') setTimeout(renderPonto, 60);
     if (viewId === 'view-salarios') setTimeout(renderSalaries, 60);
     if (viewId === 'view-agenda') setTimeout(() => { renderStudents(); renderAgendaList(); }, 60);
     if (viewId === 'view-cashback') setTimeout(renderProCashback, 60);
     if (viewId === 'view-compras') setTimeout(renderOrders, 60);
   }
   
   function goView(viewId){
     activateNav(viewId);
   
     const ocEl = document.getElementById('mobileMenu');
     if (ocEl){
       const oc = bootstrap.Offcanvas.getInstance(ocEl);
       if (oc) oc.hide();
     }
   }
   
   function bindNavClicks(){
     document.querySelectorAll('#navRail .nav-itemx').forEach(btn => {
       btn.addEventListener('click', () => goView(btn.dataset.view));
     });
   }
   
   function cloneMenuToMobile(){
     const desktopBtns = [...document.querySelectorAll('#navRail .nav-itemx')];
     const mobile = document.getElementById('navRailMobile');
     if (!mobile) return;
   
     mobile.innerHTML = '';
   
     desktopBtns.forEach(btn => {
       const clone = btn.cloneNode(true);
       clone.addEventListener('click', () => goView(clone.dataset.view));
       mobile.appendChild(clone);
     });
   }
   
   function loadViewFromHash(){
     const h = (location.hash || '').replace('#', '').trim();
     const viewId = (h && document.getElementById(h)) ? h : 'view-resumo';
     activateNav(viewId);
   }
   
   /* =========================
      RESUMO (KPIs)
      ========================= */
   function computeHoursMonthTotal(){
     const cur = state.ui.monthCursor;
     const mm = cur.getMonth() + 1;
     const yyyy = cur.getFullYear();
   
     return (state.hours.entries || []).reduce((acc, e) => {
       const dt = parseBRDate(e.date);
       if (!dt) return acc;
   
       if (dt.getFullYear() === yyyy && (dt.getMonth() + 1) === mm){
         return acc + Number(e.hours || 0);
       }
       return acc;
     }, 0);
   }
   
   function getNextEvent(){
     const now = new Date();
     const nowISO = toISODate(now);
   
     const candidates = (state.agenda.events || [])
       .slice()
       .filter(ev => ev?.dateISO && ev.dateISO >= nowISO);
   
     candidates.sort((a, b) => {
       const keyA = a.dateISO + ' ' + (a.time || '00:00');
       const keyB = b.dateISO + ' ' + (b.time || '00:00');
       return keyA.localeCompare(keyB);
     });
   
     return candidates[0] || null;
   }
   
   function lastPunch(){
     const p = (state.punches || []).slice().sort((a, b) => {
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return kb.localeCompare(ka);
     });
   
     return p[0] || null;
   }
   
   function getStudentById(id){
     return (state.students || []).find(s => s.id === id) || null;
   }
   
  function renderResumo(){
    const elC = document.getElementById('kpiContrato');
    const elV = document.getElementById('kpiVigencia');

    if (elC) elC.textContent = 'Ativo';
    if (elV) elV.textContent = `${state.contract.start} → ${state.contract.end}`;

    const barContrato = document.getElementById('barContrato');
    if (barContrato) barContrato.style.width = '100%';
   
     const total = computeHoursMonthTotal();
     const goal = Math.max(1, Number(state.hours.goalMonth || 160));
     const pct = Math.max(0, Math.min(100, (total / goal) * 100));
   
     const elH = document.getElementById('kpiHoras');
     const elHM = document.getElementById('kpiHorasMeta');
     const barH = document.getElementById('barHoras');
   
     if (elH) elH.textContent = String(total.toFixed(1)).replace('.', ',');
     if (elHM) elHM.textContent = String(goal);
     if (barH) barH.style.width = pct.toFixed(0) + '%';
   
     const elCb = document.getElementById('kpiCashback');
     if (elCb) elCb.textContent = formatBRL(state.cashback.balance);
   
     const nx = getNextEvent();
     const elN = document.getElementById('kpiNextSlot');
     if (elN){
       if (!nx){
         elN.textContent = 'Nenhum agendamento futuro';
       } else {
         const title = nx.studentId ? (getStudentById(nx.studentId)?.name || nx.title) : nx.title;
        elN.textContent = `${formatDateBRFromISO(nx.dateISO)} • ${formatTimeDisplay(nx.time)} • ${title}`;
       }
     }
   
     const lp = lastPunch();
     const elLP = document.getElementById('kpiLastPunch');
     if (elLP){
       if (!lp){
         elLP.textContent = 'Sem registros';
       } else {
         elLP.textContent = `${formatDateBRFromISO(lp.dateISO)} • ${lp.timeHHMM} • ${lp.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}`;
       }
     }
   }
   
   /* =========================
      CONTRATO
      ========================= */
  function renderContrato(){
    const statusLabel = document.getElementById('contractStatusLabel');
    const statusHint = document.getElementById('contractStatusHint');
    const range = document.getElementById('contractRange');

    if (statusLabel) statusLabel.textContent = 'Ativo';
    if (statusHint) statusHint.textContent = 'Acesso liberado para atuar.';
    if (range) range.textContent = `${state.contract.start} → ${state.contract.end}`;

   renderResumo();
 }
  
  /* =========================
     CARGA HORÁRIA
      ========================= */
   function renderHours(){
     const tbody = document.getElementById('hoursTbody');
     if (tbody) tbody.innerHTML = '';
   
     const total = computeHoursMonthTotal();
     const goal = Math.max(1, Number(state.hours.goalMonth || 160));
     const pct = Math.max(0, Math.min(100, (total / goal) * 100));
   
     const elT = document.getElementById('hoursTotal');
     const elG = document.getElementById('hoursGoal');
     const elP = document.getElementById('hoursPct');
     const bar = document.getElementById('hoursBar');
   
     if (elT) elT.textContent = String(total.toFixed(1)).replace('.', ',');
     if (elG) elG.textContent = String(goal);
     if (elP) elP.textContent = String(pct.toFixed(0));
     if (bar) bar.style.width = pct.toFixed(0) + '%';
   
     const rows = (state.hours.entries || []).slice().sort((a, b) => {
       const da = parseBRDate(a.date);
       const db = parseBRDate(b.date);
       return (db?.getTime() || 0) - (da?.getTime() || 0);
     });
   
     rows.forEach(e => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td>${escHtml(e.date)}</td>
         <td><strong>${escHtml(String(Number(e.hours || 0)).replace('.', ','))}h</strong></td>
         <td>${escHtml(e.source || '—')}</td>
         <td class="text-muted">${escHtml(e.note || '')}</td>
       `;
       tbody?.appendChild(tr);
     });
   
     renderResumo();
     bindRipple();
     saveLS();
   }
   
   function seedHoursFromPunches(){
     const punches = (state.punches || []).slice().sort((a, b) => {
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return ka.localeCompare(kb);
     });
   
     const byDay = new Map();
     punches.forEach(p => {
       if (!byDay.has(p.dateISO)) byDay.set(p.dateISO, []);
       byDay.get(p.dateISO).push(p);
     });
   
     const entries = [];
     byDay.forEach((arr, dateISO) => {
       let totalMin = 0;
       let lastIn = null;
   
       arr.forEach(p => {
         if (p.type === 'IN'){
           lastIn = p;
         } else if (p.type === 'OUT' && lastIn){
           const [h1, m1] = lastIn.timeHHMM.split(':').map(Number);
           const [h2, m2] = p.timeHHMM.split(':').map(Number);
           const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
           if (mins > 0) totalMin += mins;
           lastIn = null;
         }
       });
   
       const hours = +(totalMin / 60).toFixed(2);
       if (hours > 0){
         entries.push({
           date: formatDateBRFromISO(dateISO),
           hours,
           source:'Ponto',
           note:'Auto (ponto)'
         });
       }
     });
   
     const manual = (state.hours.entries || []).filter(e => (e.source || '') !== 'Ponto');
     state.hours.entries = [...manual, ...entries];
   
     renderHours();
     alert('Carga horária recalculada a partir do ponto ✅');
   }
   
   function exportHoursCSV(){
     const lines = [
       ['Data','Horas','Origem','Obs.'].join(';'),
       ...(state.hours.entries || []).map(e =>
         [e.date, String(e.hours).replace('.', ','), e.source, e.note]
           .map(v => String(v || ''))
           .join(';')
       )
     ];
   
     downloadText('carga_horaria.csv', lines.join('\n'));
   }
   
   /* =========================
      PONTO
      ========================= */
   function nowHHMM(){
     const d = new Date();
     return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
   }
   
   function punch(type){
     const dateISO = toISODate(new Date());
     const timeHHMM = nowHHMM();
   
     const last = lastPunch();
     if (last && last.dateISO === dateISO && last.type === type){
       alert('Ação inválida: já existe um registro igual como último ponto de hoje.');
       return;
     }
   
     state.punches.push({ id: uid(), dateISO, type, timeHHMM, note: '' });
     renderPonto();
     alert(`${type === 'IN' ? 'Entrada' : 'Saída'} registrada ✅`);
   }
   
   function clearPunches(){
     if (!confirm('Limpar todos os registros de ponto?')) return;
     state.punches = [];
     renderPonto();
   }
   
   function computeTodayFromPunches(){
     const tISO = toISODate(new Date());
     const arr = (state.punches || [])
       .filter(p => p.dateISO === tISO)
       .slice()
       .sort((a, b) => a.timeHHMM.localeCompare(b.timeHHMM));
   
     let totalMin = 0;
     let lastIn = null;
   
     arr.forEach(p => {
       if (p.type === 'IN') lastIn = p;
       if (p.type === 'OUT' && lastIn){
         const [h1, m1] = lastIn.timeHHMM.split(':').map(Number);
         const [h2, m2] = p.timeHHMM.split(':').map(Number);
         const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
         if (mins > 0) totalMin += mins;
         lastIn = null;
       }
     });
   
     return +(totalMin / 60).toFixed(2);
   }
   
   function renderPonto(){
     const tbody = document.getElementById('punchesTbody');
     if (tbody) tbody.innerHTML = '';
   
     const sorted = (state.punches || []).slice().sort((a, b) => {
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return kb.localeCompare(ka);
     });
   
     sorted.forEach(p => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td>${escHtml(formatDateBRFromISO(p.dateISO))}</td>
         <td><span class="badge-pill">${p.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}</span></td>
         <td><strong>${escHtml(p.timeHHMM)}</strong></td>
         <td class="text-muted">${escHtml(p.note || '')}</td>
       `;
       tbody?.appendChild(tr);
     });
   
     const last = lastPunch();
     const st = document.getElementById('punchStatus');
     const hint = document.getElementById('punchStatusHint');
   
     if (!last){
       if (st) st.textContent = 'Sem registros';
       if (hint) hint.textContent = 'Faça sua primeira entrada.';
     } else {
       const lab = last.type === 'IN' ? 'Em expediente' : 'Fora do expediente';
       if (st) st.textContent = lab;
       if (hint) hint.textContent = `Último registro: ${formatDateBRFromISO(last.dateISO)} ${last.timeHHMM} (${last.type})`;
     }
   
     const today = computeTodayFromPunches();
     const td = document.getElementById('punchToday');
     if (td) td.textContent = String(today).replace('.', ',') + 'h';
   
     renderResumo();
     bindRipple();
     saveLS();
   }
   
   /* =========================
      SALÁRIOS (CRUD)
      ========================= */
   function badgeSalary(status){
     if (status === 'PAGO') return `<span class="badge bg-success">PAGO</span>`;
     return `<span class="badge bg-danger">PENDENTE</span>`;
   }
   
   function renderSalaries(){
     const tbody = document.getElementById('salariesTbody');
     if (!tbody) return;
   
     tbody.innerHTML = '';
   
     const sorted = (state.salaries || []).slice().sort((a, b) => {
       const [ma, ya] = (a.compet || '').split('/').map(Number);
       const [mb, yb] = (b.compet || '').split('/').map(Number);
       const ka = (ya || 0) * 100 + (ma || 0);
       const kb = (yb || 0) * 100 + (mb || 0);
       return kb - ka;
     });
   
     sorted.forEach((s, idx) => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td><strong>${escHtml(s.compet)}</strong></td>
         <td>R$ ${formatBRL(s.value)}</td>
         <td>${escHtml(s.paidOn || '—')}</td>
         <td>${badgeSalary(s.status)}</td>
         <td class="text-end">
          <button class="icon-only btn-anim danger" title="Remover" onclick="removeSalary(${idx})">
             <i class="bi bi-trash3"></i>
           </button>
         </td>
       `;
       tbody.appendChild(tr);
     });
   
     bindRipple();
     saveLS();
   }
   
   function openAddSalary(){
     document.getElementById('salaryModalTitle').textContent = 'Adicionar salário';
     document.getElementById('inpSalCompet').value = '';
     document.getElementById('inpSalValue').value = '';
     document.getElementById('inpSalPaidOn').value = '';
     document.getElementById('inpSalStatus').value = 'PAGO';
     document.getElementById('inpSalIndex').value = '-1';
   }
   
   function openEditSalary(index){
     const s = state.salaries[index];
     if (!s) return;
   
     document.getElementById('salaryModalTitle').textContent = 'Editar salário';
     document.getElementById('inpSalCompet').value = s.compet || '';
     document.getElementById('inpSalValue').value = String(s.value ?? '');
     document.getElementById('inpSalPaidOn').value = s.paidOn || '';
     document.getElementById('inpSalStatus').value = s.status || 'PAGO';
     document.getElementById('inpSalIndex').value = String(index);
   
     const modalEl = document.getElementById('salaryModal');
     (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
   }
   
   function saveSalary(){
     const compet = (document.getElementById('inpSalCompet').value || '').trim();
     const valRaw = (document.getElementById('inpSalValue').value || '').trim();
     const paidOn = (document.getElementById('inpSalPaidOn').value || '').trim();
     const status = (document.getElementById('inpSalStatus').value || 'PAGO').trim();
     const idxRaw = (document.getElementById('inpSalIndex').value || '-1').trim();
   
     if (!compet){
       alert('Informe a competência (ex.: 03/2026).');
       return;
     }
   
     const value = Number(valRaw || 0);
     if (!Number.isFinite(value) || value < 0){
       alert('Valor inválido.');
       return;
     }
   
     const obj = { compet, value, paidOn, status };
     const idx = parseInt(idxRaw, 10);
   
     if (!Number.isFinite(idx) || idx < 0){
       state.salaries.push(obj);
     } else {
       state.salaries[idx] = obj;
     }
   
     bootstrap.Modal.getInstance(document.getElementById('salaryModal'))?.hide();
     renderSalaries();
     alert('Salário salvo ✅');
   }
   
   function removeSalary(index){
     const s = state.salaries[index];
     if (!s) return;
     if (!confirm(`Remover salário ${s.compet}?`)) return;
     state.salaries.splice(index, 1);
     renderSalaries();
   }
   
   function exportSalariesCSV(){
     const lines = [
       ['Competência','Valor','Pago em','Status'].join(';'),
       ...(state.salaries || []).map(s =>
         [s.compet, formatBRL(s.value), s.paidOn || '', s.status].join(';')
       )
     ];
   
     downloadText('salarios.csv', lines.join('\n'));
   }
   
   /* =========================
      ALUNOS (CRUD)
      ========================= */
   function openAddStudent(){
     document.getElementById('studentModalTitle').textContent = 'Adicionar aluno';
     document.getElementById('inpStName').value = '';
     document.getElementById('inpStPhone').value = '';
     document.getElementById('inpStPlan').value = 'Mensal';
     document.getElementById('inpStStatus').value = 'ATIVO';
     document.getElementById('inpStFee').value = '';
     document.getElementById('inpStNote').value = '';
     document.getElementById('inpStId').value = '';
   }
   
   function openEditStudent(id){
     const st = getStudentById(id);
     if (!st) return;
   
     document.getElementById('studentModalTitle').textContent = 'Editar aluno';
     document.getElementById('inpStName').value = st.name || '';
     document.getElementById('inpStPhone').value = st.phone || '';
     document.getElementById('inpStPlan').value = st.plan || 'Mensal';
     document.getElementById('inpStStatus').value = st.status || 'ATIVO';
     document.getElementById('inpStFee').value = String(st.fee ?? '');
     document.getElementById('inpStNote').value = st.note || '';
     document.getElementById('inpStId').value = st.id;
   
     const modalEl = document.getElementById('studentModal');
     (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
   }
   
   function saveStudent(){
     const id = (document.getElementById('inpStId').value || '').trim();
     const name = (document.getElementById('inpStName').value || '').trim();
     const phone = (document.getElementById('inpStPhone').value || '').trim();
     const plan = (document.getElementById('inpStPlan').value || 'Mensal').trim();
     const status = (document.getElementById('inpStStatus').value || 'ATIVO').trim();
     const feeRaw = (document.getElementById('inpStFee').value || '').trim();
     const note = (document.getElementById('inpStNote').value || '').trim();
   
     if (!name){
       alert('Informe o nome do aluno.');
       return;
     }
   
     const fee = Number(feeRaw || 0);
     if (!Number.isFinite(fee) || fee < 0){
       alert('Valor mensal inválido.');
       return;
     }
   
     if (!id){
       state.students.push({ id: uid(), name, phone, plan, status, fee, note });
     } else {
       const idx = (state.students || []).findIndex(s => s.id === id);
       if (idx >= 0){
         state.students[idx] = { ...state.students[idx], name, phone, plan, status, fee, note };
       }
     }
   
     bootstrap.Modal.getInstance(document.getElementById('studentModal'))?.hide();
     renderStudents();
     renderAgendaList();
     renderResumo();
     saveLS();
   
     alert('Aluno salvo ✅');
   }
   
   function removeStudent(id){
     const st = getStudentById(id);
     if (!st) return;
     if (!confirm(`Remover aluno "${st.name}"? (isso remove também eventos vinculados)`)) return;
   
     state.students = (state.students || []).filter(s => s.id !== id);
     state.agenda.events = (state.agenda.events || []).filter(ev => ev.studentId !== id);
   
     renderStudents();
     renderAgendaList();
     renderResumo();
     saveLS();
   }
   
   function renderStudents(){
     const box = document.getElementById('studentsList');
     const count = document.getElementById('studentsCount');
     if (!box || !count) return;
   
     const q = (document.getElementById('agendaFilter')?.value || '').trim().toLowerCase();
     const filtered = (state.students || []).filter(s => !q || (s.name || '').toLowerCase().includes(q));
   
     count.textContent = String((state.students || []).filter(s => s.status === 'ATIVO').length);
   
     if (!filtered.length){
       box.innerHTML = `<div class="text-muted small">Nenhum aluno no filtro.</div>`;
       return;
     }
   
     box.innerHTML = filtered.map(s => `
       <div class="slot" style="padding:10px 12px;">
         <div class="left">
           <strong>${escHtml(s.name)}</strong>
           <span>${escHtml(s.plan)} • ${escHtml(s.status)} • R$ ${formatBRL(s.fee)}/mês</span>
         </div>
         <div class="d-flex align-items-center gap-2">
           <button class="icon-only btn-anim" title="Editar" onclick="openEditStudent('${s.id}')">
             <i class="bi bi-pencil-square"></i>
           </button>
           <button class="icon-only btn-anim danger" title="Remover" onclick="removeStudent('${s.id}')">
             <i class="bi bi-trash3"></i>
           </button>
         </div>
       </div>
     `).join('');
   
     bindRipple();
   }
   
   /* =========================
      AGENDA (LISTA) + CRUD eventos
      ========================= */
   function getFilteredStudentSet(){
     const q = (document.getElementById('agendaFilter')?.value || '').trim().toLowerCase();
     if (!q) return null;
   
     const ids = new Set(
       (state.students || [])
         .filter(s => (s.name || '').toLowerCase().includes(q))
         .map(s => s.id)
     );
   
     return ids;
   }
   
   function monthRangeISO(cursorDate){
     const y = cursorDate.getFullYear();
     const m = cursorDate.getMonth();
     const first = new Date(y, m, 1);
     const last = new Date(y, m + 1, 0);
     return {
       from: toISODate(first),
       to: toISODate(last)
     };
   }

function getDefaultEventDateISO(){
  const cursor = state?.ui?.monthCursor instanceof Date
    ? state.ui.monthCursor
    : new Date();
  const today = new Date();

  // Se o usuário está no mês atual, usa hoje; senão usa o 1º dia do mês exibido.
  if (
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth() === today.getMonth()
  ){
    return toISODate(today);
  }

  return toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
}
   
   function fillEventStudentOptions(){
     const sel = document.getElementById('inpEvStudentId');
     if (!sel) return;
   
     const opts = (state.students || [])
       .map(s => `<option value="${escHtml(s.id)}">${escHtml(s.name)} (${escHtml(s.status)})</option>`)
       .join('');
   
     sel.innerHTML = `<option value="">(Sem aluno — particular)</option>${opts}`;
   }

function maskHHMM(raw){
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function bindEventTimeMask(){
  const inp = document.getElementById('inpEvTime');
  if (!inp || inp.dataset.maskBound === '1') return;
  inp.dataset.maskBound = '1';

  inp.addEventListener('input', () => {
    inp.value = maskHHMM(inp.value);
  });

  inp.addEventListener('blur', () => {
    const digits = String(inp.value || '').replace(/\D/g, '').slice(0, 4);
    if (!digits.length){
      inp.value = '';
      return;
    }
    if (digits.length < 4){
      inp.value = maskHHMM(digits);
      return;
    }

    let hh = Number(digits.slice(0, 2));
    let mm = Number(digits.slice(2, 4));
    if (!Number.isFinite(hh)) hh = 0;
    if (!Number.isFinite(mm)) mm = 0;
    hh = Math.max(0, Math.min(23, hh));
    mm = Math.max(0, Math.min(59, mm));
    inp.value = `${pad2(hh)}:${pad2(mm)}`;
  });
}
   
   function openEventModalForDate(iso){
     fillEventStudentOptions();
  
  // Abrir modal para criar novo evento: manter campos limpos para preenchimento manual,
  // mas preserve a data quando fornecida (ex.: botão "Novo horário" por dia).
  document.getElementById('eventModalTitle').textContent = 'Agendar horário';
  document.getElementById('inpEvId').value = '';
  document.getElementById('inpEvDate').value = iso ? iso : getDefaultEventDateISO();
  document.getElementById('inpEvTime').value = '';
  document.getElementById('inpEvType').value = '';
  document.getElementById('inpEvPlace').value = '';
  document.getElementById('inpEvNote').value = '';

  // Seleção de aluno: padrão vazio (Particular) — usuário escolhe se quiser vincular
  const sel = document.getElementById('inpEvStudentId');
  if (sel) sel.value = '';

  const modalEl = document.getElementById('eventModal');
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
   }
   
   function openEditEvent(id){
     const ev = (state.agenda.events || []).find(e => e.id === id);
     if (!ev) return;
   
     fillEventStudentOptions();
   
     document.getElementById('eventModalTitle').textContent = 'Editar agendamento';
     document.getElementById('inpEvId').value = ev.id;
     document.getElementById('inpEvDate').value = ev.dateISO;
     document.getElementById('inpEvTime').value = ev.time || '';
     document.getElementById('inpEvType').value = ev.type || 'PERSONAL';
     document.getElementById('inpEvPlace').value = ev.place || '';
     document.getElementById('inpEvNote').value = ev.note || '';
   
     const sel = document.getElementById('inpEvStudentId');
     if (sel) sel.value = ev.studentId || '';
   
     const modalEl = document.getElementById('eventModal');
     (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
   }
   
   function saveEvent(){
     const id = (document.getElementById('inpEvId').value || '').trim();
     const studentId = (document.getElementById('inpEvStudentId').value || '').trim() || null;
     const dateISO = (document.getElementById('inpEvDate').value || '').trim();
     const time = (document.getElementById('inpEvTime').value || '').trim();
     const type = (document.getElementById('inpEvType').value || 'PERSONAL').trim();
     const place = (document.getElementById('inpEvPlace').value || '').trim();
     const note = (document.getElementById('inpEvNote').value || '').trim();
   
     if (!dateISO){
       alert('Data inválida.');
       return;
     }
   
     if (!time || !/^\d{2}:\d{2}$/.test(time)){
       alert('Informe hora no formato HH:MM (ex.: 09:30).');
       return;
     }
   
     const st = studentId ? getStudentById(studentId) : null;
     const title = st ? st.name : 'Agendamento particular';
   
     const obj = { id: id || uid(), studentId, title, type, dateISO, time, place, note };
   
     if (!id){
       state.agenda.events.push(obj);

    // Garante que o mês visível acompanhe o novo agendamento salvo.
    const [y, m] = dateISO.split('-').map(Number);
    if (y && m){
      state.ui.monthCursor = new Date(y, m - 1, 1);
    }
     } else {
       const idx = (state.agenda.events || []).findIndex(e => e.id === id);
       if (idx >= 0) state.agenda.events[idx] = obj;
     }
   
     bootstrap.Modal.getInstance(document.getElementById('eventModal'))?.hide();
     renderAgendaList();
     renderResumo();
     saveLS();
   
     alert('Agendamento salvo ✅');
   }
   
   function deleteEvent(){
     const id = (document.getElementById('inpEvId').value || '').trim();
     if (!id){
       alert('Nenhum evento selecionado.');
       return;
     }
   
     const ev = (state.agenda.events || []).find(e => e.id === id);
     if (!ev) return;
     if (!confirm('Remover este agendamento?')) return;
   
     state.agenda.events = (state.agenda.events || []).filter(e => e.id !== id);
     bootstrap.Modal.getInstance(document.getElementById('eventModal'))?.hide();
     renderAgendaList();
     renderResumo();
     saveLS();
   
     alert('Agendamento removido ✅');
   }
   
   function renderAgendaList(){
     const root = document.getElementById('agendaList');
     const label = document.getElementById('agendaMonthLabel');
     if (!root || !label) return;
   
     const cursor = new Date(state.ui.monthCursor.getFullYear(), state.ui.monthCursor.getMonth(), 1);
     label.textContent = monthLabel(cursor);
   
     const { from, to } = monthRangeISO(cursor);
     const set = getFilteredStudentSet();
   
     const events = (state.agenda.events || [])
       .filter(ev => ev?.dateISO && ev.dateISO >= from && ev.dateISO <= to)
       .filter(ev => {
         if (!set) return true;
         if (!ev.studentId) return true;
         return set.has(ev.studentId);
       })
       .slice()
       .sort((a, b) => {
         const ka = a.dateISO + ' ' + (a.time || '00:00');
         const kb = b.dateISO + ' ' + (b.time || '00:00');
         return ka.localeCompare(kb);
       });
   
     if (!events.length){
       root.innerHTML = `<div class="text-muted">Nenhum evento neste mês (com o filtro atual).</div>`;
       return;
     }
   
     const map = new Map();
     events.forEach(ev => {
       if (!map.has(ev.dateISO)) map.set(ev.dateISO, []);
       map.get(ev.dateISO).push(ev);
     });
   
     const days = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
   
     root.innerHTML = days.map(([dateISO, evs]) => {
       return `
         <div class="day-group">
           <div class="day-head">
             <div>
               <h6>${escHtml(niceDateLabelISO(dateISO))}</h6>
               <div class="text-muted small">${evs.length} evento(s)</div>
             </div>
             <button class="icon-btn btn-anim" onclick="openEventModalForDate('${dateISO}')">
               <i class="bi bi-plus-lg me-2"></i>Novo
             </button>
           </div>
   
           ${evs.map(ev => {
             const student = ev.studentId ? getStudentById(ev.studentId)?.name : null;
             const title = student || ev.title || 'Agendamento particular';
             const place = ev.place ? `• ${escHtml(ev.place)}` : '';
             const note  = ev.note ? `• ${escHtml(ev.note)}` : '';
   
             return `
               <div class="event-row">
                 <div class="event-main">
                  <strong>${escHtml(formatTimeDisplay(ev.time))} • ${escHtml(title)}</strong>
                   <div class="event-sub">
                     <span class="chip">${escHtml(ev.type)}</span>
                     ${student ? `<span class="chip">${escHtml(student)}</span>` : `<span class="chip">Particular</span>`}
                     ${place ? `<span class="text-muted">${place}</span>` : ``}
                     ${note ? `<span class="text-muted">${note}</span>` : ``}
                   </div>
                 </div>
                 <div class="d-flex gap-2">
                   <button class="icon-only btn-anim" title="Editar" onclick="openEditEvent('${ev.id}')">
                     <i class="bi bi-pencil-square"></i>
                   </button>
                   <button class="icon-only btn-anim danger" title="Remover" onclick="quickRemoveEvent('${ev.id}')">
                     <i class="bi bi-trash3"></i>
                   </button>
                 </div>
               </div>
             `;
           }).join('')}
         </div>
       `;
     }).join('');
   
     bindRipple();
     saveLS();
   }
   
   function quickRemoveEvent(id){
     const ev = (state.agenda.events || []).find(e => e.id === id);
     if (!ev) return;
     if (!confirm('Remover este agendamento?')) return;
   
     state.agenda.events = (state.agenda.events || []).filter(e => e.id !== id);
     renderAgendaList();
     renderResumo();
     saveLS();
   }
   
   function prevMonth(){
     const d = state.ui.monthCursor;
     state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth() - 1, 1);
     renderAgendaList();
   }
   
   function nextMonth(){
     const d = state.ui.monthCursor;
     state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth() + 1, 1);
     renderAgendaList();
   }
   
   /* =========================
      CASHBACK PROFISSIONAL
      ========================= */
   function renderProCashback(){
     const bal = document.getElementById('proCbBalance');
     const goal = document.getElementById('proCbGoal');
     const pctEl = document.getElementById('proCbPct');
     const bar = document.getElementById('proCbBar');
   
     if (bal) bal.textContent = formatBRL(state.cashback.balance);
     if (goal) goal.textContent = formatBRL(state.cashback.goal);
   
     const pct = Math.max(
       0,
       Math.min(
         100,
         (Number(state.cashback.balance || 0) / Math.max(1, Number(state.cashback.goal || 0))) * 100
       )
     );
   
     if (pctEl) pctEl.textContent = String(pct.toFixed(0));
     if (bar) bar.style.width = pct.toFixed(0) + '%';
   
     const tbody = document.getElementById('proCbTbody');
     if (tbody) tbody.innerHTML = '';
   
     const hist = (state.cashback.history || []).slice().sort((a, b) => {
       const da = parseBRDate(a.date);
       const db = parseBRDate(b.date);
       return (db?.getTime() || 0) - (da?.getTime() || 0);
     });
   
     hist.forEach(h => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td>${escHtml(h.date)}</td>
         <td><span class="badge-pill">${escHtml(h.origin || '—')}</span></td>
         <td class="text-muted">${escHtml(h.desc || '')}</td>
         <td><strong>R$ ${formatBRL(h.value)}</strong></td>
       `;
       tbody?.appendChild(tr);
     });
   
     renderResumo();
     saveLS();
   }
   
   function redeemProCashback(){
     if (Number(state.cashback.balance || 0) <= 0){
       alert('Você não tem cashback disponível.');
       return;
     }
   
     window.location.href = './marketplace.html';
   }
   
   function exportCashbackCSV(){
     const lines = [
       ['Data','Origem','Descrição','Valor'].join(';'),
       ...(state.cashback.history || []).map(h =>
         [h.date, h.origin, h.desc, String(h.value).replace('.', ',')].join(';')
       )
     ];
   
     downloadText('cashback_profissional.csv', lines.join('\n'));
   }
   
   /* =========================
      MINHAS COMPRAS
      ========================= */
   function getOrdersFilterValue(){
     const btn = document.querySelector('.orders-filter.is-active, .order-filter-btn.is-active');
     return String(btn?.dataset.status || btn?.dataset.filter || 'ALL').toUpperCase();
   }

   function loadSharedOrders(){
     try {
       const arr = JSON.parse(localStorage.getItem(ORDERS_STORAGE) || '[]');
       return Array.isArray(arr) ? arr : [];
     } catch {
       return [];
     }
   }

   function saveSharedOrders(orders){
     try {
       localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
     } catch {}
   }

   function toISODateSafe(value){
     if (!value) return '';
     if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;
     return '';
   }

   function toBRDateSafe(iso){
     const [y, m, d] = String(iso || '').split('-').map(Number);
     if (!y || !m || !d) return '—';
     return `${pad2(d)}/${pad2(m)}/${y}`;
   }

   function clampTrackStep(step){
     const s = Math.max(1, Math.min(4, parseInt(step || '1', 10)));
     return Number.isFinite(s) ? s : 1;
   }

   function statusFromTrackStep(step){
     const s = Number(step || 1);
     if (s <= 1) return 'AGUARDANDO';
     if (s === 2) return 'ENVIADO';
     if (s === 3) return 'ENTREGA';
     return 'ENTREGUE';
   }

   function updateOrderStatusFromTrack(order){
     if (!order) return order;
     if (order.status === 'CANCELADO' || order.status === 'DEVOLVIDO') return order;
     order.trackStep = clampTrackStep(order.trackStep || 1);
     order.status = statusFromTrackStep(order.trackStep);
     if (order.status === 'ENTREGUE' && !order.delivered) {
       order.delivered = toISODate(new Date());
     }
     return order;
   }

   function normalizeOrderStatusClass(status){
     const s = String(status || '').toLowerCase();
     if (s === 'aguardando') return 'status-aguardando';
     if (s === 'entregue') return 'status-entregue';
     if (s === 'cancelado') return 'status-cancelado';
     if (s === 'devolvido') return 'status-devolvido';
     return 'status-aguardando';
   }

   function businessDaysBetween(fromISO, toISO) {
     if (!fromISO || !toISO) return Infinity;
     const from = new Date(fromISO + 'T00:00:00');
     const to = new Date(toISO + 'T00:00:00');
     if (isNaN(from) || isNaN(to)) return Infinity;
     if (to < from) return 0;
     let days = 0;
     const cur = new Date(from);
     while (cur <= to) {
       const dow = cur.getDay();
       if (dow !== 0 && dow !== 6) days++;
       cur.setDate(cur.getDate() + 1);
     }
     return Math.max(0, days - 1);
   }

   function getVisibleOrders(){
     const all = loadSharedOrders();
     const search = (document.getElementById('ordersSearch')?.value || '').trim().toLowerCase();
     const filter = getOrdersFilterValue();
     return all.filter((order) => {
       const matchesFilter = filter === 'ALL' || String(order.status || '').toUpperCase() === filter;
       const matchesSearch =
         !search ||
         String(order.name || order.product || '').toLowerCase().includes(search) ||
         String(order.id || order.code || '').toLowerCase().includes(search);
       return matchesFilter && matchesSearch;
     });
   }
   
   function bindOrderFilters(){
     document.querySelectorAll('.orders-filter, .order-filter-btn').forEach(btn => {
       if (btn.dataset.bound === '1') return;
       btn.dataset.bound = '1';
   
       btn.addEventListener('click', () => {
         document.querySelectorAll('.orders-filter, .order-filter-btn').forEach(b => b.classList.remove('is-active'));
         btn.classList.add('is-active');
         renderOrders();
       });
     });
   }
   
   function renderOrders(){
     const list = document.getElementById('ordersList');
     const total = document.getElementById('ordersCount');
     if (!list || !total) return;

    const all = loadSharedOrders();
    all.forEach(updateOrderStatusFromTrack);
    saveSharedOrders(all);

    const arr = getVisibleOrders().slice().sort((a, b) => {
       const da = String(b.date || b.purchaseDate || '');
       const db = String(a.date || a.purchaseDate || '');
       return da.localeCompare(db);
     });
   
     total.textContent = `${arr.length} ${arr.length === 1 ? 'pedido' : 'pedidos'}`;
   
     if (!arr.length){
       list.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-ico">🛒</div>
          <div class="orders-empty-title">Nenhuma compra encontrada</div>
          <div class="orders-empty-sub">Tente mudar o filtro ou buscar outro pedido.</div>
        </div>
      `;
       bindOrderFilters();
       return;
     }
   
     list.innerHTML = arr.map(order => {
       updateOrderStatusFromTrack(order);
       const orderCode = order.id || order.code || '';
       const purchaseDate = order.date || order.purchaseDate || '';
       const delivered = order.delivered || toISODateSafe(order.deliveryDate);
       const deliveredISO = delivered || '';
      const canCancel = order.status !== 'ENTREGUE' && order.status !== 'CANCELADO' && order.status !== 'DEVOLVIDO';
       const businessDays = deliveredISO ? businessDaysBetween(deliveredISO, toISODate(new Date())) : Infinity;
       const canReturn = order.status === 'ENTREGUE' && businessDays <= 7;
      const isReviewed = !!order.reviewed;
   
       return `
      <div class="order-card">
        <div class="order-top">
          <div class="order-product">
            <div class="order-thumb">
              <img src="${escHtml(order.image || order.thumb || './img/produto-default.png')}" alt="${escHtml(order.name || order.product || 'Produto')}">
            </div>

            <div class="order-meta">
              <div class="order-title">${escHtml(order.name || order.product || 'Produto')}</div>
              <div class="order-sub">${escHtml(order.category || 'Categoria')}</div>
              <div class="order-price">R$ ${formatBRL(Number(order.price || 0))}</div>
              <div class="mini text-muted mt-1" style="cursor:pointer;" onclick="openTracking('${escHtml(String(orderCode))}')">
                <strong>Rastreio:</strong> clique para simular etapas
              </div>
            </div>
          </div>

          <div class="order-right">
            <div class="order-code">Pedido #${escHtml(orderCode)}</div>
            <div class="order-status status-${String(order.status || '').toLowerCase()}">
              ${escHtml(order.status || 'AGUARDANDO')}
            </div>
          </div>
        </div>

        <div class="order-progress">
          ${(() => {
            const current = clampTrackStep(order.trackStep || 1);
            const labels = ['Pedido', 'Enviado', 'Entrega', 'Recebido'];
            return labels
              .map((lab, idx) => {
                const step = idx + 1;
                const isDone = step < current;
                const isCurrent = step === current;
                const cls = isDone ? 'is-done' : isCurrent ? 'is-current' : '';
                const lock = step > current + 1 ? 'data-locked="1"' : '';
                return `<div class="order-step ${cls}" ${lock} style="cursor:pointer;" onclick="toggleTrackStep('${escHtml(String(orderCode))}', ${step})">
                  <div class="step-title">${lab}</div>
                </div>`;
              })
              .join('');
          })()}
        </div>

        <div class="order-bottom">
          <div class="order-info-line">
            <span><strong>Compra:</strong> ${escHtml(purchaseDate || '—')}</span>
            ${delivered ? `<span><strong>Entrega:</strong> ${escHtml(delivered)}</span>` : ''}
          </div>

          <div class="d-flex gap-2 flex-wrap">
            <button class="icon-btn btn-anim icon-mini" type="button" onclick="openOrderInvoice('${escHtml(String(orderCode))}')">
              📄 Nota Fiscal
            </button>

            <button class="icon-btn btn-anim icon-mini" type="button" onclick="openOrderSupport('${escHtml(String(orderCode))}')">
              💬 Suporte
            </button>

            ${canCancel ? `
              <button class="icon-btn btn-anim icon-mini" type="button" onclick="cancelOrder('${escHtml(String(orderCode))}')">
                ❌ Cancelar
              </button>
            ` : ``}

            ${order.status === 'ENTREGUE' && !isReviewed ? `
              <button class="icon-btn btn-anim icon-mini" type="button" onclick="reviewProduct('${escHtml(String(orderCode))}')">
                ⭐ Avaliar
              </button>
            ` : isReviewed ? `
              <span class="text-muted small">✅ Avaliado</span>
            ` : ''}

            ${order.status === 'ENTREGUE' ? `
              <button class="icon-btn btn-anim icon-mini" type="button" onclick="requestReturn('${escHtml(String(orderCode))}')"
                ${canReturn ? '' : 'disabled'} title="${canReturn ? 'Devolução disponível' : 'Prazo de devolução expirou (7 dias úteis)'}">
                🔄 Devolver
              </button>
            ` : ''}
          </div>
        </div>
      </div>
       `;
     }).join('');
   
     bindOrderFilters();
     bindRipple();
   }
   
   function openOrderInvoice(id){
     const order = loadSharedOrders().find(o => String(o.id || o.code) === String(id));
     if (!order) return;

     const sub = document.getElementById('invSubtitle');
     const body = document.getElementById('invBody');
     if (sub) sub.textContent = `Pedido #${order.id || order.code} • ${order.status || 'AGUARDANDO'}`;
     if (body) {
       const delivered = order.delivered || toISODateSafe(order.deliveryDate) || '—';
       body.innerHTML = `
         <div class="mb-2"><strong>Produto:</strong> ${escHtml(order.name || order.product || '—')}</div>
         <div class="mb-2"><strong>Categoria:</strong> ${escHtml(order.category || '—')}</div>
         <div class="mb-2"><strong>Data da compra:</strong> ${escHtml(order.date || order.purchaseDate || '—')}</div>
         <div class="mb-2"><strong>Entrega:</strong> ${escHtml(delivered)}</div>
         <hr style="border-color: rgba(255,255,255,.15);">
         <div class="mb-1"><strong>Itens:</strong> 1</div>
         <div class="mb-1"><strong>Preço:</strong> R$ ${formatBRL(order.price || 0)}</div>
         <div class="mb-1"><strong>Total:</strong> R$ ${formatBRL(order.price || 0)}</div>
         <div class="text-muted mt-2">Documento fictício para testes locais.</div>
       `;
     }

     const modalEl = document.getElementById('invoiceModal');
     const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
     modal?.show();
   }
   
   function openOrderSupport(id){
     const order = loadSharedOrders().find(o => String(o.id || o.code) === String(id));
     if (!order) return;

     const modalEl = document.getElementById('supportModal');
     if (modalEl) {
       const orderIdEl = document.getElementById('supportOrderId');
       const orderNameEl = document.getElementById('supportOrderName');
       if (orderIdEl) orderIdEl.textContent = String(order.id || order.code || '—');
       if (orderNameEl) orderNameEl.textContent = String(order.name || order.product || '—');
       const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
       modal.show();
     }
   }

   function cancelOrder(id){
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(id));
     if (!order) return;
     if (order.status === 'ENTREGUE') {
       alert('Não é possível cancelar após a entrega.');
       return;
     }
     if (order.status === 'CANCELADO' || order.status === 'DEVOLVIDO') return;
     if (!confirm('Cancelar este pedido?')) return;
     order.status = 'CANCELADO';
     saveSharedOrders(orders);
     renderOrders();
   }

   function requestReturn(id){
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(id));
     if (!order) return;
     if (order.status !== 'ENTREGUE') {
       alert('Você só pode devolver após a entrega.');
       return;
     }
     const deliveredISO = order.delivered || '';
     const businessDays = deliveredISO ? businessDaysBetween(deliveredISO, toISODate(new Date())) : Infinity;
     if (businessDays > 7) {
       alert('Prazo de devolução expirado (7 dias úteis).');
       return;
     }
     if (!confirm('Solicitar devolução do pedido?')) return;
     order.status = 'DEVOLVIDO';
     saveSharedOrders(orders);
     renderOrders();
   }

   function toggleTrackStep(orderId, step){
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(orderId));
     if (!order) return;
     if (order.status === 'CANCELADO' || order.status === 'DEVOLVIDO') return;
     const cur = clampTrackStep(order.trackStep || 1);
     const target = clampTrackStep(step || 1);
     if (target > cur + 1) {
       alert('Habilite as etapas anteriores primeiro.');
       return;
     }
     if (target === cur && cur > 1) order.trackStep = cur - 1;
     else if (target === cur && cur === 1) order.trackStep = 1;
     else order.trackStep = target;
     updateOrderStatusFromTrack(order);
     saveSharedOrders(orders);
     renderOrders();
   }

   let trackingCtx = { orderId: '', step: 1 };

   function renderTrackingModal(order) {
     const subtitle = document.getElementById('trackingSubtitle');
     const body = document.getElementById('trackingBody');
     if (subtitle) subtitle.textContent = `Pedido #${order.id || order.code} • Status: ${order.status}`;
     if (!body) return;

     const steps = [
       { n: 1, label: 'Pedido' },
       { n: 2, label: 'Enviado' },
       { n: 3, label: 'Entrega' },
       { n: 4, label: 'Recebido' }
     ];

     const current = clampTrackStep(order.trackStep || 1);
     body.innerHTML = `
       <div class="text-muted small mb-2">Clique em "Avançar etapa" para simular a entrega e testar os filtros.</div>
       <div class="d-flex flex-column gap-2">
         ${steps.map((s) => {
           const done = s.n < current;
           const cur = s.n === current;
           const badge = done ? '✅' : (cur ? '🟡' : '⚪');
           const cls = done ? 'text-success' : (cur ? 'text-warning' : 'text-muted');
           return `<div class="d-flex justify-content-between align-items-center">
             <div class="${cls}" style="font-weight:900;">${badge} ${s.label}</div>
             <div class="small text-muted">Etapa ${s.n}/4</div>
           </div>`;
         }).join('')}
       </div>
       <hr style="border-color: rgba(255,255,255,.10); margin: 14px 0;">
       <div class="small text-muted">
         <div><strong>Compra:</strong> ${escHtml(order.date || order.purchaseDate || '—')}</div>
         <div><strong>Entrega:</strong> ${escHtml(order.delivered || toISODateSafe(order.deliveryDate) || '—')}</div>
       </div>
     `;
   }

   function openTracking(orderId) {
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(orderId));
     if (!order) return;
     updateOrderStatusFromTrack(order);
     trackingCtx.orderId = String(order.id || order.code);
     trackingCtx.step = clampTrackStep(order.trackStep || 1);
     saveSharedOrders(orders);
     renderTrackingModal(order);

     const modalEl = document.getElementById('trackingModal');
     const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
     modal?.show();
   }

   function trackingNextStep() {
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(trackingCtx.orderId));
     if (!order) return;
     if (order.status === 'CANCELADO' || order.status === 'DEVOLVIDO') return;
     order.trackStep = clampTrackStep((order.trackStep || 1) + 1);
     updateOrderStatusFromTrack(order);
     saveSharedOrders(orders);
     renderTrackingModal(order);
     renderOrders();
   }

   function trackingPrevStep() {
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(trackingCtx.orderId));
     if (!order) return;
     if (order.status === 'CANCELADO' || order.status === 'DEVOLVIDO') return;
     order.trackStep = clampTrackStep((order.trackStep || 1) - 1);
     updateOrderStatusFromTrack(order);
     saveSharedOrders(orders);
     renderTrackingModal(order);
     renderOrders();
   }

   let reviewCtx = { orderId: '', productId: '', rating: 0 };

   function loadProductReviews() {
     try {
       const raw = localStorage.getItem(PRODUCT_REVIEWS_STORAGE);
       const obj = JSON.parse(raw || 'null');
       if (!obj || typeof obj !== 'object') return {};
       return obj;
     } catch {
       return {};
     }
   }

   function saveProductReviews(reviews) {
     try {
       localStorage.setItem(PRODUCT_REVIEWS_STORAGE, JSON.stringify(reviews));
     } catch {}
   }

   function updateProductDescriptionInMarketplace(productId, rating, reviewText) {
     const STORAGE_PRODUCTS_KEY = 'ONEFIT_PRODUCTS';
     const products = JSON.parse(localStorage.getItem(STORAGE_PRODUCTS_KEY) || '[]');

     let product = products.find((p) => String(p.id) === String(productId));
     if (!product) {
       const orders = loadSharedOrders();
       const order = orders.find((o) => String(o.id || o.code) === String(productId));
       if (order) {
         product = products.find((p) =>
           String(p.name || '').toLowerCase() === String(order.name || order.product || '').toLowerCase()
         );
       }
     }

     if (!product) return;

     const reviews = loadProductReviews();
     const reviewKey = String(product.id || productId);
     const productReviews = reviews[reviewKey] || [];
     productReviews.push({ rating, review: reviewText, date: toISODate(new Date()) });
     reviews[reviewKey] = productReviews;
     saveProductReviews(reviews);

     const avgRating = productReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / productReviews.length;
     const stars = '⭐'.repeat(Math.round(avgRating));
     if (!product.description) product.description = '';
     const ratingText = `\n\n${stars} ${avgRating.toFixed(1)}/5.0 (${productReviews.length} avaliação${productReviews.length > 1 ? 'ões' : ''})`;
     if (!product.description.includes('⭐')) {
       product.description += ratingText;
     } else {
       product.description = product.description.replace(/\n\n⭐.*/, ratingText);
     }

     localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
   }

   function setReviewRating(rating) {
     reviewCtx.rating = rating;
     for (let i = 1; i <= 5; i++) {
       const star = document.getElementById(`reviewStar${i}`);
       if (star) {
         star.textContent = i <= rating ? '★' : '☆';
         star.style.color = i <= rating ? '#f5b400' : '#666';
       }
     }
   }

   function submitReview() {
     if (reviewCtx.rating === 0) {
       alert('Por favor, selecione uma avaliação (estrelas).');
       return;
     }

     const reviewText = (document.getElementById('reviewText')?.value || '').trim();
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(reviewCtx.orderId));
     if (!order) {
       alert('Pedido não encontrado.');
       return;
     }

     updateProductDescriptionInMarketplace(order.id || order.code, reviewCtx.rating, reviewText);
     order.reviewed = true;
     saveSharedOrders(orders);

     const modalEl = document.getElementById('reviewModal');
     const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
     modal?.hide();
     renderOrders();
     alert('Avaliação enviada com sucesso! ✅ A avaliação foi adicionada à descrição do produto no marketplace.');
   }

   function reviewProduct(id) {
     const orders = loadSharedOrders();
     const order = orders.find((o) => String(o.id || o.code) === String(id));
     if (!order) {
       alert('Pedido não encontrado.');
       return;
     }
     if (order.status !== 'ENTREGUE') {
       alert('Você só pode avaliar produtos após a entrega.');
       return;
     }

     reviewCtx.orderId = String(order.id || order.code);
     reviewCtx.productId = String(order.id || order.code);
     reviewCtx.rating = 0;

     for (let i = 1; i <= 5; i++) {
       const star = document.getElementById(`reviewStar${i}`);
       if (star) {
         star.textContent = '☆';
         star.style.color = '#666';
       }
     }
     const reviewText = document.getElementById('reviewText');
     if (reviewText) reviewText.value = '';

     const modalEl = document.getElementById('reviewModal');
     if (modalEl) {
       const productNameEl = document.getElementById('reviewProductName');
       if (productNameEl) productNameEl.textContent = String(order.name || order.product || 'Produto');
       const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
       modal.show();
     }
   }
   
   /* =========================
      INIT
      ========================= */
   window.addEventListener('DOMContentLoaded', () => {
     loadLS();
   
     bindNavClicks();
     cloneMenuToMobile();
     bindRipple();
     bindOrderFilters();
  bindEventTimeMask();
   
     document.getElementById('agendaFilter')?.addEventListener('input', () => {
       renderStudents();
       renderAgendaList();
     });
   
     document.getElementById('ordersSearch')?.addEventListener('input', renderOrders);
   
     document.querySelectorAll('.js-stagger').forEach((el, i) => {
       setTimeout(() => el.classList.add('in'), 80 * i);
     });
   
     loadViewFromHash();
   
     renderResumo();
     renderContrato();
     renderPonto();
     renderSalaries();
     renderHours();
     renderStudents();
     renderAgendaList();
     renderProCashback();
     renderOrders();
   });
   
   window.addEventListener('hashchange', loadViewFromHash);
   
   /* =========================
      EXPOSE para onclick do HTML
      ========================= */
   window.logout = logout;
  window.goView = goView;
  
  window.seedHoursFromPunches = seedHoursFromPunches;
   window.exportHoursCSV = exportHoursCSV;
   
   window.punch = punch;
   window.clearPunches = clearPunches;
   
   window.openAddSalary = openAddSalary;
   window.openEditSalary = openEditSalary;
   window.saveSalary = saveSalary;
   window.removeSalary = removeSalary;
   window.exportSalariesCSV = exportSalariesCSV;
   
   window.openAddStudent = openAddStudent;
   window.openEditStudent = openEditStudent;
   window.saveStudent = saveStudent;
   window.removeStudent = removeStudent;
   
   window.prevMonth = prevMonth;
   window.nextMonth = nextMonth;
   window.openEventModalForDate = openEventModalForDate;
   window.openEditEvent = openEditEvent;
   window.saveEvent = saveEvent;
   window.deleteEvent = deleteEvent;
   window.quickRemoveEvent = quickRemoveEvent;
   
   window.renderProCashback = renderProCashback;
   window.redeemProCashback = redeemProCashback;
   window.exportCashbackCSV = exportCashbackCSV;
   
   window.renderOrders = renderOrders;
   window.openOrderInvoice = openOrderInvoice;
   window.openOrderSupport = openOrderSupport;
   window.openTracking = openTracking;
   window.trackingNextStep = trackingNextStep;
   window.trackingPrevStep = trackingPrevStep;
   window.reviewProduct = reviewProduct;
   window.setReviewRating = setReviewRating;
   window.submitReview = submitReview;
  window.cancelOrder = cancelOrder;
  window.requestReturn = requestReturn;
  window.toggleTrackStep = toggleTrackStep;
   
   window.todayISO = todayISO;