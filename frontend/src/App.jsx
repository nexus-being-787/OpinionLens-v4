import React, { useState, useEffect, useRef } from 'react';
import {
  Search, GitCompare, Lightbulb, Newspaper, Activity,
  CheckCircle, Zap, X, MessageSquare, Filter, Download,
  TrendingUp, TrendingDown, Minus, BarChart2, Brain,
  Shield, AlertOctagon, ChevronRight, Trophy, Star,
  ArrowRight, Flame
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RTooltip,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';
import { io } from 'socket.io-client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const socket = io('http://localhost:5000');

/* ─── DESIGN TOKENS ──────────────────────────────────────────────────────── */
const T = {
  bg:'#07080f', s1:'#0d0f1c', s2:'#12152b', s3:'#181c35',
  border:'#1e2240', border2:'#2d3366',
  indigo:'#6366f1', cyan:'#06b6d4', rose:'#f43f5e',
  amber:'#f59e0b', green:'#10b981', purple:'#a855f7',
  text:'#e8eaf6', muted:'#525880', muted2:'#7c82a8',
  font:"'Outfit',sans-serif", mono:"'JetBrains Mono',monospace",
};

const EMOTION_COLORS = {
  admiration:'#f59e0b',amusement:'#10b981',approval:'#06b6d4',caring:'#ec4899',
  desire:'#8b5cf6',excitement:'#f97316',gratitude:'#14b8a6',joy:'#facc15',
  love:'#f43f5e',optimism:'#84cc16',anger:'#ef4444',annoyance:'#f97316',
  disappointment:'#6366f1',disapproval:'#dc2626',disgust:'#65a30d',fear:'#7c3aed',
  sadness:'#3b82f6',confusion:'#94a3b8',curiosity:'#67e8f9',surprise:'#fb923c',
  neutral:'#6b7280',nervousness:'#fbbf24',relief:'#38bdf8',pride:'#a855f7',
  grief:'#475569',remorse:'#64748b',embarrassment:'#db2777',realization:'#a3e635',
};

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:#07080f;color:#e8eaf6;font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden}
  body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
    background-image:linear-gradient(rgba(99,102,241,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.022) 1px,transparent 1px);
    background-size:56px 56px}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:#07080f}
  ::-webkit-scrollbar-thumb{background:#2d3366;border-radius:4px}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.25}}
  @keyframes shine{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes countUp{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
  .fu{animation:fadeUp .5s ease both}
  .fu1{animation:fadeUp .5s ease .08s both}
  .fu2{animation:fadeUp .5s ease .16s both}
  .fu3{animation:fadeUp .5s ease .24s both}
  .fu4{animation:fadeUp .5s ease .32s both}
  input,select,button{font-family:'Outfit',sans-serif}
  input:focus,select:focus{outline:none}
`;

/* ─── TINY HELPERS ───────────────────────────────────────────────────────── */
function Counter({ value, suffix='', decimals=0 }) {
  const [n,setN]=useState(0);
  useEffect(()=>{
    let s=0; const inc=value/50;
    const t=setInterval(()=>{
      s+=inc;
      if(s>=value){setN(value);clearInterval(t);}
      else setN(parseFloat(s.toFixed(decimals)));
    },16);
    return()=>clearInterval(t);
  },[value]);
  return <>{decimals?n.toFixed(decimals):Math.round(n)}{suffix}</>;
}

function Lbl({children,color=T.muted2}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:13}}>
      <span style={{width:3,height:13,background:color,borderRadius:2,display:'inline-block'}}/>
      <span style={{fontFamily:T.mono,fontSize:10,color,letterSpacing:'0.13em',textTransform:'uppercase',fontWeight:700}}>{children}</span>
    </div>
  );
}

function Bar5({pct,color,label,emoji='',rank=0}){
  const[w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct),100+rank*70);return()=>clearTimeout(t);},[pct]);
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:13,color:T.text,display:'flex',alignItems:'center',gap:6}}>
          {emoji&&<span style={{fontSize:14}}>{emoji}</span>}
          <span style={{fontWeight:500,textTransform:'capitalize'}}>{label}</span>
        </span>
        <span style={{fontFamily:T.mono,fontSize:11,color,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:5,background:T.border,borderRadius:3,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${w}%`,background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:3,transition:'width .9s cubic-bezier(.4,0,.2,1)',boxShadow:`0 0 7px ${color}44`}}/>
      </div>
    </div>
  );
}

/* ─── SHARED COMPONENTS ──────────────────────────────────────────────────── */
function TrustGauge({absa}){
  if(!absa?.length)return null;
  const score=Math.round(absa.reduce((a,c)=>a+c.positive_pct,0)/absa.length);
  const color=score>=68?T.green:score>=44?T.amber:T.rose;
  const label=score>=68?'Highly Trusted':score>=44?'Mixed Signals':'Critical Warning';
  return(
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <Lbl>Trust Score</Lbl>
      <div style={{position:'relative',height:120}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={[{value:score},{value:100-score}]} cx="50%" cy="100%"
              startAngle={180} endAngle={0} innerRadius={54} outerRadius={74}
              dataKey="value" stroke="none" cornerRadius={4}>
              <Cell fill={color}/><Cell fill={T.s2}/>
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{position:'absolute',bottom:0,width:'100%',textAlign:'center'}}>
          <span style={{fontFamily:T.mono,fontSize:30,fontWeight:700,color}}><Counter value={score}/></span>
          <span style={{fontSize:14,color:T.muted}}>/100</span>
        </div>
      </div>
      <div style={{textAlign:'center',marginTop:6,fontSize:13,fontWeight:700,color}}>{label}</div>
    </div>
  );
}

function SentimentDonut({pos,neu,neg}){
  const total=(pos+neu+neg)||1;
  const pct=Math.round((pos/total)*100);
  return(
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <Lbl>Sentiment Split</Lbl>
      <div style={{position:'relative',height:160}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={[{v:pos,c:T.green},{v:neu,c:T.amber},{v:neg,c:T.rose}]}
              cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="v"
              stroke="none" startAngle={90} endAngle={-270}>
              {[T.green,T.amber,T.rose].map((c,i)=><Cell key={i} fill={c}/>)}
            </Pie>
            <RTooltip contentStyle={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <span style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:T.green}}><Counter value={pct} suffix="%"/></span>
          <span style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:'0.1em'}}>Positive</span>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:4}}>
        {[[T.green,'Positive'],[T.amber,'Neutral'],[T.rose,'Negative']].map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:T.muted2}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

function AspectRadarChart({absa,color,onAspectClick}){
  if(!absa?.length)return<div style={{height:240,display:'flex',alignItems:'center',justifyContent:'center',color:T.muted,fontSize:13}}>No aspect data</div>;
  return(
    <div style={{height:250,cursor:'pointer'}}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%"
          data={absa.map(d=>({subject:d.aspect,A:d.positive_pct,fullMark:100}))}
          onClick={e=>e?.activeLabel&&onAspectClick?.(e.activeLabel)}>
          <PolarGrid stroke={T.border2}/>
          <PolarAngleAxis dataKey="subject" tick={{fill:T.muted2,fontSize:11}}/>
          <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false}/>
          <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2}/>
          <RTooltip contentStyle={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NewsSection({news}){
  if(!news?.length)return null;
  return(
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <Lbl color={T.cyan}>Latest Market Signals</Lbl>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {news.slice(0,4).map((a,i)=>(
          <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
            <div style={{background:T.s2,padding:'10px 13px',borderRadius:9,border:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'border-color .2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.cyan+'55'}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{flex:1,minWidth:0,marginRight:8}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{a.title}</div>
                <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>{a.source}</div>
              </div>
              <ChevronRight size={13} color={T.muted} style={{flexShrink:0}}/>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── COMPARE SPECIFIC COMPONENTS ───────────────────────────────────────── */

/* Dual-direction bar: left fills indigo ←→ right fills rose */
function DualBar({label,v1,v2,color1=T.indigo,color2=T.rose}){
  const max=Math.max(v1,v2,1);
  const[w1,setW1]=useState(0);
  const[w2,setW2]=useState(0);
  useEffect(()=>{
    const t=setTimeout(()=>{setW1((v1/max)*100);setW2((v2/max)*100);},200);
    return()=>clearTimeout(t);
  },[v1,v2]);
  const winner=v1>v2?1:v2>v1?2:0;
  return(
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontFamily:T.mono,fontSize:12,color:color1,fontWeight:winner===1?700:400}}>{v1}%</span>
        <span style={{fontSize:11,color:T.muted2,fontWeight:600,letterSpacing:'0.04em'}}>{label}</span>
        <span style={{fontFamily:T.mono,fontSize:12,color:color2,fontWeight:winner===2?700:400}}>{v2}%</span>
      </div>
      <div style={{display:'flex',height:6,gap:4,alignItems:'center'}}>
        <div style={{flex:1,display:'flex',justifyContent:'flex-end',overflow:'hidden',borderRadius:'4px 0 0 4px'}}>
          <div style={{width:`${w1}%`,height:6,background:`linear-gradient(90deg,transparent,${color1})`,borderRadius:'4px 0 0 4px',transition:'width 1s ease',boxShadow:winner===1?`0 0 10px ${color1}66`:''}}/>
        </div>
        <div style={{width:3,height:14,background:T.border2,borderRadius:2,flexShrink:0}}/>
        <div style={{flex:1,overflow:'hidden',borderRadius:'0 4px 4px 0'}}>
          <div style={{width:`${w2}%`,height:6,background:`linear-gradient(90deg,${color2},transparent)`,borderRadius:'0 4px 4px 0',transition:'width 1s ease',boxShadow:winner===2?`0 0 10px ${color2}66`:''}}/>
        </div>
      </div>
    </div>
  );
}

/* Score ring for compare product card */
function ScoreRing({score,color,size=70}){
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[{value:score},{value:100-score}]} cx="50%" cy="50%"
            innerRadius="62%" outerRadius="85%" dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
            <Cell fill={color}/><Cell fill={T.s3}/>
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontFamily:T.mono,fontSize:15,fontWeight:700,color}}>{score}</span>
      </div>
    </div>
  );
}

/* Full compare dashboard */
function CompareDashboard({compareData,setSelectedAspect}){
  const p1=compareData.product1, p2=compareData.product2;

  const trustOf=absa=>absa?.length?Math.round(absa.reduce((a,c)=>a+c.positive_pct,0)/absa.length):0;
  const t1=trustOf(p1.absa), t2=trustOf(p2.absa);

  const sentOf=data=>{
    if(!data?.length)return{pos:0,neu:0,neg:0};
    const pos=data.filter(r=>r.sentiment==='Positive').length;
    const neu=data.filter(r=>r.sentiment==='Neutral').length;
    const neg=data.filter(r=>r.sentiment==='Negative').length;
    const total=data.length||1;
    return{pos:Math.round((pos/total)*100),neu:Math.round((neu/total)*100),neg:Math.round((neg/total)*100)};
  };
  const s1=sentOf(p1.data), s2=sentOf(p2.data);

  const allAspects=[...new Set([...(p1.absa||[]).map(a=>a.aspect),...(p2.absa||[]).map(a=>a.aspect)])];

  const winner=t1>t2?1:t2>t1?2:0;
  const winnerName=winner===1?p1.product_info?.title?.split(' ').slice(0,3).join(' ')||'Product A'
                   :winner===2?p2.product_info?.title?.split(' ').slice(0,3).join(' ')||'Product B'
                   :null;

  /* emotion breakdown per product */
  const emotionOf=data=>{
    if(!data?.length)return[];
    const counts={};
    data.forEach(item=>{const k=(item.emotion||'').toLowerCase().trim();if(k)counts[k]=(counts[k]||0)+1;});
    return Object.entries(counts).map(([label,count])=>({label,pct:Math.round((count/data.length)*100),color:EMOTION_COLORS[label]||'#818cf8'})).sort((a,b)=>b.pct-a.pct).slice(0,6);
  };
  const e1=emotionOf(p1.data), e2=emotionOf(p2.data);

  const ProductHeader=({p,color,label,trust,sent})=>(
    <div style={{background:T.s1,border:`1px solid ${color}30`,borderRadius:18,padding:22,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:color}}/>
      <div style={{position:'absolute',top:0,right:0,width:120,height:120,background:`radial-gradient(circle,${color}08 0%,transparent 70%)`,pointerEvents:'none'}}/>
      <span style={{fontFamily:T.mono,fontSize:9,fontWeight:700,color,letterSpacing:'0.14em',textTransform:'uppercase',background:`${color}15`,padding:'3px 10px',borderRadius:999,border:`1px solid ${color}25`,display:'inline-block',marginBottom:12}}>
        {label}
      </span>
      <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
        <img src={p.product_info?.image||'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=100'}
          onError={e=>{e.target.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=100'}}
          alt="" style={{width:60,height:60,borderRadius:12,objectFit:'cover',border:`1px solid ${T.border}`,background:T.s2,padding:3,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <h3 style={{fontSize:16,fontWeight:800,color:T.text,lineHeight:1.3,marginBottom:4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.product_info?.title||'Product'}</h3>
          <span style={{fontSize:11,color:T.muted}}>{p.product_info?.category||''}</span>
        </div>
        <ScoreRing score={trust} color={color}/>
      </div>
      {/* mini sentiment strip */}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        {[{label:'Positive',val:sent.pos,color:T.green},{label:'Neutral',val:sent.neu,color:T.amber},{label:'Negative',val:sent.neg,color:T.rose}].map(({label:l,val,color:c})=>(
          <div key={l} style={{flex:1,background:T.s2,border:`1px solid ${c}20`,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:c}}>{val}%</div>
            <div style={{fontSize:10,color:T.muted,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}} className="fu">

      {/* ── PAGE TITLE ── */}
      <div style={{textAlign:'center',padding:'8px 0 0'}}>
        <h2 style={{fontSize:34,fontWeight:900,letterSpacing:'-0.03em',background:`linear-gradient(135deg,${T.indigo},${T.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Head-to-Head Comparison
        </h2>
        <p style={{color:T.muted2,fontSize:14,marginTop:6}}>Deep intelligence across trust, sentiment, emotion & aspects</p>
      </div>

      {/* ── PRODUCT HEADER CARDS ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
        <ProductHeader p={p1} color={T.indigo} label="PRODUCT A" trust={t1} sent={s1}/>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'0 8px'}}>
          <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:T.muted}}>VS</div>
        </div>
        <ProductHeader p={p2} color={T.rose} label="PRODUCT B" trust={t2} sent={s2}/>
      </div>

      {/* ── WINNER BANNER ── */}
      <div style={{background:winner===0?`${T.amber}0d`:`${winner===1?T.indigo:T.rose}0d`,border:`1px solid ${winner===0?T.amber:winner===1?T.indigo:T.rose}30`,borderRadius:14,padding:'18px 24px',display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
        {winner===0?(
          <span style={{fontSize:15,fontWeight:700,color:T.amber}}>⚖️ It's a Draw — Equally matched across all dimensions</span>
        ):(
          <>
            <Trophy size={22} color={winner===1?T.indigo:T.rose}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>Overall Winner</div>
              <div style={{fontSize:18,fontWeight:800,color:winner===1?T.indigo:T.rose}}>{winnerName}</div>
            </div>
            <div style={{fontFamily:T.mono,fontSize:12,color:T.muted,background:T.s2,padding:'4px 12px',borderRadius:999,border:`1px solid ${T.border}`}}>
              +{Math.abs(t1-t2)} trust pts ahead
            </div>
          </>
        )}
      </div>

      {/* ── CENTRE METRICS FACE-OFF ── */}
      <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:18,padding:28}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
          <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.indigo,textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p1.product_info?.title?.split(' ').slice(0,4).join(' ')}</div>
          <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.rose,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p2.product_info?.title?.split(' ').slice(0,4).join(' ')}</div>
        </div>
        <DualBar label="Overall Trust Score" v1={t1} v2={t2}/>
        <DualBar label="Positive Sentiment"  v1={s1.pos} v2={s2.pos}/>
        <DualBar label="Negative Sentiment"  v1={s1.neg} v2={s2.neg} color1={T.rose} color2={T.indigo}/>

        {/* Aspect face-off */}
        {allAspects.length>0&&(
          <>
            <div style={{height:1,background:T.border,margin:'20px 0'}}/>
            <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,letterSpacing:'0.12em',textTransform:'uppercase',textAlign:'center',marginBottom:16}}>Aspect-by-Aspect Face-off</div>
            {allAspects.slice(0,8).map(aspect=>{
              const a1=p1.absa?.find(a=>a.aspect===aspect)?.positive_pct??0;
              const a2=p2.absa?.find(a=>a.aspect===aspect)?.positive_pct??0;
              const emoji=p1.absa?.find(a=>a.aspect===aspect)?.emoji||p2.absa?.find(a=>a.aspect===aspect)?.emoji||'📌';
              return<DualBar key={aspect} label={`${emoji} ${aspect}`} v1={a1} v2={a2}/>;
            })}
          </>
        )}
      </div>

      {/* ── SIDE BY SIDE DEEP DIVE ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

        {/* Radar charts */}
        <div style={{background:T.s1,border:`1px solid ${T.indigo}25`,borderRadius:16,padding:20}}>
          <Lbl color={T.indigo}>{p1.product_info?.title?.split(' ').slice(0,3).join(' ')||'Product A'} — Radar</Lbl>
          <AspectRadarChart absa={p1.absa} color={T.indigo} onAspectClick={setSelectedAspect}/>
          <div style={{marginTop:12}}>
            {(p1.absa||[]).sort((a,b)=>b.positive_pct-a.positive_pct).map((item,i)=>{
              const c=item.positive_pct>=65?T.green:item.positive_pct>=40?T.amber:T.rose;
              return<Bar5 key={i} pct={item.positive_pct} color={c} label={item.aspect} emoji={item.emoji||'📌'} rank={i}/>;
            })}
          </div>
        </div>

        <div style={{background:T.s1,border:`1px solid ${T.rose}25`,borderRadius:16,padding:20}}>
          <Lbl color={T.rose}>{p2.product_info?.title?.split(' ').slice(0,3).join(' ')||'Product B'} — Radar</Lbl>
          <AspectRadarChart absa={p2.absa} color={T.rose} onAspectClick={setSelectedAspect}/>
          <div style={{marginTop:12}}>
            {(p2.absa||[]).sort((a,b)=>b.positive_pct-a.positive_pct).map((item,i)=>{
              const c=item.positive_pct>=65?T.green:item.positive_pct>=40?T.amber:T.rose;
              return<Bar5 key={i} pct={item.positive_pct} color={c} label={item.aspect} emoji={item.emoji||'📌'} rank={i}/>;
            })}
          </div>
        </div>

        {/* Emotion breakdown side by side */}
        <div style={{background:T.s1,border:`1px solid ${T.indigo}22`,borderRadius:16,padding:20}}>
          <Lbl color={T.indigo}>🧠 Emotion Profile A</Lbl>
          {!e1.length&&<p style={{color:T.muted,fontSize:12,fontStyle:'italic'}}>No emotion data</p>}
          {e1.map((e,i)=><Bar5 key={e.label} pct={e.pct} color={e.color} label={e.label} rank={i}/>)}
        </div>

        <div style={{background:T.s1,border:`1px solid ${T.rose}22`,borderRadius:16,padding:20}}>
          <Lbl color={T.rose}>🧠 Emotion Profile B</Lbl>
          {!e2.length&&<p style={{color:T.muted,fontSize:12,fontStyle:'italic'}}>No emotion data</p>}
          {e2.map((e,i)=><Bar5 key={e.label} pct={e.pct} color={e.color} label={e.label} rank={i}/>)}
        </div>

        {/* TL;DR + Recommendation side by side */}
        <div style={{background:`linear-gradient(135deg,${T.indigo}12,${T.cyan}06)`,border:`1px solid ${T.indigo}25`,borderRadius:16,padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <Lightbulb size={15} color='#facc15'/><span style={{fontSize:14,fontWeight:800,color:T.text}}>AI Verdict — A</span>
          </div>
          <p style={{fontSize:13,color:T.muted2,lineHeight:1.7,fontStyle:'italic',marginBottom:14}}>"{p1.tldr}"</p>
          <div style={{background:`${T.green}07`,border:`1px solid ${T.green}20`,borderRadius:10,padding:'11px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
            <CheckCircle size={14} color={T.green} style={{flexShrink:0,marginTop:2}}/>
            <p style={{fontSize:12,color:T.text,lineHeight:1.55}}>{p1.recommendation}</p>
          </div>
        </div>

        <div style={{background:`linear-gradient(135deg,${T.rose}10,${T.purple}06)`,border:`1px solid ${T.rose}25`,borderRadius:16,padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <Lightbulb size={15} color='#facc15'/><span style={{fontSize:14,fontWeight:800,color:T.text}}>AI Verdict — B</span>
          </div>
          <p style={{fontSize:13,color:T.muted2,lineHeight:1.7,fontStyle:'italic',marginBottom:14}}>"{p2.tldr}"</p>
          <div style={{background:`${T.green}07`,border:`1px solid ${T.green}20`,borderRadius:10,padding:'11px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
            <CheckCircle size={14} color={T.green} style={{flexShrink:0,marginTop:2}}/>
            <p style={{fontSize:12,color:T.text,lineHeight:1.55}}>{p2.recommendation}</p>
          </div>
        </div>

        {/* News side by side */}
        {(p1.news?.length>0||p2.news?.length>0)&&(
          <>
            <NewsSection news={p1.news}/>
            <NewsSection news={p2.news}/>
          </>
        )}
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeMode,setActiveMode]=useState('search');
  const [topic,setTopic]=useState('');
  const [url1,setUrl1]=useState('');
  const [url2,setUrl2]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [compareData,setCompareData]=useState(null);
  const [isGeneratingPDF,setIsGeneratingPDF]=useState(false);
  const [streamLogs,setStreamLogs]=useState([]);
  const [liveComments,setLiveComments]=useState([]);
  const [activeTab,setActiveTab]=useState('overview');
  const [selectedAspect,setSelectedAspect]=useState(null);
  const [sortOrder,setSortOrder]=useState('highest_score');
  const logsEndRef=useRef(null);
  const dashboardRef=useRef(null);

  useEffect(()=>{
    socket.on('status',         d=>setStreamLogs(p=>[...p,`[STATUS] ${d.message}`]));
    socket.on('error',          d=>{setStreamLogs(p=>[...p,`[ERROR] ${d.message}`]);setLoading(false);});
    socket.on('comment_preview',d=>setLiveComments(p=>[{body:d.body,id:Date.now()},...p]));
    socket.on('complete',       d=>{setResult(d);setLoading(false);});
    return()=>{socket.off('status');socket.off('error');socket.off('comment_preview');socket.off('complete');};
  },[]);

  useEffect(()=>{logsEndRef.current?.scrollIntoView({behavior:'smooth'});},[streamLogs]);

  const handleAnalyze=()=>{
    if(!topic)return alert('Enter a topic or URL.');
    setLoading(true);setResult(null);setCompareData(null);
    setStreamLogs([]);setLiveComments([]);setActiveTab('overview');
    socket.emit('start_analysis',{topic});
  };

  const handleCompare=async()=>{
    if(!url1||!url2)return alert('Enter both URLs!');
    setLoading(true);setCompareData(null);setResult(null);
    setStreamLogs([]);setLiveComments([]);
    try{
      const r=await fetch('http://localhost:5000/api/compare',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({url1,url2})
      });
      const d=await r.json();
      if(d.error)throw new Error(d.error);
      setCompareData(d);
    }catch(e){alert(e.message);}
    finally{setLoading(false);}
  };

  const downloadPDF=async()=>{
    if(!dashboardRef.current)return;
    setIsGeneratingPDF(true);
    try{
      const canvas=await html2canvas(dashboardRef.current,{scale:2,backgroundColor:'#07080f',useCORS:true,logging:false});
      const pdf=new jsPDF('p','mm','a4');
      const w=pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,(canvas.height*w)/canvas.width);
      pdf.save('OpinionLens_Report.pdf');
    }catch(e){alert('PDF generation failed.');}
    finally{setIsGeneratingPDF(false);}
  };

  /* derived for search */
  const posCount=result?.data?.filter(r=>r.sentiment==='Positive').length??0;
  const neuCount=result?.data?.filter(r=>r.sentiment==='Neutral').length??0;
  const negCount=result?.data?.filter(r=>r.sentiment==='Negative').length??0;
  const total=posCount+neuCount+negCount;
  const buyScore=total>0?+((( posCount+0.5*neuCount)/total)*100).toFixed(1):0;
  const verdict=buyScore>=80?'HIGHLY RECOMMENDED':buyScore>=60?'GOOD TO BUY':buyScore>=40?'MIXED — RISKY':'NOT RECOMMENDED';
  const verdictColor=buyScore>=80?T.green:buyScore>=60?T.cyan:buyScore>=40?T.amber:T.rose;

  const getSortedData=()=>{
    if(!result?.data)return[];
    const c=[...result.data];
    if(sortOrder==='highest_score')return c.sort((a,b)=>b.score-a.score);
    if(sortOrder==='lowest_score') return c.sort((a,b)=>a.score-b.score);
    if(sortOrder==='positive_first')return c.sort((a,b)=>b.sentiment==='Positive'?1:-1);
    if(sortOrder==='negative_first')return c.sort((a,b)=>b.sentiment==='Negative'?1:-1);
    return c;
  };

  const inp={flex:1,background:T.s2,border:`1px solid ${T.border}`,borderRadius:10,padding:'13px 16px',color:T.text,fontSize:14,fontFamily:T.font,transition:'border-color .2s',width:'100%'};
  const tab=t=>({padding:'13px 20px',fontWeight:700,fontSize:13,cursor:'pointer',background:'none',border:'none',fontFamily:T.font,color:activeTab===t?T.indigo:T.muted,borderBottom:activeTab===t?`2px solid ${T.indigo}`:'2px solid transparent',transition:'all .2s'});

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div style={{position:'relative',zIndex:1,minHeight:'100vh',padding:'36px 28px',maxWidth:1200,margin:'0 auto'}}>

        {/* HEADER */}
        <div style={{textAlign:'center',marginBottom:48}} className="fu">
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:T.s1,border:`1px solid ${T.border}`,borderRadius:999,padding:'5px 16px',marginBottom:16}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:T.green,display:'inline-block',animation:'pulse-dot 1.4s infinite'}}/>
            <span style={{fontFamily:T.mono,fontSize:10,color:T.muted2,letterSpacing:'0.12em'}}>NEURAL ENGINE ONLINE</span>
          </div>
          <h1 style={{fontSize:50,fontWeight:900,letterSpacing:'-0.04em',marginBottom:8,background:`linear-gradient(135deg,${T.text} 0%,${T.indigo} 50%,${T.cyan} 100%)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            OpinionLens<span style={{fontFamily:T.mono,fontWeight:400,fontSize:26,WebkitTextFillColor:T.muted}}> /v4</span>
          </h1>
          <p style={{color:T.muted2,fontSize:15}}>Enterprise Market Intelligence · Neural Sentiment Analysis</p>
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.indigo}55,transparent)`,marginTop:28}}/>
        </div>

        {/* MODE TOGGLE */}
        <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:22}} className="fu1">
          {[{id:'search',label:'Analyze Topic / URL',Icon:Search},{id:'compare',label:'Head-to-Head Compare',Icon:GitCompare}].map(({id,label,Icon})=>(
            <button key={id} onClick={()=>setActiveMode(id)} style={{
              display:'flex',alignItems:'center',gap:8,padding:'11px 22px',borderRadius:10,
              fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:T.font,transition:'all .2s',
              border:`1px solid ${activeMode===id?T.indigo:T.border}`,
              background:activeMode===id?`${T.indigo}18`:T.s1,
              color:activeMode===id?T.indigo:T.muted2,
              boxShadow:activeMode===id?`0 0 20px ${T.indigo}22`:'none'
            }}><Icon size={15}/>{label}</button>
          ))}
        </div>

        {/* INPUT PANEL */}
        <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:16,marginBottom:28}} className="fu1">
          {activeMode==='compare'?(
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
              <input style={inp} placeholder="Product / URL 1 (Amazon, Flipkart, Play Store…)"
                value={url1} onChange={e=>setUrl1(e.target.value)}
                onFocus={e=>e.target.style.borderColor=T.indigo}
                onBlur={e=>e.target.style.borderColor=T.border}/>
              <div style={{fontFamily:T.mono,fontWeight:700,color:T.muted,fontSize:13}}>VS</div>
              <input style={inp} placeholder="Product / URL 2"
                value={url2} onChange={e=>setUrl2(e.target.value)}
                onFocus={e=>e.target.style.borderColor=T.rose}
                onBlur={e=>e.target.style.borderColor=T.border}/>
              <button onClick={handleCompare} disabled={loading} style={{
                display:'flex',alignItems:'center',gap:8,padding:'13px 24px',borderRadius:10,
                fontWeight:700,fontSize:14,cursor:'pointer',border:'none',fontFamily:T.font,
                background:T.rose,color:'#fff',opacity:loading?.5:1,
                boxShadow:loading?'none':`0 0 20px ${T.rose}33`,transition:'all .2s'
              }}><GitCompare size={15}/>{loading?'ANALYZING…':'COMPARE'}</button>
            </div>
          ):(
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <input style={inp} placeholder="Search a brand, product, or paste Amazon / Flipkart / Play Store URL…"
                value={topic} onChange={e=>setTopic(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!loading&&handleAnalyze()}
                onFocus={e=>e.target.style.borderColor=T.indigo}
                onBlur={e=>e.target.style.borderColor=T.border}/>
              <button onClick={handleAnalyze} disabled={loading} style={{
                display:'flex',alignItems:'center',gap:8,padding:'13px 24px',borderRadius:10,
                fontWeight:700,fontSize:14,cursor:'pointer',border:'none',fontFamily:T.font,
                background:T.indigo,color:'#fff',opacity:loading?.5:1,
                boxShadow:loading?'none':`0 0 24px ${T.indigo}44`,transition:'all .2s'
              }}><Activity size={15}/>{loading?'ANALYZING…':'ANALYZE'}</button>
            </div>
          )}
        </div>

        {/* LIVE TERMINAL */}
        {loading&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:28}} className="fu">
            <div style={{background:'#030408',border:`1px solid ${T.border}`,borderRadius:14,padding:'18px 20px',fontFamily:T.mono,fontSize:12,height:210,overflowY:'auto',position:'relative'}}>
              <div style={{position:'absolute',top:14,right:16,display:'flex',gap:5}}>
                {['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{width:10,height:10,borderRadius:'50%',background:c,display:'inline-block'}}/>)}
              </div>
              <div style={{color:T.muted,marginBottom:10,fontSize:10,letterSpacing:'0.12em'}}>SYSTEM · NEURAL LOGS</div>
              {streamLogs.map((log,i)=>(
                <div key={i} style={{color:log.startsWith('[ERROR]')?T.rose:'#4ade80',marginBottom:3}}>
                  <span style={{color:T.muted,marginRight:8}}>{String(i).padStart(2,'0')}</span>{log}
                </div>
              ))}
              <div ref={logsEndRef}/>
            </div>
            <div style={{background:T.s1,border:`1px solid ${T.border2}`,borderRadius:14,padding:'18px 20px',height:210,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
              <div style={{color:T.indigo,fontWeight:700,fontSize:12,borderBottom:`1px solid ${T.border}`,paddingBottom:10,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                <MessageSquare size={13}/> LIVE DATA STREAM
              </div>
              {liveComments.map(c=>(
                <div key={c.id} style={{background:T.s2,padding:'8px 12px',borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,color:T.muted2,lineHeight:1.5}}>"{c.body}"</div>
              ))}
              {!liveComments.length&&<p style={{color:T.muted,fontSize:12,fontStyle:'italic',textAlign:'center',marginTop:20}}>Waiting for data…</p>}
            </div>
          </div>
        )}

        {/* EXPORTABLE DASHBOARD */}
        <div ref={dashboardRef}>

          {/* PDF BUTTON */}
          {(result||compareData)&&!loading&&(
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}} className="fu">
              <button onClick={downloadPDF} disabled={isGeneratingPDF} style={{
                display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,
                fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:T.font,
                border:`1px solid ${T.green}33`,background:`${T.green}0d`,
                color:T.green,opacity:isGeneratingPDF?.5:1,transition:'all .2s'
              }}><Download size={13}/>{isGeneratingPDF?'GENERATING…':'DOWNLOAD PDF REPORT'}</button>
            </div>
          )}

          {/* SINGLE ANALYSIS */}
          {result&&!loading&&activeMode==='search'&&(()=>{
            return(
              <div style={{display:'flex',flexDirection:'column',gap:22}}>

                {/* HERO */}
                <div style={{background:T.s1,border:`1px solid ${T.border2}`,borderRadius:20,padding:26,display:'flex',gap:22,alignItems:'center',flexWrap:'wrap',position:'relative',overflow:'hidden'}} className="fu">
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${T.indigo},${T.cyan})`}}/>
                  <img src={result.product_info?.image||'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200'}
                    onError={e=>{e.target.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200'}}
                    alt="" style={{width:100,height:100,borderRadius:14,objectFit:'cover',border:`1px solid ${T.border}`,background:T.s2,padding:4,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:200}}>
                    <span style={{fontSize:10,fontWeight:700,color:T.indigo,background:`${T.indigo}18`,padding:'3px 10px',borderRadius:999,border:`1px solid ${T.indigo}30`,letterSpacing:'0.08em',textTransform:'uppercase',display:'inline-block',marginBottom:10}}>
                      {result.product_info?.category||'Market Search'}
                    </span>
                    <h2 style={{fontSize:24,fontWeight:900,letterSpacing:'-0.03em',marginBottom:7,lineHeight:1.2}}>{result.product_info?.title||topic}</h2>
                    <p style={{color:T.muted2,fontSize:14,lineHeight:1.6}}>{result.product_info?.description}</p>
                  </div>
                  <div style={{background:`${verdictColor}0c`,border:`1px solid ${verdictColor}30`,borderRadius:14,padding:'16px 22px',textAlign:'center',minWidth:160,flexShrink:0}}>
                    <div style={{fontFamily:T.mono,fontSize:34,fontWeight:700,color:verdictColor,lineHeight:1}}><Counter value={buyScore} suffix="%" decimals={1}/></div>
                    <div style={{fontSize:11,fontWeight:700,color:verdictColor,marginTop:5,letterSpacing:'0.04em'}}>{verdict}</div>
                    <div style={{height:3,background:T.border,borderRadius:2,overflow:'hidden',marginTop:10}}>
                      <div style={{height:'100%',width:`${buyScore}%`,background:verdictColor,borderRadius:2,transition:'width 1.2s ease'}}/>
                    </div>
                  </div>
                </div>

                {/* STAT STRIP */}
                <div style={{display:'flex',gap:12}} className="fu1">
                  {[
                    {value:total,label:'Total Signals',color:T.indigo,Icon:BarChart2},
                    {value:posCount,label:'Positive',color:T.green,Icon:TrendingUp},
                    {value:negCount,label:'Negative',color:T.rose,Icon:TrendingDown},
                    {value:neuCount,label:'Neutral',color:T.amber,Icon:Minus},
                  ].map(({value,label,color,Icon})=>(
                    <div key={label} style={{background:T.s1,border:`1px solid ${color}20`,borderRadius:14,padding:'15px 18px',flex:1,textAlign:'center',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',inset:0,opacity:0.04,background:`radial-gradient(circle at top right,${color},transparent 70%)`}}/>
                      <Icon size={14} color={color} style={{margin:'0 auto 7px'}}/>
                      <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color,lineHeight:1}}><Counter value={value}/></div>
                      <div style={{fontSize:11,color:T.muted,letterSpacing:'0.08em',textTransform:'uppercase',marginTop:4,fontWeight:600}}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* MOOD + TIMELINE */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}} className="fu2">
                  <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,padding:'15px 17px'}}>
                    <Lbl>Community Mood Map</Lbl>
                    <div style={{display:'flex',gap:8}}>
                      {(()=>{
                        const counts={};
                        (result.data||[]).forEach(item=>{if(item.emoji)counts[item.emoji]=(counts[item.emoji]||0)+1;});
                        return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
                          .map(([emoji,count])=>({emoji,pct:Math.round((count/(result.data?.length||1))*100)}));
                      })().map((e,i)=>(
                        <div key={i} style={{flex:1,background:T.s2,border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 4px',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                          <span style={{fontSize:21}}>{e.emoji}</span>
                          <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.muted2}}>{e.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,padding:'15px 18px'}}>
                    <Lbl>Engagement Wave</Lbl>
                    <div style={{height:82}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(result.data||[]).slice(0,40).map((d,i)=>({i,score:d.score||0}))} margin={{top:4,right:0,bottom:0,left:0}}>
                          <defs>
                            <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={T.indigo} stopOpacity={0.35}/>
                              <stop offset="95%" stopColor={T.indigo} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="i" hide/><YAxis hide/>
                          <RTooltip contentStyle={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11}} formatter={v=>[v,'Score']} labelFormatter={()=>''}/>
                          <Area type="monotone" dataKey="score" stroke={T.indigo} strokeWidth={2} fill="url(#wg)" dot={false}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* TABS */}
                <div style={{borderBottom:`1px solid ${T.border}`,display:'flex'}} className="fu2">
                  <button style={tab('overview')} onClick={()=>setActiveTab('overview')}>Analytics Overview</button>
                  <button style={tab('emotions')} onClick={()=>setActiveTab('emotions')}>🧠 Emotion Intelligence</button>
                  <button style={tab('feed')} onClick={()=>setActiveTab('feed')}>Insights Feed ({result.data?.length||0})</button>
                </div>

                {/* OVERVIEW TAB */}
                {activeTab==='overview'&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:20}} className="fu">
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <TrustGauge absa={result.absa}/>
                      <SentimentDonut pos={posCount} neu={neuCount} neg={negCount}/>
                      <div style={{background:`linear-gradient(135deg,${T.indigo}14,${T.cyan}06)`,border:`1px solid ${T.indigo}22`,borderRadius:16,padding:20}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                          <Lightbulb size={15} color='#facc15'/>
                          <span style={{fontSize:14,fontWeight:800,color:T.text}}>AI Executive Summary</span>
                        </div>
                        <p style={{fontSize:13,color:T.muted2,lineHeight:1.7,fontStyle:'italic',marginBottom:14}}>"{result.tldr}"</p>
                        <div style={{background:`${T.green}07`,border:`1px solid ${T.green}20`,borderRadius:10,padding:'11px 14px',display:'flex',gap:9,alignItems:'flex-start'}}>
                          <CheckCircle size={14} color={T.green} style={{flexShrink:0,marginTop:2}}/>
                          <div>
                            <div style={{fontFamily:T.mono,fontSize:9,color:T.green,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:4}}>Recommendation</div>
                            <p style={{fontSize:13,color:T.text,lineHeight:1.55}}>{result.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:22}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                          <span style={{fontSize:15,fontWeight:800,color:T.text}}>Interactive Aspect Radar</span>
                          <span style={{fontSize:11,color:T.muted,background:T.s2,padding:'3px 10px',borderRadius:999,border:`1px solid ${T.border}`}}>Click to drill down</span>
                        </div>
                        <div style={{height:250,cursor:'pointer'}}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="72%"
                              data={(result.absa||[]).map(d=>({subject:d.aspect,A:d.positive_pct,fullMark:100}))}
                              onClick={e=>e?.activeLabel&&setSelectedAspect(e.activeLabel)}>
                              <PolarGrid stroke={T.border2}/>
                              <PolarAngleAxis dataKey="subject" tick={{fill:T.muted2,fontSize:11}}/>
                              <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false}/>
                              <Radar dataKey="A" stroke={T.indigo} fill={T.indigo} fillOpacity={0.2} strokeWidth={2}/>
                              <RTooltip contentStyle={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/>
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{marginTop:14}}>
                          {(result.absa||[]).sort((a,b)=>b.positive_pct-a.positive_pct).map((item,i)=>{
                            const c=item.positive_pct>=65?T.green:item.positive_pct>=40?T.amber:T.rose;
                            return<Bar5 key={i} pct={item.positive_pct} color={c} label={item.aspect} emoji={item.emoji||'📌'} rank={i}/>;
                          })}
                        </div>
                      </div>
                      <NewsSection news={result.news}/>
                    </div>
                  </div>
                )}

                {/* EMOTIONS TAB */}
                {activeTab==='emotions'&&(()=>{
                  const data=result.data||[];
                  const counts={};
                  data.forEach(item=>{const k=(item.emotion||item.label||'').toLowerCase().trim();if(k)counts[k]=(counts[k]||0)+1;});
                  const tl=data.length||1;
                  const emotions=Object.entries(counts).map(([label,count])=>({label,pct:Math.round((count/tl)*100),color:EMOTION_COLORS[label]||'#818cf8'})).filter(e=>e.pct>0).sort((a,b)=>b.pct-a.pct);
                  const top8=emotions.slice(0,8);
                  const posK=['admiration','amusement','approval','caring','desire','excitement','gratitude','joy','love','optimism','pride','relief'];
                  const negK=['anger','annoyance','disappointment','disapproval','disgust','embarrassment','fear','grief','remorse','sadness'];
                  const posE=emotions.filter(e=>posK.includes(e.label));
                  const negE=emotions.filter(e=>negK.includes(e.label));
                  const neuE=emotions.filter(e=>![...posK,...negK].includes(e.label));
                  return(
                    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,padding:24}} className="fu">
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
                        <Brain size={17} color={T.indigo}/>
                        <div>
                          <h3 style={{fontSize:15,fontWeight:800,color:T.text}}>Emotion Intelligence Map</h3>
                          <p style={{fontSize:12,color:T.muted,marginTop:2}}>Neural model detected {emotions.length} unique emotions across {tl} data points</p>
                        </div>
                      </div>
                      <div style={{height:210,marginBottom:22}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={top8} layout="vertical" margin={{left:14,right:48,top:0,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                            <XAxis type="number" domain={[0,100]} tick={{fill:T.muted,fontSize:11,fontFamily:T.mono}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                            <YAxis type="category" dataKey="label" width={128} tick={{fill:T.text,fontSize:12}} axisLine={false} tickLine={false}/>
                            <RTooltip contentStyle={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} formatter={v=>[`${v}%`,'Frequency']}/>
                            <Bar dataKey="pct" radius={[0,4,4,0]} maxBarSize={15}>{top8.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18}}>
                        {[{title:'Positive Emotions',items:posE,accent:T.green},{title:'Negative Emotions',items:negE,accent:T.rose},{title:'Cognitive / Neutral',items:neuE,accent:T.amber}].map(({title,items,accent})=>(
                          <div key={title}>
                            <div style={{fontSize:10,fontWeight:700,color:accent,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:5}}>
                              <span style={{width:5,height:5,borderRadius:'50%',background:accent,display:'inline-block'}}/>{title}
                            </div>
                            {!items.length&&<p style={{fontSize:12,color:T.muted,fontStyle:'italic'}}>None detected</p>}
                            {items.map((e,i)=><Bar5 key={e.label} pct={e.pct} color={e.color} label={e.label} rank={i}/>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* FEED TAB */}
                {activeTab==='feed'&&(
                  <div className="fu">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginBottom:14}}>
                      <Filter size={13} color={T.muted}/>
                      <span style={{fontSize:13,fontWeight:700,color:T.muted}}>Sort:</span>
                      <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} style={{background:T.s2,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:'7px 12px',fontSize:13,fontFamily:T.font}}>
                        <option value="highest_score">Highest Upvotes</option>
                        <option value="lowest_score">Lowest Upvotes</option>
                        <option value="positive_first">Positive First</option>
                        <option value="negative_first">Negative First</option>
                      </select>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(295px,1fr))',gap:13}}>
                      {getSortedData().map((c,i)=>{
                        const isPos=c.sentiment==='Positive',isNeg=c.sentiment==='Negative';
                        const col=isPos?T.green:isNeg?T.rose:T.amber;
                        return(
                          <div key={i} style={{background:T.s1,border:`1px solid ${T.border}`,borderLeft:`3px solid ${col}`,borderRadius:12,padding:'15px 17px',display:'flex',flexDirection:'column',gap:11,transition:'box-shadow .2s'}}
                            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 18px ${col}14`}
                            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                            <span style={{fontSize:10,fontWeight:700,color:col,letterSpacing:'0.1em',textTransform:'uppercase',background:`${col}14`,padding:'2px 8px',borderRadius:999,alignSelf:'flex-start',border:`1px solid ${col}28`}}>{c.sentiment}</span>
                            <p style={{fontSize:13,color:T.muted2,lineHeight:1.65,flex:1,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:6,WebkitBoxOrient:'vertical'}}>"{c.body}"</p>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1px solid ${T.border}`,paddingTop:9}}>
                              <span style={{fontSize:17}} title={c.emotion}>{c.emoji}</span>
                              <span style={{fontFamily:T.mono,fontSize:11,color:T.muted,background:T.s2,padding:'3px 8px',borderRadius:6}}>{c.score} 👍</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* COMPARE DASHBOARD */}
          {compareData&&!loading&&activeMode==='compare'&&(
            <CompareDashboard compareData={compareData} setSelectedAspect={setSelectedAspect}/>
          )}

        </div>{/* end exportable */}

        {/* ASPECT MODAL */}
        {selectedAspect&&result&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}}>
            <div style={{background:T.s1,width:'100%',maxWidth:660,borderRadius:20,border:`1px solid ${T.indigo}44`,display:'flex',flexDirection:'column',maxHeight:'80vh',boxShadow:`0 0 50px ${T.indigo}18`}}>
              <div style={{padding:'17px 22px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.s2,borderRadius:'20px 20px 0 0'}}>
                <h3 style={{fontSize:17,fontWeight:900,color:T.text}}>Voices on <span style={{color:T.indigo}}>"{selectedAspect}"</span></h3>
                <button onClick={()=>setSelectedAspect(null)} style={{background:T.s3,border:'none',borderRadius:'50%',width:29,height:29,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.muted2}}><X size={14}/></button>
              </div>
              <div style={{padding:18,overflowY:'auto',display:'flex',flexDirection:'column',gap:11}}>
                {result.data?.filter(c=>c.body?.toLowerCase().includes(selectedAspect.toLowerCase())).slice(0,15).map((c,i)=>(
                  <div key={i} style={{background:T.s2,padding:'13px 15px',borderRadius:11,border:`1px solid ${T.border}`}}>
                    <p style={{fontSize:13,color:T.muted2,fontStyle:'italic',marginBottom:9,lineHeight:1.65}}>"{c.body}"</p>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <span style={{fontSize:17}}>{c.emoji}</span>
                      <span style={{fontFamily:T.mono,fontSize:10,color:T.muted,background:T.s3,padding:'2px 8px',borderRadius:5}}>Score: {c.score}</span>
                    </div>
                  </div>
                ))}
                {!result.data?.filter(c=>c.body?.toLowerCase().includes(selectedAspect.toLowerCase())).length&&(
                  <p style={{textAlign:'center',color:T.muted,fontStyle:'italic',padding:'28px 0'}}>The AI abstracted this from broader context — no exact keyword match found.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}