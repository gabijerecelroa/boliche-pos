const fs = require('fs');
const path = 'src/App.jsx';
let code = fs.readFileSync(path, 'utf8');

function replaceSection(startStr, endStr, newContent, includeEnd = false) {
  const s = code.indexOf(startStr);
  const e = code.indexOf(endStr, s);
  if (s === -1 || e === -1) {
    console.log("❌ No se encontró la sección:", startStr.slice(0, 30));
    process.exit(1);
  }
  const cutEnd = includeEnd ? e + endStr.length : e;
  code = code.slice(0, s) + newContent + code.slice(cutEnd);
}

// 1. Agregar estados nuevos para DNI, WhatsApp, Box seleccionado y Pagina de Confirmacion
replaceSection(
  "const [tabTienda, setTabTienda] = useState('entradas');",
  "const ordenarBoxes",
  `const [tabTienda, setTabTienda] = useState('entradas');
  const [dniWeb, setDniWeb] = useState('');
  const [telWeb, setTelWeb] = useState('');
  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [errorPago, setErrorPago] = useState(false);

  `
);

// 2. Actualizar verificacion de Mercado Pago (guardando DNI, WhatsApp y redirigiendo a pagina dedicada)
replaceSection(
  "  useEffect(() => {\n    const verificarPagoOnline = async () => {",
  "    verificarPagoOnline();\n  }, []);",
  `  useEffect(() => {
    const verificarPagoOnline = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('status') === 'approved' || params.get('pago') === 'exito') {
        const pendiente = JSON.parse(localStorage.getItem('compra_pendiente'));
        if (pendiente) {
          setLoading(true);
          const { data: sData } = await supabase.from('sesiones').select('id, nombre_fiesta').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
          const sId = sData && sData.length > 0 ? sData[0].id : null;
          const prefijo = pendiente.tipo === 'vip' ? 'VIP-' : (pendiente.tipo === 'box' ? 'BOX-' : 'GEN-'); 
          const codigo = prefijo + Math.random().toString(36).substr(2, 5).toUpperCase();
          const hora = new Date().toLocaleTimeString();
          
          const nombreCompleto = \`\${pendiente.nombre}\${pendiente.dni ? ' | DNI: ' + pendiente.dni : ''}\`;
          const contactoWeb = pendiente.tel ? \`Web | Tel: \${pendiente.tel}\` : 'Tienda Online';

          await supabase.from('listas_vip').insert([{ 
            sesion_id: sId, 
            nombre: nombreCompleto + (pendiente.tipo === 'box' ? \` (\${pendiente.box_nombre})\` : ' (Online)'), 
            cantidad: pendiente.cantidad, 
            ingresados: 0, 
            codigo, 
            tipo_pase: pendiente.tipo, 
            creado_por: contactoWeb, 
            hora_creacion: hora 
          }]);
          
          if (pendiente.tipo === 'box') {
            await supabase.from('reservas_boxes').insert([{ 
              sesion_id: sId, 
              nombre_cliente: \`\${pendiente.nombre} | DNI: \${pendiente.dni || '-'} | Tel: \${pendiente.tel || '-'}\`, 
              box_nombre: \`\${pendiente.box_nombre} [QR: \${codigo}]\`, 
              descripcion: pendiente.box_desc, 
              estado: 'pendiente', 
              fecha: hora 
            }]);
          }

          setQrGenerado({ 
            nombre: pendiente.nombre, 
            dni: pendiente.dni || '', 
            tel: pendiente.tel || '', 
            cantidad: pendiente.cantidad, 
            codigo, 
            tipo_pase: pendiente.tipo, 
            fiesta: sData && sData[0] ? sData[0].nombre_fiesta : 'FIESTA GJBROSS', 
            box_nombre: pendiente.box_nombre || '',
            box_desc: pendiente.box_desc || '' 
          });
          localStorage.removeItem('compra_pendiente');
          window.history.replaceState({}, document.title, "/?tienda=true&ticket=" + codigo);
          setLoading(false);
        }
      } else if (params.get('status') === 'rejected' || params.get('pago') === 'fallo') {
        setErrorPago(true);
        window.history.replaceState({}, document.title, "/?tienda=true&pago=error");
      }
    };
    verificarPagoOnline();
  }, []);`,
  true
);

// 3. Actualizar funciones de compra online (Entradas y Boxes con DNI y Telefono)
replaceSection(
  "  const handleComprarEntrada = async (e) => {",
  "  const ejecutarPagoMP = async",
  `  const handleComprarEntrada = async (e) => {
    e.preventDefault();
    if (!nombreWeb.trim() || !dniWeb.trim() || !telWeb.trim()) return alert("Por favor completa Nombre, DNI y WhatsApp");
    setLoading(true);
    const precio = tipoWeb === 'general' ? preciosWeb.general : preciosWeb.vip;
    localStorage.setItem('compra_pendiente', JSON.stringify({ 
      nombre: nombreWeb.trim(), 
      dni: dniWeb.trim(), 
      tel: telWeb.trim(), 
      tipo: tipoWeb, 
      cantidad: cantWeb 
    }));
    ejecutarPagoMP(\`Entrada \${tipoWeb.toUpperCase()} GJBROSS\`, precio * cantWeb, cantWeb, tipoWeb);
  };

  const handleComprarBox = async (e) => {
    e.preventDefault();
    if (!boxSeleccionado) return;
    if (!nombreWeb.trim() || !dniWeb.trim() || !telWeb.trim()) return alert("Por favor completa Nombre, DNI y WhatsApp");
    setLoading(true);
    localStorage.setItem('compra_pendiente', JSON.stringify({ 
      nombre: nombreWeb.trim(), 
      dni: dniWeb.trim(), 
      tel: telWeb.trim(), 
      tipo: 'box', 
      cantidad: 10, 
      box_nombre: boxSeleccionado.nombre, 
      box_desc: boxSeleccionado.descripcion 
    }));
    ejecutarPagoMP(\`Reserva \${boxSeleccionado.nombre}\`, boxSeleccionado.precio, 1, 'box');
  };

  `
);

// 4. Incluir el DNI tambien en la imagen descargable si existe
code = code.replace(
  "ctx.fillStyle = '#fbbf24'; ctx.font = '60px sans-serif'; ctx.fillText(qrData.nombre.toUpperCase(), 540, 600, 900);",
  "ctx.fillStyle = '#fbbf24'; ctx.font = '55px sans-serif'; ctx.fillText(qrData.nombre.toUpperCase(), 540, 580, 900); if (qrData.dni) { ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('DNI: ' + qrData.dni, 540, 630); }"
);

// 5. Desactivar el modal flotante viejo
replaceSection(
  "  const modalQRComponent = qrGenerado ? (",
  "  const renderModalValidacionMP = () => {",
  `  const modalQRComponent = null;\n\n  `
);

// 6. Crear la Pagina Dedicada de Confirmacion/Descarga/Error y la nueva Tienda Intuitiva
replaceSection(
  "  if (vista === 'tienda') {",
  "  if (!user) {",
  `  // PAGINA DEDICADA DE ERROR DE PAGO
  if (errorPago) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-3xl border-2 border-red-600 max-w-md w-full text-center shadow-2xl">
          <p className="text-6xl mb-4">⚠️</p>
          <h1 className="text-3xl font-black text-red-400 uppercase mb-2">Pago No Completado</h1>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            La operación fue cancelada o rechazada por Mercado Pago. No se ha generado ningún cargo. Si crees que hubo un error, contáctanos.
          </p>
          <button onClick={() => { setErrorPago(false); window.history.replaceState({}, document.title, "/?tienda=true"); }} className="w-full bg-[#009EE3] hover:bg-[#008ACA] text-white font-black py-4 rounded-xl uppercase mb-3 shadow-lg">
            🔄 Volver a Intentar
          </button>
          <button onClick={() => { const msg = encodeURIComponent("Hola GJBROSS! Tuve un problema al intentar pagar en la boletería web."); window.open(\`https://wa.me/?text=\${msg}\`, '_blank'); }} className="w-full bg-gray-700 hover:bg-gray-600 text-yellow-400 font-bold py-3 rounded-xl uppercase text-xs border border-gray-600">
            📲 Informar un Error / Soporte
          </button>
        </div>
      </div>
    );
  }

  // PAGINA DEDICADA DE DESCARGA DE QR / VOUCHER BOX (SIN VENTANA FLOTANTE)
  if (qrGenerado) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col items-center justify-center">
        <div className="bg-gray-800 p-6 sm:p-8 rounded-3xl border-2 border-purple-500 max-w-lg w-full shadow-[0_0_50px_rgba(147,51,234,0.3)]">
          <div className="text-center border-b border-gray-700 pb-4 mb-6">
            <span className="bg-green-600/20 text-green-400 border border-green-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">✅ Operación Confirmada</span>
            <h1 className="text-3xl font-black text-white uppercase mt-3 tracking-wide">Tu Acceso Oficial</h1>
            <p className="text-purple-400 font-bold text-sm uppercase mt-1">{qrGenerado.fiesta || sesionActiva?.nombre_fiesta || 'GJBROSS'}</p>
          </div>

          <div className="bg-gray-900 p-5 rounded-2xl border border-gray-700 space-y-2 text-sm mb-6">
            <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">Titular:</span><span className="font-black text-white uppercase text-right">{qrGenerado.nombre}</span></div>
            {qrGenerado.dni && <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">DNI:</span><span className="font-black text-white">{qrGenerado.dni}</span></div>}
            {qrGenerado.tel && <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">WhatsApp:</span><span className="font-black text-white">{qrGenerado.tel}</span></div>}
            <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">Tipo de Pase:</span><span className="font-black text-yellow-400 uppercase">{qrGenerado.tipo_pase === 'box' ? \`🛋️ \${qrGenerado.box_nombre || 'BOX VIP'}\` : (qrGenerado.tipo_pase === 'vip' ? '👑 PASE VIP' : '🎫 ENTRADA GENERAL')}</span></div>
            <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">Capacidad:</span><span className="font-black text-green-400">{qrGenerado.cantidad} Personas</span></div>
            <div className="flex justify-between"><span className="text-gray-400 font-bold uppercase">Código Único:</span><span className="font-black text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">{qrGenerado.codigo}</span></div>
            {qrGenerado.tipo_pase === 'box' && qrGenerado.box_desc && (
              <div className="pt-3 mt-2 border-t border-gray-800">
                <p className="text-xs font-black text-red-400 uppercase mb-1">🍾 Voucher Canjeable en Barra:</p>
                <p className="text-xs font-bold text-gray-200 uppercase bg-red-900/20 border border-red-800 p-3 rounded-xl whitespace-pre-line">{qrGenerado.box_desc}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto mb-6 flex items-center justify-center shadow-inner">
            <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=\${qrGenerado.codigo}&color=000000&bgcolor=FFFFFF\`} alt="QR Acceso" className="w-full h-full object-contain" />
          </div>

          <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-xl text-xs text-gray-300 leading-relaxed mb-6 text-center">
            <p className="font-black text-blue-400 uppercase mb-1">📌 Instrucciones de Ingreso</p>
            Presiona el botón de abajo para descargar tu ticket o sácale captura a esta pantalla. Presenta el código QR en la puerta al llegar{qrGenerado.tipo_pase === 'box' ? ' y muéstralo en la barra para retirar las bebidas de tu Box.' : '.'}
          </div>

          <button onClick={() => descargarInvitacion(qrGenerado)} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-lg uppercase shadow-[0_0_20px_rgba(34,197,94,0.4)] transition active:scale-95 flex items-center justify-center gap-2 mb-3">
            ⬇️ Descargar Acceso / QR
          </button>

          <div className="flex gap-2">
            <button onClick={() => { const msg = encodeURIComponent(\`Hola! Tengo una consulta sobre mi ticket GJBROSS. Titular: \${qrGenerado.nombre} - Código: \${qrGenerado.codigo}\`); window.open(\`https://wa.me/?text=\${msg}\`, '_blank'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-yellow-400 py-3 rounded-xl font-bold uppercase text-xs transition">
              ⚠️ Informar un Error
            </button>
            <button onClick={() => { setQrGenerado(null); setBoxSeleccionado(null); if (!user) window.history.replaceState({}, document.title, "/?tienda=true"); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 rounded-xl font-bold uppercase text-xs transition">
              ⬅️ Volver a la Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (vista === 'tienda') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col p-2 lg:p-8 relative">
        {loading && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"><div className="text-white font-black text-2xl animate-pulse flex flex-col items-center gap-4"><span className="text-4xl">⏳</span> Redirigiendo a Mercado Pago...</div></div>}
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-6 pt-4"><h1 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase shadow-black drop-shadow-lg">GJBROSS</h1><p className="text-[#009EE3] font-bold mt-1 tracking-widest uppercase">BOLETERÍA OFICIAL ONLINE</p></div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto bg-gray-800 p-2 rounded-2xl shadow-lg border border-gray-700">
            <button onClick={() => { setTabTienda('entradas'); setBoxSeleccionado(null); }} className={\`flex-1 py-3 rounded-xl font-black uppercase transition \${tabTienda === 'entradas' ? 'bg-[#009EE3] text-white shadow-md' : 'text-gray-400 hover:text-white'}\`}>🎫 Entradas</button>
            <button onClick={() => setTabTienda('boxes')} className={\`flex-1 py-3 rounded-xl font-black uppercase transition \${tabTienda === 'boxes' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}\`}>🛋️ Boxes VIP</button>
          </div>

          {tabTienda === 'entradas' ? (
            <div className="bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md mx-auto border border-gray-700 relative overflow-hidden mb-10">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#009EE3] to-purple-600"></div>
              <h2 className="text-xl font-black text-white uppercase mb-1 text-center">Reserva tus Entradas</h2>
              <p className="text-xs text-gray-400 text-center mb-6">Completa tus datos para generar tu código QR de acceso</p>
              <form onSubmit={handleComprarEntrada} className="space-y-4">
                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Nombre y Apellido</label><input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Ej: Juan Pérez" value={nombreWeb} onChange={e=>setNombreWeb(e.target.value)} required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">N° de DNI</label><input type="number" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Ej: 40123456" value={dniWeb} onChange={e=>setDniWeb(e.target.value)} required /></div>
                  <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">WhatsApp</label><input type="tel" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Ej: 3718123456" value={telWeb} onChange={e=>setTelWeb(e.target.value)} required /></div>
                </div>
                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Selecciona el Sector</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTipoWeb('general')} className={\`flex-1 py-3 rounded-xl font-black uppercase transition \${tipoWeb === 'general' ? 'bg-[#009EE3] text-white' : 'bg-gray-700 text-gray-400'}\`}>General<br/><span className="text-xs font-normal">\${preciosWeb.general}</span></button>
                    <button type="button" onClick={() => setTipoWeb('vip')} className={\`flex-1 py-3 rounded-xl font-black uppercase transition \${tipoWeb === 'vip' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}\`}>VIP<br/><span className="text-xs font-normal">\${preciosWeb.vip}</span></button>
                  </div>
                </div>
                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Cantidad de Entradas</label>
                  <div className="flex items-center shadow-inner rounded-xl overflow-hidden"><button type="button" onClick={() => setCantWeb(Math.max(1, cantWeb - 1))} className="bg-gray-600 w-1/3 py-3 font-black text-2xl text-white">-</button><input type="number" className="w-1/3 bg-gray-700 py-3 text-center font-black text-2xl text-white focus:outline-none" value={cantWeb} readOnly /><button type="button" onClick={() => setCantWeb(cantWeb + 1)} className="bg-gray-600 w-1/3 py-3 font-black text-2xl text-white">+</button></div>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-gray-600 text-center"><span className="text-sm font-bold text-gray-400 block uppercase mb-1">Total a Pagar</span><span className="text-4xl font-black text-green-400">\${(tipoWeb==='general'?preciosWeb.general:preciosWeb.vip) * cantWeb}</span></div>
                <button type="submit" disabled={loading} className="w-full bg-[#009EE3] hover:bg-[#008ACA] text-white font-black py-4 rounded-xl shadow-lg transition active:scale-95 uppercase">💳 Pagar con Mercado Pago</button>
              </form>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in pb-10">
              {boxSeleccionado ? (
                <div className="bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-lg mx-auto border-2 border-red-600 relative overflow-hidden">
                  <button type="button" onClick={() => setBoxSeleccionado(null)} className="text-xs font-black uppercase text-gray-300 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg mb-4 inline-block">⬅️ Volver a todos los Boxes</button>
                  <h2 className="text-2xl font-black text-white uppercase">{boxSeleccionado.nombre}</h2>
                  <p className="text-3xl font-black text-red-500 my-2">\${boxSeleccionado.precio}</p>
                  <div className="bg-black/40 p-4 rounded-xl border border-gray-700 mb-6">
                    <p className="text-xs text-red-400 font-black uppercase mb-1">Incluye 10 Pulseras VIP + Mesa/Sofá + Bebidas:</p>
                    <p className="text-sm font-bold text-gray-200 uppercase whitespace-pre-line">{boxSeleccionado.descripcion}</p>
                  </div>
                  <form onSubmit={handleComprarBox} className="space-y-4">
                    <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Nombre y Apellido del Titular</label><input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej: Juan Pérez" value={nombreWeb} onChange={e=>setNombreWeb(e.target.value)} required /></div>
                    <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">N° de DNI del Titular</label><input type="number" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej: 40123456" value={dniWeb} onChange={e=>setDniWeb(e.target.value)} required /></div>
                    <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Número de WhatsApp (Por consultas)</label><input type="tel" className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej: 3718123456" value={telWeb} onChange={e=>setTelWeb(e.target.value)} required /></div>
                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] uppercase text-lg transition active:scale-95">
                      💳 Pagar Box en Mercado Pago
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-red-900/40 to-black border border-red-800 p-6 rounded-3xl text-center shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div><h3 className="text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">TODOS LOS BOX INCLUYEN:</h3><div className="flex flex-wrap justify-center gap-4 mt-4 text-sm font-bold text-gray-300"><span className="bg-black/50 px-4 py-2 rounded-lg border border-gray-700">🎟️ 10 PULSERAS DE ACCESO</span><span className="bg-black/50 px-4 py-2 rounded-lg border border-gray-700">🛋️ SOFÁ EXCLUSIVO & MESA</span><span className="bg-black/50 px-4 py-2 rounded-lg border border-gray-700">👑 ZONA BOX GJBROSS</span></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {boxesWeb.map(box => (
                      <div key={box.id} className="bg-gray-800 border-2 border-red-900/30 hover:border-red-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition duration-300 hover:-translate-y-1">
                        {box.imagen_url ? (<img src={box.imagen_url} alt={box.nombre} className="w-full h-56 object-cover border-b-4 border-black" />) : (<div className="w-full h-56 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center border-b-4 border-black text-6xl shadow-inner">🛋️</div>)}
                        <div className="p-6 flex-1 flex flex-col relative"><div className="absolute -top-6 right-4 bg-red-600 text-white font-black px-4 py-1 rounded-full text-lg shadow-lg border-2 border-black transform rotate-3">VIP</div><h3 className="text-2xl font-black text-white uppercase pr-10">{box.nombre}</h3><div className="mt-4 flex-1"><p className="text-sm font-bold text-gray-400 uppercase leading-relaxed whitespace-pre-line bg-black/30 p-4 rounded-xl border border-gray-700 shadow-inner">{box.descripcion}</p></div><div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center"><span className="text-3xl font-black text-red-500 drop-shadow-md">\${box.precio}</span><button onClick={() => { setBoxSeleccionado(box); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] transition active:scale-95 border border-red-400">Reservar Box</button></div></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  `
);

// 7. Mejorar vista Entregas Web con codigo QR y boton para descargar el Voucher
replaceSection(
  "  if (vista === 'entregas') {",
  "  if (vista === 'admin') {",
  `  if (vista === 'entregas') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}{renderModalValidacionMP()}
        <div className="max-w-5xl mx-auto w-full">
            <h2 className="text-2xl font-black uppercase text-red-400 mb-6 flex items-center gap-2">🍾 Entregas de Boxes VIP (Online)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservasBoxes.length === 0 ? <p className="text-gray-500 font-bold uppercase">Nadie compró Boxes online aún en esta fiesta.</p> : 
                reservasBoxes.map(r => {
                    const matchQr = r.box_nombre.match(/\\[QR:\\s*([^\\]]+)\\]/);
                    const codQr = matchQr ? matchQr[1] : 'BOX-' + r.id;
                    return (
                      <div key={r.id} className={\`p-6 rounded-2xl border-2 shadow-xl flex flex-col transition \${r.estado === 'entregado' ? 'bg-green-900/20 border-green-900 opacity-60' : 'bg-gray-800 border-red-600'}\`}>
                          <div className="flex justify-between items-start mb-2">
                              <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{r.fecha} - #{r.id}</p><p className="text-lg font-black text-white uppercase leading-tight">{r.nombre_cliente}</p></div>
                              <span className={\`px-3 py-1 rounded text-xs font-black uppercase \${r.estado === 'entregado' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}\`}>{r.estado}</span>
                          </div>
                          <div className="bg-black/40 p-4 rounded-xl border border-gray-700 my-4 flex-1">
                              <p className="text-red-400 font-black uppercase mb-1">{r.box_nombre}</p>
                              <p className="text-sm font-bold text-gray-300 uppercase whitespace-pre-line">{r.descripcion}</p>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => descargarInvitacion({ nombre: r.nombre_cliente.split('|')[0].trim(), cantidad: 10, codigo: codQr, tipo_pase: 'box', box_desc: r.descripcion })} className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl font-black text-xs uppercase">⬇️ QR</button>
                              {r.estado === 'pendiente' && (<button onClick={() => entregarBox(r.id)} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl font-black uppercase shadow-lg text-sm transition active:scale-95">✅ Entregar Botellas</button>)}
                          </div>
                      </div>
                    );
                })}
            </div>
        </div>
      </div>
    );
  }

  `
);

// 8. En Admin: Agregar los QRs de Entregas Web y boton de descarga en Auditoria QR
replaceSection(
  '<div className="bg-gray-900 p-6 rounded-2xl border border-yellow-900"><h2 className="text-lg font-black uppercase text-yellow-500 mb-4 flex items-center">🎟 QRs Emitidos (Auditoría)</h2>',
  '<div className="flex justify-between items-center mt-6"><h2 className="text-lg font-black uppercase text-white">📦 Base de Datos (Menú)</h2>',
  `<div className="bg-gray-900 p-6 rounded-2xl border border-yellow-900 space-y-6">
                  <div>
                    <h2 className="text-lg font-black uppercase text-yellow-500 mb-3 flex items-center justify-between">
                      <span>🎟 QRs Emitidos (Entradas / VIP / Boxes)</span>
                      <span className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-1 rounded">Total: {listasVip.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                      {listasVip.length === 0 ? <p className="text-gray-500 text-sm font-bold uppercase">No se emitieron QRs.</p> : listasVip.map(l => (
                        <div key={l.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white uppercase truncate">{l.nombre}</p>
                            <p className="text-[10px] text-gray-400 uppercase mt-1">👤 {l.creado_por || 'App'} • 🕒 {l.hora_creacion || '--:--'} • ({l.ingresados || 0}/{l.cantidad})</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-black text-yellow-500 bg-black px-2 py-1 rounded">{l.codigo}</span>
                            <button onClick={() => descargarInvitacion(l)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded font-black" title="Descargar QR">⬇️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-md font-black uppercase text-red-400 mb-3 flex items-center justify-between">
                      <span>🍾 Entregas Web de Boxes (QRs y Retiro en Barra)</span>
                      <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded">{reservasBoxes.length} Vendidos</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                      {reservasBoxes.length === 0 ? <p className="text-gray-500 text-xs font-bold uppercase">Sin reservas de Boxes online.</p> : reservasBoxes.map(r => {
                        const matchQr = r.box_nombre.match(/\\[QR:\\s*([^\\]]+)\\]/);
                        const codQr = matchQr ? matchQr[1] : 'BOX-' + r.id;
                        return (
                          <div key={r.id} className="bg-gray-800 p-3 rounded-xl border border-red-900/60 flex flex-col justify-between gap-2">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-xs font-black text-white uppercase">{r.nombre_cliente}</p>
                                <span className={\`text-[10px] px-2 py-0.5 rounded font-black uppercase \${r.estado === 'entregado' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}\`}>{r.estado}</span>
                              </div>
                              <p className="text-xs font-black text-red-400 uppercase mt-1">{r.box_nombre}</p>
                              <p className="text-[10px] text-gray-300 uppercase mt-1">{r.descripcion}</p>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-700">
                              <button onClick={() => descargarInvitacion({ nombre: r.nombre_cliente.split('|')[0].trim(), cantidad: 10, codigo: codQr, tipo_pase: 'box', box_desc: r.descripcion })} className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-[10px] font-black uppercase">⬇️ Descargar QR Box</button>
                              {r.estado === 'pendiente' && <button onClick={() => entregarBox(r.id)} className="flex-1 bg-red-600 hover:bg-red-500 py-1.5 rounded text-[10px] font-black uppercase">✅ Entregar</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                `
);

fs.writeFileSync(path, code);
console.log("✅ V12.4 APLICADA CON ÉXITO: Tienda con DNI/WhatsApp, Página de descarga dedicada y Entregas Web en Admin.");
