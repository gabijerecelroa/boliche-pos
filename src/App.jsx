import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('login'); // 'login', 'apertura', 'pos', 'admin', 'historial'
  const [loading, setLoading] = useState(false);

  // Sesión Activa
  const [sesionActiva, setSesionActiva] = useState(null);
  const [nombreFiestaApertura, setNombreFiestaApertura] = useState('');

  // Estados de Caja (POS)
  const [bebidas, setBebidas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');

  // Estados del Dashboard (Admin)
  const [ventasSesion, setVentasSesion] = useState([]);
  const [movsSesion, setMovsSesion] = useState([]);
  const [historial, setHistorial] = useState([]);
  
  // Modal de detalles de movimientos
  const [verDetalleMovs, setVerDetalleMovs] = useState(null); // 'entrada' o 'salida'

  // Formularios Admin
  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');

  // Carga principal
  const cargarDatos = async () => {
    // 1. Cargar menú
    const { data: prods } = await supabase.from('bebidas').select('*').order('id');
    if (prods) setBebidas(prods);

    // 2. Buscar si hay una caja abierta
    const { data: sesion } = await supabase.from('sesiones').select('*').eq('estado', 'abierta').order('id', { ascending: false }).limit(1).single();
    
    if (sesion) {
      setSesionActiva(sesion);
      // Cargar ventas y movs de ESTA sesión
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

  // Totales Calculados
  const totalEfecVentas = ventasSesion.filter(v => v.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.total), 0);
  const totalTransfVentas = ventasSesion.filter(v => v.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.total), 0);
  
  const entradasExtraEfec = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.monto), 0);
  const entradasExtraTransf = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.monto), 0);
  
  const salidasEfec = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'efectivo').reduce((acc, curr) => acc + Number(curr.monto), 0);
  const salidasTransf = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'transferencia').reduce((acc, curr) => acc + Number(curr.monto), 0);

  const CAJA_FISICA = totalEfecVentas + entradasExtraEfec - salidasEfec;
  const CAJA_BANCO = totalTransfVentas + entradasExtraTransf - salidasTransf;
  const TOTAL_NETO = CAJA_FISICA + CAJA_BANCO;

  /* ----- LOGIN Y APERTURA ----- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', username.value).eq('password', password.value).single();
    setLoading(false);
    if (error || !data) alert('❌ Usuario incorrecto.');
    else {
      setUser(data);
      await cargarDatos();
      // Lógica de ruteo inicial
      if (data.rol === 'admin') setVista('admin');
      else setVista('pos');
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

  /* ----- POS & VENTAS ----- */
  const procesarVenta = async () => {
    if (carrito.length === 0 || !sesionActiva) return;
    setLoading(true);
    const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
    const { data: ventaData, error } = await supabase.from('ventas').insert([
      { cajero: user.usuario, total: totalVenta, detalles: carrito, metodo_pago: metodoPagoPOS, sesion_id: sesionActiva.id }
    ]).select().single();
    
    if (!error) {
      for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
      setTicketActual({ tipo: 'venta', id: ventaData.id, fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS });
      setCarrito([]); cargarDatos();
    }
    setLoading(false);
  };

  /* ----- ADMIN & CIERRE ----- */
  const registrarMovimiento = async (e) => {
    e.preventDefault();
    if (!movConcepto || !movMonto || !sesionActiva) return;
    setLoading(true);
    await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo, sesion_id: sesionActiva.id }]);
    setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false);
  };

  const procesarCierre = async () => {
    if (!confirm('⚠️ ¿Cerrar caja definitivamente y volver a cero?')) return;
    setLoading(true);

    // Calcular Ranking de Ventas
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
      total_entradas: entradasExtraEfec + entradasExtraTransf,
      total_salidas: salidasEfec + salidasTransf,
      ranking_ventas: conteoProductos
    };

    await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id);
    
    setTicketActual({
      tipo: 'cierre',
      fiesta: sesionActiva.nombre_fiesta,
      fecha: new Date().toLocaleDateString(),
      hora: new Date().toLocaleTimeString(),
      responsable: user.usuario,
      ...resumenCierre
    });

    setSesionActiva(null);
    setVista('admin');
    setLoading(false);
  };

  const cargarHistorial = async () => {
    const { data } = await supabase.from('sesiones').select('*').eq('estado', 'cerrada').order('id', { ascending: false });
    if (data) setHistorial(data);
    setVista('historial');
  };

  // ----- VISTAS -----

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h1 className="text-4xl font-black text-center text-purple-500 mb-8 tracking-widest">GJBROSS <span className="text-white text-2xl">POS</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" id="username" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario" required />
            <input type="password" id="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg">Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  // TICKETS (Venta o Cierre)
  if (ticketActual) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="bg-white text-black p-6 rounded w-full max-w-sm text-center font-mono border border-gray-400">
          <h2 className="text-xl font-black uppercase">{ticketActual.tipo === 'cierre' ? 'CIERRE DE CAJA GJBROSS' : 'BARRA GJBROSS'}</h2>
          <p className="text-sm font-bold mt-1">{ticketActual.fiesta}</p>
          <hr className="my-2 border-dashed border-gray-400" />
          
          {ticketActual.tipo === 'venta' ? (
            <>
              <div className="text-left text-xs mb-2"><p><b>Ticket:</b> #{ticketActual.id}</p><p><b>Cajero:</b> {ticketActual.cajero}</p><p><b>Hora:</b> {ticketActual.fecha}</p></div>
              <hr className="my-2 border-dashed border-gray-400" />
              <div className="text-left space-y-1">
                {ticketActual.items.map((it) => (<div key={it.id} className="flex justify-between text-sm"><span>{it.cantidad}x {it.nombre}</span><span>${it.precio * it.cantidad}</span></div>))}
              </div>
              <hr className="my-2 border-dashed border-gray-400" />
              <h3 className="text-lg font-bold text-right">TOTAL: ${ticketActual.total}</h3>
              <p className="text-xs text-center mt-2 font-bold bg-gray-200 py-1">PAGO: {ticketActual.metodo_pago}</p>
            </>
          ) : (
            <>
              <div className="text-left text-xs space-y-1 mb-2">
                <p><b>Fecha:</b> {ticketActual.fecha} - {ticketActual.hora}</p>
                <p><b>Responsable:</b> {ticketActual.responsable}</p>
              </div>
              <hr className="my-2 border-dashed border-gray-400" />
              <div className="text-left text-sm space-y-2">
                <div className="flex justify-between"><span>Total Efectivo:</span><span className="font-bold">${ticketActual.recaudacion_efectivo}</span></div>
                <div className="flex justify-between"><span>Total Banco:</span><span className="font-bold">${ticketActual.recaudacion_transf}</span></div>
                <hr className="border-gray-300" />
                <div className="flex justify-between text-xs text-red-600"><span>Gastos/Salidas:</span><span>-${ticketActual.total_salidas}</span></div>
                <div className="flex justify-between text-xs text-blue-600"><span>Ingresos Extra:</span><span>+${ticketActual.total_entradas}</span></div>
              </div>
              <hr className="my-2 border-dashed border-gray-400" />
              <h3 className="text-xl font-black text-right text-green-700">NETO TOTAL: ${ticketActual.recaudacion_efectivo + ticketActual.recaudacion_transf}</h3>
            </>
          )}
        </div>
        <div className="mt-6 flex space-x-4">
          <button onClick={() => window.print()} className="bg-green-600 px-6 py-3 rounded-lg font-bold">🖨️ Imprimir</button>
          <button onClick={() => setTicketActual(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-bold">➡️ Continuar</button>
        </div>
      </div>
    );
  }

  // HEADER COMÚN
  const Header = () => (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center mb-4 rounded-b-xl lg:rounded-xl">
      <div>
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
      </div>
      <div className="flex space-x-2">
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 text-xs px-3 py-2 rounded font-bold">⚙️ Panel Admin</button>}
        {user.rol === 'admin' && vista !== 'pos' && sesionActiva && <button onClick={() => setVista('pos')} className="bg-green-600 text-xs px-3 py-2 rounded font-bold">➡️ Ir a Ventas</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-xs px-3 py-2 rounded font-bold">Salir</button>
      </div>
    </header>
  );

  // VISTA: APERTURA (Si no hay sesión y es admin)
  if (vista === 'admin' && !sesionActiva) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        <Header />
        <div className="flex flex-col items-center justify-center mt-12">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md text-center">
            <h2 className="text-2xl font-black text-white mb-2">Apertura de Caja</h2>
            <p className="text-gray-400 text-sm mb-6">Inicia una nueva sesión para empezar a vender.</p>
            <form onSubmit={abrirCaja} className="space-y-4">
              <input type="text" placeholder="Ej: Noche de Olimpus, Halloween..." className="w-full bg-gray-700 p-3 rounded font-bold text-white text-center focus:outline-none" value={nombreFiestaApertura} onChange={e => setNombreFiestaApertura(e.target.value)} required />
              <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-black text-lg">🔓 ABRIR CAJA</button>
            </form>
            <button onClick={cargarHistorial} className="mt-6 text-purple-400 text-sm font-bold underline">Ver Historial de Cierres Pasados</button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: DASHBOARD ADMIN
  if (vista === 'admin' && sesionActiva) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 relative">
        <Header />
        
        {/* Modal de Detalles Movimientos */}
        {verDetalleMovs && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
              <h2 className="text-xl font-bold uppercase mb-4 text-white">Detalle de {verDetalleMovs}s</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {movsSesion.filter(m => m.tipo === verDetalleMovs).length === 0 ? <p className="text-gray-400">No hay registros.</p> :
                  movsSesion.filter(m => m.tipo === verDetalleMovs).map(m => (
                    <div key={m.id} className="bg-gray-700 p-3 rounded flex justify-between items-center text-sm">
                      <div><p className="font-bold">{m.concepto}</p><p className="text-xs text-gray-400 uppercase">{m.metodo_pago}</p></div>
                      <span className={`font-black ${m.tipo === 'salida' ? 'text-red-400' : 'text-blue-400'}`}>${m.monto}</span>
                    </div>
                  ))
                }
              </div>
              <button onClick={() => setVerDetalleMovs(null)} className="mt-4 bg-gray-600 py-3 rounded font-bold">Cerrar</button>
            </div>
          </div>
        )}

        {/* Tarjetas Superiores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/40 p-5 rounded-xl border border-green-800 flex flex-col justify-center">
            <h2 className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Total Neto</h2>
            <p className="text-3xl font-black text-green-400">${TOTAL_NETO}</p>
          </div>
          <div className="bg-blue-900/40 p-5 rounded-xl border border-blue-800 flex flex-col justify-center">
            <h2 className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Caja (Efectivo)</h2>
            <p className="text-2xl font-bold text-blue-400">${CAJA_FISICA}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-between cursor-pointer hover:bg-gray-700 transition" onClick={() => setVerDetalleMovs('entrada')}>
            <h2 className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Ingresos Extra</h2>
            <p className="text-xl font-bold text-blue-400">+${entradasExtraEfec + entradasExtraTransf}</p>
            <p className="text-[10px] text-gray-400 mt-1 underline">Click para ver detalle</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-red-900/50 flex flex-col justify-between cursor-pointer hover:bg-gray-700 transition" onClick={() => setVerDetalleMovs('salida')}>
            <h2 className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Salidas / Gastos</h2>
            <p className="text-xl font-bold text-red-400">-${salidasEfec + salidasTransf}</p>
            <p className="text-[10px] text-gray-400 mt-1 underline">Click para ver detalle</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Acciones */}
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-lg font-bold mb-4 uppercase text-yellow-400">💵 Nuevo Movimiento</h2>
              <form onSubmit={registrarMovimiento} className="space-y-3">
                <select className="w-full bg-gray-700 p-2 rounded" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Gasto)</option><option value="entrada">🟢 Entrada Extra</option></select>
                <input type="text" placeholder="Concepto" className="w-full bg-gray-700 p-2 rounded" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required />
                <input type="number" placeholder="Monto $" className="w-full bg-gray-700 p-2 rounded" value={movMonto} onChange={e => setMovMonto(e.target.value)} required />
                <select className="w-full bg-gray-700 p-2 rounded" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select>
                <button type="submit" disabled={loading} className="w-full bg-yellow-600 text-black py-2 rounded-lg font-bold">Registrar</button>
              </form>
            </div>
            <button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black text-lg border-2 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]">🔒 CERRAR CAJA DE LA NOCHE</button>
            <button onClick={cargarHistorial} className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-bold border border-gray-600 text-sm">Ver Historial de Cierres</button>
          </div>

          {/* Columna Derecha: Stock */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 lg:col-span-2">
            <h2 className="text-lg font-bold mb-4 uppercase">Control de Stock y Precios</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px] overflow-y-auto pr-2">
              {bebidas.map(b => (
                <div key={b.id} className={`p-4 rounded-lg border ${b.stock < 10 ? 'bg-red-900/20 border-red-800' : 'bg-gray-700/50 border-gray-600'}`}>
                  <p className="font-bold mb-2">{b.nombre}</p>
                  <div className="flex justify-between items-center mb-3 text-sm"><span className="text-green-400 font-bold">${b.precio}</span><span className={`font-bold ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span></div>
                  <div className="flex space-x-2">
                    <button onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 py-1.5 rounded text-xs font-bold">Cambiar $</button>
                    <button onClick={async () => { const s = prompt('Sumar stock:', 10); if (s) { await supabase.from('bebidas').update({stock:b.stock+Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 py-1.5 rounded text-xs font-bold">+ Stock</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: HISTORIAL
  if (vista === 'historial') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        <Header />
        <div className="max-w-4xl mx-auto mt-6">
          <h2 className="text-2xl font-black mb-6 uppercase text-purple-400">Historial de Fiestas (Cierres)</h2>
          <div className="space-y-4">
            {historial.length === 0 ? <p className="text-gray-500">No hay cierres registrados.</p> :
              historial.map(h => (
                <div key={h.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3>
                    <p className="text-xs text-gray-400 mt-1">Abrió: {new Date(h.fecha_apertura).toLocaleDateString()} | Cerró: {h.cerrada_por}</p>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <p className="text-xl font-black text-green-400">${h.recaudacion_efectivo + h.recaudacion_transf}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Total Recaudado</p>
                  </div>
                </div>
              ))
            }
          </div>
          <button onClick={() => setVista('admin')} className="mt-8 bg-gray-700 px-6 py-3 rounded-lg font-bold">Volver al Panel</button>
        </div>
      </div>
    );
  }

  // VISTA: POS (CAJA)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header />
      
      {!sesionActiva ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2>
          <p className="text-gray-400 mt-2">Un administrador debe abrir la caja para poder vender.</p>
        </div>
      ) : (
        <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
          {/* Menú */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider">Menú de Barra</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bebidas.map((item) => (
                <button key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}>
                  <div><span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">{item.categoria}</span><p className="font-bold text-sm line-clamp-2">{item.nombre}</p></div>
                  <div className="mt-3 flex justify-between items-end"><span className="text-lg font-extrabold text-green-400">${item.precio}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-900/80 text-white' : 'bg-gray-700 text-gray-300'}`}>Stock: {item.stock}</span></div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Carrito */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between h-[550px] lg:h-auto">
            <div>
              <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider mb-3">Orden Actual</h2>
              {carrito.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><p className="text-4xl mb-2">🛒</p><p className="text-sm">Venta vacía</p></div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-2.5 rounded-lg border border-gray-600">
                      <div className="flex-1 mr-2"><p className="font-semibold text-xs">{item.nombre}</p><p className="text-xs text-green-400 font-bold">${item.precio * item.cantidad}</p></div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-7 h-7 rounded font-bold">-</button>
                        <span className="font-bold text-sm px-1">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-7 h-7 rounded font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="flex justify-between items-center mb-3"><span className="text-gray-400 uppercase text-xs font-semibold">Total</span><span className="text-2xl font-black text-green-400">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span></div>
              <div className="flex space-x-2 mb-3">
                <button onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>💵 Efectivo</button>
                <button onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>📱 Transf / MP</button>
              </div>
              <button onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-3 px-4 rounded-xl shadow-lg transition text-lg uppercase">{loading ? '...' : 'Cobrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
