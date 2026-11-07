import {blank, question, labels} from '../shared/forms.js'
export type Kind=keyof typeof labels
export type Rule={source:string,op:string,value:string}
export type Q=Omit<ReturnType<typeof question>,'rules'|'type'>&{type:Kind,rules:Rule[]}
export type Draft=Omit<ReturnType<typeof blank>,'questions'>&{questions:Q[]}
export type Form={id:string,slug:string|null,draft:Draft,version:number,revision:number,closed:boolean}
export type Answers=Record<string,string|string[]>
export async function api<T=any>(url:string,method='GET',body?:unknown):Promise<T>{
  const r=await fetch('/api'+url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined})
  const data=await r.json()
  if(!r.ok){if(data.login) location.assign(data.login);throw Error(data.error||'Falló la conexión.')}
  return data
}
export async function upload(url:string,file:File){
  if(file.size>10000000) throw Error('El archivo supera los 10 MB.')
  const r=await fetch('/api'+url,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file})
  const data=await r.json()
  if(!r.ok) throw Error(data.error)
  return data.id as string
}
export const msg=(e:unknown)=>e instanceof Error?e.message:'Falló la operación.'

