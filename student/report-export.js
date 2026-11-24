(function(root){
'use strict';
async function raster(svg,type='image/png'){
 const documentSvg=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(documentSvg.getElementsByTagName('parsererror').length||documentSvg.documentElement.localName!=='svg'){
  throw Error('报告图表格式不完整，请刷新页面后重新生成报告。');
 }
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
 try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=2480;canvas.height=3508;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,2480,3508);ctx.drawImage(img,0,0,2480,3508);const result=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),type,.96));canvas.width=1;canvas.height=1;
 if(type==='image/png'){
  const a=new Uint8Array(await result.arrayBuffer()),v=new DataView(a.buffer),parts=[a.slice(0,8)];let p=8,inserted=false;
  while(p<a.length){const n=v.getUint32(p),tag=new TextDecoder().decode(a.slice(p+4,p+8));if(tag==='IDAT'&&!inserted){const chunk=new Uint8Array(21),cv=new DataView(chunk.buffer);cv.setUint32(0,9);chunk.set([112,72,89,115],4);cv.setUint32(8,11811);cv.setUint32(12,11811);chunk[16]=1;cv.setUint32(17,crc(chunk.slice(4,17)));parts.push(chunk);inserted=true;}if(tag!=='pHYs')parts.push(a.slice(p,p+n+12));p+=n+12;}
  return new Blob(parts,{type:'image/png'});
 }
 return result;}finally{URL.revokeObjectURL(url);}
}
const encode=new TextEncoder();
async function pdf(svgs,onProgress=()=>{}){
 const chunks=[],offsets=[0];let length=0;const add=v=>{const bytes=typeof v==='string'?encode.encode(v):v;chunks.push(bytes);length+=bytes.length;};
 const N=svgs.length,count=2+3*N;
 function obj(id,content){offsets[id]=length;add(`${id} 0 obj\n${content}\nendobj\n`);}
 add('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Count ${N} /Kids [${svgs.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] >>`);
 for(let i=0;i<N;i++){
  onProgress(i+1,N);const image=new Uint8Array(await(await raster(svgs[i],'image/jpeg')).arrayBuffer()),id=3+i*3;
  obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
  offsets[id+1]=length;add(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 2480 /Height 3508 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);add(image);add('\nendstream\nendobj\n');
  const content='q\n595.2756 0 0 841.8898 0 0 cm\n/Im0 Do\nQ\n';obj(id+2,`<< /Length ${encode.encode(content).length} >>\nstream\n${content}endstream`);
  await new Promise(r=>setTimeout(r,0));
 }
 const start=length;add(`xref\n0 ${count+1}\n0000000000 65535 f \n`);for(let i=1;i<=count;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size ${count+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(chunks,{type:'application/pdf'});
}
function crc(a){let c=0xffffffff;for(const v of a){c^=v;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;}
async function pngZip(items,onProgress=()=>{}){
 const chunks=[],dirs=[];let offset=0;
 for(let i=0;i<items.length;i++){
  onProgress(i+1,items.length);const item=items[i],data=new Uint8Array(await(await raster(item.svg)).arrayBuffer()),name=encode.encode(item.name),check=crc(data),header=new Uint8Array(30+name.length),v=new DataView(header.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,check,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);chunks.push(header,data);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,check,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);dirs.push(central);offset+=header.length+data.length;
 }
 const e=new Uint8Array(22),v=new DataView(e.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,items.length,true);v.setUint16(10,items.length,true);v.setUint32(12,dirs.reduce((a,b)=>a+b.length,0),true);v.setUint32(16,offset,true);return new Blob([...chunks,...dirs,e],{type:'application/zip'});
}
root.ReportExport={raster,pdf,pngZip};
})(typeof window!=='undefined'?window:globalThis);
