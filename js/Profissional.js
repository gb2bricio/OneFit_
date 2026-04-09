/* =========================
   STATE (mock) + persistência local
   ========================= */
   const LS_KEY = 'ONEFIT_PRO_V1';

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
   
     ui: {
       monthCursor: new Date(2026, 2, 1), // Março/2026
       viewMeta: {
         "view-resumo":   { title:"Resumo", sub:"Acompanhe rapidamente contrato, horas, ponto, salários, agenda e cashback." },
         "view-contrato": { title:"Contrato", sub:"Status de contrato com a academia." },
         "view-carga":    { title:"Carga horária", sub:"Horas do mês e detalhamento." },
         "view-ponto":    { title:"Cartão de ponto", sub:"Bata entrada/saída e acompanhe registros." },
         "view-salarios": { title:"Salários", sub:"Histórico de pagamentos de salário." },
         "view-agenda":   { title:"Minha agenda", sub:"Agenda particular com alunos: adicionar, editar ou remover (agora em lista)." },
         "view-cashback": { title:"Meu cashback", sub:"Saldo, meta e extrato." }
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
        state = parsed;
        if (state.contract && 'status' in state.contract) delete state.contract.status;
      }
    }catch(e){}
  }
   
   /* =========================
      UTIL
      ========================= */
   function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
   function pad2(n){ return String(n).padStart(2,'0'); }
   function formatBRL(n){ return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
   function escHtml(s){
     return String(s ?? '')
       .replaceAll('&','&amp;')
       .replaceAll('<','&lt;')
       .replaceAll('>','&gt;')
       .replaceAll('"','&quot;')
       .replaceAll("'","&#039;");
   }
   function toISODate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
   function todayISO(){ return toISODate(new Date()); }
   function addDaysISO(n){
     const d = new Date();
     d.setDate(d.getDate()+n);
     return toISODate(d);
   }
   function parseBRDate(s){
     const [dd,mm,yyyy] = (s || '').split('/').map(Number);
     if (!dd || !mm || !yyyy) return null;
     return new Date(yyyy, mm-1, dd);
   }
   function formatDateBRFromISO(iso){
     const [y,m,d] = (iso || '').split('-').map(Number);
     if (!y || !m || !d) return '—';
     return `${pad2(d)}/${pad2(m)}/${y}`;
   }
   function niceDateLabelISO(iso){
     const [y,m,d] = (iso || '').split('-').map(Number);
     if (!y||!m||!d) return '—';
     const dt = new Date(y, m-1, d);
     return dt.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' });
   }
   function monthLabel(d){ return d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' }); }
   function downloadText(filename, content){
     const blob = new Blob([content], { type:'text/plain;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url; a.download = filename;
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
     document.querySelectorAll('.btn-anim, .icon-only').forEach(btn=>{
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
         s.style.top  = (y - size/2) + 'px';
         this.appendChild(s);
         setTimeout(()=> s.remove(), 650);
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
     if (location.hash.replace('#','') !== viewId) location.hash = viewId;
   
     el?.querySelectorAll?.('.js-stagger')?.forEach?.((node, i) => {
       node.classList.remove('in');
       setTimeout(() => node.classList.add('in'), 80 * i);
     });
   
     // renderizações por view
     if (viewId === 'view-resumo') setTimeout(renderResumo, 60);
     if (viewId === 'view-contrato') setTimeout(renderContrato, 60);
     if (viewId === 'view-carga') setTimeout(renderHours, 60);
     if (viewId === 'view-ponto') setTimeout(renderPonto, 60);
     if (viewId === 'view-salarios') setTimeout(renderSalaries, 60);
     if (viewId === 'view-agenda') setTimeout(() => { renderStudents(); renderAgendaList(); }, 60);
     if (viewId === 'view-cashback') setTimeout(renderProCashback, 60);
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
     const h = (location.hash || '').replace('#','').trim();
     const viewId = (h && document.getElementById(h)) ? h : 'view-resumo';
     activateNav(viewId);
   }
   
   /* =========================
      RESUMO (KPIs)
      ========================= */
   function computeHoursMonthTotal(){
     const cur = state.ui.monthCursor;
     const mm = cur.getMonth()+1, yyyy = cur.getFullYear();
   
     return (state.hours.entries || []).reduce((acc, e)=>{
       const dt = parseBRDate(e.date);
       if (!dt) return acc;
       if (dt.getFullYear() === yyyy && (dt.getMonth()+1) === mm) return acc + Number(e.hours || 0);
       return acc;
     }, 0);
   }
   function getNextEvent(){
     const now = new Date();
     const nowISO = toISODate(now);
   
     const candidates = (state.agenda.events || []).slice().filter(ev => ev?.dateISO && ev.dateISO >= nowISO);
   
     candidates.sort((a,b)=>{
       const keyA = a.dateISO + ' ' + (a.time||'00:00');
       const keyB = b.dateISO + ' ' + (b.time||'00:00');
       return keyA.localeCompare(keyB);
     });
   
     return candidates[0] || null;
   }
   function lastPunch(){
     const p = (state.punches || []).slice().sort((a,b)=>{
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return kb.localeCompare(ka);
     });
     return p[0] || null;
   }
   function getStudentById(id){ return (state.students || []).find(s => s.id === id) || null; }
   
  function renderResumo(){
    const elC = document.getElementById('kpiContrato');
    const elV = document.getElementById('kpiVigencia');
    if (elC) elC.textContent = 'Ativo';
    if (elV) elV.textContent = `${state.contract.start} → ${state.contract.end}`;
    const barContrato = document.getElementById('barContrato');
    if (barContrato) barContrato.style.width = '100%';
   
     const total = computeHoursMonthTotal();
     const goal = Math.max(1, Number(state.hours.goalMonth || 160));
     const pct = Math.max(0, Math.min(100, (total/goal)*100));
     const elH = document.getElementById('kpiHoras');
     const elHM = document.getElementById('kpiHorasMeta');
     const barH = document.getElementById('barHoras');
     if (elH) elH.textContent = String(total.toFixed(1)).replace('.',',');
     if (elHM) elHM.textContent = String(goal);
     if (barH) barH.style.width = pct.toFixed(0) + '%';
   
     const elCb = document.getElementById('kpiCashback');
     if (elCb) elCb.textContent = formatBRL(state.cashback.balance);
   
     const nx = getNextEvent();
     const elN = document.getElementById('kpiNextSlot');
     if (elN){
       if (!nx) elN.textContent = 'Nenhum agendamento futuro';
       else {
         const title = nx.studentId ? (getStudentById(nx.studentId)?.name || nx.title) : nx.title;
         elN.textContent = `${formatDateBRFromISO(nx.dateISO)} • ${nx.time} • ${title}`;
       }
     }
   
     const lp = lastPunch();
     const elLP = document.getElementById('kpiLastPunch');
     if (elLP){
       if (!lp) elLP.textContent = 'Sem registros';
       else elLP.textContent = `${formatDateBRFromISO(lp.dateISO)} • ${lp.timeHHMM} • ${lp.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}`;
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
     const pct = Math.max(0, Math.min(100, (total/goal)*100));
   
     const elT = document.getElementById('hoursTotal');
     const elG = document.getElementById('hoursGoal');
     const elP = document.getElementById('hoursPct');
     const bar = document.getElementById('hoursBar');
   
     if (elT) elT.textContent = String(total.toFixed(1)).replace('.',',');
     if (elG) elG.textContent = String(goal);
     if (elP) elP.textContent = String(pct.toFixed(0));
     if (bar) bar.style.width = pct.toFixed(0) + '%';
   
     const rows = (state.hours.entries || []).slice().sort((a,b)=>{
       const da = parseBRDate(a.date), db = parseBRDate(b.date);
       return (db?.getTime()||0) - (da?.getTime()||0);
     });
   
     rows.forEach(e=>{
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td>${escHtml(e.date)}</td>
         <td><strong>${escHtml(String(Number(e.hours||0)).replace('.',','))}h</strong></td>
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
     const punches = (state.punches || []).slice().sort((a,b)=>{
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return ka.localeCompare(kb);
     });
   
     const byDay = new Map();
     punches.forEach(p=>{
       if (!byDay.has(p.dateISO)) byDay.set(p.dateISO, []);
       byDay.get(p.dateISO).push(p);
     });
   
     const entries = [];
     byDay.forEach((arr, dateISO)=>{
       let totalMin = 0;
       let lastIn = null;
       arr.forEach(p=>{
         if (p.type === 'IN'){
           lastIn = p;
         } else if (p.type === 'OUT' && lastIn){
           const [h1,m1] = lastIn.timeHHMM.split(':').map(Number);
           const [h2,m2] = p.timeHHMM.split(':').map(Number);
           const mins = (h2*60+m2) - (h1*60+m1);
           if (mins > 0) totalMin += mins;
           lastIn = null;
         }
       });
   
       const hours = +(totalMin/60).toFixed(2);
       if (hours > 0){
         entries.push({ date: formatDateBRFromISO(dateISO), hours, source:'Ponto', note:'Auto (ponto)' });
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
       ...(state.hours.entries||[]).map(e => [e.date, String(e.hours).replace('.',','), e.source, e.note].map(v=>String(v||'')).join(';'))
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
     const arr = (state.punches || []).filter(p => p.dateISO === tISO)
       .slice().sort((a,b)=>a.timeHHMM.localeCompare(b.timeHHMM));
   
     let totalMin = 0;
     let lastIn = null;
   
     arr.forEach(p=>{
       if (p.type === 'IN') lastIn = p;
       if (p.type === 'OUT' && lastIn){
         const [h1,m1] = lastIn.timeHHMM.split(':').map(Number);
         const [h2,m2] = p.timeHHMM.split(':').map(Number);
         const mins = (h2*60+m2) - (h1*60+m1);
         if (mins > 0) totalMin += mins;
         lastIn = null;
       }
     });
   
     return +(totalMin/60).toFixed(2);
   }
   function renderPonto(){
     const tbody = document.getElementById('punchesTbody');
     if (tbody) tbody.innerHTML = '';
   
     const sorted = (state.punches || []).slice().sort((a,b)=>{
       const ka = a.dateISO + ' ' + a.timeHHMM;
       const kb = b.dateISO + ' ' + b.timeHHMM;
       return kb.localeCompare(ka);
     });
   
     sorted.forEach(p=>{
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
     if (td) td.textContent = String(today).replace('.',',') + 'h';
   
     renderResumo();
     bindRipple();
     saveLS();
   }
   
   /* =========================
      SALÁRIOS (CRUD) -> ÍCONES
      ========================= */
   function badgeSalary(status){
     if (status === 'PAGO') return `<span class="badge" style="background:var(--success)">PAGO</span>`;
     return `<span class="badge" style="background:var(--danger)">PENDENTE</span>`;
   }
   function renderSalaries(){
     const tbody = document.getElementById('salariesTbody');
     if (!tbody) return;
     tbody.innerHTML = '';
   
     const sorted = (state.salaries || []).slice().sort((a,b)=>{
       const [ma,ya] = (a.compet||'').split('/').map(Number);
       const [mb,yb] = (b.compet||'').split('/').map(Number);
       const ka = (ya||0)*100 + (ma||0);
       const kb = (yb||0)*100 + (mb||0);
       return kb - ka;
     });
   
     sorted.forEach((s, idx)=>{
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td><strong>${escHtml(s.compet)}</strong></td>
         <td>R$ ${formatBRL(s.value)}</td>
         <td>${escHtml(s.paidOn || '—')}</td>
         <td>${badgeSalary(s.status)}</td>
         <td class="text-end">
           <button class="icon-only btn-anim" title="Editar" onclick="openEditSalary(${idx})">
             <i class="bi bi-pencil-square"></i>
           </button>
           <button class="icon-only btn-anim danger ms-2" title="Remover" onclick="removeSalary(${idx})">
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
       ...(state.salaries||[]).map(s => [s.compet, formatBRL(s.value), s.paidOn || '', s.status].join(';'))
     ];
     downloadText('salarios.csv', lines.join('\n'));
   }
   
   /* =========================
      ALUNOS (CRUD) -> ÍCONES
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
       const idx = (state.students||[]).findIndex(s => s.id === id);
       if (idx >= 0) state.students[idx] = { ...state.students[idx], name, phone, plan, status, fee, note };
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
   
     state.students = (state.students||[]).filter(s => s.id !== id);
     state.agenda.events = (state.agenda.events||[]).filter(ev => ev.studentId !== id);
   
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
     const filtered = (state.students||[]).filter(s => !q || (s.name||'').toLowerCase().includes(q));
   
     count.textContent = String((state.students||[]).filter(s => s.status === 'ATIVO').length);
   
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
     const ids = new Set((state.students||[])
       .filter(s => (s.name||'').toLowerCase().includes(q))
       .map(s => s.id));
     return ids;
   }
   
   function monthRangeISO(cursorDate){
     const y = cursorDate.getFullYear();
     const m = cursorDate.getMonth(); // 0-based
     const first = new Date(y, m, 1);
     const last = new Date(y, m+1, 0);
     return { from: toISODate(first), to: toISODate(last) };
   }
   
   function fillEventStudentOptions(){
     const sel = document.getElementById('inpEvStudentId');
     if (!sel) return;
     const opts = (state.students||[]).map(s => `<option value="${escHtml(s.id)}">${escHtml(s.name)} (${escHtml(s.status)})</option>`).join('');
     sel.innerHTML = `<option value="">(Sem aluno — particular)</option>${opts}`;
   }
   
   function openEventModalForDate(iso){
     fillEventStudentOptions();
     document.getElementById('eventModalTitle').textContent = 'Agendar horário';
     document.getElementById('inpEvId').value = '';
     document.getElementById('inpEvDate').value = iso;
     document.getElementById('inpEvTime').value = '08:00';
     document.getElementById('inpEvType').value = 'PERSONAL';
     document.getElementById('inpEvPlace').value = '';
     document.getElementById('inpEvNote').value = '';
   
     const set = getFilteredStudentSet();
     const sel = document.getElementById('inpEvStudentId');
     if (sel){
       if (set && set.size){
         sel.value = [...set][0];
       } else if (state.students?.[0]) {
         sel.value = state.students[0].id;
       }
     }
   
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
     } else {
       const idx = (state.agenda.events||[]).findIndex(e => e.id === id);
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
     const ev = (state.agenda.events||[]).find(e => e.id === id);
     if (!ev) return;
     if (!confirm('Remover este agendamento?')) return;
   
     state.agenda.events = (state.agenda.events||[]).filter(e => e.id !== id);
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
         if (!ev.studentId) return true; // sem aluno = sempre aparece
         return set.has(ev.studentId);
       })
       .slice()
       .sort((a,b)=>{
         const ka = a.dateISO + ' ' + (a.time||'00:00');
         const kb = b.dateISO + ' ' + (b.time||'00:00');
         return ka.localeCompare(kb);
       });
   
     if (!events.length){
       root.innerHTML = `<div class="text-muted">Nenhum evento neste mês (com o filtro atual).</div>`;
       return;
     }
   
     // agrupa por dia
     const map = new Map();
     events.forEach(ev=>{
       if (!map.has(ev.dateISO)) map.set(ev.dateISO, []);
       map.get(ev.dateISO).push(ev);
     });
   
     const days = [...map.entries()].sort((a,b)=> a[0].localeCompare(b[0]));
   
     root.innerHTML = days.map(([dateISO, evs])=>{
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
   
           ${evs.map(ev=>{
             const student = ev.studentId ? getStudentById(ev.studentId)?.name : null;
             const title = student || ev.title || 'Agendamento particular';
             const place = ev.place ? `• ${escHtml(ev.place)}` : '';
             const note  = ev.note ? `• ${escHtml(ev.note)}` : '';
   
             return `
               <div class="event-row">
                 <div class="event-main">
                   <strong>${escHtml(ev.time)} • ${escHtml(title)}</strong>
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
     const ev = (state.agenda.events||[]).find(e=> e.id === id);
     if (!ev) return;
     if (!confirm('Remover este agendamento?')) return;
     state.agenda.events = (state.agenda.events||[]).filter(e => e.id !== id);
     renderAgendaList();
     renderResumo();
     saveLS();
   }
   
   function prevMonth(){
     const d = state.ui.monthCursor;
     state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth()-1, 1);
     renderAgendaList();
   }
   function nextMonth(){
     const d = state.ui.monthCursor;
     state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth()+1, 1);
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
   
     const pct = Math.max(0, Math.min(100, (Number(state.cashback.balance||0) / Math.max(1, Number(state.cashback.goal||0))) * 100));
     if (pctEl) pctEl.textContent = String(pct.toFixed(0));
     if (bar) bar.style.width = pct.toFixed(0) + '%';
   
     const tbody = document.getElementById('proCbTbody');
     if (tbody) tbody.innerHTML = '';
   
     const hist = (state.cashback.history||[]).slice().sort((a,b)=>{
       const da = parseBRDate(a.date), db = parseBRDate(b.date);
       return (db?.getTime()||0) - (da?.getTime()||0);
     });
   
     hist.forEach(h=>{
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
    if (Number(state.cashback.balance||0) <= 0){
      alert('Você não tem cashback disponível.');
      return;
    }
    // Redireciona para o marketplace para usar o cashback
    window.location.href = './marketplace.html';
  }
   function exportCashbackCSV(){
     const lines = [
       ['Data','Origem','Descrição','Valor'].join(';'),
       ...(state.cashback.history||[]).map(h => [h.date, h.origin, h.desc, String(h.value).replace('.',',')].join(';'))
     ];
     downloadText('cashback_profissional.csv', lines.join('\n'));
   }
   
   /* =========================
      INIT
      ========================= */
   window.addEventListener('DOMContentLoaded', () => {
     loadLS();
   
     bindNavClicks();
     cloneMenuToMobile();
     bindRipple();
   
     document.getElementById('agendaFilter')?.addEventListener('input', ()=>{
       renderStudents();
       renderAgendaList();
     });
   
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
   
   window.todayISO = todayISO;