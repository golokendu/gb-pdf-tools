const $=id=>document.getElementById(id);
const buf=f=>f.arrayBuffer();
function on(id,fn){const e=$(id);if(e)e.onclick=fn;}
function dl(blob,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();
}
if(typeof pdfjsLib!=="undefined"){
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}
function parseRange(s,max){
  const set=new Set();
  s.split(",").forEach(part=>{
    part=part.trim();if(!part)return;
    const [a,b]=part.split("-").map(Number);
    const end=b||a;
    for(let i=a;i<=end;i++)if(i>=1&&i<=max)set.add(i-1);
  });
  return [...set].sort((x,y)=>x-y);
}

on("mergeBtn",async()=>{
  const {PDFDocument}=PDFLib;
  const files=$("mergeFiles").files,m=$("mergeMsg");
  if(files.length<2){m.textContent="Please select at least 2 PDFs.";return;}
  try{
    m.textContent="Working...";
    const out=await PDFDocument.create();
    for(const f of files){
      const src=await PDFDocument.load(await buf(f));
      const pages=await out.copyPages(src,src.getPageIndices());
      pages.forEach(p=>out.addPage(p));
    }
    dl(new Blob([await out.save()],{type:"application/pdf"}),"merged.pdf");
    m.textContent="Done! Download started.";
  }catch(e){m.textContent="Error: "+e.message;}
});

on("splitBtn",async()=>{
  const {PDFDocument}=PDFLib;
  const f=$("splitFile").files[0],m=$("splitMsg");
  if(!f){m.textContent="Please select a PDF.";return;}
  try{
    m.textContent="Working...";
    const src=await PDFDocument.load(await buf(f));
    const idx=parseRange($("splitRange").value,src.getPageCount());
    if(!idx.length){m.textContent="Enter valid pages (total: "+src.getPageCount()+").";return;}
    const out=await PDFDocument.create();
    (await out.copyPages(src,idx)).forEach(p=>out.addPage(p));
    dl(new Blob([await out.save()],{type:"application/pdf"}),"split.pdf");
    m.textContent="Done! Download started.";
  }catch(e){m.textContent="Error: "+e.message;}
});

on("j2pBtn",async()=>{
  const {PDFDocument}=PDFLib;
  const files=$("imgFiles").files,m=$("j2pMsg");
  if(!files.length){m.textContent="Please select images.";return;}
  try{
    m.textContent="Working...";
    const out=await PDFDocument.create();
    for(const f of files){
      const bytes=await buf(f);
      const img=f.type==="image/png"?await out.embedPng(bytes):await out.embedJpg(bytes);
      const page=out.addPage([img.width,img.height]);
      page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
    }
    dl(new Blob([await out.save()],{type:"application/pdf"}),"images.pdf");
    m.textContent="Done! Download started.";
  }catch(e){m.textContent="Error: "+e.message;}
});

on("p2jBtn",async()=>{
  const f=$("p2jFile").files[0],m=$("p2jMsg"),box=$("p2jLinks");
  box.innerHTML="";
  if(!f){m.textContent="Please select a PDF.";return;}
  try{
    m.textContent="Working...";
    const pdf=await pdfjsLib.getDocument({data:await buf(f)}).promise;
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const vp=page.getViewport({scale:2});
      const c=document.createElement("canvas");
      c.width=vp.width;c.height=vp.height;
      await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",0.92));
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);a.download="page-"+i+".jpg";
      a.textContent="Download page "+i+" (JPG)";
      box.appendChild(a);
    }
    m.textContent="Done! Tap each link to download.";
  }catch(e){m.textContent="Error: "+e.message;}
});

on("w2pBtn",async()=>{
  const f=$("docFile").files[0],m=$("w2pMsg"),box=$("docRender");
  if(!f){m.textContent="Please select a .docx file.";return;}
  if(!f.name.toLowerCase().endsWith(".docx")){m.textContent="Only .docx files are supported. Open old .doc files in Word and save as .docx first.";return;}
  try{
    m.textContent="Working...";
    const res=await mammoth.convertToHtml({arrayBuffer:await buf(f)});
    if(!res.value||!res.value.trim()){m.textContent="This document appears to be empty or unreadable.";return;}
    box.innerHTML=res.value;
    document.title=f.name.replace(/\.docx$/i,"");
    m.textContent="Print screen opening. Choose 'Save as PDF' as the destination.";
    await new Promise(r=>setTimeout(r,300));
    window.print();
  }catch(e){m.textContent="Error: "+e.message;}
});
