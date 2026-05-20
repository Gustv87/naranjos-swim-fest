import{K as B,r as G,j as e,V as U,U as P,G as z,L as D,N as V,O as E,M as K}from"./vendor-Dcdc6Z_r.js";import{N as W,C as d,a as l,b as n,c as Y,d as c,l as _}from"./card-C3wU27kk.js";import{B as u,F as J}from"./footer-Ba09PSIE.js";import{B as q}from"./badge-B-6bKj3a.js";import{u as Q}from"./index-vvdaWki6.js";import"./radix-DaoyiNoS.js";import"./firebase-CQSQ02MQ.js";const re=()=>{const{eventId:m}=B(),{activeEvent:a,activeEventId:g,events:j,setActiveEventId:b}=Q();G.useEffect(()=>{m&&j.some(s=>s.id===m)&&g!==m&&b(m)},[g,m,j,b]);const M=new Date(a.dateTime),R=new Date(a.registrationCloseDateTime),v=M.toLocaleString("es-HN",{dateStyle:"long",timeStyle:"short"}),H=R.toLocaleDateString("es-HN",{dateStyle:"long"}),o=!!a.allowMultipleDistances,N=o?"Pruebas":"Distancias",f=[{icon:e.jsx(U,{className:"h-6 w-6"}),title:o?"Orden de Competencia":"Salida Escalonada",description:o?"Se nadarán primero todos los eventos de las damas y después los varones. La organización anunciará cada prueba y serie antes de su salida.":"Las salidas se realizarán por categorías de forma escalonada para garantizar la seguridad de todos los participantes."},{icon:e.jsx(P,{className:"h-6 w-6"}),title:"Límite de Participantes",description:`${a.capacityLimit?`Máximo ${a.capacityLimit} participantes.`:"Sin límite de participantes."} Las inscripciones se cerrarán el ${H}.`},{icon:e.jsx(z,{className:"h-6 w-6"}),title:"Equipo de Seguridad",description:o?"Personal de apoyo, salvavidas y asistencia de primeros auxilios estarán presentes durante el desarrollo de la competencia.":"Salvavidas certificados, embarcaciones de apoyo, paramédicos y ambulancia estarán presentes durante todo el evento."}],y=a.distances.map(s=>({distance:s.label,groups:s.categories.map(r=>r.label)})),w=["Gorro de natación","Traje de baño adecuado","Gafas de natación (recomendadas)"],$=o?["Material de propulsión (aletas, paletas, snorkel, etc.)","Dispositivos de flotación artificiales","Salida antes de la señal oficial","Interferir con otro nadador o cambiarse de carril sin autorización"]:["Material de propulsión (aletas, paletas, etc.)","Dispositivos de flotación artificiales","Aparatos electrónicos no autorizados","Elementos que puedan afectar la seguridad"],p=o?["Salvavidas o personal de apoyo en el área de piscina","Primeros auxilios disponibles","Control de salida y llegada por parte de la organización","Área de competencia supervisada"]:["Salvavidas certificados","Embarcaciones de apoyo","Paramédicos en meta","Ambulancia disponible"],S=o?"Condiciones de Piscina y Competencia":"Condiciones Climáticas y del Agua",L=o?"La organización se reserva el derecho de modificar el orden de pruebas, series o carriles por razones operativas, seguridad o desarrollo del evento.":"La organización se reserva el derecho de suspender, posponer o modificar el evento en caso de condiciones climáticas adversas o calidad del agua que comprometan la seguridad de los participantes.",C=o?"El área de piscina, orden de pruebas y condiciones de competencia serán supervisadas durante todo el evento. Cualquier cambio será comunicado a los participantes.":"Las condiciones del lago y el clima serán monitoreadas constantemente. Cualquier cambio o decisión será comunicada a los participantes con la mayor anticipación posible.",i=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),A=()=>{const s=window.open("","_blank");if(!s){alert("Permite ventanas emergentes en tu navegador para generar el PDF.");return}const x=new Date().toLocaleString("es-HN",{dateStyle:"medium",timeStyle:"short"}),h=`<div class="logo"><img src="${_}" alt="Swim Plus" /></div>`,I=f.map(t=>`
      <div class="rule">
        <h3>${i(t.title)}</h3>
        <p>${i(t.description)}</p>
      </div>
    `).join(""),k=y.map(t=>`
      <section class="category">
        <h3>${i(t.distance)}</h3>
        <ul>
          ${t.groups.map(F=>`<li>${i(F)}</li>`).join("")}
        </ul>
      </section>
    `).join(""),T=w.map(t=>`<li>${i(t)}</li>`).join(""),O=$.map(t=>`<li>${i(t)}</li>`).join("");s.document.write(`
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
          ${h}
          <h1>Reglamento Oficial</h1>
          <div class="meta">${i(a.name)}<br>Generado el ${i(x)}</div>
          <div class="event-info">
            <dl>
              <dt>Fecha:</dt><dd>${i(v)}</dd>
              <dt>Lugar:</dt><dd>${i(a.location)}</dd>
              <dt>Organiza:</dt><dd>Swim + plus HN</dd>
              <dt>Cupo:</dt><dd>${a.capacityLimit?`Máximo ${a.capacityLimit} participantes`:"Sin límite"}</dd>
              <dt>Inscripción:</dt><dd>L. ${i(a.price)}. ${i(a.paymentInfo)}</dd>
            </dl>
          </div>
          <div class="section">
            <h2>Normas Principales</h2>
            ${I}
          </div>
          <div class="section">
            <h2>${i(N)} y Categorías</h2>
            ${k}
          </div>
          <div class="section">
            <h2>Equipo Permitido</h2>
            <ul>${T}</ul>
          </div>
          <div class="section">
            <h2>Equipo Prohibido</h2>
            <ul>${O}</ul>
          </div>
          <div class="section">
            <h2>Medidas de Seguridad</h2>
            <ul>
              ${p.map(t=>`<li>${i(t)}</li>`).join("")}
            </ul>
          </div>
          <div class="section">
            <h2>${i(S)}</h2>
            <p>${i(L)}</p>
            <p>${i(C)}</p>
          </div>
        </body>
      </html>
    `),s.document.close(),setTimeout(()=>{s.print()},250)};return e.jsxs("div",{className:"min-h-screen bg-background flex flex-col",children:[e.jsx(W,{}),e.jsxs("div",{className:"flex-1 max-w-4xl mx-auto px-4 py-8",children:[e.jsx("div",{className:"mb-8",children:e.jsx(D,{to:`/eventos/${a.id}`,children:e.jsxs(u,{variant:"ghost",children:[e.jsx(V,{className:"mr-2 h-4 w-4"}),"Volver al evento"]})})}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsxs(l,{className:"text-center",children:[e.jsx(q,{variant:"secondary",className:"mx-auto mb-4 w-fit",children:"Documento Oficial"}),e.jsx(n,{className:"text-3xl text-primary",children:"Reglamento Oficial"}),e.jsx(Y,{className:"text-lg",children:a.name})]}),e.jsx(c,{className:"text-center",children:e.jsx("div",{className:"flex flex-wrap justify-center gap-3",children:e.jsxs(u,{size:"lg",className:"button-gradient shadow-button",onClick:A,children:[e.jsx(E,{className:"mr-2 h-5 w-5"}),"Generar PDF del Reglamento"]})})})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsxs(n,{className:"text-2xl text-primary flex items-center gap-2",children:[e.jsx(K,{className:"h-6 w-6"}),"Información del Evento"]})}),e.jsxs(c,{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Fecha y Hora"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:v}),e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Ubicación"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:a.location}),e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Organización"}),e.jsx("p",{className:"text-muted-foreground",children:"Swim + plus HN"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Cupo"}),e.jsx("p",{className:"text-muted-foreground",children:a.capacityLimit?`Máximo ${a.capacityLimit} participantes`:"Sin límite"})]})]})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsx(n,{className:"text-2xl text-primary",children:"Normas Principales"})}),e.jsx(c,{children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[f.map((s,r)=>e.jsxs("div",{className:"flex items-start gap-4 p-4 rounded-lg bg-muted/30",children:[e.jsx("div",{className:"text-primary",children:s.icon}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:s.title}),e.jsx("p",{className:"text-sm text-muted-foreground",children:s.description})]})]},r)),e.jsxs("div",{className:"flex items-start gap-4 p-4 rounded-lg bg-muted/30",children:[e.jsx("div",{className:"text-primary",children:e.jsx(P,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Costo de Inscripción"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["L ",a.price,". ",a.paymentInfo]})]})]})]})})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsxs(n,{className:"text-2xl text-primary",children:[N," y Categorías"]})}),e.jsx(c,{children:e.jsx("div",{className:"space-y-6",children:y.map((s,r)=>e.jsxs("div",{className:"border-l-4 border-primary pl-6",children:[e.jsx("h4",{className:"text-xl font-semibold text-primary mb-3",children:s.distance}),e.jsx("div",{className:"flex flex-wrap gap-2",children:s.groups.map((x,h)=>e.jsx(q,{variant:"secondary",children:x},h))})]},r))})})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-8 mb-8",children:[e.jsxs(d,{className:"card-gradient shadow-card",children:[e.jsx(l,{children:e.jsx(n,{className:"text-xl text-primary",children:"Equipo Permitido"})}),e.jsx(c,{children:e.jsx("ul",{className:"space-y-3",children:w.map((s,r)=>e.jsxs("li",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-2 h-2 bg-primary rounded-full mt-2"}),e.jsx("span",{className:"text-sm",children:s})]},r))})})]}),e.jsxs(d,{className:"card-gradient shadow-card",children:[e.jsx(l,{children:e.jsx(n,{className:"text-xl text-destructive",children:"Equipo Prohibido"})}),e.jsx(c,{children:e.jsx("ul",{className:"space-y-3",children:$.map((s,r)=>e.jsxs("li",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-2 h-2 bg-destructive rounded-full mt-2"}),e.jsx("span",{className:"text-sm",children:s})]},r))})})]})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsxs(n,{className:"text-2xl text-primary flex items-center gap-2",children:[e.jsx(z,{className:"h-6 w-6"}),"Medidas de Seguridad"]})}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Personal de Seguridad"}),e.jsx("ul",{className:"text-sm text-muted-foreground space-y-1",children:p.slice(0,3).map(s=>e.jsxs("li",{children:["• ",s]},s))})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Asistencia Médica"}),e.jsxs("ul",{className:"text-sm text-muted-foreground space-y-1",children:[p.slice(3).map(s=>e.jsxs("li",{children:["• ",s]},s)),e.jsx("li",{children:"• Botiquín de primeros auxilios"})]})]})]}),e.jsxs("div",{className:"bg-muted/30 p-4 rounded-lg",children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Retiro Voluntario"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Los participantes pueden retirarse voluntariamente en cualquier momento, pero deben avisar inmediatamente al personal de apoyo más cercano."})]})]})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsx(n,{className:"text-2xl text-primary",children:S})}),e.jsxs(c,{className:"space-y-4",children:[e.jsx("p",{className:"text-muted-foreground",children:L}),e.jsxs("div",{className:"bg-lake-light/20 p-4 rounded-lg border border-lake-blue/20",children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Monitoreo Continuo"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:C})]})]})]}),e.jsxs(d,{className:"card-gradient shadow-card mb-8",children:[e.jsx(l,{children:e.jsx(n,{className:"text-2xl text-primary",children:"Reclamaciones y Resultados"})}),e.jsx(c,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Tiempo para Reclamaciones"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Las reclamaciones sobre resultados deben presentarse hasta 30 minutos después de la publicación de los resultados oficiales."})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-primary mb-2",children:"Publicación de Resultados"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Los resultados se publicarán en el sitio web oficial y en el área de premiación el mismo día del evento."})]})]})})]}),e.jsxs(d,{className:"bg-destructive/5 border-destructive/20 shadow-card mb-8",children:[e.jsx(l,{children:e.jsx(n,{className:"text-2xl text-destructive",children:"Aviso de Responsabilidad y Condiciones de Participación"})}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("p",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:"IMPORTANTE:"})," Al inscribirse en este evento, el participante entiende y acepta que:"]}),e.jsxs("ul",{className:"text-sm text-muted-foreground space-y-2 pl-4",children:[e.jsx("li",{children:"• Ha leído y está de acuerdo con el reglamento del evento."}),e.jsx("li",{children:"• Los organizadores no se hacen responsables por accidentes, lesiones o daños."}),e.jsx("li",{children:"• Declara estar en buena condición física y sin problemas médicos que le impidan participar."}),e.jsx("li",{children:"• Autoriza a recibir atención médica en caso de emergencia."}),e.jsx("li",{children:"• Se compromete a usar el equipo requerido y seguir todas las instrucciones del personal."}),e.jsx("li",{children:"• Acepta que la inscripción no es reembolsable."}),e.jsx("li",{children:"• Autoriza el uso de su imagen en fotografías o videos del evento."}),e.jsx("li",{children:"• Si es menor de edad, confirma que su padre, madre o tutor realizó la inscripción y asume la responsabilidad."})]}),e.jsx("div",{className:"bg-destructive/10 p-4 rounded-lg border border-destructive/20",children:e.jsx("p",{className:"text-sm font-medium text-destructive",children:"La participación en este evento es bajo la total responsabilidad del participante."})})]})]}),e.jsx("div",{className:"text-center",children:e.jsx(D,{to:`/eventos/${a.id}/inscripcion`,children:e.jsxs(u,{size:"lg",className:"button-gradient shadow-button text-lg px-12 py-6",children:[e.jsx(E,{className:"mr-2 h-5 w-5"}),"Proceder a Inscripción"]})})})]}),e.jsx(J,{})]})};export{re as default};
