import {useState,useEffect} from 'react'
import {ArrowLeft,Download,Trash2} from 'lucide-react'
import {api,msg,type Draft,type Answers} from './model'
import {choice,options} from '../shared/forms.js'
type Data={rows:{id:string,created:string,version:number,answers:Answers}[],versions:{version:number,body:Draft}[],files:{id:string,name:string}[]}
export function Results({id,title,back}:{id:string,title:string,back:()=>void}){
 const [data,set]=useState<Data>(),[error,err]=useState('')
 const base='/admin/forms/'+id+'/results'
 const load=()=>api<Data>(base).then(set).catch(e=>err(msg(e)))
 useEffect(()=>{void load()},[id])
 const filename=(id:string)=>data?.files.find(f=>f.id===id)?.name||id
 function csv(){
  if(!data)return
  const cols=data.versions.flatMap(v=>v.body.questions.map(q=>({version:v.version,q})))
  const table=[['Fecha','Versión',...cols.map(c=>'v'+c.version+' · '+c.q.title)],...data.rows.map(r=>[r.created,String(r.version),...cols.map(({version,q})=>{const val=r.answers[q.id];return version!==r.version||!val?'':q.type==='file'?filename(String(val)):Array.isArray(val)?val.join(', '):val})])]
  const quote=(s:string)=>'"'+(/^[\s]*[=+@-]|^[\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"'
  const url=URL.createObjectURL(new Blob(['\uFEFF'+table.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download='respuestas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <main className="shell"><button onClick={back}><ArrowLeft/>Panel</button><h1>{title}</h1><div className="bar"><h2>Resultados</h2><button disabled={!data} onClick={csv}><Download/>Exportar CSV</button></div>{error&&<p role="alert">{error}</p>}{data&&<>{data.versions.map(v=><details className="card" key={v.version}><summary>Resumen de opciones · Versión {v.version}</summary>{v.body.questions.filter(q=>choice(q.type)).map(q=><div key={q.id}><h3>{q.title}</h3>{options(q).map((o:string)=><p key={o}>{o} · {data.rows.filter(r=>r.version===v.version && (Array.isArray(r.answers[q.id])?r.answers[q.id].includes(o):r.answers[q.id]===o)).length}</p>)}</div>)}</details>)}<h2>Envíos ({data.rows.length})</h2>{data.rows.map(r=><details className="card" key={r.id}><summary>{new Date(r.created).toLocaleString('es-UY')} · Versión {r.version}</summary>{data.versions.find(v=>v.version===r.version)?.body.questions.filter(q=>Object.hasOwn(r.answers,q.id)).map(q=><p key={q.id}><strong>{q.title}</strong><br/>{q.type==='file'?<a href={'/api/admin/files/'+r.answers[q.id]}>{filename(String(r.answers[q.id]))}</a>:[r.answers[q.id]].flat().join(', ')}</p>)}<button onClick={async()=>{if(confirm('¿Eliminar el envío y sus archivos?'))try{await api(base+'/'+r.id,'DELETE');await load()}catch(e){err(msg(e))}}}><Trash2/>Eliminar envío</button></details>)}</>}</main>
}

