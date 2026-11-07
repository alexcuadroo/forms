import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {PanelsTopLeft,Plus,Search,FileText,ChartNoAxesColumn,Globe,PenLine,Link,LockKeyhole,FolderOpen,Database,ChevronRight} from 'lucide-react'
import {api,msg,type Form,type Draft} from './model'
import {Editor} from './Editor'
import {Results} from './Results'
import {Runner} from './Runner'
import './style.css'
type Row={id:string,slug:string,title:string,closed:boolean,version:number,questions:number,responses:number,updated:string}
type Dashboard={forms:Row[],storage:{quota:number,used:number},user:{name:string,plan:string}}
function Public({slug}:{slug:string}){
 const [v,set]=useState<{body:Draft,version:number}>(),[error,err]=useState('')
 useEffect(()=>{api('/public/'+slug).then(set).catch(e=>err(msg(e)))},[slug])
 return v?<Runner draft={v.body} slug={slug} version={v.version}/>:<main className="shell"><h2>{error||'Cargando formulario…'}</h2></main>
}
function Panel(){
 const [data,set]=useState<Dashboard>(),[form,edit]=useState<Form>(),[result,results]=useState<Row>(),[search,find]=useState(''),[filter,filterBy]=useState('Todos'),[note,say]=useState(''),[busy,wait]=useState(false)
 const load=()=>api<Dashboard>('/admin/forms').then(set).catch(e=>say(msg(e)))
 useEffect(()=>{void load()},[])
 async function run(fn:()=>Promise<unknown>){wait(true);say('');try{await fn()}catch(e){say(msg(e))}finally{wait(false)}}
 const back=()=>{edit(undefined);results(undefined);void load()}
 if(form)return <Editor form={form} back={back}/>
 if(result)return <Results id={result.id} title={result.title} back={back}/>
 const rows=data?.forms||[],status=(r:Row)=>!r.version?'Borrador':r.closed?'Cerrado':'Publicado'
 const found=rows.filter(r=>r.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (filter==='Todos'||status(r)===filter))
 return <><header className="top"><div className="brand"><span className="mark"><PanelsTopLeft/></span>EduAlex <em>Forms</em></div>{data&&<div className="profile"><span>{data.user.name}</span><b>{data.user.name?.slice(0,1)||'E'}</b></div>}</header><main className="shell"><div className="bar heading"><div><small>ESPACIO DOCENTE</small><h1>Mis formularios</h1></div><button className="primary" disabled={busy||!data} onClick={()=>void run(async()=>edit(await api('/admin/forms','POST')))}><Plus/>Crear formulario</button></div>
 <div className="stats">{[[FileText,'Formularios',rows.length],[Globe,'En recepción',rows.filter(r=>r.version&&!r.closed).length],[ChartNoAxesColumn,'Respuestas',rows.reduce((n,r)=>n+r.responses,0)]].map(([Icon,title,value]:any)=><div key={title}><Icon/><span>{title}</span><strong>{data?value:'—'}</strong></div>)}</div>
 <div className="bar library"><h2>Biblioteca</h2><label className="search"><Search/><input placeholder="Buscar formulario" aria-label="Buscar formulario" value={search} onChange={e=>find(e.target.value)}/></label></div><nav>{['Todos','Publicado','Borrador','Cerrado'].map((s,i)=><button key={s} className={s===filter?'active':''} onClick={()=>filterBy(s)}>{['Todos','Publicados','Borradores','Cerrados'][i]}</button>)}</nav>
 {note&&<p className="notice" role="status">{note}</p>}{!data&&!note&&<p>Cargando formularios…</p>}{data&&!found.length&&<div className="empty"><FolderOpen size={38}/><h2>{rows.length?'Sin coincidencias':'Tu biblioteca está vacía'}</h2><p>{rows.length?'Probá con otra búsqueda o filtro.':'Creá tu primer formulario para empezar a recibir respuestas.'}</p></div>}
 <div className="grid">{found.map(r=><article className="card formcard" key={r.id}><div className="bar"><FileText/><small>{status(r)}</small></div><h2>{r.title}</h2><p>{r.questions} preguntas · {r.responses} respuestas</p><div className="actions"><button disabled={busy} onClick={()=>void run(async()=>edit(await api('/admin/forms/'+r.id)))}><PenLine/>Editar</button><button onClick={()=>results(r)}><ChartNoAxesColumn/>Resultados</button></div>{r.slug&&<div className="actions"><button onClick={()=>void run(async()=>{await navigator.clipboard.writeText(location.origin+'/'+r.slug);say('Enlace copiado.')})}><Link/>Enlace</button><button onClick={()=>void run(async()=>{await api('/admin/forms/'+r.id+'/state','POST',{closed:!r.closed});await load()})}><LockKeyhole/>{r.closed?'Reabrir':'Cerrar'}</button></div>}</article>)}</div>
 {data&&<footer className="storage"><Database/><strong>Almacenamiento</strong><progress value={Number(data.storage.used)} max={Number(data.storage.quota)}/><span>{(data.storage.used/1e6).toLocaleString('es-UY',{maximumFractionDigits:1})} MB de {data.storage.quota/1e6} MB</span></footer>}</main></>
}
const pathname=location.pathname.replace(/^\/|\/$/g,'')
createRoot(document.getElementById('root')!).render(pathname?<Public slug={encodeURIComponent(pathname)}/>:<Panel/>)

