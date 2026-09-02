import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('login');
  const [loading, setLoading] = useState(false);

  // Sesión Activa e Historial
  const [sesionActiva, setSesionActiva] = useState(null);
  const [nombreFiestaApertura, setNombreFiestaApertura] = useState('');
  const [historial, setHistorial] = useState([]);
  const [sesionExpandida, setSesionExpandida] = useState(null);

  // Estados de Caja
  const [bebidas, setBebidas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');

  // Estados del Dashboard (Admin)
  const [ventasSesion, setVentasSesion] = useState([]);
  const [movsSesion, setMovsSesion] = useState([]);
  const [verDetalleModal, setVerDetalleModal] = useState(null);

  // Formularios Admin
  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');

  const cargarDatos = async () => {
    const { data: prods } = await supabase.from('bebidas').select('*').order('id');
    if (prods) setBebidas(prods);

    if (user?.rol === 'admin') {
      const { data: hist } = await supabase.from('sesiones').select('*').eq('estado', 'cerrada').order('id', { ascending: false });
      if (hist) setHistorial(hist);
    }

    const { data: sesionData } = await supabase.from('sesiones').select('*').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
    const sesion = sesionData && sesionData.length > 0 ? sesionData[0] : null;
    
    if (sesion) {
      setSesionActiva(sesion);
      const { data: v } = await supabase.from('ventas').select('*').eq('sesion_id', sesion.id);
      const { data: m } = await supabase.from('movimientos').select('*').eq('sesion_id', sesion.id);
      setVentasSesion(v || []);
      setMovsSesion(m || []);
    } else {
      setSesionActiva(null);
      setVentasSesion([]);
      setMovsSesion([]);
    }
  };

  useEffect(() => {
    if (user) cargarDatos();
  }, [user, vista]);

  // Cálculos Financieros
  const capitalEnBarra = bebidas.reduce((acc, b) => acc + (b.precio * b.stock), 0);
  const totalEfecVentas = ventasSesion.filter(v => v.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.total), 0);
  const totalTransfVentas = ventasSesion.filter(v => v.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.total), 0);
  const entradasExtraEfec = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.monto), 0);
  const entradasExtraTransf = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.monto), 0);
  const salidasEfec = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.monto), 0);
  const salidasTransf = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.monto), 0);

  const CAJA_FISICA = totalEfecVentas + entradasExtraEfec - salidasEfec;
  const CAJA_BANCO = totalTransfVentas + entradasExtraTransf - salidasTransf;
  const TOTAL_NETO = CAJA_FISICA + CAJA_BANCO;

  /* ----- AUTH & APERTURA ----- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', username.value).eq('password', password.value).single();
    setLoading(false);
    if (error || !data) alert('❌ Usuario incorrecto.');
    else {
      setUser(data);
      await cargarDatos();
      if (data.rol === 'admin') setVista('admin'); else setVista('pos');
    }
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    if (!nombreFiestaApertura) return;
    setLoading(true);
    await supabase.from('sesiones').insert([{ nombre_fiesta: nombreFiestaApertura, abierta_por: user.usuario }]);
    await cargarDatos();
    setLoading(false);
    setVista('pos');
  };

  /* ----- VENTAS Y CARRITO ----- */
  const agregarAlCarrito = (producto) => {
    if (!producto || producto.stock <= 0) return alert('⚠️ Sin stock disponible');
    setCarrito(prevCarrito => {
      const existe = prevCarrito.find(item => item.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert('⚠️ Supera stock en barra'); return prevCarrito; }
        return prevCarrito.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      } else return [...prevCarrito, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prevCarrito => prevCarrito.map(item => {
      if (item.id === id) { const nuevaCant = item.cantidad + delta; return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null; }
      return item;
    }).filter(Boolean));
  };

  const procesarVenta = async () => {
    if (carrito.length === 0 || !sesionActiva) return;
    setLoading(true);
    const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const { data: ventaData, error } = await supabase.from('ventas').insert([{ cajero: user.usuario, total: totalVenta, detalles: carrito, metodo_pago: metodoPagoPOS, sesion_id: sesionActiva.id }]).select().single();
    
    if (!error) {
      for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
      setTicketActual({ tipo: 'venta', id: ventaData.id, fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS });
      setCarrito([]); cargarDatos();
    }
    setLoading(false);
  };

  /* ----- PANEL ADMIN ----- */
  const crearProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('bebidas').insert([{ nombre: nuevoNombre, precio: Number(nuevoPrecio), stock: Number(nuevoStock), categoria: nuevaCat }]);
    setNuevoNombre(''); setNuevoPrecio(''); setNuevoStock(''); cargarDatos(); setLoading(false);
  };

  const eliminarProducto = async (id, nombre) => {
    if (window.confirm(`⚠️ PELIGRO: ¿Eliminar "${nombre}" del menú?`)) {
      setLoading(true); await supabase.from('bebidas').delete().eq('id', id); await cargarDatos(); setLoading(false);
    }
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();
    if (!movConcepto || !movMonto || !sesionActiva) return;
    setLoading(true);
    await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo, sesion_id: sesionActiva.id }]);
    setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false);
  };

  const procesarCierre = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de CERRAR CAJA definitivamente y volver a cero?')) return;
    setLoading(true);

    let conteoProductos = {};
    ventasSesion.forEach(v => {
      v.detalles.forEach(item => {
        if (!conteoProductos[item.nombre]) conteoProductos[item.nombre] = 0;
        conteoProductos[item.nombre] += item.cantidad;
      });
    });

    const resumenCierre = {
      estado: 'cerrada',
      cerrada_por: user.usuario,
      fecha_cierre: new Date().toISOString(),
      recaudacion_efectivo: CAJA_FISICA,
      recaudacion_transf: CAJA_BANCO,
      total_salidas: salidasEfec + salidasTransf,
      total_ingresos: entradasExtraEfec + entradasExtraTransf,
      ranking_ventas: conteoProductos
    };

    await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id);
    
    setTicketActual({
      tipo: 'cierre',
      fiesta: sesionActiva.nombre_fiesta,
      fecha: new Date().toLocaleDateString(),
      hora: new Date().toLocaleTimeString(),
      responsable: user.usuario,
      ventas_efectivo: totalEfecVentas,
      ventas_transf: totalTransfVentas,
      salidas_efec: salidasEfec,
      salidas_transf: salidasTransf,
      entradas_efec: entradasExtraEfec,
      entradas_transf: entradasExtraTransf,
      tickets_totales: ventasSesion.length,
      ...resumenCierre
    });

    setSesionActiva(null);
    setVista('admin');
    setLoading(false);
  };

  // ----- RENDERIZADO PRINCIPAL -----

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-purple-500 tracking-widest">GJBROSS</h1>
            <p className="text-white tracking-widest text-sm mt-1">SISTEMA POS</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" id="username" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario" required />
            <input type="password" id="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)]">ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  if (ticketActual) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="bg-white text-black p-6 rounded w-full max-w-sm text-center font-mono border border-gray-400">
          <h2 className="text-2xl font-black uppercase text-center">{ticketActual.tipo === 'cierre' ? 'REPORTE Z' : 'GJBROSS POS'}</h2>
          <p className="text-sm font-bold text-center mt-1 bg-gray-200 py-1">{ticketActual.fiesta}</p>
          
          {ticketActual.tipo === 'venta' ? (
            <>
              <div className="text-left text-xs mb-2 mt-4"><p><b>Ticket:</b> #{ticketActual.id}</p><p><b>Cajero:</b> {ticketActual.cajero}</p><p><b>Hora:</b> {ticketActual.fecha}</p></div>
              <hr className="my-2 border-dashed border-gray-400" />
              <div className="text-left space-y-1">
                {ticketActual.items.map((it) => (<div key={it.id} className="flex justify-between text-sm"><span>{it.cantidad}x {it.nombre}</span><span>${it.precio * it.cantidad}</span></div>))}
              </div>
              <hr className="my-2 border-dashed border-gray-400" />
              <h3 className="text-2xl font-black text-right">TOTAL: ${ticketActual.total}</h3>
              <p className="text-xs text-center mt-2 font-bold bg-black text-white py-1 uppercase border border-dashed">METODO: {ticketActual.metodo_pago}</p>
            </>
          ) : (
            <>
              <div className="text-left text-xs space-y-1 mt-4 mb-2">
                <p><b>Impresión:</b> {ticketActual.fecha} - {ticketActual.hora}</p>
                <p><b>Cierre Por:</b> {ticketActual.responsable}</p>
                <p><b>Tickets Emitidos:</b> {ticketActual.tickets_totales}</p>
              </div>
              <hr className="my-2 border-black" />
              <h4 className="font-bold text-xs text-left uppercase">Detalle Efectivo</h4>
              <div className="text-left text-xs space-y-1">
                <div className="flex justify-between"><span>Ventas Efectivo:</span><span>${ticketActual.ventas_efectivo}</span></div>
                <div className="flex justify-between"><span>Entradas Extra:</span><span>+${ticketActual.entradas_efec}</span></div>
                <div className="flex justify-between text-red-600"><span>Salidas/Gastos:</span><span>-${ticketActual.salidas_efec}</span></div>
                <div className="flex justify-between font-bold text-sm bg-gray-200 mt-1"><span>TOTAL CAJÓN:</span><span>${ticketActual.recaudacion_efectivo}</span></div>
              </div>
              <hr className="my-3 border-black border-dashed" />
              <h4 className="font-bold text-xs text-left uppercase">Detalle Banco/Transf</h4>
              <div className="text-left text-xs space-y-1">
                <div className="flex justify-between"><span>Ventas Transf:</span><span>${ticketActual.ventas_transf}</span></div>
                <div className="flex justify-between"><span>Entradas Extra:</span><span>+${ticketActual.entradas_transf}</span></div>
                <div className="flex justify-between text-red-600"><span>Salidas/Gastos:</span><span>-${ticketActual.salidas_transf}</span></div>
                <div className="flex justify-between font-bold text-sm bg-gray-200 mt-1"><span>TOTAL BANCO:</span><span>${ticketActual.recaudacion_transf}</span></div>
              </div>
              <hr className="my-3 border-black" />
              <div className="bg-black text-white p-2">
                <h3 className="text-sm font-bold text-right uppercase">Recaudación Neta</h3>
                <h2 className="text-2xl font-black text-right">${ticketActual.recaudacion_efectivo + ticketActual.recaudacion_transf}</h2>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex space-x-4">
          <button onClick={() => window.print()} className="bg-green-600 px-6 py-3 rounded-lg font-black uppercase text-sm">🖨️ Imprimir Ticket</button>
          <button onClick={() => setTicketActual(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-black uppercase text-sm">➡️ Continuar</button>
        </div>
      </div>
    );
  }

  const barraHeader = (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center mb-4 rounded-b-xl lg:rounded-xl">
      <div>
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
      </div>
      <div className="flex space-x-2">
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 text-xs px-3 py-2 rounded font-bold">⚙️ Admin</button>}
        {user.rol === 'admin' && vista !== 'pos' && sesionActiva && <button onClick={() => setVista('pos')} className="bg-green-600 text-xs px-3 py-2 rounded font-bold">➡️ Ventas</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-xs px-3 py-2 rounded font-bold">Salir</button>
      </div>
    </header>
  );

  // VISTA: ADMIN DASHBOARD (Apertura + Historial cuando caja está cerrada)
  if (vista === 'admin') {
    if (!sesionActiva) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
          {barraHeader}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-1">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">
                <h2 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-widest">Apertura</h2>
                <p className="text-gray-400 text-sm mb-6 text-center">Inicia un turno para habilitar la barra.</p>
                <form onSubmit={abrirCaja} className="space-y-4">
                  <input type="text" placeholder="Ej: Fiesta Halloween..." className="w-full bg-gray-700 p-4 rounded-xl font-black text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreFiestaApertura} onChange={e => setNombreFiestaApertura(e.target.value)} required />
                  <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">🔓 ABRIR CAJA</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-[70vh]">
                <h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex items-center border-b border-gray-700 pb-2">📚 Historial de Cierres</h2>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {historial.length === 0 ? <p className="text-gray-500 text-center py-10">No hay cierres registrados aún.</p> :
                    historial.map(h => (
                      <div key={h.id} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transition">
                        <div className="flex justify-between items-start cursor-pointer" onClick={() => setSesionExpandida(sesionExpandida === h.id ? null : h.id)}>
                          <div>
                            <h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3>
                            <p className="text-xs text-gray-400 mt-1">📅 {new Date(h.fecha_cierre).toLocaleDateString()} - 👤 Cerrado por: {h.cerrada_por}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-green-400">${Number(h.recaudacion_efectivo) + Number(h.recaudacion_transf)}</p>
                            <p className="text-[10px] text-gray-300 uppercase mt-1 bg-gray-800 px-2 py-1 rounded inline-block shadow">{sesionExpandida === h.id ? '🔼 Ocultar' : '🔽 Detalles'}</p>
                          </div>
                        </div>
                        
                        {sesionExpandida === h.id && (
                          <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Finanzas del Turno</h4>
                              <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
                                <div className="flex justify-between"><span>Efectivo:</span><span className="font-bold text-blue-400">${h.recaudacion_efectivo}</span></div>
                                <div className="flex justify-between"><span>Transferencias:</span><span className="font-bold text-purple-400">${h.recaudacion_transf}</span></div>
                                <hr className="border-gray-600 my-1" />
                                <div className="flex justify-between"><span>Ingresos Extra:</span><span className="font-bold text-green-400">+${h.total_ingresos || 0}</span></div>
                                <div className="flex justify-between"><span>Gastos/Salidas:</span><span className="font-bold text-red-400">-${h.total_salidas || 0}</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">🔥 Top Bebidas Vendidas</h4>
                              <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
                                {h.ranking_ventas && Object.keys(h.ranking_ventas).length > 0 ? (
                                  Object.entries(h.ranking_ventas).sort(([,a], [,b]) => b - a).slice(0, 5).map(([nombre, cant]) => (
                                    <div key={nombre} className="flex justify-between border-b border-gray-700 pb-1"><span className="truncate pr-2 text-gray-300">{nombre}</span><span className="font-black text-yellow-400">{cant}x</span></div>
                                  ))
                                ) : <span className="text-gray-500 text-xs">Sin datos.</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 relative">
        {barraHeader}
        
        {verDetalleModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
              <h2 className="text-xl font-black uppercase mb-4 text-purple-400 border-b border-gray-700 pb-2">
                {verDetalleModal === 'entrada' ? 'Ingresos Extra' : verDetalleModal === 'salida' ? 'Salidas y Gastos' : verDetalleModal === 'ventas_efectivo' ? 'Ventas en Efectivo' : 'Ventas por Transferencia'}
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {(() => {
                  let datos = []; let esVenta = false;
                  if (verDetalleModal === 'entrada') datos = movsSesion.filter(m => m.tipo === 'entrada');
                  else if (verDetalleModal === 'salida') datos = movsSesion.filter(m => m.tipo === 'salida');
                  else if (verDetalleModal === 'ventas_efectivo') { datos = ventasSesion.filter(v => v.metodo_pago === 'efectivo'); esVenta = true; }
                  else if (verDetalleModal === 'ventas_transferencia') { datos = ventasSesion.filter(v => v.metodo_pago === 'transferencia'); esVenta = true; }

                  if (datos.length === 0) return <p className="text-gray-500 text-center py-4">No hay registros.</p>;
                  return datos.map(d => (
                    <div key={d.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-600">
                      <div className="flex-1 pr-2">
                        {esVenta ? (
                          <><p className="font-bold text-xs text-gray-300">Ticket #{d.id} - Cajero: {d.cajero}</p><p className="text-xs text-gray-400 italic line-clamp-1">{d.detalles.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}</p></>
                        ) : (
                          <><p className="font-bold text-sm text-white">{d.concepto}</p><p className="text-xs text-gray-400 uppercase">Vía: {d.metodo_pago}</p></>
                        )}
                      </div>
                      <span className={`font-black text-lg ${verDetalleModal === 'salida' ? 'text-red-400' : 'text-green-400'}`}>${esVenta ? d.total : d.monto}</span>
                    </div>
                  ));
                })()}
              </div>
              <button onClick={() => setVerDetalleModal(null)} className="mt-6 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold w-full uppercase">Cerrar Detalle</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/30 p-5 rounded-2xl border border-green-800 flex flex-col justify-center shadow-lg">
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total General Neto</h2>
            <p className="text-4xl font-black text-green-400">${TOTAL_NETO}</p>
          </div>
          <div onClick={() => setVerDetalleModal('ventas_efectivo')} className="bg-blue-900/30 p-5 rounded-2xl border border-blue-800 flex flex-col justify-center cursor-pointer hover:bg-blue-900/50 transition shadow-lg group">
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Caja (Físico)</h2>
            <p className="text-3xl font-black text-blue-400">${CAJA_FISICA}</p>
            <p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets efectivo</p>
          </div>
          <div onClick={() => setVerDetalleModal('ventas_transferencia')} className="bg-purple-900/30 p-5 rounded-2xl border border-purple-800 flex flex-col justify-center cursor-pointer hover:bg-purple-900/50 transition shadow-lg group">
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Banco / MP (Digital)</h2>
            <p className="text-3xl font-black text-purple-400">${CAJA_BANCO}</p>
            <p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets transf</p>
          </div>
          <div className="space-y-4">
            <div onClick={() => setVerDetalleModal('entrada')} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center cursor-pointer hover:border-gray-500 transition">
              <div><h2 className="text-gray-400 text-[10px] uppercase font-bold">Ingresos Extra</h2><p className="text-lg font-black text-green-400">+${entradasExtraEfec + entradasExtraTransf}</p></div>
              <span className="text-[10px] text-gray-500 underline">Ver</span>
            </div>
            <div onClick={() => setVerDetalleModal('salida')} className="bg-gray-800 p-4 rounded-xl border border-red-900/40 flex justify-between items-center cursor-pointer hover:border-red-500 transition">
              <div><h2 className="text-gray-400 text-[10px] uppercase font-bold">Salidas / Gastos</h2><p className="text-lg font-black text-red-400">-${salidasEfec + salidasTransf}</p></div>
              <span className="text-[10px] text-gray-500 underline">Ver</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-lg font-black mb-4 uppercase text-yellow-400 flex items-center">💵 Registrar Movimiento</h2>
              <form onSubmit={registrarMovimiento} className="space-y-3">
                <select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Pago Staff, Hielo)</option><option value="entrada">🟢 Ingreso Extra</option></select>
                <input type="text" placeholder="Concepto del movimiento" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required />
                <div className="flex space-x-2">
                  <input type="number" placeholder="Monto $" className="w-2/3 bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={movMonto} onChange={e => setMovMonto(e.target.value)} required />
                  <select className="w-1/3 bg-gray-700 p-3 rounded-lg focus:outline-none text-sm" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transf</option></select>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-lg font-black uppercase text-sm">Registrar</button>
              </form>
            </div>
            <button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:scale-95">🔒 CERRAR ARQUEO Z</button>
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 lg:col-span-2 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black uppercase text-white">📦 Base de Datos (Menú)</h2>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Capital en Barra</p>
                <p className="text-xl font-black text-green-400">${capitalEnBarra}</p>
              </div>
            </div>

            <form onSubmit={crearProducto} className="flex flex-col sm:flex-row gap-2 mb-6 bg-gray-700/50 p-3 rounded-xl border border-gray-600">
              <input type="text" placeholder="Nombre" className="flex-1 bg-gray-800 p-2 rounded text-sm" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required />
              <input type="number" placeholder="$ Precio" className="w-full sm:w-24 bg-gray-800 p-2 rounded text-sm" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} required />
              <input type="number" placeholder="Stock" className="w-full sm:w-20 bg-gray-800 p-2 rounded text-sm" value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required />
              <select className="w-full sm:w-28 bg-gray-800 p-2 rounded text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}><option value="bebida">Bebida</option><option value="combo">Combo</option><option value="entrada">Entrada</option></select>
              <button type="submit" className="bg-purple-600 px-4 py-2 rounded font-bold text-sm">+</button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {bebidas.map(b => (
                <div key={b.id} className={`p-4 rounded-xl border relative ${b.stock < 10 ? 'bg-red-900/10 border-red-900' : 'bg-gray-700/30 border-gray-600'}`}>
                  <button type="button" onClick={() => eliminarProducto(b.id, b.nombre)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-lg transition">❌</button>
                  <p className="font-bold text-sm mb-1 pr-6">{b.nombre}</p>
                  <div className="flex justify-between items-center mb-3"><span className="text-green-400 font-black text-lg">${b.precio}</span><span className={`font-bold text-xs bg-gray-800 px-2 py-1 rounded ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span></div>
                  <div className="flex space-x-2">
                    <button type="button" onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded text-xs font-bold uppercase transition">Cambiar $</button>
                    <button type="button" onClick={async () => { const s = prompt(`Stock real y exacto de ${b.nombre}:`, b.stock); if (s !== null && s !== '' && !isNaN(s)) { await supabase.from('bebidas').update({stock:Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold uppercase transition">Mod. Stock</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: POS (VENTAS EN CAJA)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {barraHeader}
      {!sesionActiva ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2>
          <p className="text-gray-400 mt-2">Un administrador debe abrir la caja para poder vender.</p>
        </div>
      ) : (
        <div className="flex-1 p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
              {bebidas.map((item) => (
                <button type="button" key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-3 lg:p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}>
                  <div><span className="text-[10px] font-black uppercase text-purple-500 block mb-1">{item.categoria}</span><p className="font-bold text-xs lg:text-sm line-clamp-2 leading-tight">{item.nombre}</p></div>
                  <div className="mt-2 flex justify-between items-end"><span className="text-base lg:text-lg font-black text-green-400">${item.precio}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Stk: {item.stock}</span></div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col justify-between h-[450px] lg:h-auto shadow-2xl">
            <div>
              <h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 border-b border-gray-700 pb-2">Ticket Actual</h2>
              {carrito.length === 0 ? (
                <div className="text-center py-10 text-gray-600"><p className="text-4xl mb-2">🍹</p><p className="text-xs font-bold uppercase">Toque productos para agregar</p></div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-700/40 p-2 rounded-lg border border-gray-600">
                      <div className="flex-1 mr-2"><p className="font-bold text-xs line-clamp-1">{item.nombre}</p><p className="text-xs text-green-400 font-black">${item.precio * item.cantidad}</p></div>
                      <div className="flex items-center space-x-1">
                        <button type="button" onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">-</button>
                        <span className="font-black text-sm w-4 text-center">{item.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-end mb-3"><span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span><span className="text-3xl font-black text-green-400 leading-none">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span></div>
              <div className="flex space-x-2 mb-3">
                <button type="button" onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>💵 Efectivo</button>
                <button type="button" onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📱 Transf / MP</button>
              </div>
              <button type="button" onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition active:scale-95 text-lg uppercase tracking-widest">{loading ? '...' : 'COBRAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
