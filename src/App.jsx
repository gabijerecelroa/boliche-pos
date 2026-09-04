import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Scanner } from '@yudiel/react-qr-scanner';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('login');
  const [loading, setLoading] = useState(false);

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

  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');
  const [verDetalleModal, setVerDetalleModal] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);

  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');
  const [nuevoProvNombre, setNuevoProvNombre] = useState('');
  
  const [tipoEntradaVenta, setTipoEntradaVenta] = useState('General');
  const [precioEntrada, setPrecioEntrada] = useState(5000);
  const [cantEntradas, setCantEntradas] = useState(1);
  const [pagoEntrada, setPagoEntrada] = useState('efectivo');
  
  const [tipoPaseQr, setTipoPaseQr] = useState('vip');
  const [nombreLista, setNombreLista] = useState('');
  const [cantLista, setCantLista] = useState(1);
  const [filtroQR, setFiltroQR] = useState('');
  
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

  // 🔴 MAGIA DE TIEMPO REAL: El Radar que actualiza todo solo
  useEffect(() => {
    if (!user) return;
    const radar = supabase.channel('gjbross_en_vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puerta' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_vip' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bebidas' }, () => cargarDatos())
      .subscribe();

    return () => { supabase.removeChannel(radar); };
  }, [user]);

  // Cálculos Financieros
  const capitalEnBarra = bebidas.reduce((acc, b) => acc + (b.precio * b.stock), 0);
  const deudaProveedores = proveedores.reduce((acc, p) => acc + ((p.compras || []).reduce((s, c) => s + ((c.cantidad||1) * c.costo), 0) - (p.descuento || 0)), 0);
  
  const totalEfecVentas = ventasSesion.filter(v => v.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.total), 0);
  const totalTransfVentas = ventasSesion.filter(v => v.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.total), 0);
  const totalEfecPuerta = puertaSesion.filter(p => p.tipo === 'venta' && p.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.total), 0);
  const totalTransfPuerta = puertaSesion.filter(p => p.tipo === 'venta' && p.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.total), 0);
  
  const entradasExtraEfec = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.monto), 0);
  const entradasExtraTransf = movsSesion.filter(m => m.tipo === 'entrada' && m.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.monto), 0);
  const salidasEfec = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.monto), 0);
  const salidasTransf = movsSesion.filter(m => m.tipo === 'salida' && m.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.monto), 0);
  
  const CAJA_FISICA = totalEfecVentas + totalEfecPuerta + entradasExtraEfec - salidasEfec;
  const CAJA_BANCO = totalTransfVentas + totalTransfPuerta + entradasExtraTransf - salidasTransf;
  const TOTAL_NETO = CAJA_FISICA + CAJA_BANCO;
  
  const cantGenerales = puertaSesion.filter(p => p.tipo === 'venta' && p.nombre?.includes('General')).reduce((a, c) => a + c.cantidad, 0);
  const cantVips = puertaSesion.filter(p => p.tipo === 'venta' && p.nombre?.includes('VIP')).reduce((a, c) => a + c.cantidad, 0);
  const personasVendidas = cantGenerales + cantVips;
  const personasListaIngresadas = puertaSesion.filter(p => p.tipo === 'lista').reduce((a, c) => a + c.cantidad, 0);

  // Funciones de Login y Apertura
  const handleLogin = async (e) => { 
    e.preventDefault(); setLoading(true); 
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', document.getElementById('username').value).eq('password', document.getElementById('password').value).single(); 
    setLoading(false); 
    if (error || !data) alert('❌ Error: Usuario o Contraseña'); 
    else { 
      setUser(data); await cargarDatos(); 
      if (data.rol === 'admin') setVista('admin'); 
      else if (data.rol === 'puerta') setVista('control_qr'); 
      else if (data.rol === 'boleteria') setVista('boleteria'); 
      else setVista('pos'); 
    } 
  };

  const abrirCaja = async (e) => { 
    e.preventDefault(); if (!nombreFiestaApertura) return; setLoading(true); 
    await supabase.from('sesiones').insert([{ nombre_fiesta: nombreFiestaApertura, abierta_por: user.usuario }]); 
    await cargarDatos(); setLoading(false); setVista('admin'); 
  };

  // Funciones de Puerta / QR / Boletería
  const venderEntradas = async (e) => { 
    e.preventDefault(); if (!sesionActiva || cantEntradas < 1) return; setLoading(true); 
    const total = cantEntradas * precioEntrada; 
    await supabase.from('puerta').insert([{ sesion_id: sesionActiva.id, tipo: 'venta', nombre: `Pulsera ${tipoEntradaVenta}`, cantidad: cantEntradas, precio_unitario: precioEntrada, total, metodo_pago: pagoEntrada }]); 
    setCantEntradas(1); await cargarDatos(); setLoading(false); alert(`✅ Venta Exitosa`); 
  };
  
  const generarQRLista = async (e) => { 
    e.preventDefault(); if (!sesionActiva || !nombreLista || cantLista < 1) return; setLoading(true); 
    const prefijo = tipoPaseQr === 'vip' ? 'VIP-' : 'GEN-'; 
    const codigo = prefijo + Math.random().toString(36).substr(2, 5).toUpperCase(); 
    const { error } = await supabase.from('listas_vip').insert([{ sesion_id: sesionActiva.id, nombre: nombreLista, cantidad: cantLista, ingresados: 0, codigo, tipo_pase: tipoPaseQr }]); 
    if (!error) { 
      setQrGenerado({ nombre: nombreLista, cantidad: cantLista, codigo, tipo_pase: tipoPaseQr }); 
      setNombreLista(''); setCantLista(1); await cargarDatos(); 
    } 
    setLoading(false); 
  };

  const descargarInvitacion = (qrData) => {
    const canvas = document.createElement('canvas'); 
    canvas.width = 1080; canvas.height = 1920; 
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920); 
    grad.addColorStop(0, '#0f0c29'); grad.addColorStop(0.5, '#302b63'); grad.addColorStop(1, '#24243e'); 
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 15; ctx.strokeRect(50, 50, 980, 1820);
    
    ctx.fillStyle = '#10b981'; ctx.font = 'bold 45px sans-serif'; ctx.textAlign = 'center'; 
    ctx.fillText(`FIESTA: ${sesionActiva?.nombre_fiesta?.toUpperCase() || ''}`, 540, 150);
    ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 80px sans-serif'; 
    ctx.fillText('GJBROSS', 540, 250);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px sans-serif'; 
    ctx.fillText(`PASE ${qrData.tipo_pase?.toUpperCase() || 'VIP'}`, 540, 420);
    ctx.fillStyle = '#fbbf24'; ctx.font = '60px sans-serif'; 
    ctx.fillText(qrData.nombre.toUpperCase(), 540, 600);
    ctx.fillStyle = '#9ca3af'; ctx.font = '40px sans-serif'; 
    ctx.fillText(`Válido para ${qrData.cantidad} personas`, 540, 680);
    
    const img = new Image(); img.crossOrigin = 'Anonymous';
    img.onload = () => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(270, 800, 540, 540); 
        ctx.drawImage(img, 290, 820, 500, 500);
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 60px sans-serif'; 
        ctx.fillText(qrData.codigo, 540, 1500);
        ctx.fillStyle = '#9ca3af'; ctx.font = '35px sans-serif'; 
        ctx.fillText('Presenta este código en la puerta', 540, 1750);
        
        const link = document.createElement('a'); 
        link.download = `Invitacion_${qrData.tipo_pase||'vip'}_${qrData.nombre}.png`; 
        link.href = canvas.toDataURL('image/png'); 
        link.click();
    };
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrData.codigo}&color=000000&bgcolor=FFFFFF`;
  };

  const procesarEscaneoAutomatico = async (textoCodigo) => { 
    setMostrarEscaner(false); 
    const listaEncontrada = listasVip.find(l => l.codigo.toUpperCase() === textoCodigo.toUpperCase()); 
    if (!listaEncontrada) return alert('❌ CÓDIGO INVÁLIDO O INEXISTENTE.'); 
    if (listaEncontrada.estado === 'ingresado') { 
      alert(`⚠️ CÓDIGO COMPLETADO.\nYa entraron las ${listaEncontrada.cantidad} personas de este QR.`); 
      setFiltroQR(textoCodigo); return; 
    } 

    const yaIngresados = listaEncontrada.ingresados || 0;
    const disponibles = listaEncontrada.cantidad - yaIngresados;
    
    const cantIngresarStr = prompt(`🎟️ PASE: ${listaEncontrada.nombre}\n\nQuedan disponibles: ${disponibles} (de ${listaEncontrada.cantidad}).\n\n¿Cuántos ingresan AHORA MISMO?`, disponibles);
    
    if (cantIngresarStr === null) return; 
    const cantIngresar = Number(cantIngresarStr);
    
    if (isNaN(cantIngresar) || cantIngresar <= 0 || cantIngresar > disponibles) {
      return alert(`❌ Cantidad inválida. Debes ingresar un número entre 1 y ${disponibles}.`);
    }

    setLoading(true); 
    const nuevosIngresados = yaIngresados + cantIngresar;
    const nuevoEstado = nuevosIngresados >= listaEncontrada.cantidad ? 'ingresado' : 'pendiente';

    await supabase.from('listas_vip').update({ ingresados: nuevosIngresados, estado: nuevoEstado }).eq('id', listaEncontrada.id); 
    await supabase.from('puerta').insert([{ sesion_id: sesionActiva.id, tipo: 'lista', nombre: `Lista ${listaEncontrada.tipo_pase?.toUpperCase()||'VIP'} - ${listaEncontrada.nombre}`, cantidad: cantIngresar, precio_unitario: 0, total: 0 }]); 
    
    setFiltroQR(''); await cargarDatos(); setLoading(false); 
    alert(`✅ ACCESO PERMITIDO\n\nVIP: ${listaEncontrada.nombre}\nPASAN AHORA: ${cantIngresar} PERSONAS\nFaltan llegar: ${listaEncontrada.cantidad - nuevosIngresados}`); 
  };

  // Funciones de Venta Barra
  const agregarAlCarrito = (producto) => { 
    if (!producto || producto.stock <= 0) return alert('⚠️ Sin stock'); 
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

  // Funciones Admin y Proveedores
  const crearProveedor = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('proveedores').insert([{ nombre: nuevoProvNombre }]); setNuevoProvNombre(''); await cargarDatos(); setLoading(false); };
  const eliminarProveedor = async (id, nombre) => { if (window.confirm(`¿Eliminar proveedor?`)) { setLoading(true); await supabase.from('proveedores').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  
  const guardarRegistroProv = async (e) => { 
    e.preventDefault(); setLoading(true); 
    const prov = proveedores.find(p => p.id === modalProv.id); 
    let nuevoItem = { id: Date.now(), cantidad: Number(provCant || 1), costo: Number(provCosto) }; 
    if (tipoProvReg === 'bebida') { 
      const bebida = bebidas.find(b => b.id === Number(provBebidaId)); 
      if(!bebida) { alert("Selecciona bebida"); setLoading(false); return; } 
      nuevoItem = { ...nuevoItem, tipo: 'bebida', producto: bebida.nombre, bebida_id: bebida.id }; 
      await supabase.from('bebidas').update({ stock: bebida.stock + Number(provCant) }).eq('id', bebida.id); 
    } else nuevoItem = { ...nuevoItem, tipo: 'deuda', producto: provConceptoDeuda }; 
    await supabase.from('proveedores').update({ compras: [...(prov.compras || []), nuevoItem] }).eq('id', prov.id); 
    setModalProv(null); setProvCant(''); setProvCosto(''); setProvConceptoDeuda(''); await cargarDatos(); setLoading(false); 
  };
  
  const aplicarDescuentoProv = async (id, descActual) => { const desc = prompt('Descuento a favor ($):', descActual || 0); if (desc !== null && !isNaN(desc)) { await supabase.from('proveedores').update({ descuento: Number(desc) }).eq('id', id); cargarDatos(); } };
  
  const pagarDeudaProveedor = async (prov, totalDeuda) => { 
    if (!sesionActiva) return alert('⚠️ ABRIR CAJA primero.'); 
    if (totalDeuda <= 0) return alert('Sin deuda.'); 
    const metodo = prompt(`Pagar $${totalDeuda} a ${prov.nombre}. "efectivo" o "transferencia"`, "efectivo"); 
    if (metodo !== 'efectivo' && metodo !== 'transferencia') return; 
    if (window.confirm(`¿Confirmar pago con la CAJA ACTUAL?`)) { 
      setLoading(true); 
      await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: 'salida', concepto: `Pago Proveedor: ${prov.nombre}`, monto: totalDeuda, metodo_pago: metodo, sesion_id: sesionActiva.id }]); 
      await supabase.from('proveedores').update({ compras: [], descuento: 0 }).eq('id', prov.id); 
      await cargarDatos(); setLoading(false); alert('✅ Pago registrado.'); 
    } 
  };
  
  const crearProducto = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('bebidas').insert([{ nombre: nuevoNombre, precio: Number(nuevoPrecio), stock: Number(nuevoStock), categoria: nuevaCat }]); setNuevoNombre(''); setNuevoPrecio(''); setNuevoStock(''); cargarDatos(); setLoading(false); };
  const eliminarProducto = async (id, nombre) => { if (window.confirm(`¿Eliminar "${nombre}"?`)) { setLoading(true); await supabase.from('bebidas').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const registrarMovimiento = async (e) => { e.preventDefault(); setLoading(true); await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo, sesion_id: sesionActiva.id }]); setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false); };
  
  const procesarCierre = async () => { 
    if (!window.confirm('⚠️ ¿CERRAR CAJA definitivamente?')) return; setLoading(true); 
    let conteoProductos = {}; ventasSesion.forEach(v => { v.detalles.forEach(item => { if (!conteoProductos[item.nombre]) conteoProductos[item.nombre] = 0; conteoProductos[item.nombre] += item.cantidad; }); }); 
    const resumenCierre = { estado: 'cerrada', cerrada_por: user.usuario, fecha_cierre: new Date().toISOString(), recaudacion_efectivo: CAJA_FISICA, recaudacion_transf: CAJA_BANCO, total_salidas: movsSesion.filter(m=>m.tipo==='salida').reduce((a,c)=>a+Number(c.monto),0), total_ingresos: movsSesion.filter(m=>m.tipo==='entrada').reduce((a,c)=>a+Number(c.monto),0), ranking_ventas: conteoProductos, personas_vendidas: personasVendidas, personas_lista: personasListaIngresadas }; 
    await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id); 
    setTicketActual({ tipo: 'cierre', fiesta: sesionActiva.nombre_fiesta, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), responsable: user.usuario, ventas_efectivo: totalEfecVentas, ventas_transf: totalTransfVentas, puerta_efectivo: totalEfecPuerta, puerta_transf: totalTransfPuerta, salidas_efec: salidasEfec, salidas_transf: salidasTransf, entradas_efec: entradasExtraEfec, entradas_transf: entradasExtraTransf, cant_generales: cantGenerales, cant_vips: cantVips, ...resumenCierre }); 
    setSesionActiva(null); setVista('admin'); setLoading(false); 
  };

  /* ========================================================================= */
  /* ======================= ZONA DE RENDERIZADO =========================== */
  /* ========================================================================= */

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
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-lg shadow-lg">ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  const barraHeader = (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center mb-4 rounded-b-xl lg:rounded-xl gap-3 shadow-lg">
      <div className="flex flex-col items-center md:items-start w-full md:w-auto">
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {user.rol === 'admin' && vista !== 'proveedores' && <button onClick={() => setVista('proveedores')} className="bg-orange-600 hover:bg-orange-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">🚚 Provs</button>}
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 hover:bg-blue-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">⚙️ Admin</button>}
        {sesionActiva && user.rol === 'admin' && vista !== 'puerta' && <button onClick={() => setVista('puerta')} className="bg-yellow-600 hover:bg-yellow-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow text-black">🚪 QRs / Puerta</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'cajero') && vista !== 'pos' && <button onClick={() => setVista('pos')} className="bg-green-600 hover:bg-green-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">🍹 Barra</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'boleteria') && vista !== 'boleteria' && <button onClick={() => setVista('boleteria')} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">🎟️ Boletería</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">Salir</button>
      </div>
    </header>
  );

  // VISTA DE TICKET (COMÚN)
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
                {ticketActual.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm"><span>{it.cantidad}x {it.nombre}</span><span>${it.precio * it.cantidad}</span></div>
                ))}
              </div>
              <hr className="my-2 border-dashed border-gray-400" />
              <h3 className="text-2xl font-black text-right">TOTAL: ${ticketActual.total}</h3>
              <p className="text-xs text-center mt-2 font-bold bg-black text-white py-1 uppercase border border-dashed">METODO: {ticketActual.metodo_pago}</p>
            </>
          ) : (
            <>
              <div className="text-left text-xs space-y-1 mt-4 mb-2"><p><b>Cierre:</b> {ticketActual.fecha} - {ticketActual.hora}</p><p><b>Resp:</b> {ticketActual.responsable}</p></div>
              <hr className="border-black my-2" />
              <h4 className="font-bold text-xs text-left uppercase mb-1">Métricas de Puerta</h4>
              <div className="text-left text-xs space-y-1 bg-gray-100 p-2 border border-dashed">
                <div className="flex justify-between"><span>Vendidas (Generales):</span><span className="font-bold">{ticketActual.cant_generales} pers.</span></div>
                <div className="flex justify-between"><span>Vendidas (VIPs):</span><span className="font-bold">{ticketActual.cant_vips} pers.</span></div>
                <div className="flex justify-between text-red-600"><span>Listas Gratis Ingresadas:</span><span className="font-bold">{ticketActual.personas_lista} pers.</span></div>
                <div className="flex justify-between text-sm font-black mt-1"><span>TOTAL ADENTRO:</span><span>{ticketActual.personas_vendidas + ticketActual.personas_lista} pers.</span></div>
              </div>
              <hr className="border-black my-2" />
              <div className="text-left text-xs space-y-1">
                <div className="flex justify-between font-bold"><span>Total Ventas (Barra+Puerta):</span><span>${ticketActual.ventas_efectivo + ticketActual.ventas_transf + ticketActual.puerta_efectivo + ticketActual.puerta_transf}</span></div>
                <div className="flex justify-between text-green-600"><span>Entradas de plata extra:</span><span>+${ticketActual.entradas_efec + ticketActual.entradas_transf}</span></div>
                <div className="flex justify-between text-red-600"><span>Pagos/Salidas de caja:</span><span>-${ticketActual.salidas_efec + ticketActual.salidas_transf}</span></div>
              </div>
              <hr className="my-3 border-black" />
              <div className="bg-black text-white p-2 text-left text-sm space-y-1">
                <div className="flex justify-between text-gray-300"><span>A Rendir EFECTIVO:</span><span>${ticketActual.recaudacion_efectivo}</span></div>
                <div className="flex justify-between text-gray-300"><span>A Rendir BANCO/MP:</span><span>${ticketActual.recaudacion_transf}</span></div>
                <hr className="border-gray-500 my-1"/>
                <div className="flex justify-between"><span className="font-bold uppercase">Recaudación Neta:</span><span className="text-xl font-black">${ticketActual.recaudacion_efectivo + ticketActual.recaudacion_transf}</span></div>
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

  // VISTA: USUARIO PUERTA (ESCANER)
  if (user.rol === 'puerta') {
    const listasFiltradas = listasVip.filter(l => l.nombre.toLowerCase().includes(filtroQR.toLowerCase()) || l.codigo.toLowerCase().includes(filtroQR.toLowerCase()));
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {mostrarEscaner && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700 pt-8">
              <h2 className="text-xl font-black text-purple-400 tracking-widest">ESCANEAR PASE VIP</h2>
              <button onClick={() => setMostrarEscaner(false)} className="text-red-500 font-black text-lg bg-gray-800 px-4 py-2 rounded-lg">CERRAR ✖</button>
            </div>
            <div className="flex-1 w-full flex items-center justify-center bg-black p-4">
              <div className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-purple-500 shadow-[0_0_40px_rgba(147,51,234,0.4)] relative">
                <Scanner onScan={(r) => { if(!r) return; const txt = Array.isArray(r)?r[0].rawValue:(r.text||r); if(txt) procesarEscaneoAutomatico(txt); }} onError={console.log} />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
              </div>
            </div>
            <div className="p-8 bg-gray-900 text-center pb-12">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Apunta la cámara al código</p>
            </div>
          </div>
        )}
        <header className="bg-gray-800 p-4 rounded-xl mb-6 flex justify-between items-center border border-purple-500/30 shadow-lg">
          <div>
            <h1 className="text-xl font-black text-purple-400">CONTROL PUERTA</h1>
            <p className="text-xs text-green-400 uppercase font-bold">{sesionActiva ? sesionActiva.nombre_fiesta : 'Caja Cerrada'}</p>
          </div>
          <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 px-4 py-2 rounded-lg font-bold text-xs uppercase shadow">Salir</button>
        </header>
        {!sesionActiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">En Espera</h2><p className="text-gray-400 mt-2">Un administrador debe abrir la caja adentro.</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex justify-between shadow-xl">
              <div className="text-center">
                <p className="text-xs text-gray-400 font-bold uppercase">Ingresados (Adentro)</p>
                <p className="text-4xl font-black text-green-400">{personasListaIngresadas}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-bold uppercase">Listas Pendientes</p>
                <p className="text-4xl font-black text-yellow-400">{listasVip.filter(l => l.estado === 'pendiente').length}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input type="text" placeholder="Escribe DNI o Código..." className="w-full bg-gray-800 p-4 pl-12 rounded-xl border border-gray-700 font-black text-lg focus:outline-none focus:border-purple-500 shadow-inner" value={filtroQR} onChange={e => setFiltroQR(e.target.value)} />
                <span className="absolute left-4 top-4 text-xl">🔍</span>
              </div>
              <button onClick={() => setMostrarEscaner(true)} className="bg-purple-600 hover:bg-purple-500 px-6 rounded-xl font-black text-3xl shadow-[0_0_15px_rgba(147,51,234,0.5)] transition active:scale-95 flex items-center justify-center">📷</button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pb-10">
              {listasFiltradas.length === 0 ? <p className="text-center text-gray-500 py-10 font-bold uppercase">No se encontraron resultados.</p> :
                listasFiltradas.map(l => (
                  <div key={l.id} className={`p-5 rounded-2xl border-2 flex justify-between items-center transition ${l.estado === 'ingresado' ? 'bg-green-900/10 border-green-900/50 opacity-40' : 'bg-gray-800 border-gray-600 shadow-lg'}`}>
                    <div>
                      <p className="font-black text-xl uppercase text-white">{l.nombre}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                        {l.tipo_pase} | Cód: <span className="text-yellow-400 font-bold">{l.codigo}</span>
                      </p>
                      <p className="text-sm text-blue-400 font-bold mt-2">Ingresados: {l.ingresados || 0} / {l.cantidad}</p>
                    </div>
                    {l.estado === 'ingresado' ? (
                      <span className="text-green-500 font-black text-sm uppercase bg-green-900/40 px-3 py-2 rounded-lg">✅ Adentro</span>
                    ) : (
                      <button onClick={() => procesarEscaneoAutomatico(l.codigo)} className="bg-purple-600 hover:bg-purple-500 px-5 py-4 rounded-xl font-black text-sm uppercase shadow-[0_0_15px_rgba(147,51,234,0.4)] active:scale-95 transition">Ingreso Parcial (+)</button>
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

  // VISTA: BOLETERIA
  if (vista === 'boleteria') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}
        {!sesionActiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2></div>
        ) : (
          <div className="max-w-md mx-auto w-full mt-4 bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-black uppercase text-center text-indigo-400 mb-8 tracking-widest">🎟️ TAQUILLA</h2>
            <form onSubmit={venderEntradas} className="space-y-6">
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Tipo de Pulsera</label>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setTipoEntradaVenta('General')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${tipoEntradaVenta === 'General' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}>General</button>
                  <button type="button" onClick={() => setTipoEntradaVenta('VIP')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${tipoEntradaVenta === 'VIP' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}>Pase VIP</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Precio Unitario ($)</label>
                <input type="number" className="w-full bg-gray-700 p-4 rounded-xl font-black text-2xl text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={precioEntrada} onChange={e => setPrecioEntrada(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Cantidad a Vender</label>
                <div className="flex items-center shadow-inner rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setCantEntradas(Math.max(1, cantEntradas - 1))} className="bg-gray-600 w-1/3 py-4 font-black text-3xl active:bg-gray-500 transition">-</button>
                  <input type="number" className="w-1/3 bg-gray-700 py-4 text-center font-black text-3xl focus:outline-none" value={cantEntradas} readOnly />
                  <button type="button" onClick={() => setCantEntradas(cantEntradas + 1)} className="bg-gray-600 w-1/3 py-4 font-black text-3xl active:bg-gray-500 transition">+</button>
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-gray-600 text-center">
                <span className="text-sm font-bold text-gray-400 block uppercase mb-1">Total a Cobrar</span>
                <span className="text-5xl font-black text-green-400">${cantEntradas * precioEntrada}</span>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Método de Pago</label>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setPagoEntrada('efectivo')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${pagoEntrada === 'efectivo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>💵 Efectivo</button>
                  <button type="button" onClick={() => setPagoEntrada('transferencia')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${pagoEntrada === 'transferencia' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>📱 Transf</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-6 rounded-xl font-black text-2xl uppercase shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-95 transition">✅ COBRAR</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // VISTA: ADMIN DASHBOARD
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
                  {historial.length === 0 ? <p className="text-gray-500 text-center py-10">No hay cierres.</p> : 
                    historial.map(h => (
                      <div key={h.id} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transition">
                        <div className="flex justify-between items-start cursor-pointer" onClick={() => setSesionExpandida(sesionExpandida === h.id ? null : h.id)}>
                          <div>
                            <h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3>
                            <p className="text-xs text-gray-400 mt-1">📅 {new Date(h.fecha_cierre).toLocaleDateString()} - 👤 {h.cerrada_por}</p>
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
                                <div className="flex justify-between"><span>Total Personas:</span><span className="font-bold text-purple-400">{h.personas_vendidas + h.personas_lista}</span></div>
                                <div className="flex justify-between"><span>(Vendidas / Gratis):</span><span className="text-gray-400 text-xs">({h.personas_vendidas} / {h.personas_lista})</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">🔥 Top Bebidas Vendidas</h4>
                              <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
                                {h.ranking_ventas && Object.keys(h.ranking_ventas).length > 0 ? (
                                  Object.entries(h.ranking_ventas).sort(([,a], [,b]) => b - a).slice(0, 5).map(([nombre, cant]) => (
                                    <div key={nombre} className="flex justify-between border-b border-gray-700 pb-1">
                                      <span className="truncate pr-2 text-gray-300">{nombre}</span><span className="font-black text-yellow-400">{cant}x</span>
                                    </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/30 p-5 rounded-2xl border border-green-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total General Neto</h2><p className="text-4xl font-black text-green-400">${TOTAL_NETO}</p></div>
          <div onClick={() => setVerDetalleModal('ventas_efectivo')} className="bg-blue-900/30 p-5 rounded-2xl border border-blue-800 flex flex-col justify-center cursor-pointer hover:bg-blue-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Caja (Físico)</h2><p className="text-3xl font-black text-blue-400">${CAJA_FISICA}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
          <div onClick={() => setVerDetalleModal('ventas_transferencia')} className="bg-purple-900/30 p-5 rounded-2xl border border-purple-800 flex flex-col justify-center cursor-pointer hover:bg-purple-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Banco / MP (Digital)</h2><p className="text-3xl font-black text-purple-400">${CAJA_BANCO}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
          <div className="bg-orange-900/30 p-5 rounded-2xl border border-orange-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deuda Proveedores</h2><p className="text-3xl font-black text-orange-400">${deudaProveedores}</p></div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-1">🎟️ Ventas Boletería</h2>
            <p className="text-sm text-white"><span className="text-indigo-400 font-black">{cantGenerales}</span> Generales | <span className="text-purple-400 font-black">{cantVips}</span> VIPs</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Recaudado Taquilla</p>
            <p className="text-2xl font-black text-green-400">${totalEfecPuerta + totalTransfPuerta}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            
            {/* Monitor VIP en Admin */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex justify-between items-center">👑 Monitor Puerta <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Adentro: {personasListaIngresadas}</span></h2>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                {listasVip.filter(l => l.ingresados > 0).length === 0 ? <p className="text-gray-500 text-sm">Nadie ha ingresado por QR aún.</p> :
                  listasVip.filter(l => l.ingresados > 0).map(l => (
                    <div key={l.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                      <span className="font-bold text-white text-sm">{l.nombre}</span>
                      <span className="font-black text-green-400 text-xs">+{l.ingresados} Adentro</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-lg font-black mb-4 uppercase text-yellow-400 flex items-center">💵 Registrar Movimiento</h2>
              <form onSubmit={registrarMovimiento} className="space-y-3">
                <select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Gasto)</option><option value="entrada">🟢 Ingreso Extra</option></select>
                <input type="text" placeholder="Concepto" className="w-full bg-gray-700 p-3 rounded-lg" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required />
                <div className="flex space-x-2">
                  <input type="number" placeholder="Monto $" className="w-2/3 bg-gray-700 p-3 rounded-lg font-bold" value={movMonto} onChange={e => setMovMonto(e.target.value)} required />
                  <select className="w-1/3 bg-gray-700 p-3 rounded-lg text-sm" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transf</option></select>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-yellow-600 text-black py-3 rounded-lg font-black uppercase">Registrar</button>
              </form>
            </div>
            
            <button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)]">🔒 CERRAR ARQUEO Z</button>
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
                  <button type="button" onClick={() => eliminarProducto(b.id, b.nombre)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-lg">❌</button>
                  <p className="font-bold text-sm mb-1 pr-6">{b.nombre}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-green-400 font-black text-lg">${b.precio}</span>
                    <span className={`font-bold text-xs bg-gray-800 px-2 py-1 rounded ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button type="button" onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 py-2 rounded text-xs font-bold uppercase">Cambiar $</button>
                    <button type="button" onClick={async () => { const s = prompt(`Stock exacto:`, b.stock); if (s !== null && !isNaN(s)) { await supabase.from('bebidas').update({stock:Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 py-2 rounded text-xs font-bold uppercase">Mod. Stock</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: PUERTA (GENERADOR DE QRS Y LISTAS DE LUJO)
  if (vista === 'puerta') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        {barraHeader}
        
        {qrGenerado && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(147,51,234,0.7)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-900 to-transparent opacity-20 pointer-events-none"></div>
              <h2 className="text-4xl font-black text-black uppercase mb-1 tracking-tighter">¡CREADO!</h2>
              <p className="text-purple-600 font-black uppercase text-sm mb-6">{sesionActiva?.nombre_fiesta}</p>
              
              <div className="bg-gray-100 p-4 rounded-2xl border border-dashed border-gray-300 mb-6">
                <p className="font-black text-2xl text-black uppercase">{qrGenerado.nombre}</p>
                <p className="text-gray-600 font-bold text-lg mt-1">{qrGenerado.tipo_pase === 'vip' ? '👑 PASE VIP' : '🎫 PASE GENERAL'} ({qrGenerado.cantidad} pers)</p>
              </div>

              <button onClick={() => descargarInvitacion(qrGenerado)} className="w-full bg-black text-white py-4 rounded-xl font-black text-lg uppercase shadow-lg transition active:scale-95 flex items-center justify-center gap-2 mb-3">⬇️ Descargar Invitación Pro</button>
              <button onClick={() => setQrGenerado(null)} className="w-full bg-gray-200 text-gray-600 py-3 rounded-xl font-bold uppercase transition active:scale-95">Cerrar</button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-bl-full pointer-events-none"></div>
            <h2 className="text-2xl font-black uppercase text-purple-400 mb-2 flex items-center gap-2">📱 Generador de Pases (QR)</h2>
            <p className="text-sm text-gray-400 mb-6">Genera invitaciones digitales para enviar por WhatsApp.</p>
            
            <form onSubmit={generarQRLista} className="space-y-6 relative z-10">
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Categoría de la Invitación</label>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setTipoPaseQr('general')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoPaseQr === 'general' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>Entrada General</button>
                  <button type="button" onClick={() => setTipoPaseQr('vip')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoPaseQr === 'vip' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>VIP / Accesos</button>
                </div>
              </div>

              <div><label className="text-xs text-gray-400 font-bold uppercase">Nombre del Titular</label><input type="text" className="w-full bg-gray-700 p-4 rounded-xl font-black mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreLista} onChange={e => setNombreLista(e.target.value)} required placeholder="Ej: Gabriel Roa" /></div>
              
              <div><label className="text-xs text-gray-400 font-bold uppercase">Total de Personas (+Acompañantes)</label><div className="flex items-center mt-1 shadow-inner"><button type="button" onClick={() => setCantLista(Math.max(1, cantLista - 1))} className="bg-gray-600 w-1/3 py-4 rounded-l-xl font-black text-2xl active:bg-gray-500">-</button><input type="number" className="w-1/3 bg-gray-700 py-4 text-center font-black text-purple-400 text-2xl focus:outline-none" value={cantLista} readOnly /><button type="button" onClick={() => setCantLista(cantLista + 1)} className="bg-gray-600 w-1/3 py-4 rounded-r-xl font-black text-2xl active:bg-gray-500">+</button></div></div>
              
              <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-5 rounded-2xl font-black text-xl uppercase shadow-[0_0_20px_rgba(147,51,234,0.4)] transition active:scale-95 mt-4">Generar Pase ✨</button>
            </form>
          </div>

          {/* HISTORIAL DE QRS PARA RE-DESCARGAR */}
          <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-black uppercase text-white mb-4">📋 Listas Generadas</h2>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {listasVip.length === 0 ? <p className="text-gray-500">No hay pases generados.</p> :
                listasVip.map(l => (
                  <div key={l.id} className="bg-gray-700 p-4 rounded-xl flex justify-between items-center border border-gray-600">
                    <div>
                      <p className="font-bold text-lg text-white uppercase">{l.nombre} <span className="text-[10px] bg-purple-600 px-2 py-1 rounded text-white ml-2 align-middle">{l.tipo_pase?.toUpperCase() || 'VIP'}</span></p>
                      <p className="text-xs text-gray-400 mt-1">Cant: {l.cantidad} | Cód: <span className="text-yellow-400 font-bold">{l.codigo}</span></p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {l.estado === 'ingresado' ? <span className="text-green-400 font-black text-[10px] uppercase bg-green-900/40 px-2 py-1 rounded">✅ Adentro</span> : <span className="text-yellow-400 font-black text-[10px] uppercase bg-yellow-900/40 px-2 py-1 rounded">Pendiente</span>}
                      <button onClick={() => descargarInvitacion(l)} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg font-bold text-[10px] uppercase shadow transition">⬇️ Bajar QR</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: PROVEEDORES
  if (vista === 'proveedores') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}
        {modalProv && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md">
              <h2 className="text-xl font-black uppercase text-orange-400 mb-4">Ingreso de: {modalProv.nombre}</h2>
              <form onSubmit={guardarRegistroProv} className="space-y-4">
                <select className="w-full bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={tipoProvReg} onChange={e => setTipoProvReg(e.target.value)}>
                  <option value="bebida">📦 Mercadería (Suma a Stock)</option>
                  <option value="deuda">📄 Deuda Extra (Ej: Flete)</option>
                </select>
                {tipoProvReg === 'bebida' ? (
                  <>
                    <select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={provBebidaId} onChange={e => setProvBebidaId(e.target.value)} required>
                      <option value="">-- Selecciona producto que llegó --</option>
                      {bebidas.map(b => <option key={b.id} value={b.id}>{b.nombre} (Stock: {b.stock})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Cant. traída" className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold" value={provCant} onChange={e => setProvCant(e.target.value)} required />
                      <input type="number" placeholder="$ Costo Unit." className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold" value={provCosto} onChange={e => setProvCosto(e.target.value)} required />
                    </div>
                  </>
                ) : (
                  <>
                    <input type="text" placeholder="Concepto deuda" className="w-full bg-gray-700 p-3 rounded-lg font-bold" value={provConceptoDeuda} onChange={e => setProvConceptoDeuda(e.target.value)} required />
                    <input type="number" placeholder="Monto total $" className="w-full bg-gray-700 p-3 rounded-lg font-bold" value={provCosto} onChange={e => setProvCosto(e.target.value)} required />
                  </>
                )}
                <div className="flex space-x-2 pt-2">
                  <button type="button" onClick={() => setModalProv(null)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold uppercase">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-500 py-3 rounded-lg font-black uppercase shadow">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto mt-6 flex-1 w-full">
          <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase text-orange-400">🚚 Proveedores y Stock</h2>
              <p className="text-sm text-gray-400">Al cargar mercadería acá, el stock de la barra se actualiza solo.</p>
            </div>
            <form onSubmit={crearProveedor} className="flex w-full md:w-auto">
              <input type="text" placeholder="Nombre Prov." className="w-full bg-gray-700 p-3 rounded-l-xl focus:outline-none" value={nuevoProvNombre} onChange={e => setNuevoProvNombre(e.target.value)} required />
              <button type="submit" className="bg-orange-600 px-6 font-bold rounded-r-xl">Añadir</button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {proveedores.map(p => {
              const subtotal = (p.compras || []).reduce((acc, c) => acc + ((c.cantidad||1) * c.costo), 0);
              const totalPagar = subtotal - (p.descuento || 0);
              return (
                <div key={p.id} className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl relative flex flex-col">
                  <button onClick={() => eliminarProveedor(p.id, p.nombre)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition">❌</button>
                  <h3 className="text-xl font-black text-white uppercase mb-4 pr-8 border-b border-gray-700 pb-2">{p.nombre}</h3>
                  <div className="bg-gray-700/50 p-3 rounded-xl flex-1 max-h-[200px] overflow-y-auto mb-4 border border-gray-600 space-y-2 custom-scrollbar">
                    {(!p.compras || p.compras.length === 0) ? <p className="text-gray-500 text-sm text-center mt-4 font-bold uppercase">Sin deudas.</p> : 
                      p.compras.map(c => (
                        <div key={c.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg text-sm shadow border border-gray-700">
                          <div className="flex-1 pr-2">
                            <p className="font-bold text-white line-clamp-1">{c.producto}</p>
                            <p className="text-[10px] text-gray-400">{c.tipo==='bebida'?`${c.cantidad}x (Stock sumado)`:'Cargo extra'}</p>
                          </div>
                          <span className="font-black text-orange-400 text-lg">${(c.cantidad||1) * c.costo}</span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="space-y-1 mb-3 bg-gray-900 p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between text-xs text-gray-400 font-bold"><span>Subtotal:</span><span>${subtotal}</span></div>
                    <div className="flex justify-between text-xs text-yellow-400 font-bold"><span>Descuento:</span><span>-${p.descuento || 0}</span></div>
                    <hr className="border-gray-700 my-2"/>
                    <div className="flex justify-between text-lg font-black text-white"><span>DEUDA:</span><span className="text-orange-400">${totalPagar}</span></div>
                  </div>
                  <div className="flex space-x-2 mb-3">
                    <button onClick={() => {setModalProv(p); setTipoProvReg('bebida');}} className="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-xl font-black text-xs uppercase shadow transition active:scale-95">+ Sumar</button>
                    <button onClick={() => aplicarDescuentoProv(p.id, p.descuento)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-xl font-black text-xs uppercase shadow transition active:scale-95">🎁 Desc.</button>
                  </div>
                  <button onClick={() => pagarDeudaProveedor(p, totalPagar)} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black text-sm uppercase shadow-[0_0_15px_rgba(220,38,38,0.4)] transition active:scale-95">💸 Pagar con Caja</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // VISTA: POS (BARRA)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {barraHeader}
      {!sesionActiva ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2>
        </div>
      ) : (
        <div className="flex-1 p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
              {bebidas.map((item) => (
                <button type="button" key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-3 lg:p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-500 block mb-1">{item.categoria}</span>
                    <p className="font-bold text-xs lg:text-sm line-clamp-2 leading-tight">{item.nombre}</p>
                  </div>
                  <div className="mt-2 flex justify-between items-end">
                    <span className="text-base lg:text-lg font-black text-green-400">${item.precio}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Stk: {item.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col justify-between h-[450px] lg:h-auto shadow-2xl">
            <div>
              <h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 border-b border-gray-700 pb-2">Ticket Actual</h2>
              {carrito.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <p className="text-4xl mb-2">🍹</p>
                  <p className="text-xs font-bold uppercase">Toque productos para agregar</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-700/40 p-2 rounded-lg border border-gray-600">
                      <div className="flex-1 mr-2">
                        <p className="font-bold text-xs line-clamp-1">{item.nombre}</p>
                        <p className="text-xs text-green-400 font-black">${item.precio * item.cantidad}</p>
                      </div>
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
              <div className="flex justify-between items-end mb-3">
                <span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span>
                <span className="text-3xl font-black text-green-400 leading-none">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span>
              </div>
              <div className="flex space-x-2 mb-3">
                <button type="button" onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>💵 Efectivo</button>
                <button type="button" onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📱 Transf</button>
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
