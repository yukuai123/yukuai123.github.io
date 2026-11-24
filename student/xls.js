/* Excel 97-2003 BIFF8 data reader. Implements MS-CFB and MS-XLS records;
   reads cached cell values only and never evaluates macros or formula code. */
(function(root){
'use strict';
const fail=s=>{throw Error('XLS读取失败：'+s);},UTF16=new TextDecoder('utf-16le');
function compound(input){
 const b=new Uint8Array(input),v=new DataView(input),sig=[208,207,17,224,161,177,26,225];
 if(!sig.every((x,i)=>b[i]===x))return b;
 if(b.length<512||v.getUint16(28,true)!==0xfffe)fail('复合文件头损坏');
 const major=v.getUint16(26,true),shift=v.getUint16(30,true),size=2**shift,miniSize=2**v.getUint16(32,true);
 if(![512,4096].includes(size)||miniSize!==64)fail('不支持的扇区大小');
 const maxSector=Math.floor(b.length/size)-1,sector=id=>{if(!Number.isInteger(id)||id<0||id>=maxSector)fail('扇区越界');return b.subarray((id+1)*size,(id+2)*size);};
 const u32=a=>{const d=new DataView(a.buffer,a.byteOffset,a.byteLength);return Array.from({length:Math.floor(a.length/4)},(_,i)=>d.getUint32(i*4,true));};
 let fatIds=[];for(let i=0;i<109;i++){const id=v.getUint32(76+i*4,true);if(id<0xfffffffa)fatIds.push(id);}
 let dif=v.getUint32(68,true);const seen=new Set();for(let n=0;n<v.getUint32(72,true);n++){
  if(seen.has(dif))fail('DIFAT链循环');seen.add(dif);const ids=u32(sector(dif));fatIds.push(...ids.slice(0,-1).filter(x=>x<0xfffffffa));dif=ids.at(-1);
 }
 const fatCount=v.getUint32(44,true);if(fatCount>maxSector||fatIds.length<fatCount)fail('FAT目录不完整');
 const fat=fatIds.slice(0,fatCount).flatMap(id=>u32(sector(id)));
 function chain(start,table,get,limit=100*1024*1024){const pieces=[],visited=new Set();let id=start,total=0;while(id<0xfffffffa){if(visited.has(id)||id>=table.length)fail('数据链损坏');visited.add(id);const part=get(id);total+=part.length;if(total>limit)fail('工作簿解压后过大');pieces.push(part);id=table[id];}if(id!==0xfffffffe&&pieces.length)fail('数据链未正常结束');const out=new Uint8Array(total);let pos=0;for(const p of pieces){out.set(p,pos);pos+=p.length;}return out;}
 const directory=chain(v.getUint32(48,true),fat,sector),dv=new DataView(directory.buffer),entries=[];
 for(let p=0;p+128<=directory.length;p+=128){const type=directory[p+66],nl=dv.getUint16(p+64,true);if(!type)continue;if(nl<2||nl>64)fail('目录名称损坏');const streamSize=dv.getUint32(p+120,true)+(major===4?dv.getUint32(p+124,true)*4294967296:0);entries.push({name:UTF16.decode(directory.subarray(p,p+nl-2)),type,start:dv.getUint32(p+116,true),size:streamSize});}
 const rootEntry=entries.find(e=>e.type===5),book=entries.find(e=>e.type===2&&/^(Workbook|Book)$/i.test(e.name));
 if(!book){if(entries.some(e=>e.name==='EncryptedPackage'))fail('文件已加密，请先在Excel中取消密码');fail('没有找到Workbook数据流');}
 if(book.size>100*1024*1024)fail('工作簿数据流过大');
 if(book.size>=v.getUint32(56,true))return chain(book.start,fat,sector).subarray(0,book.size);
 if(!rootEntry)fail('缺少根目录');const miniStream=chain(rootEntry.start,fat,sector).subarray(0,rootEntry.size);
 const miniFat=u32(chain(v.getUint32(60,true),fat,sector));
 return chain(book.start,miniFat,id=>{if((id+1)*miniSize>miniStream.length)fail('微型扇区越界');return miniStream.subarray(id*miniSize,(id+1)*miniSize);}).subarray(0,book.size);
}
class Segments{
 constructor(a){this.a=a;this.i=0;this.p=0;}
 ensure(){while(this.i<this.a.length&&this.p===this.a[this.i].length){this.i++;this.p=0;}if(this.i>=this.a.length)fail('共享字符串截断');}
 byte(){this.ensure();return this.a[this.i][this.p++];}
 short(){return this.byte()|this.byte()<<8;}
 long(){return(this.byte()+this.byte()*256+this.byte()*65536+this.byte()*16777216)>>>0;}
 skip(n){for(let j=0;j<n;j++)this.byte();}
 string(){const count=this.short(),flag=this.byte(),runs=flag&8?this.short():0,ext=flag&4?this.long():0;let wide=!!(flag&1),out='';
 for(let j=0;j<count;j++){
  if(this.p===this.a[this.i].length){this.i++;this.p=0;if(this.i>=this.a.length)fail('跨记录字符串截断');wide=!!(this.byte()&1);}
  const lo=this.byte(),hi=wide?this.byte():0;out+=String.fromCharCode(lo|hi<<8);
 }
 this.skip(runs*4+ext);return out;}
}
function rk(value){if(value&2)return(value>>2)/(value&1?100:1);const buf=new ArrayBuffer(8),v=new DataView(buf);v.setUint32(4,value&0xfffffffc,true);return v.getFloat64(0,true)/(value&1?100:1);}
function parse(input,filename){
 const book=compound(input),view=new DataView(book.buffer,book.byteOffset,book.byteLength),records=[];
 for(let p=0;p+4<=book.length;){const type=view.getUint16(p,true),n=view.getUint16(p+2,true);if(!type&&!n)break;if(p+4+n>book.length)fail('BIFF记录越界');records.push({type,offset:p,data:book.subarray(p+4,p+4+n)});p+=4+n;}
 if(!records.length||records[0].type!==0x0809)fail('不是Excel 97-2003二进制工作簿');
 if(new DataView(records[0].data.buffer,records[0].data.byteOffset).getUint16(0,true)!==0x0600)fail('目前支持Excel 97-2003 .xls，请将更早版本另存为此格式');
 if(records.some(r=>r.type===0x002f))fail('工作簿已加密，请先取消密码');
 let strings=[],sheets=[];
 for(let i=0;i<records.length;i++){const r=records[i],d=r.data,v=new DataView(d.buffer,d.byteOffset,d.byteLength);
  if(r.type===0x00fc){const parts=[d];while(records[i+1]?.type===0x003c)parts.push(records[++i].data);const reader=new Segments(parts);reader.long();const count=reader.long();if(count>1000000)fail('共享字符串过多');for(let k=0;k<count;k++)strings.push(reader.string());}
  else if(r.type===0x0085&&d[5]===0){const count=d[6],wide=!!(d[7]&1),bytes=d.subarray(8,8+count*(wide?2:1));sheets.push({offset:v.getUint32(0,true),name:wide?UTF16.decode(bytes):Array.from(bytes,x=>String.fromCharCode(x)).join('')});}
 }
 if(!sheets.length)fail('没有找到数据工作表');
 const errorNames={0:'#NULL!',7:'#DIV/0!',15:'#VALUE!',23:'#REF!',29:'#NAME?',36:'#NUM!',42:'#N/A'};
 return sheets.map(sheet=>{
  const rows=[];let pending=null,depth=0,started=false;
  const store=(row,col,val)=>{if(row>65535||col>255)fail('单元格位置无效');rows[row]??=[];rows[row][col]=val;};
  for(let i=0;i<records.length;i++){const rec=records[i];if(rec.offset<sheet.offset)continue;const d=rec.data,v=new DataView(d.buffer,d.byteOffset,d.byteLength),type=rec.type;
   if(type===0x0809){if(started)depth++;else started=true;continue;}
   if(type===0x000a){if(depth){depth--;continue;}break;}
   if(depth)continue;
   if(type===0x0207&&pending){const parts=[d];while(records[i+1]?.type===0x003c)parts.push(records[++i].data);const str=new Segments(parts).string();store(pending.row,pending.col,str);pending=null;continue;}
   if(![0x00fd,0x0203,0x027e,0x00bd,0x0205,0x0006,0x0204,0x00d6].includes(type))continue;
   if(d.length<6)fail('单元格记录截断');const row=v.getUint16(0,true),col=v.getUint16(2,true);
   if(type===0x00fd){const index=v.getUint32(6,true);if(index>=strings.length)fail('共享字符串索引越界');store(row,col,strings[index]);}
   else if(type===0x0203)store(row,col,v.getFloat64(6,true));
   else if(type===0x027e)store(row,col,rk(v.getUint32(6,true)));
   else if(type===0x00bd){const last=v.getUint16(d.length-2,true);for(let j=col;j<=last;j++)store(row,j,rk(v.getUint32(6+(j-col)*6,true)));}
   else if(type===0x0205)store(row,col,d[7]?errorNames[d[6]]??'#VALUE!':!!d[6]);
   else if(type===0x0006){if(d[12]===255&&d[13]===255){if(d[6]===0)pending={row,col};else if(d[6]===1)store(row,col,!!d[8]);else if(d[6]===2)store(row,col,errorNames[d[8]]??'#VALUE!');}else store(row,col,v.getFloat64(6,true));}
   else if(type===0x0204||type===0x00d6){const parts=[d.subarray(6)];while(records[i+1]?.type===0x003c)parts.push(records[++i].data);store(row,col,new Segments(parts).string());}
  }
  return {name:filename.replace(/\.xls$/i,''),file:filename,sheet:sheet.name,rows:Array.from({length:rows.length},(_,i)=>rows[i]??[])};
 });
}
root.LegacyXLS={parse,compound};
})(typeof window!=='undefined'?window:globalThis);
