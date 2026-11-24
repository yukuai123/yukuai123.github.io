/* Minimal OOXML reader/writer. No external services or third-party scripts. */
(function(root){
const enc=new TextEncoder(),dec=new TextDecoder();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Excel内的XML格式损坏');return d;};
const colNum=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
const colName=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
async function unzip(buffer){
 const a=new Uint8Array(buffer),v=new DataView(buffer);let eo=-1;
 for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){eo=i;break;}
 if(eo<0)throw Error('无法识别Excel文件，请选择标准 .xls 或 .xlsx 文件。');
 const entries=v.getUint16(eo+10,true);let p=v.getUint32(eo+16,true),out=new Map(),expanded=0;
 for(let i=0;i<entries;i++){
  if(v.getUint32(p,true)!==0x02014b50)throw Error('Excel ZIP目录损坏');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),original=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
  if(flags&1)throw Error('不支持加密工作簿，请先另存为未加密xlsx');
  const name=dec.decode(a.slice(p+46,p+46+nl));p+=46+nl+el+cl;
  if(!/^(xl\/.*\.xml|xl\/.*\.rels)$/.test(name))continue;
  expanded+=original;if(expanded>100*1024*1024)throw Error('解压后的工作簿超过100MB，请拆分文件');
  const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);const payload=a.slice(start,start+size);let bytes;
  if(method===0)bytes=payload;
  else if(method===8){try{bytes=new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}catch(e){throw Error('读取压缩Excel失败，请使用最新版Chrome或Edge打开工具。');}}
  else throw Error('不支持此Excel压缩方式，请重新另存为xlsx');
  out.set(name,dec.decode(bytes));
 }
 return out;
}
async function read(file){
 if(file.size>30*1024*1024)throw Error(`${file.name}超过30MB，请拆分文件`);
 const buffer=await file.arrayBuffer(),signature=new Uint8Array(buffer,0,Math.min(8,buffer.byteLength));
 if(signature[0]!==0x50||signature[1]!==0x4b){
  if(typeof LegacyXLS==='undefined')throw Error('旧版XLS读取组件未加载，请重新打开最新版工具。');
  return LegacyXLS.parse(buffer,file.name);
 }
 const files=await unzip(buffer);
 const strings=files.has('xl/sharedStrings.xml')?[...xml(files.get('xl/sharedStrings.xml')).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
 if(!files.has('xl/workbook.xml'))throw Error('文件缺少Excel工作簿信息');
 const wb=xml(files.get('xl/workbook.xml')),rels=xml(files.get('xl/_rels/workbook.xml.rels'));
 const targets=new Map([...rels.getElementsByTagName('Relationship')].map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
 const result=[];
 for(const s of wb.getElementsByTagName('sheet')){
  const target=targets.get(s.getAttribute('r:id'));if(!target)continue;let path=target.startsWith('/')?target.slice(1):'xl/'+target;path=path.replace(/^xl\/\.\//,'xl/');
  if(!files.has(path))continue;
  const rows=[];for(const r of xml(files.get(path)).getElementsByTagName('row')){
   const row=[];for(const c of r.getElementsByTagName('c')){const ref=c.getAttribute('r'),type=c.getAttribute('t'),vv=c.getElementsByTagName('v')[0]?.textContent;let val=null;
    if(type==='s')val=strings[Number(vv)]??null;else if(type==='inlineStr')val=[...c.getElementsByTagName('t')].map(t=>t.textContent).join('');else if(type==='str'||type==='e')val=vv??null;else if(vv!==undefined)val=Number(vv);
    row[colNum(ref.replace(/\d/g,''))]=val;
   }rows[Number(r.getAttribute('r'))-1]=row;
  }
  result.push({name:file.name.replace(/\.xlsx?$/i,''),file:file.name,sheet:s.getAttribute('name'),rows:Array.from({length:rows.length},(_,i)=>rows[i]??[])});
 }
 return result;
}
const crcTable=Array.from({length:256},(_,i)=>{for(let k=0;k<8;k++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
const crc=a=>{let c=0xffffffff;for(const x of a)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function zip(files){const parts=[],central=[];let offset=0;for(const [name,str]of files){const n=enc.encode(name),a=enc.encode(str),h=new Uint8Array(30+n.length),v=new DataView(h.buffer),check=crc(a);
v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,check,true);v.setUint32(18,a.length,true);v.setUint32(22,a.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,a);
const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,check,true);cv.setUint32(20,a.length,true);cv.setUint32(24,a.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);central.push(c);offset+=h.length+a.length;}
const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,central.reduce((s,a)=>s+a.length,0),true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
function write(sheets){const types=`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
const files=[['[Content_Types].xml',types],['_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],['xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`]];
sheets.forEach((s,i)=>files.push([`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${s.rows.map((r,j)=>`<row r="${j+1}">${r.map((v,k)=>v===null||v===undefined?'':typeof v==='number'?`<c r="${colName(k)}${j+1}"><v>${v}</v></c>`:`<c r="${colName(k)}${j+1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`]));return zip(files);}
root.ExcelIO={read,write,colName};
})(typeof window!=='undefined'?window:globalThis);
