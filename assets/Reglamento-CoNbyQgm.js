import{j as e,J as E,U as b,S as N,L as f,I as R,F as v,M as H}from"./vendor-DUIQUKnV.js";import{N as A,C as r,a as d,b as l,c as M,d as c}from"./card-5rIHRlBz.js";import{B as x}from"./button-D0lEg1HC.js";import{B as y}from"./badge-Cu41TsSh.js";import{l as k}from"./Logo-DsMBfIr-.js";import{u as T}from"./index-B2939b0h.js";import"./radix-DYQLFqfF.js";import"./firebase-C9ZSkJuO.js";const W=()=>{const{activeEvent:a}=T(),w=new Date(a.dateTime),S=new Date(a.registrationCloseDateTime),p=w.toLocaleString("es-HN",{dateStyle:"long",timeStyle:"short"}),L=S.toLocaleDateString("es-HN",{dateStyle:"long"}),h=[{icon:e.jsx(E,{className:"h-6 w-6"}),title:"Salida Escalonada",description:"Las salidas se realizarán por categorías de forma escalonada para garantizar la seguridad de todos los participantes."},{icon:e.jsx(b,{className:"h-6 w-6"}),title:"Límite de Participantes",description:`${a.capacityLimit?`Máximo ${a.capacityLimit} participantes.`:"Sin límite de participantes."} Las inscripciones se cerrarán el ${L}.`},{icon:e.jsx(N,{className:"h-6 w-6"}),title:"Equipo de Seguridad",description:"Salvavidas certificados, embarcaciones de apoyo, paramédicos y ambulancia estarán presentes durante todo el evento."}],u=a.distances.map(s=>({distance:s.label,groups:s.categories.map(t=>t.label)})),g=["Gorro de natación","Traje de baño adecuado","Gafas de natación (recomendadas)"],j=["Material de propulsión (aletas, paletas, etc.)","Dispositivos de flotación artificiales","Aparatos electrónicos no autorizados","Elementos que puedan afectar la seguridad"],i=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),$=()=>{const s=window.open("","_blank");if(!s){alert("Permite ventanas emergentes en tu navegador para generar el PDF.");return}const o=new Date().toLocaleString("es-HN",{dateStyle:"medium",timeStyle:"short"}),m=`<div class="logo"><img src="${k}" alt="Swim Plus" /></div>`,P=h.map(n=>`
      <div class="rule">
        <h3>${i(n.title)}</h3>
        <p>${i(n.description)}</p>
      </div>
    `).join(""),C=u.map(n=>`
      <section class="category">
        <h3>${i(n.distance)}</h3>
        <ul>
          ${n.groups.map(D=>`<li>${i(D)}</li>`).join("")}
        </ul>
      </section>
    `).join(""),q=g.map(n=>`<li>${i(n)}</li>`).join(""),z=j.map(n=>`<li>${i(n)}</li>`).join("");s.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Reglamento Oficial - Swim Plus</title>
          <style>
            :root { color-scheme: only light; }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 32px;
              color: #111827;
              line-height: 1.5;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 26px;
              text-align: center;
              color: #111827;
            }
            h2 {
              margin: 24px 0 12px;
              font-size: 20px;
              color: #2563eb;
            }
            h3 {
              margin: 16px 0 6px;
              font-size: 16px;
            }
            .meta {
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .logo {
              text-align: center;
              margin-bottom: 16px;
            }
            .logo img {
              max-width: 200px;
              height: auto;
              display: block;
              margin: 0 auto;
              background: transparent;
              border-radius: 0;
            }
            .intro, .section {
              margin-bottom: 20px;
            }
            .event-info {
              border: 1px solid #d1d5db;
              padding: 16px;
              border-radius: 8px;
              background: #f9fafb;
            }
            .event-info dl {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 8px;
            }
            .event-info dt {
              font-weight: 600;
            }
            ul {
              padding-left: 24px;
            }
            @media print {
              body { margin: 16px; }
              h1 { font-size: 22px; }
              h2 { font-size: 18px; }
            }
          </style>
        </head>
        <body>
          ${m}
          <h1>Reglamento Oficial</h1>
          <div class="meta">${i(a.name)}<br>Generado el ${i(o)}</div>
          <div class="event-info">
            <dl>
              <dt>Fecha:</dt><dd>${i(p)}</dd>
              <dt>Lugar:</dt><dd>${i(a.location)}</dd>
              <dt>Organiza:</dt><dd>Swim + plus HN</dd>
              <dt>Cupo:</dt><dd>${a.capacityLimit?`Máximo ${a.capacityLimit} participantes`:"Sin límite"}</dd>
              <dt>Inscripción:</dt><dd>L. ${i(a.price)}. ${i(a.paymentInfo)}</dd>
            </dl>
          </div>
          <div class="section">
            <h2>Normas Principales</h2>
            ${P}
          </div>
          <div class="section">
            <h2>Distancias y Categorías</h2>
            ${C}
          </div>
          <div class="section">
            <h2>Equipo Permitido</h2>
            <ul>${q}</ul>
          </div>
          <div class="section">
            <h2>Equipo Prohibido</h2>
            <ul>${z}</ul>
          </div>
          <div class="section">
            <h2>Medidas de Seguridad</h2>
            <ul>
              <li>Salvavidas certificados</li>
              <li>Embarcaciones de apoyo</li>
              <li>Paramédicos en meta</li>
              <li>Ambulancia disponible</li>
            </ul>
          </div>
        </body>
      </html>
    `),s.document.close(),setTimeout(()=>{s.print()},250)};return e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx(A,{}),e.jsxs("div",{className:"max-w-4xl mx-auto px-4 py-8",children:[e.jsx("div",{className:"mb-8",children:e.jsx(f,{to:"/",children:e.jsxs(x,{variant:"ghost",children:[e.jsx(R,{className:"mr-2 h-4 w-4"}),"Volver al inicio"]})})}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsxs(d,{className:"text-center",children:[e.jsx(y,{variant:"secondary",className:"mx-auto mb-4 w-fit",children:"Documento Oficial"}),e.jsx(l,{className:"text-3xl text-primary",children:"Reglamento Oficial"}),e.jsx(M,{className:"text-lg",children:a.name})]}),e.jsx(c,{className:"text-center",children:e.jsx("div",{className:"flex flex-wrap justify-center gap-3",children:e.jsxs(x,{size:"lg",className:"button-gradient shadow-button",onClick:$,children:[e.jsx(v,{className:"mr-2 h-5 w-5"}),"Generar PDF del Reglamento"]})})})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsxs(l,{className:"text-2xl text-primary flex items-center gap-2",children:[e.jsx(H,{className:"h-6 w-6"}),"Información del Evento"]})}),e.jsxs(c,{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Fecha y Hora"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:p}),e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Ubicación"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:a.location}),e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Organización"}),e.jsx("p",{className:"text-muted-foreground",children:"Swim + plus HN"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Cupo"}),e.jsx("p",{className:"text-muted-foreground",children:a.capacityLimit?`Máximo ${a.capacityLimit} participantes`:"Sin límite"})]})]})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsx(l,{className:"text-2xl text-primary",children:"Normas Principales"})}),e.jsx(c,{children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[h.map((s,t)=>e.jsxs("div",{className:"flex items-start gap-4 p-4 rounded-lg bg-muted/30",children:[e.jsx("div",{className:"text-primary",children:s.icon}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:s.title}),e.jsx("p",{className:"text-sm text-muted-foreground",children:s.description})]})]},t)),e.jsxs("div",{className:"flex items-start gap-4 p-4 rounded-lg bg-muted/30",children:[e.jsx("div",{className:"text-primary",children:e.jsx(b,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Costo de Inscripción"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["L ",a.price,". ",a.paymentInfo]})]})]})]})})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsx(l,{className:"text-2xl text-primary",children:"Distancias y Categorías"})}),e.jsx(c,{children:e.jsx("div",{className:"space-y-6",children:u.map((s,t)=>e.jsxs("div",{className:"border-l-4 border-primary pl-6",children:[e.jsx("h4",{className:"text-xl font-semibold text-primary mb-3",children:s.distance}),e.jsx("div",{className:"flex flex-wrap gap-2",children:s.groups.map((o,m)=>e.jsx(y,{variant:"secondary",children:o},m))})]},t))})})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-8 mb-8",children:[e.jsxs(r,{className:"card-gradient shadow-card",children:[e.jsx(d,{children:e.jsx(l,{className:"text-xl text-primary",children:"Equipo Permitido"})}),e.jsx(c,{children:e.jsx("ul",{className:"space-y-3",children:g.map((s,t)=>e.jsxs("li",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-2 h-2 bg-primary rounded-full mt-2"}),e.jsx("span",{className:"text-sm",children:s})]},t))})})]}),e.jsxs(r,{className:"card-gradient shadow-card",children:[e.jsx(d,{children:e.jsx(l,{className:"text-xl text-destructive",children:"Equipo Prohibido"})}),e.jsx(c,{children:e.jsx("ul",{className:"space-y-3",children:j.map((s,t)=>e.jsxs("li",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-2 h-2 bg-destructive rounded-full mt-2"}),e.jsx("span",{className:"text-sm",children:s})]},t))})})]})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsxs(l,{className:"text-2xl text-primary flex items-center gap-2",children:[e.jsx(N,{className:"h-6 w-6"}),"Medidas de Seguridad"]})}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Personal de Seguridad"}),e.jsxs("ul",{className:"text-sm text-muted-foreground space-y-1",children:[e.jsx("li",{children:"• Salvavidas certificados"}),e.jsx("li",{children:"• Embarcaciones de apoyo"}),e.jsx("li",{children:"• Personal de rescate acuático"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Asistencia Médica"}),e.jsxs("ul",{className:"text-sm text-muted-foreground space-y-1",children:[e.jsx("li",{children:"• Paramédicos en meta"}),e.jsx("li",{children:"• Ambulancia disponible"}),e.jsx("li",{children:"• Botiquín de primeros auxilios"})]})]})]}),e.jsxs("div",{className:"bg-muted/30 p-4 rounded-lg",children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Retiro Voluntario"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Los participantes pueden retirarse voluntariamente en cualquier momento, pero deben avisar inmediatamente al personal de seguridad más cercano."})]})]})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsx(l,{className:"text-2xl text-primary",children:"Condiciones Climáticas y del Agua"})}),e.jsxs(c,{className:"space-y-4",children:[e.jsx("p",{className:"text-muted-foreground",children:"La organización se reserva el derecho de suspender, posponer o modificar el evento en caso de condiciones climáticas adversas o calidad del agua que comprometan la seguridad de los participantes."}),e.jsxs("div",{className:"bg-lake-light/20 p-4 rounded-lg border border-lake-blue/20",children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Monitoreo Continuo"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Las condiciones del lago y el clima serán monitoreadas constantemente. Cualquier cambio o decisión será comunicada a los participantes con la mayor anticipación posible."})]})]})]}),e.jsxs(r,{className:"card-gradient shadow-card mb-8",children:[e.jsx(d,{children:e.jsx(l,{className:"text-2xl text-primary",children:"Reclamaciones y Resultados"})}),e.jsx(c,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Tiempo para Reclamaciones"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Las reclamaciones sobre resultados deben presentarse hasta 30 minutos después de la publicación de los resultados oficiales."})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Publicación de Resultados"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Los resultados se publicarán en el sitio web oficial y en el área de premiación el mismo día del evento."})]})]})})]}),e.jsxs(r,{className:"bg-destructive/5 border-destructive/20 shadow-card mb-8",children:[e.jsx(d,{children:e.jsx(l,{className:"text-2xl text-destructive",children:"Aviso de Responsabilidad y Condiciones de Participación"})}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("p",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:"IMPORTANTE:"})," Al inscribirse en este evento, el participante entiende y acepta que:"]}),e.jsxs("ul",{className:"text-sm text-muted-foreground space-y-2 pl-4",children:[e.jsx("li",{children:"• Ha leído y está de acuerdo con el reglamento del evento."}),e.jsx("li",{children:"• Los organizadores no se hacen responsables por accidentes, lesiones o daños."}),e.jsx("li",{children:"• Declara estar en buena condición física y sin problemas médicos que le impidan participar."}),e.jsx("li",{children:"• Autoriza a recibir atención médica en caso de emergencia."}),e.jsx("li",{children:"• Se compromete a usar el equipo de seguridad requerido y seguir todas las instrucciones del personal."}),e.jsx("li",{children:"• Acepta que la inscripción no es reembolsable."}),e.jsx("li",{children:"• Autoriza el uso de su imagen en fotografías o videos del evento."}),e.jsx("li",{children:"• Si es menor de edad, confirma que su padre, madre o tutor realizó la inscripción y asume la responsabilidad."})]}),e.jsx("div",{className:"bg-destructive/10 p-4 rounded-lg border border-destructive/20",children:e.jsx("p",{className:"text-sm font-medium text-destructive",children:"La participación en este evento es bajo la total responsabilidad del participante."})})]})]}),e.jsx("div",{className:"text-center",children:e.jsx(f,{to:"/inscripcion",children:e.jsxs(x,{size:"lg",className:"button-gradient shadow-button text-lg px-12 py-6",children:[e.jsx(v,{className:"mr-2 h-5 w-5"}),"Proceder a Inscripción"]})})})]})]})};export{W as default};
