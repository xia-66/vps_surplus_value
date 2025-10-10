/* ======================
   主脚本：UI + 计算 + 自有 API
   纯前端（多文件）
   ====================== */

// 统一选择器工具：既兼容 $('#id') / '.class' / 复杂选择器，也兼容传入裸 id（如 'currency'）
function $(sel){
  if(typeof sel !== 'string') return sel;
  const s = sel.trim();
  if(s.startsWith('#') || s.startsWith('.') || s.includes(' ') || s.includes('[')){
    return document.querySelector(s);
  }
  return document.getElementById(s);
}

// ----- 启动 -----
document.addEventListener('DOMContentLoaded', () => {
  try {
    if(window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.zh){
      flatpickr.localize(flatpickr.l10ns.zh);
    }
  } catch(_) {}
  initPickers();
  bindUI();
  initTheme();
  fetchExchangeRate(); // 首次加载默认币种
  loadFromUrlParams();
});

/* --------------------------
   日期控件
   -------------------------- */
function initPickers(){
  const tx = $('#transactionDate');
  const ex = $('#expiryDate');
  const today = new Date();
  if(window.flatpickr){
    flatpickr(tx, { dateFormat: "Y-m-d", locale: "zh", defaultDate: today, onChange: generateShareLink });
    flatpickr(ex, { dateFormat: "Y-m-d", locale: "zh", minDate: "today", onChange: generateShareLink });
  } else {
    // 降级：使用原生日期输入
    if(tx){ tx.type = 'date'; tx.valueAsDate = today; tx.addEventListener('change', generateShareLink); }
    if(ex){
      ex.type = 'date';
      // min=今天
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      ex.min = `${yyyy}-${mm}-${dd}`;
      ex.addEventListener('change', generateShareLink);
    }
  }
}

/* --------------------------
   主题（暗黑/浅色）
   - 支持 system preference
   - 持久化 localStorage
   -------------------------- */
const THEME_KEY = 'vps.theme';
let _themeMem = null;
function safeStorageGet(k){
  try { return window.localStorage ? localStorage.getItem(k) : _themeMem; } catch(_) { return _themeMem; }
}
function safeStorageSet(k,v){
  try { if(window.localStorage) localStorage.setItem(k,v); else _themeMem = v; } catch(_) { _themeMem = v; }
}
function initTheme(){
  const htmlRoot = document.documentElement;
  const saved = safeStorageGet(THEME_KEY);
  if(saved){
    htmlRoot.setAttribute('data-theme', saved);
  } else {
    // 尊重系统偏好
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(prefersDark) htmlRoot.setAttribute('data-theme','dark');
  }
  updateThemeIcon();
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = htmlRoot.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    htmlRoot.setAttribute('data-theme', cur);
    safeStorageSet(THEME_KEY, cur);
    updateThemeIcon();
    showNotification(`已切换到 ${cur === 'dark' ? '暗黑' : '浅色'} 模式`, 'info');
  });
}
function updateThemeIcon(){
  const icon = document.querySelector('#themeToggle i');
  const theme = document.documentElement.getAttribute('data-theme');
  if(theme === 'dark'){
    icon.className = 'fas fa-moon';
  } else {
    icon.className = 'fas fa-sun';
  }
}

/* --------------------------
   事件绑定
   -------------------------- */
function bindUI(){
  $('#currency').addEventListener('change', fetchExchangeRate);
  $('#calculateBtn').addEventListener('click', onCalculate);
  $('#clearBtn').addEventListener('click', clearForm);
  $('#generateLinkBtn').addEventListener('click', generateShareLink);
  $('#copyLinkBtn').addEventListener('click', copyShareLink);
  $('#helpLink').addEventListener('click', (e) => { e.preventDefault(); openHelp(); });
  $('#closeHelp')?.addEventListener('click', closeHelp);

  // 自动更新分享链接
  attachAutoShare();

  // 阻止负数输入：金额/汇率类
  sanitizeNonNegative('amount', '续费金额');
  sanitizeNonNegative('bidAmount', '出价金额');
  sanitizeNonNegative('customRate', '自定汇率');

  // 周期标签（展示预设时间：月/季/半年/年/...）
  $('#cycle').addEventListener('change', updateCyclePresetLabel);
  updateCyclePresetLabel();
}

function attachAutoShare(){
  const ids = ['currency','customRate','amount','cycle','bidAmount','transactionDate','expiryDate'];
  ids.forEach(id => {
    const el = $(id);
    if(!el) return;
    ['input','change'].forEach(ev => el.addEventListener(ev, generateShareLink));
  });
}

function sanitizeNonNegative(id, label){
  const el = $(id);
  if(!el) return;
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    if(!isNaN(v) && v < 0){
      el.value = '';
      showNotification(`${label}不可为负数`, 'error');
      generateShareLink();
    }
  });
}

/* --------------------------
   自有 API 获取汇率（无 APIKEY）
   URL 示例：
   https://api.iloli.im/exchange_rate/v2/index.php/latest/USD
   解析：response.conversion_rates.CNY
   这是自建的API反代，限制单IP请求10秒内不超过10次
   -------------------------- */
const EXCHANGE_API_BASE = 'https://api.iloli.im/exchange_rate/v2/index.php/latest';

function toLocalRelative(utcStr){
  try{
    const d = new Date(utcStr);
    if(isNaN(d)) return utcStr || '—';
    const now = Date.now();
    const diffMs = now - d.getTime();
    const mins = Math.floor(diffMs/60000);
    if(mins < 1) return '刚刚更新';
    if(mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins/60);
    if(hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours/24);
    return `${days} 天前`;
  }catch{ return utcStr || '—'; }
}

async function fetchExchangeRate(){
  const cur = $('#currency').value || 'USD';
  setRateMeta('正在获取汇率...');
  try{
    const resp = await fetch(`${EXCHANGE_API_BASE}/${encodeURIComponent(cur)}`, { cache: 'no-store' });
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    // 确保返回结构中存在 conversion_rates.CNY
    const rate = data && data.conversion_rates && data.conversion_rates.CNY;
    if(!rate) throw new Error('API 返回缺少 conversion_rates.CNY');
    $('#customRate').value = Number(rate).toFixed(4);
    // 仅传入动态内容，避免与 setRateMeta 的前缀重复
    const rel = toLocalRelative(data.time_last_update_utc ?? '');
    setRateMeta(`（${cur} → CNY）: ${Number(rate).toFixed(4)} （更新：${rel}）`);
  } catch(err){
    console.warn('fetchExchangeRate fail', err);
    setRateMeta('自动获取汇率失败：请手动输入或重试');
    showNotification('无法访问汇率 API，已回退到手动输入模式', 'error');
  }
}

function setRateMeta(txt){
  const el = $('#rateMeta');
  if(el) el.innerText = `汇率：${txt}`;
}

/* --------------------------
   计算逻辑（与之前逻辑兼容）
   - amount: 外币续费金额（外币单位）
   - customRate: 用于换算成人民币（RMB）
   - cycle: 续费周期（月）
   - remainingDays: 到期日与交易日差（天）
   计算思路：
     localAmount = amount (外币) * customRate -> 得到人民币价（周期内）
     annualPrice = localAmount * (12 / cycle)
     dailyValue = annualPrice / 365
     remainingValue = dailyValue * remainingDays
     premium = bidAmount - remainingValue
   -------------------------- */
const MAX_INPUT = 1e9;     // 单项输入上限
const MAX_RESULT = 1e12;   // 结果上限（超过则认为不合理）
function isStrictNumberString(s){ return /^\d+(\.\d+)?$/.test(String(s).trim()); }
function fmtMoney(n, d=2){
  if(!Number.isFinite(n)) throw new Error('非法数值');
  if(Math.abs(n) > MAX_RESULT) throw new Error('数值过大');
  return n.toFixed(d);
}

function onCalculate(){
  const customRateStr = $('#customRate').value;
  const amountStr = $('#amount').value;
  const cycle = parseInt($('#cycle').value, 10);
  const expiryDate = $('#expiryDate').value;
  const transactionDate = $('#transactionDate').value;
  const bidAmountStr = $('#bidAmount').value;

  if(!isStrictNumberString(customRateStr) || !isStrictNumberString(amountStr) || !expiryDate || !transactionDate || !isStrictNumberString(bidAmountStr)){
    showNotification('请输入纯数字（可带小数点），请勿包含其他字符。', 'error');
    return;
  }

  const customRate = parseFloat(customRateStr);
  const amount = parseFloat(amountStr);
  const bidAmount = parseFloat(bidAmountStr);

  if([customRate, amount, bidAmount].some(v => !Number.isFinite(v))){
    showNotification('请完整填写：汇率、续费金额、日期、出价。', 'error');
    return;
  }
  if(customRate <= 0){ showNotification('自定汇率必须大于 0', 'error'); return; }
  if(amount < 0){ showNotification('续费金额不可为负数', 'error'); return; }
  if(bidAmount < 0){ showNotification('出价金额不可为负数', 'error'); return; }
  if(amount > MAX_INPUT || bidAmount > MAX_INPUT || customRate > MAX_INPUT){
    showNotification('输入的数值过大，请检查（上限约 1e9）', 'error');
    return;
  }
  if(!cycle || cycle <= 0){ showNotification('续费周期不合法', 'error'); return; }

  const btn = $('#calculateBtn');
  btn.disabled = true; const prevText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 计算中...';

  try{
  const remainingDays = calculateRemainingDays(expiryDate, transactionDate);
  if(remainingDays <= 0){
    showNotification('到期日期必须晚于交易日期且至少相差 1 天', 'error');
    return;  
  }

  const localAmount = amount * customRate; // 人民币（该周期）
  const annualPrice = localAmount * (12 / cycle);
  const dailyValue = annualPrice / 365;
  const remainingValue = dailyValue * remainingDays;
  const premiumValue = bidAmount - remainingValue;

  const result = {
    remainingValue: fmtMoney(remainingValue, 2),
    premiumValue: fmtMoney(premiumValue, 2)
  };

  const data = {
    price: fmtMoney(localAmount, 2),
    annualPrice: fmtMoney(annualPrice, 2),
    time: remainingDays,
    customRate: Number(customRate).toFixed(4),
    amount: fmtMoney(amount, 2),
    cycle,
    expiryDate,
    transactionDate,
    bidAmount: fmtMoney(bidAmount, 2)
  };

  updateResults(result, data);
  showNotification('计算完成', 'success');

  // 自动生成分享链接（便于复制）
  generateShareLink();
  } catch(err){
    console.warn('calculate failed', err);
    showNotification('计算失败：检测到异常数值或输入不合法', 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = prevText;
  }
}

function calculateRemainingDays(expiryDate, transactionDate){
  const e = new Date(expiryDate); e.setHours(0,0,0,0);
  const t = new Date(transactionDate); t.setHours(0,0,0,0);
  if(e <= t) return 0;
  return Math.floor((e - t) / (1000*60*60*24));
}

function setText(id, text){ const el = $(id); if(el) el.innerText = text; }
function updateCyclePresetLabel(){
  const c = $('#cycle')?.value || '1';
  setText('cyclePresetLabel', `当前周期：${cycleLabel(c)}`);
}
function cycleLabel(cycle){
  const m = Number(cycle);
  if(m === 1) return '月';
  if(m === 3) return '季';
  if(m === 6) return '半年';
  if(m === 12) return '年';
  if(m === 24) return '两年';
  if(m === 36) return '三年';
  return `${m}月`;
}

function updateResults(result, data){
  setText('resultDate', data.transactionDate);
  setText('resultExpiry', data.expiryDate);
  setText('resultForeignRate', Number(data.customRate).toFixed(4));
  setText('resultCyclePrice', `${data.price} RMB / ${cycleLabel(data.cycle)}`);
  setText('resultAnnualPrice', `${data.annualPrice} RMB / 年`);
  setText('resultDays', String(data.time));
  setText('resultValue', `${result.remainingValue} 元`);
  setText('premiumValue', `${result.premiumValue} 元`);
  // 滚动到结果（移动端友好）
  const resultCard = $('#calcResult');
  if(resultCard && resultCard.scrollIntoView) resultCard.scrollIntoView({ behavior: 'smooth' });
}

/* --------------------------
   分享 / 链接导出
   - 把表单输入编码到查询参数
   -------------------------- */
function generateShareLink(){
  const params = {
    currency: $('#currency').value,
    customRate: $('#customRate').value,
    amount: $('#amount').value,
    cycle: $('#cycle').value,
    bidAmount: $('#bidAmount').value,
    expiryDate: $('#expiryDate').value,
    transactionDate: $('#transactionDate').value
  };
  const q = Object.keys(params).filter(k => params[k] !== undefined && String(params[k]).length > 0)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const shareUrl = `${location.origin}${location.pathname}${q ? ('?' + q) : ''}#shared`;
  $('#shareLink').value = shareUrl;
  return shareUrl;
}

function copyShareLink(){
  const link = $('#shareLink').value;
  if(!link){ showNotification('请先生成链接', 'error'); return; }
  navigator.clipboard?.writeText(link).then(()=> {
    showNotification('链接已复制到剪贴板', 'success');
  }).catch(()=> {
    $('#shareLink').select();
    document.execCommand('copy');
    showNotification('链接已复制（备用方法）', 'success');
  });
}

function safeDecode(v){ try { return decodeURIComponent(v); } catch(e){ console.warn('Bad URI component', v); showNotification('链接参数包含非法编码，已忽略异常字段', 'error'); return null; } }
function loadFromUrlParams(){
  const qp = new URLSearchParams(location.search);
  if(![...qp.keys()].length) return;
  const mapping = {
    currency: 'currency',
    customRate: 'customRate',
    amount: 'amount',
    cycle: 'cycle',
    bidAmount: 'bidAmount',
    expiryDate: 'expiryDate',
    transactionDate: 'transactionDate'
  };
  let any = false;
  for(const [k, id] of Object.entries(mapping)){
    if(qp.has(k) && $(id)){
      const val = safeDecode(qp.get(k));
      if(val !== null){ $(id).value = val; any = true; }
    }
  }
  if(any){
    generateShareLink();
    // 若能自动计算则执行
    const canAuto = qp.has('amount') && qp.has('customRate') && qp.has('expiryDate') && qp.has('transactionDate') && qp.has('bidAmount');
    if(canAuto) onCalculate();
    else showNotification('已从链接加载数据', 'info');
  }
}

/* --------------------------
   清空表单
   -------------------------- */
function clearForm(){
  ['customRate','amount','bidAmount','expiryDate','transactionDate','shareLink'].forEach(id => { if($(id)) $(id).value = ''; });
  // 默认将交易日期重置为今天，便于重新计算
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  if($('#transactionDate')) $('#transactionDate').value = `${yyyy}-${mm}-${dd}`;
  fetchExchangeRate();
  // 重置结果
  setText('resultDate','—');
  setText('resultExpiry','—');
  setText('resultForeignRate','—');
  setText('resultCyclePrice','—');
  setText('resultAnnualPrice','—');
  setText('resultDays','0');
  setText('resultValue','—');
  setText('premiumValue','—');
  showNotification('表单已清空', 'success');
}

/* --------------------------
   帮助弹窗
   -------------------------- */
let _prevFocus = null; let _trapHandler = null;
let _overlayClick = null;
function getFocusable(container){
  return container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
}
function openHelp(){
  const modal = $('#helpModal');
  if(!modal) return;
  _prevFocus = document.activeElement;
  modal.setAttribute('aria-hidden','false');
  const focusables = getFocusable(modal);
  const first = focusables[0]; const last = focusables[focusables.length-1];
  first?.focus();
  _trapHandler = (e) => {
    if(e.key === 'Tab'){
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    if(e.key === 'Escape') closeHelp();
  };
  modal.addEventListener('keydown', _trapHandler);
  _overlayClick = (e) => { if(e.target === modal) closeHelp(); };
  modal.addEventListener('click', _overlayClick);
}
function closeHelp(){
  const modal = $('#helpModal');
  if(!modal) return;
  modal.setAttribute('aria-hidden','true');
  if(_trapHandler){ modal.removeEventListener('keydown', _trapHandler); _trapHandler = null; }
  if(_overlayClick){ modal.removeEventListener('click', _overlayClick); _overlayClick = null; }
  _prevFocus?.focus();
}

/* --------------------------
   通知（Toast）
   -------------------------- */
function showNotification(msg, type='info'){
  const n = document.createElement('div');
  n.className = `toast ${type}`;
  n.textContent = msg;
  document.body.appendChild(n);
  requestAnimationFrame(()=> n.classList.add('show'));
  setTimeout(()=> { n.classList.remove('show'); setTimeout(()=> n.remove(), 220); }, 2800);
}
