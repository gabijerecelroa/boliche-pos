import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Scanner } from '@yudiel/react-qr-scanner';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState('login');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
  const [staff, setStaff] = useState([]);

  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');
  const [nombreFiado, setNombreFiado] = useState('');
  const [verDetalleModal, setVerDetalleModal] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);

  // Estados Admin Generales
  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');
  const [nuevoProvNombre, setNuevoProvNombre] = useState('');
  
  const [precioG, setPrecioG] = useState(5000);
  const [precioV, setPrecioV] = useState(10000);

  const [nuevoStaffUser, setNuevoStaffUser] = useState('');
  const [nuevoStaffPass, setNuevoStaffPass] = useState('');
  const [nuevoStaffRol, setNuevoStaffRol] = useState('cajero');
  const [nuevoStaffCupo, setNuevoStaffCupo] = useState(0);

  const [tipoEntradaVenta, setTipoEntradaVenta] = useState('General');
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

  // 🔴 DETECTOR DE INTERNET
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const cargarDatos = async () => {
    if (!navigator.onLine) return; 
    const { data: prods } = await supabase.from('bebidas').select('*').order('id');
    if (prods) setBebidas(prods);
    const { data: provs } = await supabase.from('proveedores').select('*').order('id');
    if (provs) setProveedores(provs);
    
    if (user?.rol === 'admin') {
      const { data: hist } = await supabase.from('sesiones').select('*').eq('estado', 'cerrada').order('id', { ascending: false });
      if (hist) setHistorial(hist);
      const { data: st } = await supabase.from('cajeros').select('*').order('id');
      if (st) setStaff(st);
    }

    if (user?.rol === 'puerta') {
      const { data: u } = await supabase.from('cajeros').select('*').eq('id', user.id).single();
      if (u) setUser(u); 
    }

    const { data: sesionData } = await supabase.from('sesiones').select('*').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
    const sesion = sesionData && sesionData.length > 0 ? sesionData[0] : null;
    
    if (sesion) {
      setSesionActiva(sesion);
      setPrecioG(sesion.precio_general || 5000);
      setPrecioV(sesion.precio_vip || 10000);
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

  // TIEMPO REAL 
  useEffect(() => {
    if (!user || !isOnline) return;
    const radar = supabase.channel('gjbross_en_vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puerta' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_vip' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bebidas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cajeros' }, () => cargarDatos())
      .subscribe();
    return () => { supabase.removeChannel(radar); };
  }, [user, isOnline]);

  // 🔴 SINCRONIZADOR OFFLINE
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;
      let vOffline = JSON.parse(localStorage.getItem('ventasOffline') || '[]');
      let pOffline = JSON.parse(localStorage.getItem('puertaOffline') || '[]');
      let synced = false;
      
      if (vOffline.length > 0) {
        const { error } = await supabase.from('ventas').insert(vOffline);
        if (!error) { localStorage.setItem('ventasOffline', '[]'); synced = true; }
      }
      if (pOffline.length > 0) {
        const { error } = await supabase.from('puerta').insert(pOffline);
        if (!error) { localStorage.setItem('puertaOffline', '[]'); synced = true; }
      }
      if (synced) cargarDatos();
    };
    const interval = setInterval(syncOfflineData, 10000);
    return () => clearInterval(interval);
  }, []);

  const capitalEnBarra = bebidas.reduce((acc, b) => acc + (b.precio * b.stock), 0);
  const deudaProveedores = proveedores.reduce((acc, p) => acc + ((p.compras || []).reduce((s, c) => s + ((c.cantidad||1) * c.costo), 0) - (p.descuento || 0)), 0);
  
  // 🟢 LA PLATA FIADA NO SUMA A LA CAJA
  const totalEfecVentas = ventasSesion.filter(v => v.metodo_pago === 'efectivo').reduce((a, c) => a + Number(c.total), 0);
  const totalTransfVentas = ventasSesion.filter(v => v.metodo_pago === 'transferencia').reduce((a, c) => a + Number(c.total), 0);
  const totalFiadosPendientes = ventasSesion.filter(v => v.metodo_pago === 'fiado' && v.estado_pago === 'pendiente').reduce((a, c) => a + Number(c.total), 0);

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
  const precioActualTaquilla = tipoEntradaVenta === 'General' ? (sesionActiva?.precio_general || 5000) : (sesionActiva?.precio_vip || 10000);

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    if (!isOnline) return alert("❌ Necesitas internet para iniciar sesión.");
    setLoading(true); 
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', document.getElementById('username').value).eq('password', document.getElementById('password').value).single(); 
    setLoading(false); 
    if (error || !data) alert('❌ Error: Usuario o Contraseña incorrectos'); 
    else { 
      setUser(data); await cargarDatos(); 
      if (data.rol === 'admin') setVista('admin'); else if (data.rol === 'puerta') setVista('puerta'); else if (data.rol === 'boleteria') setVista('boleteria'); else setVista('pos'); 
    } 
  };

  const abrirCaja = async (e) => { e.preventDefault(); if(!isOnline) return alert("Conectate para abrir caja"); if (!nombreFiestaApertura) return; setLoading(true); await supabase.from('sesiones').insert([{ nombre_fiesta: nombreFiestaApertura, abierta_por: user.usuario }]); await cargarDatos(); setLoading(false); setVista('admin'); };
  const actualizarPreciosTaquilla = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('sesiones').update({ precio_general: Number(precioG), precio_vip: Number(precioV) }).eq('id', sesionActiva.id); await cargarDatos(); setLoading(false); alert('✅ Precios de taquilla actualizados.'); };
  const crearStaff = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('cajeros').insert([{ usuario: nuevoStaffUser, password: nuevoStaffPass, rol: nuevoStaffRol, cupo_listas: nuevoStaffRol === 'puerta' ? Number(nuevoStaffCupo) : 0 }]); setNuevoStaffUser(''); setNuevoStaffPass(''); setNuevoStaffCupo(0); await cargarDatos(); setLoading(false); alert('✅ Empleado creado exitosamente.'); };
  const eliminarStaff = async (id, nombre) => { if(!isOnline) return; if (window.confirm(`¿Seguro que deseas ELIMINAR al usuario "${nombre}"?`)) { setLoading(true); await supabase.from('cajeros').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const sumarCupoStaff = async (id, cupoActual, nombre) => { if(!isOnline) return; const sumar = prompt(`¿Cuántos pases VIP extras le vas a sumar a ${nombre}?`); if (sumar && !isNaN(sumar)) { await supabase.from('cajeros').update({ cupo_listas: cupoActual + Number(sumar) }).eq('id', id); cargarDatos(); } };

  // 🔴 COBRAR UNA DEUDA (CUENTA CORRIENTE)
  const saldarDeuda = async (cliente, tickets, totalDeuda) => {
    if(!isOnline) return alert("❌ Conéctate a internet para cobrar deudas.");
    const metodo = prompt(`Cobrar $${totalDeuda} a ${cliente}.\nEscribe "efectivo" o "transferencia":`, "efectivo");
    if (metodo !== 'efectivo' && metodo !== 'transferencia') return;
    setLoading(true);
    for (let id of tickets) {
      await supabase.from('ventas').update({ metodo_pago: metodo, estado_pago: 'pagado' }).eq('id', id);
    }
    await cargarDatos();
    setLoading(false);
    alert(`✅ Deuda de ${cliente} saldada. La plata ya sumó en caja.`);
  };

  const venderEntradas = async (e) => { 
    e.preventDefault(); if (!sesionActiva || cantEntradas < 1) return; setLoading(true); 
    const total = cantEntradas * precioActualTaquilla; 
    const nuevaEntrada = { sesion_id: sesionActiva.id, tipo: 'venta', nombre: `Pulsera ${tipoEntradaVenta}`, cantidad: cantEntradas, precio_unitario: precioActualTaquilla, total, metodo_pago: pagoEntrada };
    if (isOnline) { await supabase.from('puerta').insert([nuevaEntrada]); await cargarDatos(); alert(`✅ Venta Exitosa`); } 
    else { let guardadas = JSON.parse(localStorage.getItem('puertaOffline') || '[]'); guardadas.push(nuevaEntrada); localStorage.setItem('puertaOffline', JSON.stringify(guardadas)); alert(`✅ Venta GUARDADA OFFLINE`); }
    setCantEntradas(1); setLoading(false); 
  };
  
  const generarQRLista = async (e) => { 
    e.preventDefault(); if (!sesionActiva || !nombreLista || cantLista < 1) return; 
    if(!isOnline) return alert("❌ Sin internet no puedes crear QRs.");
    if (user.rol === 'puerta') { if (user.cupo_listas < cantLista) return alert(`❌ CUPO INSUFICIENTE.\nTe quedan ${user.cupo_listas} lugares pero intentas meter a ${cantLista}.`); }
    setLoading(true); const prefijo = tipoPaseQr === 'vip' ? 'VIP-' : 'GEN-'; const codigo = prefijo + Math.random().toString(36).substr(2, 5).toUpperCase(); const { error } = await supabase.from('listas_vip').insert([{ sesion_id: sesionActiva.id, nombre: nombreLista, cantidad: cantLista, ingresados: 0, codigo, tipo_pase: tipoPaseQr }]); 
    if (!error) { 
      if (user.rol === 'puerta') await supabase.from('cajeros').update({ cupo_listas: user.cupo_listas - cantLista }).eq('id', user.id);
      setQrGenerado({ nombre: nombreLista, cantidad: cantLista, codigo, tipo_pase: tipoPaseQr }); setNombreLista(''); setCantLista(1); await cargarDatos(); 
    } setLoading(false); 
  };

  const descargarInvitacion = (qrData) => { 
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext('2d'); 
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920); grad.addColorStop(0, '#0f0c29'); grad.addColorStop(0.5, '#302b63'); grad.addColorStop(1, '#24243e'); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height); 
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 15; ctx.strokeRect(50, 50, 980, 1820); 
    
    ctx.fillStyle = '#10b981'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; 
    const textoFiesta = `FIESTA: ${sesionActiva?.nombre_fiesta?.toUpperCase() || ''}`;
    ctx.fillText(textoFiesta, 540, 150, 900); 

    ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 80px sans-serif'; ctx.fillText('GJBROSS', 540, 250); 
    
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px sans-serif'; 
    const textoPase = qrData.tipo_pase === 'vip' ? 'PASE VIP' : 'ACCESO QR';
    ctx.fillText(textoPase, 540, 420); 
    
    ctx.fillStyle = '#fbbf24'; ctx.font = '60px sans-serif'; 
    ctx.fillText(qrData.nombre.toUpperCase(), 540, 600, 900); 
    
    ctx.fillStyle = '#9ca3af'; ctx.font = '40px sans-serif'; ctx.fillText(`Válido para ${qrData.cantidad} personas`, 540, 680); 
    
    const img = new Image(); img.crossOrigin = 'Anonymous'; 
    img.onload = () => { 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(270, 800, 540, 540); ctx.drawImage(img, 290, 820, 500, 500); 
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 60px sans-serif'; ctx.fillText(qrData.codigo, 540, 1500); 
        ctx.fillStyle = '#9ca3af'; ctx.font = '35px sans-serif'; ctx.fillText('Presenta este código en la puerta', 540, 1750); 
        const link = document.createElement('a'); link.download = `Invitacion_${qrData.tipo_pase||'vip'}_${qrData.nombre}.png`; link.href = canvas.toDataURL('image/png'); link.click(); 
    }; 
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrData.codigo}&color=000000&bgcolor=FFFFFF`; 
  };
  
  const procesarEscaneoAutomatico = async (textoCodigo) => { 
    if(!isOnline) return alert("❌ No puedes escanear QRs sin conexión a internet.");
    setMostrarEscaner(false); const listaEncontrada = listasVip.find(l => l.codigo.toUpperCase() === textoCodigo.toUpperCase()); if (!listaEncontrada) return alert('❌ CÓDIGO INVÁLIDO O INEXISTENTE.'); if (listaEncontrada.estado === 'ingresado') { alert(`⚠️ CÓDIGO COMPLETADO.\nYa entraron las ${listaEncontrada.cantidad} personas de este QR.`); setFiltroQR(textoCodigo); return; } const yaIngresados = listaEncontrada.ingresados || 0; const disponibles = listaEncontrada.cantidad - yaIngresados; const cantIngresarStr = prompt(`🎟️ PASE: ${listaEncontrada.nombre}\nQuedan disponibles: ${disponibles} (de ${listaEncontrada.cantidad}).\n¿Cuántos ingresan AHORA MISMO?`, disponibles); if (cantIngresarStr === null) return; const cantIngresar = Number(cantIngresarStr); if (isNaN(cantIngresar) || cantIngresar <= 0 || cantIngresar > disponibles) { return alert(`❌ Cantidad inválida.`); } setLoading(true); const nuevosIngresados = yaIngresados + cantIngresar; const nuevoEstado = nuevosIngresados >= listaEncontrada.cantidad ? 'ingresado' : 'pendiente'; await supabase.from('listas_vip').update({ ingresados: nuevosIngresados, estado: nuevoEstado }).eq('id', listaEncontrada.id); await supabase.from('puerta').insert([{ sesion_id: sesionActiva.id, tipo: 'lista', nombre: `Lista ${listaEncontrada.tipo_pase?.toUpperCase()||'VIP'} - ${listaEncontrada.nombre}`, cantidad: cantIngresar, precio_unitario: 0, total: 0 }]); setFiltroQR(''); await cargarDatos(); setLoading(false); alert(`✅ ACCESO PERMITIDO\nVIP: ${listaEncontrada.nombre}\nPASAN AHORA: ${cantIngresar}\nFaltan llegar: ${listaEncontrada.cantidad - nuevosIngresados}`); 
  };

  const agregarAlCarrito = (producto) => { if (!producto || producto.stock <= 0) return alert('⚠️ Sin stock'); setCarrito(prev => { const existe = prev.find(item => item.id === producto.id); if (existe) { if (existe.cantidad >= producto.stock) { alert('⚠️ Supera stock'); return prev; } return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item); } else return [...prev, { ...producto, cantidad: 1 }]; }); };
  const cambiarCantidad = (id, delta) => setCarrito(prev => prev.map(i => i.id === id ? (i.cantidad + delta > 0 ? { ...i, cantidad: i.cantidad + delta } : null) : i).filter(Boolean));
  
  // 🔴 MOTOR DE VENTA POS/BARRA (EFECTIVO, TRANSF Y FIADOS)
  const procesarVenta = async () => { 
    if (carrito.length === 0 || !sesionActiva) return; 
    if (metodoPagoPOS === 'fiado' && !nombreFiado.trim()) return alert("⚠️ Ingresa el nombre de quien saca anotado.");
    
    setLoading(true); 
    const totalVenta = carrito.reduce((a, item) => a + (item.precio * item.cantidad), 0); 
    const nuevaVenta = { 
      cajero: user.usuario, 
      total: totalVenta, 
      detalles: carrito, 
      metodo_pago: metodoPagoPOS, 
      sesion_id: sesionActiva.id,
      cliente: metodoPagoPOS === 'fiado' ? nombreFiado.trim() : '',
      estado_pago: metodoPagoPOS === 'fiado' ? 'pendiente' : 'pagado'
    };
    
    if (isOnline) {
      const { data: ventaData, error } = await supabase.from('ventas').insert([nuevaVenta]).select().single(); 
      if (!error) { 
        for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id); 
        setTicketActual({ tipo: 'venta', id: ventaData.id, fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS, cliente: nuevaVenta.cliente }); 
        setCarrito([]); setNombreFiado(''); cargarDatos(); 
      } 
    } else {
      let guardadas = JSON.parse(localStorage.getItem('ventasOffline') || '[]');
      guardadas.push(nuevaVenta);
      localStorage.setItem('ventasOffline', JSON.stringify(guardadas));
      setBebidas(prev => prev.map(b => { const itemCar = carrito.find(c => c.id === b.id); return itemCar ? { ...b, stock: b.stock - itemCar.cantidad } : b; }));
      setTicketActual({ tipo: 'venta', id: "OFF-" + Date.now().toString().slice(-4), fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS, cliente: nuevaVenta.cliente }); 
      setCarrito([]); setNombreFiado('');
    }
    setLoading(false); 
  };
  
  const crearProveedor = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('proveedores').insert([{ nombre: nuevoProvNombre }]); setNuevoProvNombre(''); await cargarDatos(); setLoading(false); };
  const eliminarProveedor = async (id, nombre) => { if(!isOnline) return; if (window.confirm(`¿Eliminar proveedor?`)) { setLoading(true); await supabase.from('proveedores').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const guardarRegistroProv = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); const prov = proveedores.find(p => p.id === modalProv.id); let nuevoItem = { id: Date.now(), cantidad: Number(provCant || 1), costo: Number(provCosto) }; if (tipoProvReg === 'bebida') { const bebida = bebidas.find(b => b.id === Number(provBebidaId)); if(!bebida) { alert("Selecciona bebida"); setLoading(false); return; } nuevoItem = { ...nuevoItem, tipo: 'bebida', producto: bebida.nombre, bebida_id: bebida.id }; await supabase.from('bebidas').update({ stock: bebida.stock + Number(provCant) }).eq('id', bebida.id); } else nuevoItem = { ...nuevoItem, tipo: 'deuda', producto: provConceptoDeuda }; await supabase.from('proveedores').update({ compras: [...(prov.compras || []), nuevoItem] }).eq('id', prov.id); setModalProv(null); setProvCant(''); setProvCosto(''); setProvConceptoDeuda(''); await cargarDatos(); setLoading(false); };
  const aplicarDescuentoProv = async (id, descActual) => { if(!isOnline) return; const desc = prompt('Descuento a favor ($):', descActual || 0); if (desc !== null && !isNaN(desc)) { await supabase.from('proveedores').update({ descuento: Number(desc) }).eq('id', id); cargarDatos(); } };
  const pagarDeudaProveedor = async (prov, totalDeuda) => { if (!sesionActiva) return alert('⚠️ ABRIR CAJA primero.'); if(!isOnline) return; if (totalDeuda <= 0) return alert('Sin deuda.'); const metodo = prompt(`Pagar $${totalDeuda} a ${prov.nombre}. "efectivo" o "transferencia"`, "efectivo"); if (metodo !== 'efectivo' && metodo !== 'transferencia') return; if (window.confirm(`¿Confirmar pago con la CAJA ACTUAL?`)) { setLoading(true); await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: 'salida', concepto: `Pago Proveedor: ${prov.nombre}`, monto: totalDeuda, metodo_pago: metodo, sesion_id: sesionActiva.id }]); await supabase.from('proveedores').update({ compras: [], descuento: 0 }).eq('id', prov.id); await cargarDatos(); setLoading(false); alert('✅ Pago registrado.'); } };
  const crearProducto = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('bebidas').insert([{ nombre: nuevoNombre, precio: Number(nuevoPrecio), stock: Number(nuevoStock), categoria: nuevaCat }]); setNuevoNombre(''); setNuevoPrecio(''); setNuevoStock(''); cargarDatos(); setLoading(false); };
  const eliminarProducto = async (id, nombre) => { if(!isOnline) return; if (window.confirm(`¿Eliminar "${nombre}"?`)) { setLoading(true); await supabase.from('bebidas').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const registrarMovimiento = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo, sesion_id: sesionActiva.id }]); setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false); };
  
  const procesarCierre = async () => { 
    if (!isOnline) return alert("❌ No puedes cerrar caja sin conexión a internet.");
    if (!window.confirm('⚠️ ¿CERRAR CAJA definitivamente?')) return; setLoading(true); 
    let conteoProductos = {}; ventasSesion.forEach(v => { v.detalles.forEach(item => { if (!conteoProductos[item.nombre]) conteoProductos[item.nombre] = 0; conteoProductos[item.nombre] += item.cantidad; }); }); 
    const resumenCierre = { estado: 'cerrada', cerrada_por: user.usuario, fecha_cierre: new Date().toISOString(), recaudacion_efectivo: CAJA_FISICA, recaudacion_transf: CAJA_BANCO, total_salidas: movsSesion.filter(m=>m.tipo==='salida').reduce((a,c)=>a+Number(c.monto),0), total_ingresos: movsSesion.filter(m=>m.tipo==='entrada').reduce((a,c)=>a+Number(c.monto),0), ranking_ventas: conteoProductos, personas_vendidas: personasVendidas, personas_lista: personasListaIngresadas }; 
    await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id); 
    setTicketActual({ tipo: 'cierre', fiesta: sesionActiva.nombre_fiesta, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), responsable: user.usuario, ventas_efectivo: totalEfecVentas, ventas_transf: totalTransfVentas, puerta_efectivo: totalEfecPuerta, puerta_transf: totalTransfPuerta, salidas_efec: salidasEfec, salidas_transf: salidasTransf, entradas_efec: entradasExtraEfec, entradas_transf: entradasExtraTransf, cant_generales: cantGenerales, cant_vips: cantVips, fiados_pendientes: totalFiadosPendientes, ...resumenCierre }); 
    setSesionActiva(null); setVista('admin'); setLoading(false); 
  };

  /* ================== UI ================== */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 relative">
          {!isOnline && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">SIN INTERNET</div>}
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-purple-500 tracking-widest">GJBROSS</h1><p className="text-white tracking-widest text-sm mt-1">SISTEMA POS</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" id="username" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario" required />
            <input type="password" id="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-lg shadow-lg">ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  const pendingCount = (JSON.parse(localStorage.getItem('ventasOffline')||'[]').length) + (JSON.parse(localStorage.getItem('puertaOffline')||'[]').length);

  const barraHeader = (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center mb-4 rounded-b-xl lg:rounded-xl gap-3 shadow-lg print:hidden">
      <div className="flex flex-col items-center md:items-start w-full md:w-auto">
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        <div className="flex items-center gap-2 mt-1">
          {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${isOnline ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>{isOnline ? '🌐 Online' : '⚠️ Offline'}</span>
          {pendingCount > 0 && <span className="text-[10px] bg-yellow-600 text-black px-2 py-0.5 rounded font-black uppercase animate-pulse">⏳ {pendingCount} PENDIENTES</span>}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {user.rol === 'admin' && vista !== 'proveedores' && <button onClick={() => setVista('proveedores')} className="bg-orange-600 hover:bg-orange-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🚚 Provs</button>}
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 hover:bg-blue-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">⚙️ Admin</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'puerta') && vista !== 'puerta' && <button onClick={() => setVista('puerta')} className="bg-yellow-600 hover:bg-yellow-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition text-black">🚪 QRs / Puerta</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'cajero') && vista !== 'pos' && <button onClick={() => setVista('pos')} className="bg-green-600 hover:bg-green-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🍹 Barra</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'boleteria') && vista !== 'boleteria' && <button onClick={() => setVista('boleteria')} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🎟️ Boletería</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">Salir</button>
      </div>
    </header>
  );

  if (ticketActual) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center print:bg-white print:text-black print:min-h-0 print:p-0 print:block">
        <style>{`@media print { @page { margin: 0; size: auto; } body { margin: 0; padding: 0; background: white; } }`}</style>
        <div className="bg-white text-black p-6 rounded w-full max-w-sm text-center font-mono border border-gray-400 print:border-none print:p-2 print:m-0 print:shadow-none print:w-full print:max-w-[80mm] mx-auto">
          <h2 className="text-2xl font-black uppercase text-center print:text-xl">{ticketActual.tipo === 'cierre' ? 'REPORTE Z' : 'GJBROSS POS'}</h2>
          <p className="text-sm font-bold text-center mt-1 bg-gray-200 py-1 print:text-xs print:mt-0">{ticketActual.fiesta}</p>
          {ticketActual.tipo === 'venta' ? (
            <>
              <div className="text-left text-xs mb-2 mt-4 print:mt-2"><p><b>Ticket:</b> #{ticketActual.id}</p><p><b>Cajero:</b> {ticketActual.cajero}</p><p><b>Hora:</b> {ticketActual.fecha}</p></div>
              <hr className="my-2 border-dashed border-gray-400 print:my-1" />
              <div className="text-left space-y-1 print:space-y-0">{ticketActual.items.map((it) => (<div key={it.id} className="flex justify-between text-sm print:text-xs"><span>{it.cantidad}x {it.nombre}</span><span>${it.precio * it.cantidad}</span></div>))}</div>
              <hr className="my-2 border-dashed border-gray-400 print:my-1" />
              <h3 className="text-2xl font-black text-right print:text-lg">TOTAL: ${ticketActual.total}</h3>
              <p className={`text-xs text-center mt-2 font-bold py-1 uppercase border border-dashed print:mt-1 print:border-black ${ticketActual.metodo_pago === 'fiado' ? 'bg-red-600 text-white print:bg-white print:text-black' : 'bg-black text-white print:bg-white print:text-black'}`}>
                METODO: {ticketActual.metodo_pago} {ticketActual.cliente ? `(${ticketActual.cliente})` : ''}
              </p>
            </>
          ) : (
            <>
              <div className="text-left text-xs space-y-1 mt-4 mb-2 print:mt-2 print:mb-1"><p><b>Cierre:</b> {ticketActual.fecha} - {ticketActual.hora}</p><p><b>Resp:</b> {ticketActual.responsable}</p></div>
              <hr className="border-black my-2 print:my-1" />
              <h4 className="font-bold text-xs text-left uppercase mb-1">Métricas de Puerta</h4>
              <div className="text-left text-xs space-y-1 bg-gray-100 p-2 border border-dashed print:p-1 print:space-y-0 print:bg-white print:border-black">
                <div className="flex justify-between"><span>Vendidas (Generales):</span><span className="font-bold">{ticketActual.cant_generales} pers.</span></div>
                <div className="flex justify-between"><span>Vendidas (VIPs):</span><span className="font-bold">{ticketActual.cant_vips} pers.</span></div>
                <div className="flex justify-between text-red-600 print:text-black"><span>Listas Gratis Ingresadas:</span><span className="font-bold">{ticketActual.personas_lista} pers.</span></div>
                <div className="flex justify-between text-sm font-black mt-1 print:text-xs"><span>TOTAL ADENTRO:</span><span>{ticketActual.personas_vendidas + ticketActual.personas_lista} pers.</span></div>
              </div>
              <hr className="border-black my-2 print:my-1" />
              <div className="text-left text-xs space-y-1 print:space-y-0">
                <div className="flex justify-between font-bold"><span>Total Ventas:</span><span>${ticketActual.ventas_efectivo + ticketActual.ventas_transf + ticketActual.puerta_efectivo + ticketActual.puerta_transf}</span></div>
                <div className="flex justify-between text-yellow-600 print:text-black"><span>Fiados (Sin cobrar):</span><span>${ticketActual.fiados_pendientes}</span></div>
                <div className="flex justify-between text-green-600 print:text-black"><span>Entradas extra:</span><span>+${ticketActual.entradas_efec + ticketActual.entradas_transf}</span></div>
                <div className="flex justify-between text-red-600 print:text-black"><span>Salidas caja:</span><span>-${ticketActual.salidas_efec + ticketActual.salidas_transf}</span></div>
              </div>
              <hr className="my-3 border-black print:my-1" />
              <div className="bg-black text-white p-2 text-left text-sm space-y-1 print:bg-white print:text-black print:p-1 print:space-y-0">
                <div className="flex justify-between text-gray-300 print:text-black"><span>Rendir EFECTIVO:</span><span>${ticketActual.recaudacion_efectivo}</span></div>
                <div className="flex justify-between text-gray-300 print:text-black"><span>Rendir BANCO:</span><span>${ticketActual.recaudacion_transf}</span></div>
                <hr className="border-gray-500 my-1 print:border-black"/>
                <div className="flex justify-between"><span className="font-bold uppercase">Neto:</span><span className="text-xl font-black print:text-lg">${ticketActual.recaudacion_efectivo + ticketActual.recaudacion_transf}</span></div>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex space-x-4 print:hidden">
          <button onClick={() => { window.print(); setTicketActual(null); }} className="bg-green-600 px-6 py-3 rounded-lg font-black uppercase text-sm">🖨️ Imprimir Ticket</button>
          <button onClick={() => setTicketActual(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-black uppercase text-sm">➡️ Continuar</button>
        </div>
      </div>
    );
  }

  const renderDetallesModal = () => {
    if (!verDetalleModal) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col"><h2 className="text-xl font-black uppercase mb-4 text-purple-400 border-b border-gray-700 pb-2">{verDetalleModal === 'entrada' ? 'Ingresos Extra' : verDetalleModal === 'salida' ? 'Salidas y Gastos' : verDetalleModal === 'ventas_efectivo' ? 'Ventas en Efectivo' : 'Ventas por Transferencia'}</h2><div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{(() => { let datos = []; let esVenta = false; if (verDetalleModal === 'entrada') datos = movsSesion.filter(m => m.tipo === 'entrada'); else if (verDetalleModal === 'salida') datos = movsSesion.filter(m => m.tipo === 'salida'); else if (verDetalleModal === 'ventas_efectivo') { datos = ventasSesion.filter(v => v.metodo_pago === 'efectivo'); esVenta = true; } else if (verDetalleModal === 'ventas_transferencia') { datos = ventasSesion.filter(v => v.metodo_pago === 'transferencia'); esVenta = true; } if (datos.length === 0) return <p className="text-gray-500 text-center py-4">No hay registros.</p>; return datos.map(d => (<div key={d.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-600"><div className="flex-1 pr-2">{esVenta ? (<><p className="font-bold text-xs text-gray-300">Ticket #{d.id} - Cajero: {d.cajero}</p><p className="text-xs text-gray-400 italic line-clamp-1">{d.detalles.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}</p></>) : (<><p className="font-bold text-sm text-white">{d.concepto}</p><p className="text-xs text-gray-400 uppercase">Vía: {d.metodo_pago}</p></>)}</div><span className={`font-black text-lg ${verDetalleModal === 'salida' ? 'text-red-400' : 'text-green-400'}`}>${esVenta ? d.total : d.monto}</span></div>)); })()}</div><button onClick={() => setVerDetalleModal(null)} className="mt-6 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold w-full uppercase">Cerrar Detalle</button></div>
      </div>
    );
  };

  // VISTA ADMIN DASHBOARD (AHORA CON 5 COLUMNAS Y DEUDORES)
  if (vista === 'admin') {
    
    // Lógica para agrupar deudores
    const fiadosPendientes = ventasSesion.filter(v => v.metodo_pago === 'fiado' && v.estado_pago === 'pendiente');
    const deudores = fiadosPendientes.reduce((acc, v) => {
      if (!acc[v.cliente]) acc[v.cliente] = { total: 0, tickets: [], items: [] };
      acc[v.cliente].total += Number(v.total);
      acc[v.cliente].tickets.push(v.id);
      acc[v.cliente].items.push(...v.detalles);
      return acc;
    }, {});

    if (!sesionActiva) return (<div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">{barraHeader}<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"><div className="lg:col-span-1"><div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl"><h2 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-widest">Apertura</h2><p className="text-gray-400 text-sm mb-6 text-center">Inicia un turno para habilitar la barra.</p><form onSubmit={abrirCaja} className="space-y-4"><input type="text" placeholder="Ej: Fiesta Halloween..." className="w-full bg-gray-700 p-4 rounded-xl font-black text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreFiestaApertura} onChange={e => setNombreFiestaApertura(e.target.value)} required /><button type="submit" disabled={loading || !isOnline} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50">🔓 ABRIR CAJA</button></form></div></div><div className="lg:col-span-2"><div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-[70vh]"><h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex items-center border-b border-gray-700 pb-2">📚 Historial de Cierres</h2><div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{historial.length === 0 ? <p className="text-gray-500 text-center py-10">No hay cierres.</p> : historial.map(h => (<div key={h.id} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transition"><div className="flex justify-between items-start cursor-pointer" onClick={() => setSesionExpandida(sesionExpandida === h.id ? null : h.id)}><div><h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3><p className="text-xs text-gray-400 mt-1">📅 {new Date(h.fecha_cierre).toLocaleDateString()} - 👤 {h.cerrada_por}</p></div><div className="text-right"><p className="text-xl font-black text-green-400">${Number(h.recaudacion_efectivo) + Number(h.recaudacion_transf)}</p><p className="text-[10px] text-gray-300 uppercase mt-1 bg-gray-800 px-2 py-1 rounded inline-block shadow">{sesionExpandida === h.id ? '🔼 Ocultar' : '🔽 Detalles'}</p></div></div>{sesionExpandida === h.id && (<div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Finanzas del Turno</h4><div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700"><div className="flex justify-between"><span>Efectivo:</span><span className="font-bold text-blue-400">${h.recaudacion_efectivo}</span></div><div className="flex justify-between"><span>Transferencias:</span><span className="font-bold text-purple-400">${h.recaudacion_transf}</span></div><hr className="border-gray-600 my-1" /><div className="flex justify-between"><span>Total Personas:</span><span className="font-bold text-purple-400">{h.personas_vendidas + h.personas_lista}</span></div><div className="flex justify-between"><span>(Vendidas / Gratis):</span><span className="text-gray-400 text-xs">({h.personas_vendidas} / {h.personas_lista})</span></div></div></div><div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2">🔥 Top Bebidas</h4><div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">{h.ranking_ventas && Object.keys(h.ranking_ventas).length > 0 ? (Object.entries(h.ranking_ventas).sort(([,a], [,b]) => b - a).slice(0, 5).map(([nombre, cant]) => (<div key={nombre} className="flex justify-between border-b border-gray-700 pb-1"><span className="truncate pr-2 text-gray-300">{nombre}</span><span className="font-black text-yellow-400">{cant}x</span></div>))) : <span className="text-gray-500 text-xs">Sin datos.</span>}</div></div></div>)}</div>))}</div></div></div></div></div>);

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 relative">
        {barraHeader}
        {renderDetallesModal()}
        
        {/* METRICAS PRINCIPALES AHORA INCLUYEN CUENTAS POR COBRAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-green-900/30 p-5 rounded-2xl border border-green-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total General Neto</h2><p className="text-4xl font-black text-green-400">${TOTAL_NETO}</p></div>
          <div onClick={() => setVerDetalleModal('ventas_efectivo')} className="bg-blue-900/30 p-5 rounded-2xl border border-blue-800 flex flex-col justify-center cursor-pointer hover:bg-blue-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Caja (Físico)</h2><p className="text-3xl font-black text-blue-400">${CAJA_FISICA}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
          <div onClick={() => setVerDetalleModal('ventas_transferencia')} className="bg-purple-900/30 p-5 rounded-2xl border border-purple-800 flex flex-col justify-center cursor-pointer hover:bg-purple-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Banco / MP (Digital)</h2><p className="text-3xl font-black text-purple-400">${CAJA_BANCO}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
          <div className="bg-orange-900/30 p-5 rounded-2xl border border-orange-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deuda Proveedores</h2><p className="text-3xl font-black text-orange-400">${deudaProveedores}</p></div>
          <div className="bg-red-900/30 p-5 rounded-2xl border border-red-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Cuentas x Cobrar</h2><p className="text-3xl font-black text-red-400">${totalFiadosPendientes}</p></div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center shadow-lg"><div><h2 className="text-sm font-bold text-gray-400 uppercase mb-1">🎟️ Ventas Boletería</h2><p className="text-sm text-white"><span className="text-indigo-400 font-black">{cantGenerales}</span> Generales | <span className="text-purple-400 font-black">{cantVips}</span> VIPs</p></div><div className="text-right"><p className="text-xs text-gray-500 uppercase">Recaudado Taquilla</p><p className="text-2xl font-black text-green-400">${totalEfecPuerta + totalTransfPuerta}</p></div></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex justify-between items-center">👑 Monitor Puerta <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Adentro: {personasListaIngresadas}</span></h2><div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">{listasVip.filter(l => l.ingresados > 0).length === 0 ? <p className="text-gray-500 text-sm">Nadie ha ingresado por QR aún.</p> : listasVip.filter(l => l.ingresados > 0).map(l => (<div key={l.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg border border-gray-600"><span className="font-bold text-white text-sm">{l.nombre}</span><span className="font-black text-green-400 text-xs">+{l.ingresados} Adentro</span></div>))}</div></div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h2 className="text-lg font-black uppercase text-blue-400 mb-4 flex items-center">👥 GESTIÓN DE STAFF</h2>
              <form onSubmit={crearStaff} className="space-y-3 mb-4">
                <input type="text" placeholder="Nuevo Usuario" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none text-sm" value={nuevoStaffUser} onChange={e => setNuevoStaffUser(e.target.value)} required />
                <div className="flex space-x-2"><input type="text" placeholder="Contraseña" className="w-1/2 bg-gray-700 p-3 rounded-lg focus:outline-none text-sm" value={nuevoStaffPass} onChange={e => setNuevoStaffPass(e.target.value)} required /><select className="w-1/2 bg-gray-700 p-3 rounded-lg focus:outline-none text-sm font-bold" value={nuevoStaffRol} onChange={e => setNuevoStaffRol(e.target.value)}><option value="cajero">Cajero (Barra)</option><option value="boleteria">Boletería</option><option value="puerta">Puerta (QR)</option></select></div>
                {nuevoStaffRol === 'puerta' && (<div><label className="text-xs text-yellow-400 font-bold uppercase mb-1 block">Cupo de Invitados (Listas VIP)</label><input type="number" placeholder="Ej: 50" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none text-sm font-bold" value={nuevoStaffCupo} onChange={e => setNuevoStaffCupo(e.target.value)} required /></div>)}
                <button type="submit" disabled={loading || !isOnline} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-black uppercase text-sm disabled:opacity-50">Crear Usuario</button>
              </form>
              <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                {staff.filter(s => s.rol !== 'admin').map(s => (<div key={s.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center text-sm"><div><p className="font-bold text-white uppercase">{s.usuario}</p><p className="text-[10px] text-gray-400 uppercase">{s.rol} {s.rol === 'puerta' ? `| Cupo: ${s.cupo_listas}` : ''}</p></div><div className="flex items-center space-x-2">{s.rol === 'puerta' && <button onClick={() => sumarCupoStaff(s.id, s.cupo_listas, s.usuario)} className="text-yellow-400 bg-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-600">+ Cupo</button>}<button onClick={() => eliminarStaff(s.id, s.usuario)} className="text-red-500 hover:text-red-400 text-lg">❌</button></div></div>))}
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black uppercase text-indigo-400 mb-4 flex items-center">🎟️ Precios Taquilla</h2><form onSubmit={actualizarPreciosTaquilla} className="space-y-3"><div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"><span className="font-bold text-sm">General $</span><input type="number" className="bg-gray-800 p-2 rounded text-white font-black text-right w-24" value={precioG} onChange={e=>setPrecioG(e.target.value)} required /></div><div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"><span className="font-bold text-sm">VIP $</span><input type="number" className="bg-gray-800 p-2 rounded text-white font-black text-right w-24" value={precioV} onChange={e=>setPrecioV(e.target.value)} required /></div><button type="submit" disabled={loading || !isOnline} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-black uppercase text-sm disabled:opacity-50">Fijar Precios</button></form></div>
            <button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)]">🔒 CERRAR ARQUEO Z</button>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 lg:col-span-2 shadow-xl space-y-6">
            
            {/* 🔴 NUEVO: PANEL DE CUENTAS CORRIENTES */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-red-900">
              <h2 className="text-lg font-black uppercase text-red-400 mb-4 flex items-center">📝 Cuentas Corrientes (Fiados)</h2>
              {Object.keys(deudores).length === 0 ? <p className="text-gray-500 text-sm font-bold uppercase">Nadie debe plata.</p> : 
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(deudores).map(([cliente, data]) => (
                    <div key={cliente} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-white uppercase text-lg leading-tight pr-2">{cliente}</span>
                          <span className="font-black text-red-400 text-xl">-${data.total}</span>
                        </div>
                        <p className="text-xs text-gray-400 italic mb-4 line-clamp-2">{data.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}</p>
                      </div>
                      <button onClick={() => saldarDeuda(cliente, data.tickets, data.total)} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-black text-sm uppercase transition shadow-[0_0_10px_rgba(34,197,94,0.3)]">Cobrar Deuda</button>
                    </div>
                  ))}
                </div>
              }
            </div>

            <div className="flex justify-between items-center mt-6"><h2 className="text-lg font-black uppercase text-white">📦 Base de Datos (Menú)</h2><div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Capital en Barra</p><p className="text-xl font-black text-green-400">${capitalEnBarra}</p></div></div>
            <form onSubmit={crearProducto} className="flex flex-col sm:flex-row gap-2 bg-gray-700/50 p-3 rounded-xl border border-gray-600"><input type="text" placeholder="Nombre" className="flex-1 bg-gray-800 p-2 rounded text-sm" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required /><input type="number" placeholder="$ Precio" className="w-full sm:w-24 bg-gray-800 p-2 rounded text-sm" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} required /><input type="number" placeholder="Stock" className="w-full sm:w-20 bg-gray-800 p-2 rounded text-sm" value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required /><select className="w-full sm:w-28 bg-gray-800 p-2 rounded text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}><option value="bebida">Bebida</option><option value="combo">Combo</option><option value="entrada">Entrada</option></select><button type="submit" disabled={!isOnline} className="bg-purple-600 px-4 py-2 rounded font-bold text-sm disabled:opacity-50">+</button></form>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">{bebidas.map(b => (<div key={b.id} className={`p-4 rounded-xl border relative ${b.stock < 10 ? 'bg-red-900/10 border-red-900' : 'bg-gray-700/30 border-gray-600'}`}><button type="button" onClick={() => eliminarProducto(b.id, b.nombre)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-lg">❌</button><p className="font-bold text-sm mb-1 pr-6">{b.nombre}</p><div className="flex justify-between items-center mb-3"><span className="text-green-400 font-black text-lg">${b.precio}</span><span className={`font-bold text-xs bg-gray-800 px-2 py-1 rounded ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span></div><div className="flex space-x-2"><button type="button" onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 py-2 rounded text-xs font-bold uppercase">Cambiar $</button><button type="button" onClick={async () => { const s = prompt(`Stock exacto:`, b.stock); if (s !== null && !isNaN(s)) { await supabase.from('bebidas').update({stock:Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 py-2 rounded text-xs font-bold uppercase">Mod. Stock</button></div></div>))}</div>
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700"><h2 className="text-lg font-black mb-4 uppercase text-yellow-400 flex items-center">💵 Registrar Movimiento</h2><form onSubmit={registrarMovimiento} className="space-y-3"><select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Gasto)</option><option value="entrada">🟢 Ingreso Extra</option></select><input type="text" placeholder="Concepto" className="w-full bg-gray-700 p-3 rounded-lg" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required /><div className="flex space-x-2"><input type="number" placeholder="Monto $" className="w-2/3 bg-gray-700 p-3 rounded-lg font-bold" value={movMonto} onChange={e => setMovMonto(e.target.value)} required /><select className="w-1/3 bg-gray-700 p-3 rounded-lg text-sm" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transf</option></select></div><button type="submit" disabled={loading || !isOnline} className="w-full bg-yellow-600 text-black py-3 rounded-lg font-black uppercase disabled:opacity-50">Registrar</button></form></div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: POS BARRA (AHORA CON BOTÓN ANOTAR)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {barraHeader}
      {!sesionActiva ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2></div>
      ) : (
        <div className="flex-1 p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
          <div className="lg:col-span-2 space-y-3"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">{bebidas.map((item) => (<button type="button" key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-3 lg:p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}><div><span className="text-[10px] font-black uppercase text-purple-500 block mb-1">{item.categoria}</span><p className="font-bold text-xs lg:text-sm line-clamp-2 leading-tight">{item.nombre}</p></div><div className="mt-2 flex justify-between items-end"><span className="text-base lg:text-lg font-black text-green-400">${item.precio}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Stk: {item.stock}</span></div></button>))}</div></div>
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col justify-between h-[450px] lg:h-auto shadow-2xl">
            <div><h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 border-b border-gray-700 pb-2">Ticket Actual</h2>{carrito.length === 0 ? (<div className="text-center py-10 text-gray-600"><p className="text-4xl mb-2">🍹</p><p className="text-xs font-bold uppercase">Toque productos para agregar</p></div>) : (<div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">{carrito.map((item) => (<div key={item.id} className="flex items-center justify-between bg-gray-700/40 p-2 rounded-lg border border-gray-600"><div className="flex-1 mr-2"><p className="font-bold text-xs line-clamp-1">{item.nombre}</p><p className="text-xs text-green-400 font-black">${item.precio * item.cantidad}</p></div><div className="flex items-center space-x-1"><button type="button" onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">-</button><span className="font-black text-sm w-4 text-center">{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">+</button></div></div>))}</div>)}</div>
            <div className="pt-2">
              <div className="flex justify-between items-end mb-3"><span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span><span className="text-3xl font-black text-green-400 leading-none">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span></div>
              
              {/* SELECTOR DE PAGO CON OPCIÓN "ANOTAR" */}
              <div className="flex space-x-2 mb-3">
                <button type="button" onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>💵 Efec</button>
                <button type="button" onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📱 Trans</button>
                <button type="button" onClick={() => setMetodoPagoPOS('fiado')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'fiado' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📝 Anotar</button>
              </div>

              {metodoPagoPOS === 'fiado' && (
                <input type="text" placeholder="Nombre de quien saca anotado..." className="w-full mb-3 bg-gray-900 border border-gray-700 p-3 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-center uppercase" value={nombreFiado} onChange={e => setNombreFiado(e.target.value)} required />
              )}

              <button type="button" onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition active:scale-95 text-lg uppercase tracking-widest">{loading ? '...' : 'COBRAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
