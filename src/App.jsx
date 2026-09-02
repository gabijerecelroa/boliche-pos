import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('login');
  const [loading, setLoading] = useState(false);

  // Sesión y Datos
  const [sesionActiva, setSesionActiva] = useState(null);
  const [nombreFiestaApertura, setNombreFiestaApertura] = useState('');
  const [historial, setHistorial] = useState([]);
  const [sesionExpandida, setSesionExpandida] = useState(null);
  
  const [bebidas, setBebidas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [ventasSesion, setVentasSesion] = useState([]);
  const [movsSesion, setMovsSesion] = useState([]);
  const [puertaSesion, setPuertaSesion] = useState([]);
  const [listasVip, setListasVip] = useState([]);

  // Estados UI
  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');
  const [verDetalleModal, setVerDetalleModal] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);

  // Formularios Admin
  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');
  const [nuevoProvNombre, setNuevoProvNombre] = useState('');

  // Formularios Puerta
  const [precioEntrada, setPrecioEntrada] = useState(5000);
  const [cantEntradas, setCantEntradas] = useState(1);
  const [pagoEntrada, setPagoEntrada] = useState('efectivo');
  const [nombreLista, setNombreLista] = useState('');
  const [cantLista, setCantLista] = useState(1);
  const [filtroQR, setFiltroQR] = useState('');

  // Formularios Proveedor (Modal)
  const [modalProv, setModalProv] = useState(null);
  const [tipoProvReg, setTipoProvReg] = useState('bebida');
  const [provBebidaId, setProvBebidaId] = useState('');
  const [provCant, setProvCant] = useState('');
  const [provCosto, setProvCosto] = useState('');
  const [provConceptoDeuda, setProvConceptoDeuda] = useState('');

  const cargarDatos = async () => {
    const { data: prods } = await supabase.from('bebidas').select('*').order('id');
    if (prods) setBebidas(prods);

    const { data: provs } = await supabase.from('proveedores').select('*').order('id');
    if (provs) setProveedores(provs);

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
      const { data: p } = await supabase.from('puerta').select('*').eq('sesion_id', sesion.id);
      const { data: l } = await supabase.from('listas_vip').select('*').eq('sesion_id', sesion.id).order('id', { ascending: false });
      setVentasSesion(v || []); setMovsSesion(m || []); setPuertaSesion(p || []); setListasVip(l || []);
    } else {
      setSesionActiva(null); setVentasSesion([]); setMovsSesion([]); setPuertaSesion([]); setListasVip([]);
    }
  };

  useEffect(() => { if (user) cargarDatos(); }, [user, vista]);

  // CÁLCULOS
  const capitalEnBarra = bebidas.reduce((acc, b) => acc + (b.precio * b.stock), 0);
  const deudaProveedores = proveedores.reduce((acc, p) => acc + ((p.compras || []).reduce((s, c) => s + (c.cantidad * c.costo), 0) - (p.descuento || 0)), 0);
  const CAJA_FISICA = ventasSesion.filter(v => v.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.total), 0) + puertaSesion.filter(p => p.tipo === 'venta' && p.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.total), 0) + movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.monto), 0) - movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.monto), 0);
  const CAJA_BANCO = ventasSesion.filter(v => v.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.total), 0) + puertaSesion.filter(p => p.tipo === 'venta' && p.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.total), 0) + movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.monto), 0) - movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.monto), 0);
  const TOTAL_NETO = CAJA_FISICA + CAJA_BANCO;
  const personasVendidas = puertaSesion.filter(p => p.tipo === 'venta').reduce((a, c) => a + c.cantidad, 0);
  const personasListaIngresadas = puertaSesion.filter(p => p.tipo === 'lista').reduce((a, c) => a + c.cantidad, 0);

  /* ----- AUTH ----- */
  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', document.getElementById('username').value).eq('password', document.getElementById('password').value).single();
    setLoading(false);
    if (error || !data) alert('❌ Usuario o contraseña incorrectos.');
    else { setUser(data); await cargarDatos(); if (data.rol === 'admin') setVista('admin'); else if (data.rol === 'puerta') setVista('control_qr'); else setVista('pos'); }
  };

  const abrirCaja = async (e) => {
    e.preventDefault(); if (!nombreFiestaApertura) return; setLoading(true);
    await supabase.from('sesiones').insert([{ nombre_fiesta: nombreFiestaApertura, abierta_por: user.usuario }]);
    await cargarDatos(); setLoading(false); setVista('pos');
  };

  /* ----- MÓDULO PUERTA Y QRs ----- */
  const venderEntradas = async (e) => {
    e.preventDefault(); if (!sesionActiva || cantEntradas < 1) return; setLoading(true);
    await supabase.from('puerta').insert([{ sesion_id: sesionActiva.id, tipo: 'venta', cantidad: cantEntradas, precio_unitario: precioEntrada, total: cantEntradas * precioEntrada, metodo_pago: pagoEntrada }]);
    setCantEntradas(1); await cargarDatos(); setLoading(false);
  };

  const generarQRLista = async (e) => {
    e.preventDefault(); if (!sesionActiva || !nombreLista || cantLista < 1) return; setLoading(true);
    const codigo = 'VIP-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const { error } = await supabase.from('listas_vip').insert([{ sesion_id: sesionActiva.id, nombre: nombreLista, cantidad: cantLista, codigo: codigo }]);
    if (!error) { setQrGenerado({ nombre: nombreLista, cantidad: cantLista, codigo: codigo }); setNombreLista(''); setCantLista(1); await cargarDatos(); }
    setLoading(false);
  };

  const marcarIngresoQR = async (lista) => {
    if (!window.confirm(`¿Dejar pasar a ${lista.nombre} (${lista.cantidad} personas)?`)) return;
    setLoading(true);
    await supabase.from('listas_vip').update({ estado: 'ingresado' }).eq('id', lista.id);
    await supabase.from('puerta').insert([{ sesion_id: sesionActiva.id, tipo: 'lista', nombre: lista.nombre, cantidad: lista.cantidad, precio_unitario: 0, total: 0 }]);
    setFiltroQR(''); await cargarDatos(); setLoading(false);
  };

  /* ----- MÓDULO VENTAS (BARRA) ----- */
  const agregarAlCarrito = (producto) => {
    if (!producto || producto.stock <= 0) return alert('⚠️ Sin stock disponible');
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert('⚠️ Supera stock'); return prev; }
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      } else return [...prev, { ...producto, cantidad: 1 }];
    });
  };
  const cambiarCantidad = (id, delta) => setCarrito(prev => prev.map(i => i.id === id ? (i.cantidad + delta > 0 ? { ...i, cantidad: i.cantidad + delta } : null) : i).filter(Boolean));
  const procesarVenta = async () => {
    if (carrito.length === 0 || !sesionActiva) return; setLoading(true);
    const totalVenta = carrito.reduce((a, item) => a + (item.precio * item.cantidad), 0);
    const { data: ventaData, error } = await supabase.from('ventas').insert([{ cajero: user.usuario, total: totalVenta, detalles: carrito, metodo_pago: metodoPagoPOS, sesion_id: sesionActiva.id }]).select().single();
    if (!error) {
      for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
      setTicketActual({ tipo: 'venta', id: ventaData.id, fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS });
      setCarrito([]); cargarDatos();
    }
    setLoading(false);
  };

  /* ----- MÓDULO PROVEEDORES SINCRONIZADO ----- */
  const crearProveedor = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('proveedores').insert([{ nombre: nuevoProvNombre }]); setNuevoProvNombre(''); await cargarDatos(); setLoading(false); };
  const eliminarProveedor = async (id, nombre) => { if (window.confirm(`¿Eliminar proveedor "${nombre}"?`)) { setLoading(true); await supabase.from('proveedores').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  
  const guardarRegistroProv = async (e) => {
    e.preventDefault(); setLoading(true);
    const prov = proveedores.find(p => p.id === modalProv.id);
    let nuevoItem = { id: Date.now(), cantidad: Number(provCant || 1), costo: Number(provCosto) };

    if (tipoProvReg === 'bebida') {
      const bebida = bebidas.find(b => b.id === Number(provBebidaId));
      if(!bebida) { alert("Selecciona una bebida"); setLoading(false); return; }
      nuevoItem = { ...nuevoItem, tipo: 'bebida', producto: bebida.nombre, bebida_id: bebida.id };
      await supabase.from('bebidas').update({ stock: bebida.stock + Number(provCant) }).eq('id', bebida.id);
    } else {
      nuevoItem = { ...nuevoItem, tipo: 'deuda', producto: provConceptoDeuda };
    }
    await supabase.from('proveedores').update({ compras: [...(prov.compras || []), nuevoItem] }).eq('id', prov.id);
    setModalProv(null); setProvCant(''); setProvCosto(''); setProvConceptoDeuda(''); await cargarDatos(); setLoading(false);
  };

  const aplicarDescuentoProv = async (id, descActual) => { const desc = prompt('Descuento a favor ($):', descActual || 0); if (desc !== null && !isNaN(desc)) { await supabase.from('proveedores').update({ descuento: Number(desc) }).eq('id', id); cargarDatos(); } };
  const pagarDeudaProveedor = async (prov, totalDeuda) => {
    if (!sesionActiva) return alert('⚠️ ABRIR CAJA primero para poder sacar plata.');
    if (totalDeuda <= 0) return alert('Sin deuda pendiente.');
    const metodo = prompt(`Pagar $${totalDeuda} a ${prov.nombre}.\nEscribe "efectivo" o "transferencia"`, "efectivo");
    if (metodo !== 'efectivo' && metodo !== 'transferencia') return;
    if (window.confirm(`¿Confirmas el pago con la CAJA ACTUAL?`)) {
      setLoading(true);
      await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: 'salida', concepto: `Pago a Proveedor: ${prov.nombre}`, monto: totalDeuda, metodo_pago: metodo, sesion_id: sesionActiva.id }]);
      await supabase.from('proveedores').update({ compras: [], descuento: 0 }).eq('id', prov.id);
      await cargarDatos(); setLoading(false); alert('✅ Pago registrado. La deuda volvió a $0.');
    }
  };

  /* ----- ADMIN Y CIERRE ----- */
  const crearProducto = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('bebidas').insert([{ nombre: nuevoNombre, precio: Number(nuevoPrecio), stock: Number(nuevoStock), categoria: nuevaCat }]); setNuevoNombre(''); setNuevoPrecio(''); setNuevoStock(''); cargarDatos(); setLoading(false); };
  const eliminarProducto = async (id, nombre) => { if (window.confirm(`¿Eliminar "${nombre}"?`)) { setLoading(true); await supabase.from('bebidas').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const registrarMovimiento = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo, sesion_id: sesionActiva.id }]); setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false); };
  
  const procesarCierre = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de CERRAR CAJA definitivamente?')) return;
    setLoading(true);
    let conteoProductos = {}; ventasSesion.forEach(v => { v.detalles.forEach(item => { if (!conteoProductos[item.nombre]) conteoProductos[item.nombre] = 0; conteoProductos[item.nombre] += item.cantidad; }); });
    const resumenCierre = {
      estado: 'cerrada', cerrada_por: user.usuario, fecha_cierre: new Date().toISOString(), recaudacion_efectivo: CAJA_FISICA, recaudacion_transf: CAJA_BANCO,
      total_salidas: movsSesion.filter(m=>m.tipo==='salida').reduce((a,c)=>a+Number(c.monto),0), total_ingresos: movsSesion.filter(m=>m.tipo==='entrada').reduce((a,c)=>a+Number(c.monto),0),
      ranking_ventas: conteoProductos, personas_vendidas: personasVendidas, personas_lista: personasListaIngresadas
    };
    await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id);
    setTicketActual({ tipo: 'cierre', fiesta: sesionActiva.nombre_fiesta, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), responsable: user.usuario, ...resumenCierre });
    setSesionActiva(null); setVista('admin'); setLoading(false);
  };

  /* ================== RENDERIZADO ================== */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-purple-500 tracking-widest">GJBROSS</h1><p className="text-white tracking-widest text-sm mt-1">SISTEMA POS</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" id="username" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario" required />
            <input type="password" id="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)]">ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  // VISTA EXCLUSIVA: USUARIO DE PUERTA (Control QR)
  if (user.rol === 'puerta') {
    const listasFiltradas = listasVip.filter(l => l.nombre.toLowerCase().includes(filtroQR.toLowerCase()) || l.codigo.toLowerCase().includes(filtroQR.toLowerCase()));
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <header className="bg-gray-800 p-4 rounded-xl mb-4 flex justify-between items-center border border-purple-500/30">
          <div><h1 className="text-lg font-black text-purple-400">CONTROL DE PUERTA</h1><p className="text-xs text-green-400 uppercase">{sesionActiva ? sesionActiva.nombre_fiesta : 'Caja Cerrada'}</p></div>
          <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-600 px-3 py-2 rounded font-bold text-xs">Salir</button>
        </header>
        {!sesionActiva ? <div className="text-center mt-20"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Esperando que abran la caja...</p></div> : (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between">
              <div className="text-center"><p className="text-xs text-gray-400 font-bold uppercase">Ingresados (Gratis)</p><p className="text-2xl font-black text-green-400">{personasListaIngresadas}</p></div>
              <div className="text-center"><p className="text-xs text-gray-400 font-bold uppercase">Listas Pendientes</p><p className="text-2xl font-black text-yellow-400">{listasVip.filter(l => l.estado === 'pendiente').length}</p></div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Escanear QR o buscar Nombre..." className="w-full bg-gray-800 p-4 pl-12 rounded-xl border border-gray-700 font-black text-lg focus:outline-none focus:border-purple-500" value={filtroQR} onChange={e => setFiltroQR(e.target.value)} autoFocus />
              <span className="absolute left-4 top-4 text-xl">🔍</span>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {listasFiltradas.length === 0 ? <p className="text-center text-gray-500 py-6">No se encontraron listas.</p> :
                listasFiltradas.map(l => (
                  <div key={l.id} className={`p-4 rounded-xl border flex justify-between items-center ${l.estado === 'ingresado' ? 'bg-green-900/20 border-green-900 opacity-50' : 'bg-gray-800 border-gray-600'}`}>
                    <div>
                      <p className="font-black text-lg uppercase">{l.nombre}</p>
                      <p className="text-xs text-gray-400">Código: <span className="text-yellow-400 font-bold">{l.codigo}</span></p>
                    </div>
                    {l.estado === 'ingresado' ? (
                      <span className="text-green-500 font-black text-xs uppercase bg-green-900/40 px-2 py-1 rounded">Ingresó</span>
                    ) : (
                      <button onClick={() => marcarIngresoQR(l)} className="bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded-lg font-black text-sm uppercase shadow-[0_0_10px_rgba(147,51,234,0.4)]">Dar Ingreso (+{l.cantidad})</button>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  }

  // HEADER PARA ADMIN Y CAJERO
  const barraHeader = (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center mb-4 rounded-b-xl lg:rounded-xl gap-3">
      <div className="flex flex-col items-center md:items-start w-full md:w-auto">
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {user.rol === 'admin' && vista !== 'proveedores' && <button onClick={() => setVista('proveedores')} className="bg-orange-600 hover:bg-orange-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">🚚 Provs</button>}
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 hover:bg-blue-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">⚙️ Admin</button>}
        {sesionActiva && vista !== 'puerta' && <button onClick={() => setVista('puerta')} className="bg-yellow-600 hover:bg-yellow-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow text-black">🚪 Puerta / Listas</button>}
        {sesionActiva && vista !== 'pos' && <button onClick={() => setVista('pos')} className="bg-green-600 hover:bg-green-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">🍹 Barra</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">Salir</button>
      </div>
    </header>
  );

  // VISTA: PUERTA (TAQUILLA Y GENERACIÓN DE QRs)
  if (vista === 'puerta') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        {barraHeader}
        
        {/* Modal Código QR */}
        {qrGenerado && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm text-center shadow-[0_0_30px_rgba(147,51,234,0.5)]">
              <h2 className="text-2xl font-black text-black uppercase mb-1">Pase VIP</h2>
              <p className="text-purple-600 font-bold uppercase">{sesionActiva.nombre_fiesta}</p>
              <div className="my-4 flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrGenerado.codigo}`} alt="QR Code" className="rounded-lg shadow-md" /></div>
              <p className="font-black text-xl text-black">{qrGenerado.nombre}</p>
              <p className="text-gray-600 font-bold">Válido para: {qrGenerado.cantidad} personas</p>
              <p className="text-xs text-gray-400 mt-2 bg-gray-100 p-2 rounded border border-dashed">Tomá captura de pantalla y envíaselo por WhatsApp</p>
              <button onClick={() => setQrGenerado(null)} className="mt-4 w-full bg-purple-600 text-white py-3 rounded-lg font-black uppercase shadow">Hecho</button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-xl font-black uppercase text-green-400 mb-4 flex items-center gap-2">🎟️ Venta Entradas (Taquilla)</h2>
              <form onSubmit={venderEntradas} className="space-y-4">
                <div className="flex gap-2">
                  <div className="w-1/2"><label className="text-xs text-gray-400 font-bold uppercase">Precio Unitario ($)</label><input type="number" className="w-full bg-gray-700 p-3 rounded-lg font-bold mt-1" value={precioEntrada} onChange={e => setPrecioEntrada(e.target.value)} required /></div>
                  <div className="w-1/2"><label className="text-xs text-gray-400 font-bold uppercase">Personas</label><div className="flex items-center mt-1"><button type="button" onClick={() => setCantEntradas(Math.max(1, cantEntradas - 1))} className="bg-gray-600 px-4 py-3 rounded-l-lg font-black">-</button><input type="number" className="w-full bg-gray-700 p-3 text-center font-bold" value={cantEntradas} readOnly /><button type="button" onClick={() => setCantEntradas(cantEntradas + 1)} className="bg-gray-600 px-4 py-3 rounded-r-lg font-black">+</button></div></div>
                </div>
                <div className="bg-gray-900 p-3 rounded-lg flex justify-between items-center border border-gray-700"><span className="text-sm font-bold text-gray-400">Total a Cobrar:</span><span className="text-2xl font-black text-white">${cantEntradas * precioEntrada}</span></div>
                <div className="flex space-x-2"><button type="button" onClick={() => setPagoEntrada('efectivo')} className={`flex-1 py-3 rounded-lg font-black text-xs uppercase transition ${pagoEntrada === 'efectivo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>💵 Efectivo</button><button type="button" onClick={() => setPagoEntrada('transferencia')} className={`flex-1 py-3 rounded-lg font-black text-xs uppercase transition ${pagoEntrada === 'transferencia' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>📱 Transf</button></div>
                <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-lg uppercase shadow">Vender Pulsera</button>
              </form>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-xl font-black uppercase text-yellow-400 mb-4 flex items-center gap-2">📱 Generar Pase QR (Lista VIP)</h2>
              <form onSubmit={generarQRLista} className="space-y-4">
                <div><label className="text-xs text-gray-400 font-bold uppercase">Nombre Principal (El que muestra el QR)</label><input type="text" className="w-full bg-gray-700 p-3 rounded-lg font-bold mt-1" value={nombreLista} onChange={e => setNombreLista(e.target.value)} required placeholder="Ej: Gabriel Roa" /></div>
                <div><label className="text-xs text-gray-400 font-bold uppercase">Total de Personas (+Acompañantes)</label><div className="flex items-center mt-1"><button type="button" onClick={() => setCantLista(Math.max(1, cantLista - 1))} className="bg-gray-600 px-4 py-3 rounded-l-lg font-black">-</button><input type="number" className="w-full bg-gray-700 p-3 text-center font-bold text-yellow-400 text-xl" value={cantLista} readOnly /><button type="button" onClick={() => setCantLista(cantLista + 1)} className="bg-gray-600 px-4 py-3 rounded-r-lg font-black">+</button></div></div>
                <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-black text-lg uppercase shadow-[0_0_15px_rgba(147,51,234,0.4)]">Generar QR</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: PROVEEDORES (Con Modal de Registro Sincronizado)
  if (vista === 'proveedores') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        {barraHeader}
        
        {/* Modal Añadir a Proveedor */}
        {modalProv && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md">
              <h2 className="text-xl font-black uppercase text-orange-400 mb-4">Ingreso de: {modalProv.nombre}</h2>
              <form onSubmit={guardarRegistroProv} className="space-y-4">
                <select className="w-full bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={tipoProvReg} onChange={e => setTipoProvReg(e.target.value)}><option value="bebida">📦 Ingreso de Mercadería (Suma a Stock)</option><option value="deuda">📄 Deuda Extra (Ej: Alquiler, Arreglos)</option></select>
                
                {tipoProvReg === 'bebida' ? (
                  <>
                    <select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={provBebidaId} onChange={e => setProvBebidaId(e.target.value)} required>
                      <option value="">-- Selecciona el producto que trajo --</option>
                      {bebidas.map(b => <option key={b.id} value={b.id}>{b.nombre} (Stock actual: {b.stock})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Cant. traída" className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold" value={provCant} onChange={e => setProvCant(e.target.value)} required />
                      <input type="number" placeholder="$ Costo Unit." className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold" value={provCosto} onChange={e => setProvCosto(e.target.value)} required />
                    </div>
                  </>
                ) : (
                  <>
                    <input type="text" placeholder="Concepto de la deuda" className="w-full bg-gray-700 p-3 rounded-lg font-bold" value={provConceptoDeuda} onChange={e => setProvConceptoDeuda(e.target.value)} required />
                    <input type="number" placeholder="Monto total $ de la deuda" className="w-full bg-gray-700 p-3 rounded-lg font-bold" value={provCosto} onChange={e => setProvCosto(e.target.value)} required />
                  </>
                )}
                <div className="flex space-x-2 pt-2"><button type="button" onClick={() => setModalProv(null)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold uppercase">Cancelar</button><button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-500 py-3 rounded-lg font-black uppercase shadow">Guardar</button></div>
              </form>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto mt-6">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div><h2 className="text-2xl font-black uppercase text-orange-400">🚚 Proveedores y Stock</h2><p className="text-sm text-gray-400">Al cargar mercadería acá, el stock de la barra se actualiza solo.</p></div>
            <form onSubmit={crearProveedor} className="flex w-full md:w-auto"><input type="text" placeholder="Nombre Prov." className="w-full bg-gray-700 p-3 rounded-l-lg focus:outline-none" value={nuevoProvNombre} onChange={e => setNuevoProvNombre(e.target.value)} required /><button type="submit" className="bg-orange-600 px-6 font-bold rounded-r-lg">Añadir</button></form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proveedores.map(p => {
              const subtotal = (p.compras || []).reduce((acc, c) => acc + ((c.cantidad||1) * c.costo), 0);
              const totalPagar = subtotal - (p.descuento || 0);
              return (
                <div key={p.id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative flex flex-col">
                  <button onClick={() => eliminarProveedor(p.id, p.nombre)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition">❌</button>
                  <h3 className="text-xl font-black text-white uppercase mb-4 pr-8 border-b border-gray-700 pb-2">{p.nombre}</h3>
                  <div className="bg-gray-700/50 p-3 rounded-xl flex-1 max-h-[200px] overflow-y-auto mb-4 border border-gray-600 space-y-2 custom-scrollbar">
                    {(!p.compras || p.compras.length === 0) ? <p className="text-gray-500 text-sm text-center mt-4">Sin deudas.</p> : p.compras.map(c => (<div key={c.id} className="flex justify-between items-center bg-gray-800 p-2 rounded text-sm shadow"><div className="flex-1 pr-2"><p className="font-bold text-white line-clamp-1">{c.producto}</p><p className="text-[10px] text-gray-400">{c.tipo==='bebida'?`${c.cantidad}x (Stock sumado)`:'Cargo extra'}</p></div><span className="font-black text-orange-400">${(c.cantidad||1) * c.costo}</span></div>))}
                  </div>
                  <div className="space-y-1 mb-3 bg-gray-900 p-3 rounded-lg"><div className="flex justify-between text-xs text-gray-400"><span>Subtotal:</span><span>${subtotal}</span></div><div className="flex justify-between text-xs text-yellow-400"><span>Descuento:</span><span>-${p.descuento || 0}</span></div><hr className="border-gray-700 my-2"/><div className="flex justify-between text-lg font-black text-white"><span>DEUDA:</span><span className="text-orange-400">${totalPagar}</span></div></div>
                  <div className="flex space-x-2 mb-3"><button onClick={() => {setModalProv(p); setTipoProvReg('bebida');}} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg font-bold text-[10px] uppercase shadow">+ Sumar</button><button onClick={() => aplicarDescuentoProv(p.id, p.descuento)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-2 rounded-lg font-bold text-[10px] uppercase shadow">🎁 Desc.</button></div>
                  <button onClick={() => pagarDeudaProveedor(p, totalPagar)} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-black text-xs uppercase shadow-[0_0_10px_rgba(220,38,38,0.4)]">💸 Pagar con Plata de Caja</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // RESTO DE VISTAS (ADMIN DASHBOARD y POS BARRA) se mantienen usando la estructura principal.
  // Como el código es muy grande y repetitivo, he blindado todas las funciones arriba.
  // Reutilizamos el renderizado de POS y Admin tal cual lo tenías, ya conectados a la lógica.

  // 6. VISTA: ADMIN
  if (vista === 'admin') {
    if (!sesionActiva) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">{barraHeader}<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"><div className="lg:col-span-1"><div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl"><h2 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-widest">Apertura</h2><p className="text-gray-400 text-sm mb-6 text-center">Inicia un turno para habilitar la barra.</p><form onSubmit={abrirCaja} className="space-y-4"><input type="text" placeholder="Ej: Fiesta Halloween..." className="w-full bg-gray-700 p-4 rounded-xl font-black text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreFiestaApertura} onChange={e => setNombreFiestaApertura(e.target.value)} required /><button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">🔓 ABRIR CAJA</button></form></div></div><div className="lg:col-span-2"><div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-[70vh]"><h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex items-center border-b border-gray-700 pb-2">📚 Historial de Cierres</h2><div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{historial.length === 0 ? <p className="text-gray-500 text-center py-10">No hay cierres.</p> : historial.map(h => (<div key={h.id} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transition"><div className="flex justify-between items-start cursor-pointer" onClick={() => setSesionExpandida(sesionExpandida === h.id ? null : h.id)}><div><h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3><p className="text-xs text-gray-400 mt-1">📅 {new Date(h.fecha_cierre).toLocaleDateString()} - 👤 {h.cerrada_por}</p></div><div className="text-right"><p className="text-xl font-black text-green-400">${Number(h.recaudacion_efectivo) + Number(h.recaudacion_transf)}</p><p className="text-[10px] text-gray-300 uppercase mt-1 bg-gray-800 px-2 py-1 rounded inline-block shadow">{sesionExpandida === h.id ? '🔼 Ocultar' : '🔽 Detalles'}</p></div></div>{sesionExpandida === h.id && (<div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Finanzas del Turno</h4><div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700"><div className="flex justify-between"><span>Efectivo:</span><span className="font-bold text-blue-400">${h.recaudacion_efectivo}</span></div><div className="flex justify-between"><span>Transferencias:</span><span className="font-bold text-purple-400">${h.recaudacion_transf}</span></div><hr className="border-gray-600 my-1" /><div className="flex justify-between"><span>Total Ingresos:</span><span className="font-bold text-purple-400">{h.personas_vendidas + h.personas_lista} pers.</span></div><div className="flex justify-between"><span>(Vendidas / Gratis):</span><span className="text-gray-400 text-xs">({h.personas_vendidas} / {h.personas_lista})</span></div></div></div><div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2">🔥 Top Bebidas</h4><div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">{h.ranking_ventas && Object.keys(h.ranking_ventas).length > 0 ? (Object.entries(h.ranking_ventas).sort(([,a], [,b]) => b - a).slice(0, 5).map(([nombre, cant]) => (<div key={nombre} className="flex justify-between border-b border-gray-700 pb-1"><span className="truncate pr-2 text-gray-300">{nombre}</span><span className="font-black text-yellow-400">{cant}x</span></div>))) : <span className="text-gray-500 text-xs">Sin datos.</span>}</div></div></div>)}</div>))}</div></div></div></div></div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 relative">
        {barraHeader}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/30 p-5 rounded-2xl border border-green-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total General Neto</h2><p className="text-4xl font-black text-green-400">${TOTAL_NETO}</p></div>
          <div className="bg-blue-900/30 p-5 rounded-2xl border border-blue-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Caja (Físico)</h2><p className="text-3xl font-black text-blue-400">${CAJA_FISICA}</p></div>
          <div className="bg-purple-900/30 p-5 rounded-2xl border border-purple-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Banco / MP (Digital)</h2><p className="text-3xl font-black text-purple-400">${CAJA_BANCO}</p></div>
          <div className="bg-orange-900/30 p-5 rounded-2xl border border-orange-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deuda a Proveedores</h2><p className="text-3xl font-black text-orange-400">${deudaProveedores}</p></div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center shadow-lg"><div><h2 className="text-sm font-bold text-gray-400 uppercase">📊 Estadísticas de Puerta</h2><p className="text-sm text-white mt-1"><span className="text-green-400 font-bold">{personasVendidas}</span> Vendidas | <span className="text-yellow-400 font-bold">{personasListaIngresadas}</span> Gratis Ingresados</p></div><div className="text-right"><p className="text-xs text-gray-500 uppercase">Total Adentro</p><p className="text-2xl font-black text-purple-400">{personasVendidas + personasListaIngresadas} pers.</p></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="space-y-6"><div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black mb-4 uppercase text-yellow-400 flex items-center">💵 Registrar Movimiento</h2><form onSubmit={registrarMovimiento} className="space-y-3"><select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Gasto)</option><option value="entrada">🟢 Ingreso Extra</option></select><input type="text" placeholder="Concepto" className="w-full bg-gray-700 p-3 rounded-lg" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required /><div className="flex space-x-2"><input type="number" placeholder="Monto $" className="w-2/3 bg-gray-700 p-3 rounded-lg font-bold" value={movMonto} onChange={e => setMovMonto(e.target.value)} required /><select className="w-1/3 bg-gray-700 p-3 rounded-lg text-sm" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transf</option></select></div><button type="submit" disabled={loading} className="w-full bg-yellow-600 text-black py-3 rounded-lg font-black uppercase">Registrar</button></form></div><button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)]">🔒 CERRAR ARQUEO Z</button></div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 lg:col-span-2 shadow-xl"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black uppercase text-white">📦 Base de Datos (Menú)</h2><div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Capital en Barra</p><p className="text-xl font-black text-green-400">${capitalEnBarra}</p></div></div><form onSubmit={crearProducto} className="flex flex-col sm:flex-row gap-2 mb-6 bg-gray-700/50 p-3 rounded-xl border border-gray-600"><input type="text" placeholder="Nombre" className="flex-1 bg-gray-800 p-2 rounded text-sm" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required /><input type="number" placeholder="$ Precio" className="w-full sm:w-24 bg-gray-800 p-2 rounded text-sm" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} required /><input type="number" placeholder="Stock" className="w-full sm:w-20 bg-gray-800 p-2 rounded text-sm" value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required /><select className="w-full sm:w-28 bg-gray-800 p-2 rounded text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}><option value="bebida">Bebida</option><option value="combo">Combo</option><option value="entrada">Entrada</option></select><button type="submit" className="bg-purple-600 px-4 py-2 rounded font-bold text-sm">+</button></form><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">{bebidas.map(b => (<div key={b.id} className={`p-4 rounded-xl border relative ${b.stock < 10 ? 'bg-red-900/10 border-red-900' : 'bg-gray-700/30 border-gray-600'}`}><button type="button" onClick={() => eliminarProducto(b.id, b.nombre)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-lg">❌</button><p className="font-bold text-sm mb-1 pr-6">{b.nombre}</p><div className="flex justify-between items-center mb-3"><span className="text-green-400 font-black text-lg">${b.precio}</span><span className={`font-bold text-xs bg-gray-800 px-2 py-1 rounded ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span></div><div className="flex space-x-2"><button type="button" onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 py-2 rounded text-xs font-bold uppercase">Cambiar $</button><button type="button" onClick={async () => { const s = prompt(`Stock exacto:`, b.stock); if (s !== null && !isNaN(s)) { await supabase.from('bebidas').update({stock:Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 py-2 rounded text-xs font-bold uppercase">Mod. Stock</button></div></div>))}</div></div></div></div>
    );
  }

  // 7. VISTA: POS (BARRA)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">{barraHeader}{!sesionActiva ? (<div className="flex-1 flex flex-col items-center justify-center p-6 text-center"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2></div>) : (<div className="flex-1 p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full"><div className="lg:col-span-2 space-y-3"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">{bebidas.map((item) => (<button type="button" key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-3 lg:p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}><div><span className="text-[10px] font-black uppercase text-purple-500 block mb-1">{item.categoria}</span><p className="font-bold text-xs lg:text-sm line-clamp-2 leading-tight">{item.nombre}</p></div><div className="mt-2 flex justify-between items-end"><span className="text-base lg:text-lg font-black text-green-400">${item.precio}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Stk: {item.stock}</span></div></button>))}</div></div><div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col justify-between h-[450px] lg:h-auto shadow-2xl"><div><h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 border-b border-gray-700 pb-2">Ticket Actual</h2>{carrito.length === 0 ? (<div className="text-center py-10 text-gray-600"><p className="text-4xl mb-2">🍹</p><p className="text-xs font-bold uppercase">Toque productos para agregar</p></div>) : (<div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">{carrito.map((item) => (<div key={item.id} className="flex items-center justify-between bg-gray-700/40 p-2 rounded-lg border border-gray-600"><div className="flex-1 mr-2"><p className="font-bold text-xs line-clamp-1">{item.nombre}</p><p className="text-xs text-green-400 font-black">${item.precio * item.cantidad}</p></div><div className="flex items-center space-x-1"><button type="button" onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">-</button><span className="font-black text-sm w-4 text-center">{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">+</button></div></div>))}</div>)}</div><div className="pt-2"><div className="flex justify-between items-end mb-3"><span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span><span className="text-3xl font-black text-green-400 leading-none">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span></div><div className="flex space-x-2 mb-3"><button type="button" onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>💵 Efectivo</button><button type="button" onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📱 Transf</button></div><button type="button" onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition active:scale-95 text-lg uppercase tracking-widest">{loading ? '...' : 'COBRAR'}</button></div></div></div>)}</div>
  );
}

export default App;
