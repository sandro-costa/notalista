/* =====================================================
   NotaLista — app.js (demo funcional, tudo local)
   Lista, listas múltiplas, histórico e preços em localStorage.
   ===================================================== */
(function(){
'use strict';

/* ---------- estado ---------- */
var LS='notalista-v1';
var state={
  user:null, house:null,
  lists:[], activeList:null, history:[], prices:{}, alerts:[]
};
function load(){
  try{var raw=localStorage.getItem(LS);if(raw)state=Object.assign(state,JSON.parse(raw));}catch(e){}
}
function save(){localStorage.setItem(LS,JSON.stringify(state));}
function $(id){return document.getElementById(id);}
function brl(v){return 'R$ '+(+v).toFixed(2).replace('.',',');}
function today(){return new Date().toISOString().slice(0,10);}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ---------- onboarding ---------- */
function ensureUser(){
  if(state.user){return true;}
  $('onboarding').hidden=false;
  return false;
}
$('obGo').addEventListener('click',function(){
  var n=$('obName').value.trim();
  if(!n){$('obName').focus();return;}
  state.user=n;
  state.house=state.house||('NL-'+Math.random().toString(36).slice(2,6).toUpperCase());
  save();initApp();
});
$('obName').addEventListener('keydown',function(e){if(e.key==='Enter')$('obGo').click();});
$('obJoinGo').addEventListener('click',function(){
  var c=$('obCode').value.trim().toUpperCase();
  if(c.length<4){$('obCode').focus();return;}
  var n=$('obName').value.trim()||'Convidado';
  state.user=n;state.house=c;save();initApp();
});

/* ---------- init ---------- */
function initApp(){
  $('onboarding').hidden=true;
  $('appRoot').hidden=false;
  $('userAvatar').textContent=(state.user||'?').charAt(0).toUpperCase();
  $('houseBadge').textContent=state.house||'residência';
  if(!state.lists.length){
    state.lists=[{id:'l1',name:'Lista do mês',items:seedItems()}];
    state.activeList='l1';
  }
  renderAll();save();
}

function seedItems(){
  return [
    {id:iid(),name:'Arroz tipo 1, 5 kg',cat:'MERCADO',price:24.90,done:true},
    {id:iid(),name:'Frango inteiro',cat:'AÇOUGUE',price:13.90,done:false},
    {id:iid(),name:'Detergente neutro',cat:'LIMPEZA',price:2.49,done:false},
    {id:iid(),name:'Banana prata',cat:'HORTIFRUTI',price:7.90,done:false},
    {id:iid(),name:'Pão francês',cat:'PADARIA',price:18.90,done:false}
  ];
}
var _id=0;function iid(){return 'i'+Date.now().toString(36)+(_id++);}
function currentList(){
  return state.lists.find(function(l){return l.id===state.activeList})||state.lists[0];
}

/* ---------- render ---------- */
function renderAll(){renderBuy();renderLists();renderHistory();renderPrices();renderHeader();}

function renderHeader(){
  var l=currentList();if(!l)return;
  $('listTitle').textContent=l.name;
  var total=l.items.reduce(function(s,i){return s+(+i.price||0)},0);
  var pend=l.items.filter(function(i){return !i.done}).length;
  $('listSub').textContent=l.items.length+' itens · '+pend+' pendentes · '+brl(total);
}

function renderBuy(){
  var l=currentList();if(!l)return;
  var filter=document.querySelector('.chip.active');
  var f=filter?filter.dataset.filter:'all';
  var ul=$('buyList');ul.innerHTML='';
  var items=l.items.filter(function(i){
    return f==='all'||(f==='done'?i.done:!i.done);
  });
  items.forEach(function(i){ul.appendChild(buyRow(i));});
  $('buyEmpty').hidden=!(l.items.length===0);
}

function buyRow(i){
  var li=document.createElement('li');
  li.className='buy-item'+(i.done?' done':'');
  li.innerHTML=
    '<span class="chk" role="checkbox" aria-checked="'+i.done+'" title="Marcar">'+(i.done?'✓':'')+'</span>'+
    '<div class="info"><div class="name">'+esc(i.name)+(i.cat?' <span class="cat-tag">'+esc(i.cat)+'</span>':'')+'</div>'+
    '<div class="meta">'+(i.note||'adicionado pela nota')+'</div></div>'+
    '<span class="price">'+brl(i.price)+'</span>'+
    '<button class="del" title="Remover">✕</button>';
  li.querySelector('.chk').addEventListener('click',function(){
    i.done=!i.done;save();renderBuy();renderHeader();
  });
  li.querySelector('.del').addEventListener('click',function(){
    li.classList.add('removing');
    setTimeout(function(){
      var l=currentList();
      l.items=l.items.filter(function(x){return x.id!==i.id});
      save();renderAll();
    },280);
  });
  return li;
}

/* filtros */
document.querySelectorAll('.chip').forEach(function(c){
  c.addEventListener('click',function(){
    document.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active')});
    c.classList.add('active');renderBuy();
  });
});

/* ---------- listas ---------- */
function renderLists(){
  var ul=$('listsUl');ul.innerHTML='';
  state.lists.forEach(function(l){
    var li=document.createElement('li');
    li.className='list-card'+(l.id===state.activeList?' active':'');
    var pend=l.items.filter(function(i){return !i.done}).length;
    li.innerHTML='<div><strong>'+esc(l.name)+'</strong><small>'+
      l.items.length+' itens · '+pend+' pendentes</small></div>'+
      (l.id===state.activeList?'<span class="pill-mini">✓ em uso</span>':'<span class="pill-mini">abrir →</span>');
    li.addEventListener('click',function(){
      state.activeList=l.id;save();renderAll();
      switchTab('buy');
    });
    ul.appendChild(li);
  });
}
$('btnNewList').addEventListener('click',function(){
  var n=prompt('Nome da nova lista:','Lista nova');
  if(!n)return;
  var l={id:iid(),name:n,items:[]};
  state.lists.push(l);state.activeList=l.id;save();renderAll();switchTab('buy');
});

/* ---------- histórico ---------- */
function renderHistory(){
  var ul=$('historyUl');ul.innerHTML='';
  $('stPurchases').textContent=state.history.length;
  $('stTotal').textContent=brl(state.history.reduce(function(s,h){return s+h.total},0));
  $('stItems').textContent=state.history.reduce(function(s,h){return s+h.items.length},0);
  $('histEmpty').hidden=state.history.length>0;
  state.history.forEach(function(h){
    var li=document.createElement('li');
    li.className='hist-card';
    var names=h.items.map(function(i){return i.name}).join(', ');
    li.innerHTML='<div class="row"><strong>'+esc(h.store)+'</strong><time>'+fmtDate(h.date)+'</time></div>'+
      '<div class="row"><span class="items">'+h.items.length+' itens: '+esc(names)+'</span>'+
      '<span class="total">'+brl(h.total)+'</span></div>';
    ul.appendChild(li);
  });
}
function fmtDate(d){
  var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0];
}

/* ---------- preços ---------- */
function renderPrices(){
  var ul=$('pricesUl');ul.innerHTML='';
  var keys=Object.keys(state.prices);
  $('pricesEmpty').hidden=keys.length>0;
  keys.forEach(function(k){
    var arr=state.prices[k];var avg=arr.reduce(function(s,v){return s+v},0)/arr.length;
    var last=arr[arr.length-1];
    var diff=(last-avg)/avg*100;
    var li=document.createElement('li');
    li.className='price-card';
    var pts=arr.map(function(v,idx){
      return (idx/(arr.length-1||1))*280+','+(60-((v-Math.min.apply(null,arr))/(Math.max.apply(null,arr)-Math.min.apply(null,arr)||1))*50);
    }).join(' ');
    li.innerHTML='<div class="row"><div><strong>'+esc(k)+'</strong><div class="avg">média '+brl(avg)+'</div></div>'+
      '<span class="'+(diff>3?'delta-up':'delta-down')+'">'+(diff>0?'▲':'▼')+' '+Math.abs(diff).toFixed(0)+'%</span></div>'+
      '<svg viewBox="0 0 300 70" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="#E55A3F" stroke-width="3" stroke-linecap="round"/></svg>';
    ul.appendChild(li);
  });
  renderAlerts();
}
function renderAlerts(){
  var ul=$('alertsUl');ul.innerHTML='';
  var any=false;
  Object.keys(state.prices).forEach(function(k){
    var arr=state.prices[k];var avg=arr.reduce(function(s,v){return s+v},0)/arr.length;
    var last=arr[arr.length-1];
    if(last>avg*1.05){
      any=true;
      var li=document.createElement('li');
      li.textContent=k+' está '+Math.round((last-avg)/avg*100)+'% acima da sua média ('+brl(avg)+').';
      ul.appendChild(li);
    }
  });
  if(!any)ul.innerHTML='<li class="muted">Nenhum alerta por enquanto.</li>';
}

/* ---------- scan simulado ---------- */
var pendingPurchase=null;
var DEMO_NOTES=[
  {store:'Supermercado Boa Vida',date:today(),items:[
    {name:'Café torrado e moído, 500 g',cat:'MERCADO',price:21.90},
    {name:'Leite integral, cx 12 un',cat:'MERCADO',price:5.49},
    {name:'Sabão em pó, 1 kg',cat:'LIMPEZA',price:12.30},
    {name:'Tomate',cat:'HORTIFRUTI',price:8.90},
    {name:'Pão francês',cat:'PADARIA',price:18.90}
  ]},
  {store:'Atacarejo Bom Preço',date:today(),items:[
    {name:'Arroz tipo 1, 5 kg',cat:'MERCADO',price:23.90},
    {name:'Óleo de soja, 900 ml',cat:'MERCADO',price:7.29},
    {name:'Frango inteiro',cat:'AÇOUGUE',price:12.90},
    {name:'Detergente neutro',cat:'LIMPEZA',price:2.29}
  ]},
  {store:'Farmácia Central',date:today(),items:[
    {name:'Protetor solar FPS 50',cat:'FARMÁCIA',price:39.90},
    {name:'Sabonete facial',cat:'FARMÁCIA',price:14.50},
    {name:'Vitamina C 1 g, 20 cp',cat:'FARMÁCIA',price:22.90}
  ]}
];
function openScan(){
  pendingPurchase=null;
  $('scanResult').hidden=true;
  $('scanItems').innerHTML='';
  $('scanConfirm').hidden=true;
  $('scanSim').hidden=false;
  $('scanFrame').hidden=false;
  $('scanModal').hidden=false;
}
$('tabScan').addEventListener('click',openScan);
$('scanClose').addEventListener('click',function(){$('scanModal').hidden=true;});
$('scanSim').addEventListener('click',function(){
  var note=DEMO_NOTES[Math.floor(Math.random()*DEMO_NOTES.length)];
  pendingPurchase=JSON.parse(JSON.stringify(note));
  $('scanFrame').hidden=true;
  $('scanResult').hidden=false;
  $('scanStore').innerHTML='<span>'+esc(note.store)+'</span><time>'+fmtDate(note.date)+'</time>';
  var box=$('scanItems');box.innerHTML='';
  note.items.forEach(function(i){
    var d=document.createElement('div');
    d.className='panel-row';
    d.innerHTML='<span>'+esc(i.name)+'</span><em>'+brl(i.price)+'</em>';
    box.appendChild(d);
  });
  $('scanSim').hidden=true;
  $('scanConfirm').hidden=false;
});
$('scanConfirm').addEventListener('click',function(){
  if(!pendingPurchase)return;
  // registra histórico
  var total=pendingPurchase.items.reduce(function(s,i){return s+i.price},0);
  state.history.unshift({store:pendingPurchase.store,date:pendingPurchase.date,items:pendingPurchase.items,total:total});
  // registra preços
  pendingPurchase.items.forEach(function(i){
    (state.prices[i.name]=state.prices[i.name]||[]).push(i.price);
  });
  // mescla na lista ativa (itens novos entram)
  var l=currentList();
  pendingPurchase.items.forEach(function(i){
    var exists=l.items.some(function(x){return x.name===i.name});
    if(!exists)l.items.push({id:iid(),name:i.name,cat:i.cat,price:i.price,done:false,note:'da nota '+pendingPurchase.store});
  });
  toast('Nota lida: '+pendingPurchase.items.length+' itens adicionados ✓');
  pendingPurchase=null;
  $('scanModal').hidden=true;
  save();renderAll();switchTab('buy');
});

/* ---------- modal novo item ---------- */
$('btnAddItem').addEventListener('click',function(){
  $('itemModal').hidden=false;$('itName').focus();
});
$('itCancel').addEventListener('click',function(){$('itemModal').hidden=true;});
$('itSave').addEventListener('click',function(){
  var name=$('itName').value.trim();
  var price=parseFloat($('itPrice').value.replace(',','.'))||0;
  if(!name){$('itName').focus();return;}
  var l=currentList();
  l.items.push({id:iid(),name:name,cat:$('itCat').value,price:price,done:false,note:'manual'});
  $('itName').value='';$('itPrice').value='';
  $('itemModal').hidden=true;
  save();renderAll();
  toast('Item adicionado ✓');
});
$('itName').addEventListener('keydown',function(e){if(e.key==='Enter')$('itSave').click();});

/* ---------- tabs ---------- */
function switchTab(name){
  document.querySelectorAll('.tab').forEach(function(t){t.hidden=(t.id!=='tab-'+name)});
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){
    b.classList.toggle('active',b.dataset.tab===name);
  });
}
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){
  b.addEventListener('click',function(){switchTab(b.dataset.tab)});
});

/* ---------- toast ---------- */
var toastTimer=null;
function toast(msg){
  var t=$('toast');t.textContent=msg;t.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.hidden=true},2600);
}

/* ---------- boot ---------- */
load();
if(!ensureUser()){$('onboarding').hidden=false;}
else{initApp();}
})();
