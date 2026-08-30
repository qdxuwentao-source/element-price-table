
(function(){
'use strict';
const CATS={
  alkali:{name:'碱金属',color:'#ff6b6b'},
  alkaline:{name:'碱土金属',color:'#ffa94d'},
  transition:{name:'过渡金属',color:'#ffd43b'},
  post:{name:'后过渡金属',color:'#8ce99a'},
  metalloid:{name:'类金属',color:'#63e6be'},
  nonmetal:{name:'非金属',color:'#4dabf7'},
  halogen:{name:'卤素',color:'#748ffc'},
  noble:{name:'稀有气体',color:'#b197fc'},
  lanthanide:{name:'镧系金属',color:'#f783ac'},
  actinide:{name:'锕系金属',color:'#da77f2'}
};
const NO_PRICE_NOTE={
  Tc:'人工合成放射性元素，无大宗商品市场',
  Pm:'人工合成放射性元素，无公开市场报价',
  Tm:'氧化铥市场不活跃，无权威日度报价',
  Yb:'氧化镱市场不活跃，无权威日度报价',
  Lu:'氧化镥市场不活跃，无权威日度报价',
  Tl:'铊为管制化学品，无公开现货报价',
  Po:'天然放射性极强，无商业市场',
  At:'极稀有放射性元素，无商业市场',
  Rn:'放射性气体，无商业市场',
  Fr:'极稀有放射性元素，无商业市场',
  Ra:'放射性元素，无商业市场',
  Ac:'放射性元素，无商业市场',
  Th:'放射性元素，无大宗商品市场',
  Pa:'极稀有放射性元素，无商业市场'
};
function rgba(hex,a){
  const n=parseInt(hex.slice(1),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function fmtNum(v){
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
function shortPrice(p){
  if(!p) return '—';
  const v=p.v, per=p.unit.replace('元/','').replace('美元/','');
  if(v>=10000) return '≈'+(v/10000).toFixed(1)+'万/'+per;
  if(v>=1000) return '≈'+(v/1000).toFixed(2).replace(/\.?0+$/,'')+'千/'+per;
  if(v>=100) return '≈'+Math.round(v)+'/'+per;
  return '≈'+v+'/'+per;
}
function longPrice(p){
  if(!p) return null;
  const v=p.v;
  if(v>=1000) return fmtNum(v)+' '+p.unit;
  return v+' '+p.unit;
}
let cells=[], cellNodes=[];
const table=document.getElementById('table');
function buildCells(){
  cells=[];
  ELEMENTS.forEach(function(e){
    if(e.r && e.c) cells.push({el:e,r:e.r,c:e.c,main:true,period:e.r});
    if(e.fb) cells.push({el:e,r:e.fb[0],c:e.fb[1],period:(e.fb[0]===9?6:7)});
  });
}
function render(){
  table.innerHTML='';
  cellNodes=[];
  cells.forEach(function(cell){
    const el=cell.el, p=PRICES[el.sym]||null;
    const cat=CATS[el.cat]||{name:el.cat,color:'#888'};
    const d=document.createElement('div');
    d.className='cell '+el.cat+(p&&p.live?' live':'');
    d.style.gridRow=cell.r;
    d.style.gridColumn=cell.c;
    d.style.background=rgba(cat.color,0.13);
    d.style.borderColor=rgba(cat.color,0.35);
    d.setAttribute('data-sym',el.sym);
    d.setAttribute('data-name',el.name);
    d.setAttribute('data-num',el.n);
    d.setAttribute('data-cat',el.cat);
    d.innerHTML='<span class="num">'+el.n+'</span>'+
      '<span class="sym">'+el.sym+'</span>'+
      '<span class="nm">'+el.name+'</span>'+
      '<span class="pr'+(p?'':' na')+'">'+shortPrice(p)+'</span>'+
      (p&&p.live?'<span class="live-dot"></span>':'');
    d.addEventListener('mouseenter',function(ev){showTip(ev,cell,p);});
    d.addEventListener('mousemove',moveTip);
    d.addEventListener('mouseleave',hideTip);
    table.appendChild(d);
    cellNodes.push(d);
  });
  ['镧系','锕系'].forEach(function(label){
    const L=document.createElement('div');
    L.className='f-label';
    L.style.gridRow=(label==='镧系'?9:10);
    L.style.gridColumn='1/3';
    L.textContent=label;
    table.appendChild(L);
  });
}
const tip=document.getElementById('tooltip');
function tipHTML(el,period,p){
  const cat=CATS[el.cat]||{name:el.cat};
  let h='<div class="tt-head"><span class="tt-sym" style="color:'+cat.color+'">'+el.sym+'</span>'+
     '<span class="tt-name">'+el.name+'</span><span class="tt-num">第'+period+'周期 · '+cat.name+' · 原子量 '+el.mass+'</span></div>';
  if(p){
    h+='<div class="tt-price" style="color:'+(p.live?'#7ce38b':'#ffd43b')+'">'+longPrice(p)+'</div>';
    h+='<div class="tt-product">'+p.product+'</div>';
    h+='<div class="tt-row"><span>数据日期：'+p.date+'</span><span>来源：'+p.src+'</span></div>';
    if(p.chg!==null&&p.chg!==undefined&&!p.live){
      const cls=p.chg>0?'up':(p.chg<0?'down':'');
      const arrow=p.chg>0?'▲':(p.chg<0?'▼':'▬');
      h+='<div class="tt-row"><span>较前日：</span><span class="tt-chg '+cls+'">'+arrow+' '+p.chg+' '+p.unit+'</span></div>';
    }
    if(p.note) h+='<div class="tt-note">注：'+p.note+'</div>';
    if(!p.live) h+='<div class="tt-meta">参考价 · 非实时 · 实际交易请以交易所实时报价为准</div>';
    else h+='<div class="tt-meta">实时联网行情 · 仅供参考</div>';
  }else{
    h+='<div class="tt-no">暂无公开现货报价</div>';
    h+='<div class="tt-note">'+ (NO_PRICE_NOTE[el.sym]||'该元素无活跃的大宗商品/现货交易市场') +'</div>';
  }
  return h;
}
function showTip(ev,cell,p){
  const el=cell.el, period=cell.period;
  tip.innerHTML=tipHTML(el,period,p);
  tip.classList.add('show');
  moveTip(ev);
}
function moveTip(ev){
  const r=tip.getBoundingClientRect();
  const gap=14;
  let x=ev.clientX+gap, y=ev.clientY+gap;
  if(x+r.width>window.innerWidth-8) x=ev.clientX-r.width-gap;
  if(y+r.height>window.innerHeight-8) y=ev.clientY-r.height-gap;
  tip.style.left=x+'px'; tip.style.top=y+'px';
}
function hideTip(){ tip.classList.remove('show'); }

const search=document.getElementById('search');
let activeCat=null;
function applyFilter(){
  const q=search.value.trim().toLowerCase();
  let n=0;
  cellNodes.forEach(function(d){
    const sym=d.getAttribute('data-sym');
    const name=d.getAttribute('data-name');
    const num=d.getAttribute('data-num');
    const cat=d.getAttribute('data-cat');
    const hit=!q || sym.toLowerCase().indexOf(q)>=0 || name.indexOf(q)>=0 || String(num)===q;
    const catHit=!activeCat || cat===activeCat;
    d.classList.toggle('muted', !(hit&&catHit));
    d.classList.toggle('found', !!q&&hit);
    if(hit&&catHit) n++;
  });
  const count=document.getElementById('matchCount');
  if(count) count.textContent=q?('匹配 '+n+' 个元素'):'';
}
search.addEventListener('input',applyFilter);
document.querySelectorAll('.legend .lg').forEach(function(lg){
  lg.addEventListener('click',function(){
    const cat=lg.getAttribute('data-cat');
    activeCat=(activeCat===cat)?null:cat;
    document.querySelectorAll('.legend .lg').forEach(function(x){x.classList.remove('active');});
    if(activeCat){ lg.classList.add('active'); }
    applyFilter();
  });
});

const statusEl=document.getElementById('status');
function setStatus(txt,cls){
  statusEl.textContent=txt;
  statusEl.className=cls||'';
}
function withTimeout(promise,ms){
  return Promise.race([
    promise,
    new Promise(function(resolve,reject){ setTimeout(function(){ reject(new Error('timeout')); }, ms); })
  ]);
}
async function liveUpdate(){
  setStatus('正在联网获取实时贵金属价格…');
  const done=[];
  try{
    let cny=7.15;
    try{
      const r=await withTimeout(fetch('https://open.er-api.com/v6/latest/USD'),5000);
      const j=await r.json();
      if(j&&j.rates&&j.rates.CNY) cny=j.rates.CNY;
    }catch(e){}
    const map={XAU:{el:'Au',u:'元/克',f:function(p){return p*cny/31.1034768;},note:'美元/盎司按实时汇率折算；仅供参考'},
               XAG:{el:'Ag',u:'元/克',f:function(p){return p*cny/31.1034768;},note:'美元/盎司按实时汇率折算；仅供参考'},
               XPT:{el:'Pt',u:'元/克',f:function(p){return p*cny/31.1034768;},note:'美元/盎司按实时汇率折算；仅供参考'},
               XPD:{el:'Pd',u:'元/克',f:function(p){return p*cny/31.1034768;},note:'美元/盎司按实时汇率折算；仅供参考'},
               HG:{el:'Cu',u:'元/吨',f:function(p){return p*cny*2204.6226218;},note:'美元/磅按实时汇率折算；仅供参考'}};
    await Promise.all(Object.keys(map).map(function(s){
      return withTimeout(fetch('https://api.gold-api.com/price/'+s),5000)
        .then(function(r){return r.json();})
        .then(function(j){
          if(j&&typeof j.price==='number'){
            const cfg=map[s];
            const v=cfg.f(j.price);
            PRICES[cfg.el]={v:+v.toFixed(2),unit:cfg.u,product:'国际行情（实时联网）',date:'今日实时',src:'gold-api.com + er-api',chg:null,note:cfg.note,live:true};
            done.push(cfg.el);
          }
        })
        .catch(function(){});
    }));
  }catch(e){}
  if(done.length){
    setStatus('已联网更新：'+done.join('/')+'（实时） · 其余为内置参考价','live');
  }else{
    setStatus('联网获取失败，显示内置参考价（2026-08-28）','off');
  }
  render();
}
document.getElementById('refresh').addEventListener('click',function(ev){
  ev.target.disabled=true;
  liveUpdate().finally(function(){ev.target.disabled=false;});
});
buildCells();
render();
liveUpdate();
})();
