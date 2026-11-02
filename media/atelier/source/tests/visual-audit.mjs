// Browser-computed text contrast, including alpha compositing of CSS surfaces.
// Canvas artwork is reviewed separately in screenshots, not certified by this.
export async function auditTextContrast(page) {
  return page.evaluate(() => {
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const rgba=value=>{
      ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
      return [...ctx.getImageData(0,0,1,1).data].map((n,i)=>i===3?n/255:n);
    };
    const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3]));
    const luminance=rgb=>rgb.slice(0,3).map(value=>{
      const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
    }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const root=document.querySelector('dialog[open]')||document.body;
    const rows=[...root.querySelectorAll('*')].filter(el=>
      el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&
      [...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim())
    ).map(el=>{
      const chain=[];let opacity=1;
      for(let p=el;p;p=p.parentElement){chain.unshift(p);opacity*=Number(getComputedStyle(p).opacity);}
      let background=[255,255,255];
      for(const ancestor of chain)background=over(rgba(getComputedStyle(ancestor).backgroundColor),background);
      const style=getComputedStyle(el),foreground=rgba(style.color);
      foreground[3]*=opacity;
      const values=[luminance(over(foreground,background)),luminance(background)].sort((a,b)=>b-a);
      return {text:el.textContent.trim().slice(0,100),selector:el.id||el.className,
        ratio:Number(((values[0]+.05)/(values[1]+.05)).toFixed(2)),
        disabled:Boolean(el.closest(':disabled')),fontSize:style.fontSize};
    });
    const enabled=rows.filter(row=>!row.disabled);
    return {labelsChecked:enabled.length,minimumRatio:Math.min(...enabled.map(row=>row.ratio)),
      disabledExemptions:rows.length-enabled.length,failures:enabled.filter(row=>row.ratio<4.5)};
  });
}
