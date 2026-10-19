import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Scanner } from '@yudiel/react-qr-scanner';

function App() {
  const [user, setUser] = useState(null);
  const [vista, setVista] = useState(() => window.location.search.includes('tienda=true') ? 'tienda' : 'login');
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
  const [boxesWeb, setBoxesWeb] = useState([]);
  const [reservasBoxes, setReservasBoxes] = useState([]);

  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');
  const [nombreFiado, setNombreFiado] = useState('');
  const [verDetalleModal, setVerDetalleModal] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);

  const [modalMP, setModalMP] = useState(false);
  const [transfMP, setTransfMP] = useState([]);
  const [cargandoMP, setCargandoMP] = useState(false);

  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');
  const [nuevoProvNombre, setNuevoProvNombre] = useState('');
  
  const [boxNombre, setBoxNombre] = useState('');
  const [boxDesc, setBoxDesc] = useState('');
  const [boxPrecio, setBoxPrecio] = useState('');
  const [boxImg, setBoxImg] = useState('');
  const [boxStock, setBoxStock] = useState(10);
  const [dniBusquedaWeb, setDniBusquedaWeb] = useState('');
  const [buscandoQrWeb, setBuscandoQrWeb] = useState(false);
  const WHATSAPP_SOPORTE = '5493718000000'; // <-- Puedes cambiar este número cuando quieras

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

  const [preciosWeb, setPreciosWeb] = useState({ general: 5000, vip: 10000 });
  const [nombreWeb, setNombreWeb] = useState('');
  const [tipoWeb, setTipoWeb] = useState('general');
  const [cantWeb, setCantWeb] = useState(1);
  const [tabTienda, setTabTienda] = useState('entradas');
  const [dniWeb, setDniWeb] = useState('');
  const [telWeb, setTelWeb] = useState('');
  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [errorPago, setErrorPago] = useState(false);

  const ordenarBoxes = (arr) => {
    return [...arr].sort((a, b) => {
      const numA = parseInt((a.nombre.match(/\d+/) || [0])[0]);
      const numB = parseInt((b.nombre.match(/\d+/) || [0])[0]);
      return numA - numB;
    });
  };

  // REGISTRO CENTRALIZADO E INFALIBLE DE COMPRAS WEB
  const registrarCompraWebEnBD = async (pendiente, paymentId) => {
    if (!pendiente || !pendiente.nombre) return null;
    const { data: sData } = await supabase.from('sesiones').select('id, nombre_fiesta').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
    const sId = sData && sData.length > 0 ? sData[0].id : null;
    const fiestaNombre = sData && sData[0] ? sData[0].nombre_fiesta : 'FIESTA GJBROSS';

    const tipo = pendiente.tipo || 'general';
    const prefijo = tipo === 'vip' ? 'VIP-' : (tipo === 'box' ? 'BOX-' : 'GEN-');
    const sufijo = paymentId ? String(paymentId).slice(-6) : Math.random().toString(36).substr(2, 5).toUpperCase();
    const codigo = prefijo + sufijo;

    // Verificar si este pago de MP ya fue registrado antes (por el cliente o por auto-sync)
    const { data: existente } = await supabase.from('listas_vip').select('*').eq('codigo', codigo).limit(1);
    if (existente && existente.length > 0) {
      return {
        nombre: pendiente.nombre,
        dni: pendiente.dni || '',
        tel: pendiente.tel || '',
        cantidad: Number(pendiente.cantidad || 1),
        codigo,
        tipo_pase: tipo,
        fiesta: fiestaNombre,
        box_nombre: pendiente.box_nombre || '',
        box_desc: pendiente.box_desc || ''
      };
    }

    const hora = new Date().toLocaleTimeString();
    const nombreCompleto = `${pendiente.nombre}${pendiente.dni ? ' | DNI: ' + pendiente.dni : ''}`;
    const contactoWeb = `Web${pendiente.tel ? ' | Tel: ' + pendiente.tel : ''}${paymentId ? ' | MP#' + paymentId : ''}`;
    const cantNum = Number(pendiente.cantidad || (tipo === 'box' ? 10 : 1));

    await supabase.from('listas_vip').insert([{ 
      sesion_id: sId, 
      nombre: nombreCompleto + (tipo === 'box' ? ` (${pendiente.box_nombre || 'Box VIP'})` : ' (Online)'), 
      cantidad: cantNum, 
      ingresados: 0, 
      codigo, 
      tipo_pase: tipo, 
      creado_por: contactoWeb, 
      hora_creacion: hora 
    }]);

    const montoTotalWeb = Number(pendiente.precio_total || 0);
    if (montoTotalWeb > 0) {
      const etiquetaVenta = tipo === 'box' 
        ? `Box VIP Web (${pendiente.box_nombre || 'Box'})` 
        : `Entrada ${tipo === 'vip' ? 'VIP' : 'General'} Web`;
      await supabase.from('puerta').insert([{
        sesion_id: sId,
        tipo: 'venta',
        nombre: etiquetaVenta,
        cantidad: cantNum,
        precio_unitario: Math.round(montoTotalWeb / cantNum),
        total: montoTotalWeb,
        metodo_pago: 'transferencia',
        hora
      }]);
    }
    
    if (tipo === 'box') {
      await supabase.from('reservas_boxes').insert([{ 
        sesion_id: sId, 
        nombre_cliente: `${pendiente.nombre} | DNI: ${pendiente.dni || '-'} | Tel: ${pendiente.tel || '-'}`, 
        box_nombre: `${pendiente.box_nombre || 'BOX VIP'} [QR: ${codigo}]`, 
        descripcion: pendiente.box_desc || '10 PULSERAS + MESA BOX', 
        estado: 'pendiente', 
        fecha: hora 
      }]);
      if (pendiente.box_id) {
        const { data: bxActual } = await supabase.from('boxes_web').select('stock').eq('id', pendiente.box_id).single();
        if (bxActual && bxActual.stock > 0) {
          await supabase.from('boxes_web').update({ stock: bxActual.stock - 1 }).eq('id', pendiente.box_id);
        }
      }
    }

    return { 
      nombre: pendiente.nombre, 
      dni: pendiente.dni || '', 
      tel: pendiente.tel || '', 
      cantidad: cantNum, 
      codigo, 
      tipo_pase: tipo, 
      fiesta: fiestaNombre, 
      box_nombre: pendiente.box_nombre || '',
      box_desc: pendiente.box_desc || '' 
    };
  };

  // AUTO-SINCRONIZADOR: Rescata compras de clientes que cerraron Mercado Pago antes de volver a la web
  const sincronizarPagosWebMP = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch('/api/mp-transferencias');
      const pagos = await res.json();
      if (!Array.isArray(pagos)) return;
      let huboNuevos = false;
      for (const p of pagos) {
        if (p.metadata && p.metadata.nombre && p.metadata.tipo) {
          const prefijo = p.metadata.tipo === 'vip' ? 'VIP-' : (p.metadata.tipo === 'box' ? 'BOX-' : 'GEN-');
          const codigo = prefijo + String(p.id).slice(-6);
          const { data: existe } = await supabase.from('listas_vip').select('id').eq('codigo', codigo).limit(1);
          if (!existe || existe.length === 0) {
            await registrarCompraWebEnBD(p.metadata, p.id);
            huboNuevos = true;
          }
        }
      }
      if (huboNuevos && user) cargarDatos();
    } catch (e) { console.log('Sync MP en segundo plano'); }
  };

  useEffect(() => {
    const verificarPagoOnline = async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status') || params.get('collection_status');
      const paymentId = params.get('payment_id') || params.get('collection_id');

      if (status === 'approved') {
        setLoading(true);
        let pendiente = null;
        try { pendiente = JSON.parse(localStorage.getItem('compra_pendiente')); } catch (e) {}

        // Si cambió de navegador (ej: de Instagram a Chrome), recuperamos los datos de la URL
        if (!pendiente && params.get('external_reference')) {
          try { pendiente = JSON.parse(atob(params.get('external_reference'))); } catch (e) {}
        }

        // Validamos con MP y si aún faltan datos los recuperamos de la metadata de MP
        if (paymentId) {
          try {
            const verif = await fetch(`/api/mp-transferencias?payment_id=${paymentId}`);
            const verifData = await verif.json();
            if (verifData && verifData.valido === false) {
              setLoading(false);
              setErrorPago(true);
              return;
            }
            if (!pendiente && verifData && verifData.metadata && verifData.metadata.nombre) {
              pendiente = verifData.metadata;
            }
          } catch (e) { console.log('Verificación local'); }
        }

        if (pendiente) {
          const qrData = await registrarCompraWebEnBD(pendiente, paymentId);
          if (qrData) setQrGenerado(qrData);
          localStorage.removeItem('compra_pendiente');
          window.history.replaceState({}, document.title, "/?tienda=true&ticket=" + (qrData?.codigo || 'ok'));
        }
        setLoading(false);
      } else if (status === 'rejected' || params.get('pago') === 'fallo') {
        setErrorPago(true);
        window.history.replaceState({}, document.title, "/?tienda=true&pago=error");
      }
    };
    verificarPagoOnline();
  }, []);

  useEffect(() => {
    const getWebData = async () => {
      const { data } = await supabase.from('sesiones').select('*').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
      if(data && data[0]) setPreciosWeb({general: data[0].precio_general || 5000, vip: data[0].precio_vip || 10000});
      const { data: bData } = await supabase.from('boxes_web').select('*');
      if(bData) setBoxesWeb(ordenarBoxes(bData));
    };
    if(vista === 'tienda') getWebData();
  }, [vista]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true); const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const cargarDatos = async () => {
    if (!navigator.onLine) return; 
    const { data: prods } = await supabase.from('bebidas').select('*').order('id'); if (prods) setBebidas(prods);
    const { data: provs } = await supabase.from('proveedores').select('*').order('id'); if (provs) setProveedores(provs);
    const { data: bx } = await supabase.from('boxes_web').select('*'); if (bx) setBoxesWeb(ordenarBoxes(bx));
    
    if (user?.rol === 'admin') {
      const { data: hist } = await supabase.from('sesiones').select('*').eq('estado', 'cerrada').order('id', { ascending: false }); if (hist) setHistorial(hist);
      const { data: st } = await supabase.from('cajeros').select('*').order('id'); if (st) setStaff(st);
    }
    if (user?.rol === 'puerta') { const { data: u } = await supabase.from('cajeros').select('*').eq('id', user.id).single(); if (u) setUser(u); }

    const { data: sesionData } = await supabase.from('sesiones').select('*').eq('estado', 'abierta').order('id', { ascending: false }).limit(1);
    const sesion = sesionData && sesionData.length > 0 ? sesionData[0] : null;
    
    if (sesion) {
      setSesionActiva(sesion); setPrecioG(sesion.precio_general || 5000); setPrecioV(sesion.precio_vip || 10000);
      // Si había compras web hechas mientras la caja estaba cerrada, las vinculamos a esta fiesta activa
      await supabase.from('listas_vip').update({ sesion_id: sesion.id }).is('sesion_id', null);
      await supabase.from('reservas_boxes').update({ sesion_id: sesion.id }).is('sesion_id', null);
      await supabase.from('puerta').update({ sesion_id: sesion.id }).is('sesion_id', null);
      const { data: v } = await supabase.from('ventas').select('*').eq('sesion_id', sesion.id); setVentasSesion(v || []);
      const { data: m } = await supabase.from('movimientos').select('*').eq('sesion_id', sesion.id); setMovsSesion(m || []);
      const { data: p } = await supabase.from('puerta').select('*').eq('sesion_id', sesion.id); setPuertaSesion(p || []);
      const { data: l } = await supabase.from('listas_vip').select('*').eq('sesion_id', sesion.id).order('id', { ascending: false }); setListasVip(l || []);
      const { data: resBox } = await supabase.from('reservas_boxes').select('*').eq('sesion_id', sesion.id).order('id', { ascending: false }); setReservasBoxes(resBox || []);
    } else {
      setSesionActiva(null); setVentasSesion([]); setMovsSesion([]); setPuertaSesion([]); setListasVip([]); setReservasBoxes([]);
    }
  };

  useEffect(() => { if (user) cargarDatos(); }, [user, vista]);

  useEffect(() => {
    if (!user || !isOnline) return;
    const radar = supabase.channel('gjbross_en_vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puerta' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_vip' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bebidas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boxes_web' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas_boxes' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cajeros' }, () => cargarDatos()).subscribe();
    return () => { supabase.removeChannel(radar); };
  }, [user, isOnline]);

  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;
      let vOffline = JSON.parse(localStorage.getItem('ventasOffline') || '[]');
      let pOffline = JSON.parse(localStorage.getItem('puertaOffline') || '[]');
      let synced = false;
      if (vOffline.length > 0) {
        const { error } = await supabase.from('ventas').insert(vOffline);
        if (!error) { 
          let itemsVendidos = {};
          vOffline.forEach(venta => { venta.detalles.forEach(item => { if (!itemsVendidos[item.id]) itemsVendidos[item.id] = 0; itemsVendidos[item.id] += item.cantidad; }); });
          for (const id of Object.keys(itemsVendidos)) { const { data: drink } = await supabase.from('bebidas').select('stock').eq('id', id).single(); if (drink) { await supabase.from('bebidas').update({ stock: drink.stock - itemsVendidos[id] }).eq('id', id); } }
          localStorage.setItem('ventasOffline', '[]'); synced = true; 
        }
      }
      if (pOffline.length > 0) {
        const { error } = await supabase.from('puerta').insert(pOffline);
        if (!error) { localStorage.setItem('puertaOffline', '[]'); synced = true; }
      }
      if (synced) cargarDatos();
    };
    const interval = setInterval(syncOfflineData, 10000); return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user && isOnline) sincronizarPagosWebMP();
  }, [user]);

  const cargarTransferenciasMP = async () => {
    if (!isOnline) return alert("Sin internet."); setCargandoMP(true);
    try { 
      await sincronizarPagosWebMP();
      const res = await fetch('/api/mp-transferencias'); 
      const data = await res.json(); 
      if (Array.isArray(data)) setTransfMP(data); 
    } catch (error) { alert("Error de red."); }
    setCargandoMP(false);
  };

  const rescatarPagoManualMP = async (pago) => {
    const nombre = prompt(`Crear QR para el pago #${pago.id} ($${pago.monto}).\nIngresa Nombre y Apellido del cliente:`);
    if (!nombre || !nombre.trim()) return;
    const dni = prompt("Ingresa el DNI (opcional):") || "";
    const esVip = (pago.descripcion || '').toUpperCase().includes('VIP');
    const esBox = (pago.descripcion || '').toUpperCase().includes('BOX') || (pago.descripcion || '').toUpperCase().includes('RESERVA');
    const tipo = esBox ? 'box' : (esVip ? 'vip' : 'general');
    const cant = Number(prompt("¿Para cuántas personas es el acceso?", esBox ? "10" : "1")) || 1;
    setLoading(true);
    const qr = await registrarCompraWebEnBD({
      nombre: nombre.trim(),
      dni: dni.trim(),
      tel: '',
      tipo,
      cantidad: cant,
      precio_total: pago.monto,
      box_nombre: esBox ? pago.descripcion : '',
      box_desc: esBox ? 'BOX VIP RESERVADO POR MP' : ''
    }, pago.id);
    await cargarDatos();
    setLoading(false);
    setModalMP(false);
    if (qr) alert(`✅ ¡QR Creado con éxito!\nCódigo: ${qr.codigo}\nYa figura en la lista de QRs y en la Caja.`);
  };

    const capitalEnBarra = bebidas.reduce((acc, b) => acc + (b.precio * b.stock), 0);
  const deudaProveedores = proveedores.reduce((acc, p) => acc + ((p.compras || []).reduce((s, c) => s + ((c.cantidad||1) * c.costo), 0) - (p.descuento || 0)), 0);
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
    e.preventDefault(); if (!isOnline) return alert("❌ Sin internet."); setLoading(true); 
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', document.getElementById('username').value).eq('password', document.getElementById('password').value).single(); 
    setLoading(false); 
    if (error || !data) alert('❌ Credenciales incorrectas'); 
    else { setUser(data); await cargarDatos(); if (data.rol === 'admin') setVista('admin'); else if (data.rol === 'puerta') setVista('puerta'); else if (data.rol === 'boleteria') setVista('boleteria'); else setVista('pos'); } 
  };

  const handleComprarEntrada = async (e) => {
    e.preventDefault();
    if (!nombreWeb.trim() || !dniWeb.trim() || !telWeb.trim()) return alert("Por favor completa Nombre, DNI y WhatsApp");
    setLoading(true);
    const precio = tipoWeb === 'general' ? preciosWeb.general : preciosWeb.vip;
    const totalPagar = precio * cantWeb;
    const datosCompra = { 
      nombre: nombreWeb.trim(), 
      dni: dniWeb.trim(), 
      tel: telWeb.trim(), 
      tipo: tipoWeb, 
      cantidad: cantWeb,
      precio_total: totalPagar
    };
    localStorage.setItem('compra_pendiente', JSON.stringify(datosCompra));
    ejecutarPagoMP(`Entrada ${tipoWeb.toUpperCase()} GJBROSS`, totalPagar, cantWeb, tipoWeb, datosCompra);
  };

  const handleComprarBox = async (e) => {
    e.preventDefault();
    if (!boxSeleccionado) return;
    if ((boxSeleccionado.stock ?? 10) <= 0) return alert("⚠️ Este Box ya se encuentra agotado.");
    if (!nombreWeb.trim() || !dniWeb.trim() || !telWeb.trim()) return alert("Por favor completa Nombre, DNI y WhatsApp");
    setLoading(true);
    const datosCompra = { 
      nombre: nombreWeb.trim(), 
      dni: dniWeb.trim(), 
      tel: telWeb.trim(), 
      tipo: 'box', 
      cantidad: 10, 
      box_id: boxSeleccionado.id,
      box_nombre: boxSeleccionado.nombre, 
      box_desc: boxSeleccionado.descripcion,
      precio_total: boxSeleccionado.precio
    };
    localStorage.setItem('compra_pendiente', JSON.stringify(datosCompra));
    ejecutarPagoMP(`Reserva ${boxSeleccionado.nombre}`, boxSeleccionado.precio, 1, 'box', datosCompra);
  };

  const recuperarQrPorDni = async (e) => {
    e.preventDefault();
    if (!dniBusquedaWeb.trim()) return;
    setBuscandoQrWeb(true);
    // Primero sincronizamos con Mercado Pago por si el cliente cerró la app sin volver
    await sincronizarPagosWebMP();
    const { data: encontrados } = await supabase.from('listas_vip').select('*').ilike('nombre', `%${dniBusquedaWeb.trim()}%`).order('id', { ascending: false }).limit(1);
    if (!encontrados || encontrados.length === 0) {
      setBuscandoQrWeb(false);
      return alert("❌ No encontramos ningún acceso con ese DNI. Si acabas de pagar, aguarda unos segundos y vuelve a intentar.");
    }
    const item = encontrados[0];
    let descBox = '';
    if (item.tipo_pase === 'box') {
      const { data: rBox } = await supabase.from('reservas_boxes').select('*').ilike('box_nombre', `%${item.codigo}%`).limit(1);
      if (rBox && rBox[0]) descBox = rBox[0].descripcion;
    }
    setBuscandoQrWeb(false);
    setQrGenerado({
      nombre: item.nombre.split('|')[0].trim(),
      dni: dniBusquedaWeb.trim(),
      tel: (item.creado_por || '').includes('Tel:') ? item.creado_por.split('Tel:')[1].split('|')[0].trim() : '',
      cantidad: item.cantidad,
      codigo: item.codigo,
      tipo_pase: item.tipo_pase,
      fiesta: sesionActiva?.nombre_fiesta || 'FIESTA GJBROSS',
      box_nombre: item.tipo_pase === 'box' ? 'BOX VIP' : '',
      box_desc: descBox
    });
  };

  const ejecutarPagoMP = async (titulo, precioTotal, cant, tipoPase, datosCompra) => {
    try {
      const resp = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ titulo, precio: precioTotal/cant, cantidad: cant, tipoPase, origin: window.location.origin + '/?tienda=true', datosCompra }) 
      });
      const data = await resp.json();
      if (data.url_pago) window.location.href = data.url_pago; else { alert("Error al conectar con MP."); setLoading(false); }
    } catch(e) { alert("Error de red"); setLoading(false); }
  };

    const descargarInvitacion = (qrData) => { 
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext('2d'); 
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920); grad.addColorStop(0, '#0f0c29'); grad.addColorStop(0.5, '#302b63'); grad.addColorStop(1, '#24243e'); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height); 
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 15; ctx.strokeRect(50, 50, 980, 1820); 
    ctx.fillStyle = '#10b981'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; 
    ctx.fillText(`FIESTA: ${(qrData.fiesta || sesionActiva?.nombre_fiesta || '').toUpperCase()}`, 540, 150, 900); 
    ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 80px sans-serif'; ctx.fillText('GJBROSS', 540, 250); 
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px sans-serif'; 
    ctx.fillText(qrData.tipo_pase === 'box' ? 'RESERVA BOX' : (qrData.tipo_pase === 'vip' ? 'PASE VIP' : 'ACCESO QR'), 540, 420); 
    ctx.fillStyle = '#fbbf24'; ctx.font = '55px sans-serif'; ctx.fillText(qrData.nombre.toUpperCase(), 540, 580, 900); if (qrData.dni) { ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('DNI: ' + qrData.dni, 540, 630); } 
    
    if (qrData.tipo_pase === 'box') {
        ctx.fillStyle = '#10b981'; ctx.font = 'bold 35px sans-serif'; ctx.fillText('✅ PRESENTAR ESTE TICKET EN LA BARRA', 540, 680); 
        ctx.fillStyle = '#ffffff'; ctx.font = '30px sans-serif'; ctx.fillText(qrData.box_desc, 540, 740); 
    } else {
        ctx.fillStyle = '#9ca3af'; ctx.font = '40px sans-serif'; ctx.fillText(`Válido para ${qrData.cantidad} personas`, 540, 680); 
    }

    const img = new Image(); img.crossOrigin = 'Anonymous'; 
    img.onload = () => { 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(270, 800, 540, 540); ctx.drawImage(img, 290, 820, 500, 500); 
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 60px sans-serif'; ctx.fillText(qrData.codigo, 540, 1500); 
        ctx.fillStyle = '#9ca3af'; ctx.font = '35px sans-serif'; ctx.fillText('Presenta este código en la puerta', 540, 1750); 
        canvas.toBlob(async (blob) => {
        const fileName = `Ticket_${qrData.tipo_pase||'vip'}_${qrData.nombre.replace(/\s+/g, '_')}.png`;
        
        // MAGIA PARA iPHONE/ANDROID: Abre el menú nativo para compartir/guardar
        if (navigator.canShare && navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
            const file = new File([blob], fileName, { type: 'image/png' });
            try {
                await navigator.share({ files: [file], title: 'Ticket GJBROSS' });
                return;
            } catch (e) { console.log('Acción cancelada'); }
        }
        
        // Método clásico reforzado para Computadoras
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 'image/png'); 
    }; img.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrData.codigo}&color=000000&bgcolor=FFFFFF`; 
  };

  const modalQRComponent = null;

    const renderModalValidacionMP = () => {
    if (!modalMP) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-[105] flex items-center justify-center p-4"><div className="bg-gray-800 p-6 rounded-3xl border border-[#009EE3] w-full max-w-md max-h-[80vh] flex flex-col"><div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3"><h2 className="text-lg font-black uppercase text-[#009EE3]">📱 Pagos Recientes</h2><button onClick={() => setModalMP(false)} className="text-gray-400 hover:text-red-500 font-black text-xl">✖</button></div><div className="flex gap-2 mb-4"><button onClick={cargarTransferenciasMP} disabled={cargandoMP} className="flex-[2] bg-[#009EE3] hover:bg-[#008ACA] text-white font-black py-3 rounded-xl uppercase text-sm">{cargandoMP ? 'Sincronizando...' : '🔄 Actualizar y Sincronizar'}</button><button onClick={() => window.open('https://www.mercadopago.com.ar/activities', '_blank')} className="flex-[1] bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 rounded-xl text-[10px] uppercase text-center leading-tight">Ver MP<br/>Oficial</button></div><div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">{transfMP.length === 0 && !cargandoMP ? <p className="text-center text-gray-500 font-bold uppercase mt-8 text-sm">Sin cobros</p> : transfMP.map(t => (<div key={t.id} className="bg-gray-700/50 p-4 rounded-xl flex justify-between items-center gap-2"><div className="flex-1 pr-2 min-w-0"><p className="font-bold text-white text-sm truncate">{t.descripcion}</p><p className="text-[10px] text-gray-400 mt-1 uppercase">{t.fecha} • Op #{String(t.id).slice(-6)}</p>{t.metadata?.nombre && <p className="text-[10px] text-purple-400 font-bold uppercase mt-0.5">👤 {t.metadata.nombre} (DNI: {t.metadata.dni})</p>}</div><div className="text-right shrink-0"><span className="font-black text-green-400 text-lg block">+$${t.monto}</span>{(user?.rol === 'admin' && (t.descripcion || '').toLowerCase().includes('entrada') || (t.descripcion || '').toLowerCase().includes('reserva')) && (<button onClick={() => rescatarPagoManualMP(t)} className="mt-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow">+ Crear QR</button>)}</div></div>))}</div></div></div>
    );
  };

    const entregarBox = async (id) => {
    if(!isOnline) return;
    if(!window.confirm('¿Confirmar entrega de las botellas de este BOX?')) return;
    setLoading(true); await supabase.from('reservas_boxes').update({ estado: 'entregado' }).eq('id', id); await cargarDatos(); setLoading(false);
  };

  const agregarAlCarrito = (producto) => { if (!producto || producto.stock <= 0) return alert('⚠️ Sin stock'); setCarrito(prev => { const existe = prev.find(item => item.id === producto.id); if (existe) { if (existe.cantidad >= producto.stock) { alert('⚠️ Supera stock'); return prev; } return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item); } else return [...prev, { ...producto, cantidad: 1 }]; }); };
  const cambiarCantidad = (id, delta) => setCarrito(prev => prev.map(i => i.id === id ? (i.cantidad + delta > 0 ? { ...i, cantidad: i.cantidad + delta } : null) : i).filter(Boolean));
  
  const procesarVenta = async () => { 
    if (carrito.length === 0 || !sesionActiva) return; 
    if (metodoPagoPOS === 'fiado' && !nombreFiado.trim()) return alert("⚠️ Ingresa el nombre de quien saca anotado.");
    setLoading(true); 
    const totalVenta = carrito.reduce((a, item) => a + (item.precio * item.cantidad), 0); 
    const horaVenta = new Date().toLocaleTimeString();
    const nuevaVenta = { cajero: user.usuario, total: totalVenta, detalles: carrito, metodo_pago: metodoPagoPOS, sesion_id: sesionActiva.id, cliente: metodoPagoPOS === 'fiado' ? nombreFiado.trim() : '', estado_pago: metodoPagoPOS === 'fiado' ? 'pendiente' : 'pagado', hora: horaVenta };
    if (isOnline) {
      const { data: ventaData, error } = await supabase.from('ventas').insert([nuevaVenta]).select().single(); 
      if (!error) { 
        for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id); 
        setTicketActual({ tipo: 'venta', id: ventaData.id, fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: horaVenta, items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS, cliente: nuevaVenta.cliente }); 
        setCarrito([]); setNombreFiado(''); cargarDatos(); 
      } 
    } else {
      let guardadas = JSON.parse(localStorage.getItem('ventasOffline') || '[]'); guardadas.push(nuevaVenta); localStorage.setItem('ventasOffline', JSON.stringify(guardadas));
      setBebidas(prev => prev.map(b => { const itemCar = carrito.find(c => c.id === b.id); return itemCar ? { ...b, stock: b.stock - itemCar.cantidad } : b; }));
      setTicketActual({ tipo: 'venta', id: "OFF-" + Date.now().toString().slice(-4), fiesta: sesionActiva.nombre_fiesta, cajero: user.usuario, fecha: horaVenta, items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS, cliente: nuevaVenta.cliente }); 
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
  const procesarCierre = async () => { if (!isOnline) return alert("❌ No puedes cerrar caja sin conexión a internet."); if (!window.confirm('⚠️ ¿CERRAR CAJA definitivamente?')) return; setLoading(true); let conteoProductos = {}; ventasSesion.forEach(v => { v.detalles.forEach(item => { if (!conteoProductos[item.nombre]) conteoProductos[item.nombre] = 0; conteoProductos[item.nombre] += item.cantidad; }); }); const resumenCierre = { estado: 'cerrada', cerrada_por: user.usuario, fecha_cierre: new Date().toISOString(), recaudacion_efectivo: CAJA_FISICA, recaudacion_transf: CAJA_BANCO, total_salidas: movsSesion.filter(m=>m.tipo==='salida').reduce((a,c)=>a+Number(c.monto),0), total_ingresos: movsSesion.filter(m=>m.tipo==='entrada').reduce((a,c)=>a+Number(c.monto),0), ranking_ventas: conteoProductos, personas_vendidas: personasVendidas, personas_lista: personasListaIngresadas }; await supabase.from('sesiones').update(resumenCierre).eq('id', sesionActiva.id); setTicketActual({ tipo: 'cierre', fiesta: sesionActiva.nombre_fiesta, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(), responsable: user.usuario, ventas_efectivo: totalEfecVentas, ventas_transf: totalTransfVentas, puerta_efectivo: totalEfecPuerta, puerta_transf: totalTransfPuerta, salidas_efec: salidasEfec, salidas_transf: salidasTransf, entradas_efec: entradasExtraEfec, entradas_transf: entradasExtraTransf, cant_generales: cantGenerales, cant_vips: cantVips, fiados_pendientes: totalFiadosPendientes, ...resumenCierre }); setSesionActiva(null); setVista('admin'); setLoading(false); };

  const saldarDeuda = async (cliente, tickets, totalDeuda) => {
    if(!isOnline) return alert("❌ Conéctate a internet para cobrar deudas.");
    const metodo = prompt(`Cobrar $${totalDeuda} a ${cliente}.\nEscribe "efectivo" o "transferencia":`, "efectivo");
    if (metodo !== 'efectivo' && metodo !== 'transferencia') return;
    setLoading(true);
    for (let id of tickets) { await supabase.from('ventas').update({ metodo_pago: metodo, estado_pago: 'pagado' }).eq('id', id); }
    await cargarDatos(); setLoading(false); alert(`✅ Deuda saldada.`);
  };

  const venderEntradas = async (e) => { 
    e.preventDefault(); if (!sesionActiva || cantEntradas < 1) return; setLoading(true); 
    const total = cantEntradas * precioActualTaquilla; 
    const horaTicket = new Date().toLocaleTimeString();
    const nuevaEntrada = { sesion_id: sesionActiva.id, tipo: 'venta', nombre: `Pulsera ${tipoEntradaVenta}`, cantidad: cantEntradas, precio_unitario: precioActualTaquilla, total, metodo_pago: pagoEntrada, hora: horaTicket };
    if (isOnline) { await supabase.from('puerta').insert([nuevaEntrada]); await cargarDatos(); alert(`✅ Venta Exitosa`); } 
    else { let guardadas = JSON.parse(localStorage.getItem('puertaOffline') || '[]'); guardadas.push(nuevaEntrada); localStorage.setItem('puertaOffline', JSON.stringify(guardadas)); alert(`✅ Venta GUARDADA OFFLINE`); }
    setCantEntradas(1); setLoading(false); 
  };
  
  const generarQRLista = async (e) => { 
    e.preventDefault(); if (!sesionActiva || !nombreLista || cantLista < 1) return; 
    if(!isOnline) return alert("❌ Sin internet no puedes crear QRs.");
    if (user.rol === 'puerta') { if (user.cupo_listas < cantLista) return alert(`❌ CUPO INSUFICIENTE.\nTe quedan ${user.cupo_listas} lugares pero intentas meter a ${cantLista}.`); }
    setLoading(true); 
    const prefijo = tipoPaseQr === 'vip' ? 'VIP-' : 'GEN-'; 
    const codigo = prefijo + Math.random().toString(36).substr(2, 5).toUpperCase(); 
    const hora_creacion = new Date().toLocaleTimeString();
    const { error } = await supabase.from('listas_vip').insert([{ sesion_id: sesionActiva.id, nombre: nombreLista, cantidad: cantLista, ingresados: 0, codigo, tipo_pase: tipoPaseQr, creado_por: user.usuario, hora_creacion }]); 
    if (!error) { 
      if (user.rol === 'puerta') await supabase.from('cajeros').update({ cupo_listas: user.cupo_listas - cantLista }).eq('id', user.id);
      setQrGenerado({ nombre: nombreLista, cantidad: cantLista, codigo, tipo_pase: tipoPaseQr }); setNombreLista(''); setCantLista(1); await cargarDatos(); 
    } setLoading(false); 
  };

  const procesarEscaneoAutomatico = async (textoCodigo) => { 
    if(!isOnline) return alert("❌ No puedes escanear QRs sin conexión a internet.");
    setMostrarEscaner(false); const codigoLimpio = textoCodigo.trim().toUpperCase(); const listaEncontrada = listasVip.find(l => l.codigo.toUpperCase() === codigoLimpio); if (!listaEncontrada) return alert(`❌ CÓDIGO INVÁLIDO O INEXISTENTE.\n(Leído: "${codigoLimpio}")`); if (listaEncontrada.estado === 'ingresado') { alert(`⚠️ CÓDIGO COMPLETADO.\nYa entraron las ${listaEncontrada.cantidad} personas de este QR.`); setFiltroQR(codigoLimpio); return; } const yaIngresados = listaEncontrada.ingresados || 0; const disponibles = listaEncontrada.cantidad - yaIngresados; const cantIngresarStr = prompt(`🎟 PASE: ${listaEncontrada.nombre}\nQuedan disponibles: ${disponibles} (de ${listaEncontrada.cantidad}).\n¿Cuántos ingresan AHORA MISMO?`, disponibles); if (cantIngresarStr === null) return; const cantIngresar = Number(cantIngresarStr); if (isNaN(cantIngresar) || cantIngresar <= 0 || cantIngresar > disponibles) { return alert(`❌ Cantidad inválida.`); } setLoading(true); const nuevosIngresados = yaIngresados + cantIngresar; const nuevoEstado = nuevosIngresados >= listaEncontrada.cantidad ? 'ingresado' : 'pendiente'; await supabase.from('listas_vip').update({ ingresados: nuevosIngresados, estado: nuevoEstado }).eq('id', listaEncontrada.id);
    const esCompraWeb = (listaEncontrada.creado_por || '').includes('Web') || (listaEncontrada.creado_por || '').includes('Tienda') || listaEncontrada.tipo_pase === 'box';
    await supabase.from('puerta').insert([{ 
      sesion_id: sesionActiva.id, 
      tipo: esCompraWeb ? 'ingreso_web' : 'lista', 
      nombre: `${esCompraWeb ? 'Ingreso Web' : 'Lista ' + (listaEncontrada.tipo_pase?.toUpperCase()||'VIP')} - ${listaEncontrada.nombre}`, 
      cantidad: cantIngresar, 
      precio_unitario: 0, 
      total: 0, 
      hora: new Date().toLocaleTimeString() 
    }]);
    setFiltroQR(''); await cargarDatos(); setLoading(false); alert(`✅ ACCESO PERMITIDO\nVIP: ${listaEncontrada.nombre}\nPASAN AHORA: ${cantIngresar}\nFaltan llegar: ${listaEncontrada.cantidad - nuevosIngresados}`); 
  };

  const abrirCaja = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('sesiones').insert([{ nombre_fiesta: nombreFiestaApertura, abierta_por: user.usuario }]); await cargarDatos(); setLoading(false); setVista('admin'); };
  const actualizarPreciosTaquilla = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('sesiones').update({ precio_general: Number(precioG), precio_vip: Number(precioV) }).eq('id', sesionActiva.id); await cargarDatos(); setLoading(false); alert('✅ Precios de taquilla actualizados.'); };
  const crearStaff = async (e) => { e.preventDefault(); if(!isOnline) return; setLoading(true); await supabase.from('cajeros').insert([{ usuario: nuevoStaffUser, password: nuevoStaffPass, rol: nuevoStaffRol, cupo_listas: nuevoStaffRol === 'puerta' ? Number(nuevoStaffCupo) : 0 }]); setNuevoStaffUser(''); setNuevoStaffPass(''); setNuevoStaffCupo(0); await cargarDatos(); setLoading(false); alert('✅ Empleado creado exitosamente.'); };
  const eliminarStaff = async (id, nombre) => { if(!isOnline) return; if (window.confirm(`¿Seguro que deseas ELIMINAR al usuario "${nombre}"?`)) { setLoading(true); await supabase.from('cajeros').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const sumarCupoStaff = async (id, cupoActual, nombre) => { if(!isOnline) return; const sumar = prompt(`¿Cuántos pases VIP extras le vas a sumar a ${nombre}?`); if (sumar && !isNaN(sumar)) { await supabase.from('cajeros').update({ cupo_listas: cupoActual + Number(sumar) }).eq('id', id); cargarDatos(); } };
  const crearBoxWeb = async (e) => { 
    e.preventDefault(); if(!isOnline) return; setLoading(true); 
    await supabase.from('boxes_web').insert([{ nombre: boxNombre.toUpperCase(), descripcion: boxDesc.toUpperCase(), precio: Number(boxPrecio), imagen_url: boxImg, stock: Number(boxStock || 10) }]); 
    setBoxNombre(''); setBoxDesc(''); setBoxPrecio(''); setBoxImg(''); setBoxStock(10); await cargarDatos(); setLoading(false); alert('✅ Box creado.'); 
  };
  const eliminarBoxWeb = async (id) => { if(!isOnline) return; if(window.confirm('¿Eliminar Box?')){ setLoading(true); await supabase.from('boxes_web').delete().eq('id', id); await cargarDatos(); setLoading(false); } };
  const editarPrecioBox = async (box) => { if(!isOnline) return; const n = prompt(`Nuevo precio para ${box.nombre}:`, box.precio); if (n && !isNaN(n)) { await supabase.from('boxes_web').update({ precio: Number(n) }).eq('id', box.id); cargarDatos(); } };
  const editarStockBox = async (box) => { if(!isOnline) return; const s = prompt(`Stock disponible para ${box.nombre}:`, box.stock ?? 10); if (s !== null && !isNaN(s)) { await supabase.from('boxes_web').update({ stock: Number(s) }).eq('id', box.id); cargarDatos(); } };
  const editarDescBox = async (box) => { if(!isOnline) return; const d = prompt(`Editar bebidas incluidas en ${box.nombre}:`, box.descripcion); if (d && d.trim()) { await supabase.from('boxes_web').update({ descripcion: d.toUpperCase() }).eq('id', box.id); cargarDatos(); } };

  const enviarQrWhatsAppCliente = (telefonoTexto, nombreCliente, codigoQr, tipoPase) => {
    const numLimpio = (telefonoTexto || '').replace(/\D/g, '');
    if (!numLimpio) return alert("⚠️ Este registro no tiene un número de teléfono guardado.");
    const numFinal = numLimpio.startsWith('54') ? numLimpio : '549' + numLimpio;
    const linkTienda = `${window.location.origin}/?tienda=true`;
    const msg = encodeURIComponent(`¡Hola ${nombreCliente}! 🎉 Aquí tienes los datos de tu acceso oficial para *GJBROSS*:\n\n🔑 *Código QR:* ${codigoQr}\n🎫 *Pase:* ${tipoPase.toUpperCase()}\n\n📲 Puedes recuperar y descargar tu QR en cualquier momento ingresando tu DNI en nuestra Boletería Oficial:\n${linkTienda}`);
    window.open(`https://wa.me/${numFinal}?text=${msg}`, '_blank');
  };

  // ----- RENDERIZADO DE VISTAS -----

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
              <p className={`text-xs text-center mt-2 font-bold py-1 uppercase border border-dashed print:mt-1 print:border-black ${ticketActual.metodo_pago === 'fiado' ? 'bg-red-600 text-white print:bg-white print:text-black' : 'bg-black text-white print:bg-white print:text-black'}`}>METODO: {ticketActual.metodo_pago} {ticketActual.cliente ? `(${ticketActual.cliente})` : ''}</p>
            </>
          ) : (
            <>
              <div className="text-left text-xs space-y-1 mt-4 mb-2 print:mt-2 print:mb-1"><p><b>Cierre:</b> {ticketActual.fecha} - {ticketActual.hora}</p><p><b>Resp:</b> {ticketActual.responsable}</p></div>
              <hr className="border-black my-2 print:my-1" />
              <h4 className="font-bold text-xs text-left uppercase mb-1">Métricas de Puerta</h4>
              <div className="text-left text-xs space-y-1 bg-gray-100 p-2 border border-dashed print:p-1 print:space-y-0 print:bg-white print:border-black"><div className="flex justify-between"><span>Vendidas (Generales):</span><span className="font-bold">{ticketActual.cant_generales} pers.</span></div><div className="flex justify-between"><span>Vendidas (VIPs):</span><span className="font-bold">{ticketActual.cant_vips} pers.</span></div><div className="flex justify-between text-red-600 print:text-black"><span>Listas Gratis Ingresadas:</span><span className="font-bold">{ticketActual.personas_lista} pers.</span></div><div className="flex justify-between text-sm font-black mt-1 print:text-xs"><span>TOTAL ADENTRO:</span><span>{ticketActual.personas_vendidas + ticketActual.personas_lista} pers.</span></div></div>
              <hr className="border-black my-2 print:my-1" />
              <div className="text-left text-xs space-y-1 print:space-y-0"><div className="flex justify-between font-bold"><span>Total Ventas:</span><span>${ticketActual.ventas_efectivo + ticketActual.ventas_transf + ticketActual.puerta_efectivo + ticketActual.puerta_transf}</span></div><div className="flex justify-between text-yellow-600 print:text-black"><span>Fiados (Sin cobrar):</span><span>${ticketActual.fiados_pendientes}</span></div><div className="flex justify-between text-green-600 print:text-black"><span>Entradas extra:</span><span>+${ticketActual.entradas_efec + ticketActual.entradas_transf}</span></div><div className="flex justify-between text-red-600 print:text-black"><span>Salidas caja:</span><span>-${ticketActual.salidas_efec + ticketActual.salidas_transf}</span></div></div>
              <hr className="my-3 border-black print:my-1" />
              <div className="bg-black text-white p-2 text-left text-sm space-y-1 print:bg-white print:text-black print:p-1 print:space-y-0"><div className="flex justify-between text-gray-300 print:text-black"><span>Rendir EFECTIVO:</span><span>${ticketActual.recaudacion_efectivo}</span></div><div className="flex justify-between text-gray-300 print:text-black"><span>Rendir BANCO:</span><span>${ticketActual.recaudacion_transf}</span></div><hr className="border-gray-500 my-1 print:border-black"/><div className="flex justify-between"><span className="font-bold uppercase">Neto:</span><span className="text-xl font-black print:text-lg">${ticketActual.recaudacion_efectivo + ticketActual.recaudacion_transf}</span></div></div>
            </>
          )}
        </div>
        <div className="mt-6 flex space-x-4 print:hidden"><button onClick={() => { window.print(); setTicketActual(null); }} className="bg-green-600 px-6 py-3 rounded-lg font-black uppercase text-sm">🖨️ Imprimir Ticket</button><button onClick={() => setTicketActual(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-black uppercase text-sm">➡️ Continuar</button></div>
      </div>
    );
  }

  const renderDetallesModal = () => {
    if (!verDetalleModal) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col"><h2 className="text-xl font-black uppercase mb-4 text-purple-400 border-b border-gray-700 pb-2">{verDetalleModal === 'entrada' ? 'Ingresos Extra' : verDetalleModal === 'salida' ? 'Salidas y Gastos' : verDetalleModal === 'ventas_efectivo' ? 'Ventas en Efectivo' : 'Ventas por Transferencia'}</h2><div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{(() => { let datos = []; let esVenta = false; if (verDetalleModal === 'entrada') datos = movsSesion.filter(m => m.tipo === 'entrada'); else if (verDetalleModal === 'salida') datos = movsSesion.filter(m => m.tipo === 'salida'); else if (verDetalleModal === 'ventas_efectivo') { datos = ventasSesion.filter(v => v.metodo_pago === 'efectivo'); esVenta = true; } else if (verDetalleModal === 'ventas_transferencia') { datos = ventasSesion.filter(v => v.metodo_pago === 'transferencia'); esVenta = true; } if (datos.length === 0) return <p className="text-gray-500 text-center py-4">No hay registros.</p>; return datos.map(d => (<div key={d.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-600"><div className="flex-1 pr-2">{esVenta ? (<><p className="font-bold text-xs text-gray-300">Tk #{d.id} - 👤 {d.cajero} - 🕒 {d.hora || '--:--'}</p><p className="text-xs text-gray-400 italic line-clamp-1 mt-1">{d.detalles.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}</p></>) : (<><p className="font-bold text-sm text-white">{d.concepto}</p><p className="text-xs text-gray-400 uppercase">Vía: {d.metodo_pago}</p></>)}</div><span className={`font-black text-lg ${verDetalleModal === 'salida' ? 'text-red-400' : 'text-green-400'}`}>${esVenta ? d.total : d.monto}</span></div>)); })()}</div><button onClick={() => setVerDetalleModal(null)} className="mt-6 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold w-full uppercase">Cerrar Detalle</button></div>
      </div>
    );
  };

  // PAGINA DEDICADA DE ERROR DE PAGO
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
          <button onClick={() => { const msg = encodeURIComponent("Hola GJBROSS! Tuve un problema al intentar pagar en la boletería web."); window.open(`https://wa.me/${WHATSAPP_SOPORTE}?text=${msg}`, '_blank'); }} className="w-full bg-gray-700 hover:bg-gray-600 text-yellow-400 font-bold py-3 rounded-xl uppercase text-xs border border-gray-600">
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
            <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400 font-bold uppercase">Tipo de Pase:</span><span className="font-black text-yellow-400 uppercase">{qrGenerado.tipo_pase === 'box' ? `🛋️ ${qrGenerado.box_nombre || 'BOX VIP'}` : (qrGenerado.tipo_pase === 'vip' ? '👑 PASE VIP' : '🎫 ENTRADA GENERAL')}</span></div>
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
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrGenerado.codigo}&color=000000&bgcolor=FFFFFF`} alt="QR Acceso" className="w-full h-full object-contain" />
          </div>

          <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-xl text-xs text-gray-300 leading-relaxed mb-6 text-center">
            <p className="font-black text-blue-400 uppercase mb-1">📌 Instrucciones de Ingreso</p>
            Presiona el botón de abajo para descargar tu ticket o sácale captura a esta pantalla. Presenta el código QR en la puerta al llegar{qrGenerado.tipo_pase === 'box' ? ' y muéstralo en la barra para retirar las bebidas de tu Box.' : '.'}
          </div>

          <button onClick={() => descargarInvitacion(qrGenerado)} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-lg uppercase shadow-[0_0_20px_rgba(34,197,94,0.4)] transition active:scale-95 flex items-center justify-center gap-2 mb-3">
            ⬇️ Descargar Acceso / QR
          </button>

          <div className="flex gap-2">
            <button onClick={() => { const msg = encodeURIComponent(`Hola! Tengo una consulta sobre mi ticket GJBROSS. Titular: ${qrGenerado.nombre} - Código: ${qrGenerado.codigo}`); window.open(`https://wa.me/${WHATSAPP_SOPORTE}?text=${msg}`, '_blank'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-yellow-400 py-3 rounded-xl font-bold uppercase text-xs transition">
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
            <button onClick={() => { setTabTienda('entradas'); setBoxSeleccionado(null); }} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tabTienda === 'entradas' ? 'bg-[#009EE3] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>🎫 Entradas</button>
            <button onClick={() => setTabTienda('boxes')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tabTienda === 'boxes' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>🛋️ Boxes VIP</button>
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
                    <button type="button" onClick={() => setTipoWeb('general')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoWeb === 'general' ? 'bg-[#009EE3] text-white' : 'bg-gray-700 text-gray-400'}`}>General<br/><span className="text-xs font-normal">${preciosWeb.general}</span></button>
                    <button type="button" onClick={() => setTipoWeb('vip')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoWeb === 'vip' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>VIP<br/><span className="text-xs font-normal">${preciosWeb.vip}</span></button>
                  </div>
                </div>
                <div><label className="text-xs text-gray-400 font-bold uppercase block mb-1">Cantidad de Entradas</label>
                  <div className="flex items-center shadow-inner rounded-xl overflow-hidden"><button type="button" onClick={() => setCantWeb(Math.max(1, cantWeb - 1))} className="bg-gray-600 w-1/3 py-3 font-black text-2xl text-white">-</button><input type="number" className="w-1/3 bg-gray-700 py-3 text-center font-black text-2xl text-white focus:outline-none" value={cantWeb} readOnly /><button type="button" onClick={() => setCantWeb(cantWeb + 1)} className="bg-gray-600 w-1/3 py-3 font-black text-2xl text-white">+</button></div>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-gray-600 text-center"><span className="text-sm font-bold text-gray-400 block uppercase mb-1">Total a Pagar</span><span className="text-4xl font-black text-green-400">${(tipoWeb==='general'?preciosWeb.general:preciosWeb.vip) * cantWeb}</span></div>
                <button type="submit" disabled={loading} className="w-full bg-[#009EE3] hover:bg-[#008ACA] text-white font-black py-4 rounded-xl shadow-lg transition active:scale-95 uppercase">💳 Pagar con Mercado Pago</button>
              </form>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in pb-10">
              {boxSeleccionado ? (
                <div className="bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-lg mx-auto border-2 border-red-600 relative overflow-hidden">
                  <button type="button" onClick={() => setBoxSeleccionado(null)} className="text-xs font-black uppercase text-gray-300 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg mb-4 inline-block">⬅️ Volver a todos los Boxes</button>
                  <h2 className="text-2xl font-black text-white uppercase">{boxSeleccionado.nombre}</h2>
                  <p className="text-3xl font-black text-red-500 my-2">${boxSeleccionado.precio}</p>
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
                    {boxesWeb.map(box => {
                      const stockDisp = box.stock ?? 10;
                      const agotado = stockDisp <= 0;
                      return (
                        <div key={box.id} className={`bg-gray-800 border-2 ${agotado ? 'border-gray-700 opacity-60' : 'border-red-900/30 hover:border-red-500'} rounded-3xl overflow-hidden shadow-2xl flex flex-col transition duration-300`}>
                          {box.imagen_url ? (<img src={box.imagen_url} alt={box.nombre} className="w-full h-56 object-cover border-b-4 border-black" />) : (<div className="w-full h-56 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center border-b-4 border-black text-6xl shadow-inner">🛋️</div>)}
                          <div className="p-6 flex-1 flex flex-col relative">
                            <div className={`absolute -top-6 right-4 ${agotado ? 'bg-gray-600' : 'bg-red-600'} text-white font-black px-4 py-1 rounded-full text-xs shadow-lg border-2 border-black`}>
                              {agotado ? 'AGOTADO' : `QUEDAN ${stockDisp}`}
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase pr-10">{box.nombre}</h3>
                            <div className="mt-4 flex-1"><p className="text-sm font-bold text-gray-400 uppercase leading-relaxed whitespace-pre-line bg-black/30 p-4 rounded-xl border border-gray-700 shadow-inner">{box.descripcion}</p></div>
                            <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
                              <span className="text-3xl font-black text-red-500 drop-shadow-md">${box.precio}</span>
                              <button disabled={agotado} onClick={() => { setBoxSeleccionado(box); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`${agotado ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95 border border-red-400'} px-6 py-3 rounded-xl font-black uppercase text-sm transition`}>
                                {agotado ? 'Sin Cupo' : 'Reservar Box'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* RECUPERADOR DE QR POR DNI PARA CLIENTES */}
          <div className="max-w-md mx-auto mt-4 mb-12 bg-gray-800/80 p-6 rounded-3xl border border-gray-700 text-center shadow-xl">
            <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider mb-1">🔍 ¿Ya compraste y cerraste la ventana?</h3>
            <p className="text-xs text-gray-400 mb-4">Ingresa tu DNI para volver a ver y descargar tu código QR o Voucher Box</p>
            <form onSubmit={recuperarQrPorDni} className="flex gap-2">
              <input type="number" placeholder="Tu N° de DNI..." className="flex-1 bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-purple-500" value={dniBusquedaWeb} onChange={e => setDniBusquedaWeb(e.target.value)} required />
              <button type="submit" disabled={buscandoQrWeb} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-black uppercase text-xs shadow-lg transition active:scale-95">
                {buscandoQrWeb ? '...' : 'Buscar QR'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

    if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 flex-col">
        {modalQRComponent}
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 relative">
          {!isOnline && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">SIN INTERNET</div>}
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-purple-500 tracking-widest">GJBROSS</h1><p className="text-white tracking-widest text-sm mt-1">SISTEMA POS</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" id="username" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario Staff" required />
            <input type="password" id="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-lg shadow-lg">ENTRAR AL SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  const pendingCount = (JSON.parse(localStorage.getItem('ventasOffline')||'[]').length) + (JSON.parse(localStorage.getItem('puertaOffline')||'[]').length);

  const barraHeader = (
    <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center mb-4 rounded-b-xl lg:rounded-xl gap-3 shadow-lg print:hidden shrink-0">
      <div className="flex flex-col items-center md:items-start w-full md:w-auto">
        <h1 className="text-xl font-black tracking-wider text-purple-400">GJBROSS <span className="text-white text-sm">POS</span></h1>
        <div className="flex items-center gap-2 mt-1">
          {sesionActiva ? <p className="text-xs text-green-400 font-bold uppercase">🟢 {sesionActiva.nombre_fiesta}</p> : <p className="text-xs text-red-400 font-bold uppercase">🔴 CAJA CERRADA</p>}
          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${isOnline ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>{isOnline ? '🌐 Online' : '⚠️ Offline'}</span>
          {pendingCount > 0 && <span className="text-[10px] bg-yellow-600 text-black px-2 py-0.5 rounded font-black uppercase animate-pulse">⏳ {pendingCount} PENDIENTES</span>}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {(user.rol === 'admin' || user.rol === 'cajero') && <button onClick={() => setVista('entregas')} className="bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-xs px-3 py-2 rounded font-black uppercase shadow transition border border-red-400">🍾 Entregas Web</button>}
        {(user.rol === 'admin' || user.rol === 'cajero' || user.rol === 'boleteria') && <button onClick={() => { setModalMP(true); cargarTransferenciasMP(); }} className="bg-[#009EE3] hover:bg-[#008ACA] text-white text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🔍 Validar MP</button>}
        {user.rol === 'admin' && vista !== 'admin' && <button onClick={() => setVista('admin')} className="bg-blue-600 hover:bg-blue-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">⚙️ Admin</button>}
        {user.rol === 'admin' && vista !== 'proveedores' && <button onClick={() => setVista('proveedores')} className="bg-orange-600 hover:bg-orange-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🚚 Provs</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'puerta') && vista !== 'puerta' && <button onClick={() => setVista('puerta')} className="bg-yellow-600 hover:bg-yellow-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition text-black">🚪 QRs</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'cajero') && vista !== 'pos' && <button onClick={() => setVista('pos')} className="bg-green-600 hover:bg-green-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🍹 Barra</button>}
        {sesionActiva && (user.rol === 'admin' || user.rol === 'boleteria') && vista !== 'boleteria' && <button onClick={() => setVista('boleteria')} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow transition">🎟️ Taquilla</button>}
        <button onClick={() => {setUser(null); setVista('login');}} className="bg-red-900 text-[10px] sm:text-xs px-3 py-2 rounded font-bold uppercase shadow">Salir</button>
      </div>
    </header>
  );

  if (vista === 'entregas') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}{renderModalValidacionMP()}
        <div className="max-w-5xl mx-auto w-full">
            <h2 className="text-2xl font-black uppercase text-red-400 mb-6 flex items-center gap-2">🍾 Entregas de Boxes VIP (Online)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservasBoxes.length === 0 ? <p className="text-gray-500 font-bold uppercase">Nadie compró Boxes online aún en esta fiesta.</p> : 
                reservasBoxes.map(r => {
                    const matchQr = r.box_nombre.match(/\[QR:\s*([^\]]+)\]/);
                    const codQr = matchQr ? matchQr[1] : 'BOX-' + r.id;
                    return (
                      <div key={r.id} className={`p-6 rounded-2xl border-2 shadow-xl flex flex-col transition ${r.estado === 'entregado' ? 'bg-green-900/20 border-green-900 opacity-60' : 'bg-gray-800 border-red-600'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{r.fecha} - #{r.id}</p><p className="text-lg font-black text-white uppercase leading-tight">{r.nombre_cliente}</p></div>
                              <span className={`px-3 py-1 rounded text-xs font-black uppercase ${r.estado === 'entregado' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}`}>{r.estado}</span>
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

    if (vista === 'admin') {
    const fiadosPendientes = ventasSesion.filter(v => v.metodo_pago === 'fiado' && v.estado_pago === 'pendiente');
    const deudores = fiadosPendientes.reduce((acc, v) => { if (!acc[v.cliente]) acc[v.cliente] = { total: 0, tickets: [], items: [] }; acc[v.cliente].total += Number(v.total); acc[v.cliente].tickets.push(v.id); acc[v.cliente].items.push(...v.detalles.map(i => ({...i, horaVenta: v.hora}))); return acc; }, {});
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 relative">
        {barraHeader}{renderDetallesModal()}{renderModalValidacionMP()}{modalQRComponent}
        
        {/* APERTURA SÓLO SI NO HAY SESIÓN ACTIVA */}
        {!sesionActiva ? (
          <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl mt-10">
            <h2 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-widest">Apertura de Caja</h2>
            <p className="text-gray-400 text-sm mb-6 text-center">Inicia un turno para habilitar todo el sistema.</p>
            <form onSubmit={abrirCaja} className="space-y-4">
              <input type="text" placeholder="Ej: Fiesta Halloween..." className="w-full bg-gray-700 p-4 rounded-xl font-black text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreFiestaApertura} onChange={e => setNombreFiestaApertura(e.target.value)} required />
              <button type="submit" disabled={loading || !isOnline} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50">🔓 ABRIR CAJA</button>
            </form>
          </div>
        ) : (
          /* DASHBOARD DE ADMIN (SI HAY SESION) */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-green-900/30 p-5 rounded-2xl border border-green-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total General Neto</h2><p className="text-4xl font-black text-green-400">${TOTAL_NETO}</p></div>
              <div onClick={() => setVerDetalleModal('ventas_efectivo')} className="bg-blue-900/30 p-5 rounded-2xl border border-blue-800 flex flex-col justify-center cursor-pointer hover:bg-blue-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Caja (Físico)</h2><p className="text-3xl font-black text-blue-400">${CAJA_FISICA}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
              <div onClick={() => setVerDetalleModal('ventas_transferencia')} className="bg-purple-900/30 p-5 rounded-2xl border border-purple-800 flex flex-col justify-center cursor-pointer hover:bg-purple-900/50 transition shadow-lg group"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-white transition">Banco / MP (Digital)</h2><p className="text-3xl font-black text-purple-400">${CAJA_BANCO}</p><p className="text-[10px] text-gray-500 mt-2 underline uppercase">Ver tickets</p></div>
              <div className="bg-orange-900/30 p-5 rounded-2xl border border-orange-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Deuda Proveedores</h2><p className="text-3xl font-black text-orange-400">${deudaProveedores}</p></div>
              <div className="bg-red-900/30 p-5 rounded-2xl border border-red-800 flex flex-col justify-center shadow-lg"><h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Cuentas x Cobrar</h2><p className="text-3xl font-black text-red-400">${totalFiadosPendientes}</p></div>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-red-900/20 p-6 rounded-2xl border border-red-900/50 shadow-xl mb-6">
                <h2 className="text-xl font-black uppercase text-red-400 mb-4 flex items-center gap-2">📦 Configurar Boxes Web <span className="text-xs bg-red-900 text-white px-2 py-1 rounded">Tienda Online</span></h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <form onSubmit={crearBoxWeb} className="lg:col-span-1 space-y-3">
                        <input type="text" placeholder="Nombre (Ej: BOX GJBROSS 1)" className="w-full bg-gray-700 p-3 rounded font-bold focus:outline-none" value={boxNombre} onChange={e=>setBoxNombre(e.target.value)} required />
                        <div className="flex gap-2">
                          <input type="number" placeholder="Precio $" className="w-2/3 bg-gray-700 p-3 rounded font-bold text-green-400 focus:outline-none" value={boxPrecio} onChange={e=>setBoxPrecio(e.target.value)} required />
                          <input type="number" placeholder="Stock" className="w-1/3 bg-gray-700 p-3 rounded font-bold text-yellow-400 focus:outline-none" value={boxStock} onChange={e=>setBoxStock(e.target.value)} required />
                        </div>
                        <textarea placeholder="Descripción de botellas (Ej: 2 SKYY, 4 SPRITE)" className="w-full bg-gray-700 p-3 rounded h-24 font-bold focus:outline-none" value={boxDesc} onChange={e=>setBoxDesc(e.target.value)} required />
                        <input type="text" placeholder="URL Imagen (Opcional)" className="w-full bg-gray-700 p-3 rounded text-xs focus:outline-none" value={boxImg} onChange={e=>setBoxImg(e.target.value)} />
                        <button type="submit" disabled={!isOnline || loading} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black uppercase shadow-lg disabled:opacity-50">Añadir Box a la Tienda</button>
                    </form>
                    <div className="lg:col-span-2 bg-gray-900/50 rounded-xl p-4 border border-gray-700 max-h-[380px] overflow-y-auto custom-scrollbar">
                        {boxesWeb.length === 0 ? <p className="text-gray-500 text-center mt-10 font-bold uppercase">No hay Boxes en venta.</p> : 
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {boxesWeb.map(b => (
                                <div key={b.id} className="bg-gray-800 p-4 rounded-xl border border-red-900/50 flex flex-col relative">
                                    <button onClick={()=>eliminarBoxWeb(b.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 font-bold text-sm">❌</button>
                                    <p className="font-black text-white uppercase text-base leading-tight pr-6">{b.nombre}</p>
                                    <div className="flex justify-between items-center my-1">
                                      <span className="font-black text-green-400 text-lg">${b.precio}</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${(b.stock ?? 10) > 0 ? 'bg-gray-700 text-yellow-400' : 'bg-red-600 text-white'}`}>Stock: {b.stock ?? 10}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold whitespace-pre-line bg-gray-900 p-2 rounded flex-1 mb-2">{b.descripcion}</p>
                                    <div className="flex gap-1">
                                      <button type="button" onClick={() => editarPrecioBox(b)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-1.5 rounded text-[10px] font-black uppercase">$ Precio</button>
                                      <button type="button" onClick={() => editarStockBox(b)} className="flex-1 bg-blue-700 hover:bg-blue-600 py-1.5 rounded text-[10px] font-black uppercase">📦 Stock</button>
                                      <button type="button" onClick={() => editarDescBox(b)} className="flex-1 bg-purple-700 hover:bg-purple-600 py-1.5 rounded text-[10px] font-black uppercase">✏️ Texto</button>
                                    </div>
                                </div>
                            ))}
                        </div>}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center shadow-lg"><div><h2 className="text-sm font-bold text-gray-400 uppercase mb-1">🎟️ Ventas Boletería</h2><p className="text-sm text-white"><span className="text-indigo-400 font-black">{cantGenerales}</span> Generales | <span className="text-purple-400 font-black">{cantVips}</span> VIPs</p></div><div className="text-right"><p className="text-xs text-gray-500 uppercase">Recaudado Taquilla</p><p className="text-2xl font-black text-green-400">${totalEfecPuerta + totalTransfPuerta}</p></div></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex justify-between items-center">👑 Monitor Puerta <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Adentro: {personasListaIngresadas}</span></h2><div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">{listasVip.filter(l => l.ingresados > 0).length === 0 ? <p className="text-gray-500 text-sm">Nadie ha ingresado por QR aún.</p> : listasVip.filter(l => l.ingresados > 0).map(l => (<div key={l.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg border border-gray-600"><span className="font-bold text-white text-sm">{l.nombre}</span><span className="font-black text-green-400 text-xs">+{l.ingresados} Adentro</span></div>))}</div></div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black uppercase text-blue-400 mb-4 flex items-center">👥 GESTIÓN DE STAFF</h2><form onSubmit={crearStaff} className="space-y-3 mb-4"><input type="text" placeholder="Nuevo Usuario" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none text-sm" value={nuevoStaffUser} onChange={e => setNuevoStaffUser(e.target.value)} required /><div className="flex space-x-2"><input type="text" placeholder="Contraseña" className="w-1/2 bg-gray-700 p-3 rounded-lg focus:outline-none text-sm" value={nuevoStaffPass} onChange={e => setNuevoStaffPass(e.target.value)} required /><select className="w-1/2 bg-gray-700 p-3 rounded-lg focus:outline-none text-sm font-bold" value={nuevoStaffRol} onChange={e => setNuevoStaffRol(e.target.value)}><option value="cajero">Cajero (Barra)</option><option value="boleteria">Boletería</option><option value="puerta">Puerta (QR)</option></select></div>{nuevoStaffRol === 'puerta' && (<div><label className="text-xs text-yellow-400 font-bold uppercase mb-1 block">Cupo de Invitados (Listas VIP)</label><input type="number" placeholder="Ej: 50" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none text-sm font-bold" value={nuevoStaffCupo} onChange={e => setNuevoStaffCupo(e.target.value)} required /></div>)}<button type="submit" disabled={loading || !isOnline} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-black uppercase text-sm disabled:opacity-50">Crear Usuario</button></form><div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">{staff.filter(s => s.rol !== 'admin').map(s => (<div key={s.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center text-sm"><div><p className="font-bold text-white uppercase">{s.usuario}</p><p className="text-[10px] text-gray-400 uppercase">{s.rol} {s.rol === 'puerta' ? `| Cupo: ${s.cupo_listas}` : ''}</p></div><div className="flex items-center space-x-2">{s.rol === 'puerta' && <button onClick={() => sumarCupoStaff(s.id, s.cupo_listas, s.usuario)} className="text-yellow-400 bg-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-600">+ Cupo</button>}<button onClick={() => eliminarStaff(s.id, s.usuario)} className="text-red-500 hover:text-red-400 text-lg">❌</button></div></div>))}</div></div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl"><h2 className="text-lg font-black uppercase text-indigo-400 mb-4 flex items-center">🎟️ Precios Taquilla</h2><form onSubmit={actualizarPreciosTaquilla} className="space-y-3"><div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"><span className="font-bold text-sm">General $</span><input type="number" className="bg-gray-800 p-2 rounded text-white font-black text-right w-24 focus:outline-none" value={precioG} onChange={e=>setPrecioG(e.target.value)} required /></div><div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"><span className="font-bold text-sm">VIP $</span><input type="number" className="bg-gray-800 p-2 rounded text-white font-black text-right w-24 focus:outline-none" value={precioV} onChange={e=>setPrecioV(e.target.value)} required /></div><button type="submit" disabled={loading || !isOnline} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-black uppercase text-sm disabled:opacity-50">Fijar Precios</button></form></div>
                <button onClick={procesarCierre} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)]">🔒 CERRAR ARQUEO Z</button>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 lg:col-span-2 shadow-xl space-y-6">
                <div className="bg-gray-900 p-6 rounded-2xl border border-red-900"><h2 className="text-lg font-black uppercase text-red-400 mb-4 flex items-center">📝 Cuentas Corrientes (Fiados)</h2>{Object.keys(deudores).length === 0 ? <p className="text-gray-500 text-sm font-bold uppercase">Nadie debe plata.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">{Object.entries(deudores).map(([cliente, data]) => (<div key={cliente} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-between"><div><div className="flex justify-between items-start mb-2"><span className="font-black text-white uppercase text-lg leading-tight pr-2">{cliente}</span><span className="font-black text-red-400 text-xl">-${data.total}</span></div><p className="text-xs text-gray-400 italic mb-4 line-clamp-3">{data.items.map(i => `${i.cantidad}x ${i.nombre} (${i.horaVenta || '--:--'})`).join(', ')}</p></div><button onClick={() => saldarDeuda(cliente, data.tickets, data.total)} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-black text-sm uppercase transition shadow-[0_0_10px_rgba(34,197,94,0.3)]">Cobrar Deuda</button></div>))}</div>}</div>
                <div className="bg-gray-900 p-6 rounded-2xl border border-yellow-900 space-y-6">
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
                            {(l.creado_por || '').includes('Tel:') && (
                              <button onClick={() => enviarQrWhatsAppCliente(l.creado_por.split('Tel:')[1], l.nombre.split('|')[0].trim(), l.codigo, l.tipo_pase || 'general')} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded font-black" title="Enviar por WhatsApp">📲</button>
                            )}
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
                        const matchQr = r.box_nombre.match(/\[QR:\s*([^\]]+)\]/);
                        const codQr = matchQr ? matchQr[1] : 'BOX-' + r.id;
                        const partesCliente = r.nombre_cliente.split('|');
                        const telCliente = partesCliente[2] ? partesCliente[2].replace('Tel:', '').trim() : '';
                        return (
                          <div key={r.id} className="bg-gray-800 p-3 rounded-xl border border-red-900/60 flex flex-col justify-between gap-2">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-xs font-black text-white uppercase">{r.nombre_cliente}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${r.estado === 'entregado' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}`}>{r.estado}</span>
                              </div>
                              <p className="text-xs font-black text-red-400 uppercase mt-1">{r.box_nombre}</p>
                              <p className="text-[10px] text-gray-300 uppercase mt-1">{r.descripcion}</p>
                            </div>
                            <div className="flex gap-1 pt-2 border-t border-gray-700">
                              <button onClick={() => descargarInvitacion({ nombre: partesCliente[0].trim(), cantidad: 10, codigo: codQr, tipo_pase: 'box', box_desc: r.descripcion })} className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-[10px] font-black uppercase">⬇️ QR</button>
                              {telCliente && telCliente !== '-' && (
                                <button onClick={() => enviarQrWhatsAppCliente(telCliente, partesCliente[0].trim(), codQr, 'BOX VIP')} className="bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded text-[10px] font-black uppercase">📲 WA</button>
                              )}
                              {r.estado === 'pendiente' && <button onClick={() => entregarBox(r.id)} className="flex-1 bg-red-600 hover:bg-red-500 py-1.5 rounded text-[10px] font-black uppercase">✅ Entregar</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6"><h2 className="text-lg font-black uppercase text-white">📦 Base de Datos (Menú)</h2><div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Capital en Barra</p><p className="text-xl font-black text-green-400">${capitalEnBarra}</p></div></div>
                <form onSubmit={crearProducto} className="flex flex-col sm:flex-row gap-2 bg-gray-700/50 p-3 rounded-xl border border-gray-600"><input type="text" placeholder="Nombre" className="flex-1 bg-gray-800 p-2 rounded text-sm focus:outline-none" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required /><input type="number" placeholder="$ Precio" className="w-full sm:w-24 bg-gray-800 p-2 rounded text-sm focus:outline-none" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} required /><input type="number" placeholder="Stock" className="w-full sm:w-20 bg-gray-800 p-2 rounded text-sm focus:outline-none" value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required /><select className="w-full sm:w-28 bg-gray-800 p-2 rounded text-sm focus:outline-none" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}><option value="bebida">Bebida</option><option value="combo">Combo</option><option value="entrada">Entrada</option></select><button type="submit" disabled={!isOnline} className="bg-purple-600 px-4 py-2 rounded font-bold text-sm disabled:opacity-50">+</button></form>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">{bebidas.map(b => (<div key={b.id} className={`p-4 rounded-xl border relative ${b.stock < 10 ? 'bg-red-900/10 border-red-900' : 'bg-gray-700/30 border-gray-600'}`}><button type="button" onClick={() => eliminarProducto(b.id, b.nombre)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-lg">❌</button><p className="font-bold text-sm mb-1 pr-6">{b.nombre}</p><div className="flex justify-between items-center mb-3"><span className="text-green-400 font-black text-lg">${b.precio}</span><span className={`font-bold text-xs bg-gray-800 px-2 py-1 rounded ${b.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>Stock: {b.stock}</span></div><div className="flex space-x-2"><button type="button" onClick={async () => { const n = prompt('Nuevo precio:', b.precio); if (n) { await supabase.from('bebidas').update({precio:Number(n)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-gray-600 py-2 rounded text-xs font-bold uppercase">Cambiar $</button><button type="button" onClick={async () => { const s = prompt(`Stock exacto:`, b.stock); if (s !== null && !isNaN(s)) { await supabase.from('bebidas').update({stock:Number(s)}).eq('id',b.id); cargarDatos();} }} className="flex-1 bg-blue-600 py-2 rounded text-xs font-bold uppercase">Mod. Stock</button></div></div>))}</div>
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700"><h2 className="text-lg font-black mb-4 uppercase text-yellow-400 flex items-center">💵 Registrar Movimiento</h2><form onSubmit={registrarMovimiento} className="space-y-3"><select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}><option value="salida">🔴 Salida (Gasto)</option><option value="entrada">🟢 Ingreso Extra</option></select><input type="text" placeholder="Concepto" className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required /><div className="flex space-x-2"><input type="number" placeholder="Monto $" className="w-2/3 bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={movMonto} onChange={e => setMovMonto(e.target.value)} required /><select className="w-1/3 bg-gray-700 p-3 rounded-lg text-sm focus:outline-none" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transf</option></select></div><button type="submit" disabled={loading || !isOnline} className="w-full bg-yellow-600 text-black py-3 rounded-lg font-black uppercase disabled:opacity-50">Registrar</button></form></div>
              </div>
            </div>
          </>
        )}

        {/* HISTORIAL DE CIERRES SIEMPRE VISIBLE EN ADMIN */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mt-6">
          <h2 className="text-lg font-black uppercase text-purple-400 mb-4 flex items-center border-b border-gray-700 pb-2">📚 Historial de Cierres Z (Fiestas Anteriores)</h2>
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {historial.length === 0 ? <p className="text-gray-500 text-center py-6 font-bold uppercase text-sm">No hay cierres registrados aún.</p> : historial.map(h => (
              <div key={h.id} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 transition">
                <div className="flex justify-between items-start cursor-pointer" onClick={() => setSesionExpandida(sesionExpandida === h.id ? null : h.id)}>
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase">{h.nombre_fiesta}</h3>
                    <p className="text-xs text-gray-400 mt-1">📅 {h.fecha_cierre ? new Date(h.fecha_cierre).toLocaleDateString() : '--'} • 👤 Cerró: {h.cerrada_por}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-400">${Number(h.recaudacion_efectivo || 0) + Number(h.recaudacion_transf || 0)}</p>
                    <p className="text-[10px] text-gray-300 uppercase mt-1 bg-gray-800 px-2 py-1 rounded inline-block shadow">{sesionExpandida === h.id ? '🔼 Ocultar' : '🔽 Ver Detalles'}</p>
                  </div>
                </div>
                {sesionExpandida === h.id && (
                  <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Finanzas del Turno</h4>
                      <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div className="flex justify-between"><span>Efectivo:</span><span className="font-bold text-blue-400">${h.recaudacion_efectivo}</span></div>
                        <div className="flex justify-between"><span>Transferencias / MP:</span><span className="font-bold text-purple-400">${h.recaudacion_transf}</span></div>
                        <hr className="border-gray-600 my-1" />
                        <div className="flex justify-between"><span>Entradas Vendidas:</span><span className="font-bold text-green-400">{h.personas_vendidas || 0} pers.</span></div>
                        <div className="flex justify-between"><span>Listas Gratis RRPP:</span><span className="font-bold text-yellow-400">{h.personas_lista || 0} pers.</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">🔥 Top 5 Bebidas Vendidas</h4>
                      <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
                        {h.ranking_ventas && Object.keys(h.ranking_ventas).length > 0 ? (
                          Object.entries(h.ranking_ventas).sort(([,a], [,b]) => b - a).slice(0, 5).map(([nombre, cant]) => (
                            <div key={nombre} className="flex justify-between border-b border-gray-700 pb-1">
                              <span className="truncate pr-2 text-gray-300">{nombre}</span>
                              <span className="font-black text-yellow-400">{cant}x</span>
                            </div>
                          ))
                        ) : <span className="text-gray-500 text-xs">Sin ventas de barra.</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

    if (vista === 'puerta' || user.rol === 'puerta') {
    const listasFiltradas = listasVip.filter(l => l.nombre.toLowerCase().includes(filtroQR.toLowerCase()) || l.codigo.toLowerCase().includes(filtroQR.toLowerCase()));
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        {barraHeader}{renderModalValidacionMP()}
        {mostrarEscaner && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col"><div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700 pt-8"><h2 className="text-xl font-black text-purple-400 tracking-widest">ESCANEAR PASE VIP</h2><button onClick={() => setMostrarEscaner(false)} className="text-red-500 font-black text-lg bg-gray-800 px-4 py-2 rounded-lg">CERRAR ✖</button></div><div className="flex-1 w-full flex items-center justify-center bg-black p-4"><div className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-purple-500 shadow-[0_0_40px_rgba(147,51,234,0.4)] relative"><Scanner onScan={(r) => { if(!r) return; let txt = ''; if (Array.isArray(r)) { txt = r[0]?.rawValue || ''; } else if (r?.text) { txt = r.text; } else if (typeof r === 'string') { txt = r; } if(txt.trim()) procesarEscaneoAutomatico(txt.trim()); }} onError={(e) => console.log('Error Escaner:', e)} /><div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div></div></div><div className="p-8 bg-gray-900 text-center pb-12"><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Apunta la cámara al código</p></div></div>
        )}
        {modalQRComponent}
        {!sesionActiva ? (<div className="flex-1 flex flex-col items-center justify-center text-center mt-20"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">En Espera</h2></div>) : (
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(user.rol === 'admin' || user.rol === 'puerta') && (
              <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden h-fit"><div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-bl-full pointer-events-none"></div><h2 className="text-2xl font-black uppercase text-purple-400 mb-2 flex items-center gap-2">📱 Generador de Pases (QR)</h2>{user.rol === 'puerta' ? <p className="text-sm font-bold text-yellow-400 bg-yellow-900/30 p-2 rounded-lg mb-6 border border-yellow-800">🎟️ TU CUPO DISPONIBLE: {user.cupo_listas} Pases</p> : <p className="text-sm text-gray-400 mb-6">Genera invitaciones digitales para enviar por WhatsApp.</p>}<form onSubmit={generarQRLista} className="space-y-6 relative z-10"><div><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Categoría de la Invitación</label><div className="flex space-x-2"><button type="button" onClick={() => setTipoPaseQr('general')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoPaseQr === 'general' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>Entrada General</button><button type="button" onClick={() => setTipoPaseQr('vip')} className={`flex-1 py-3 rounded-xl font-black uppercase transition ${tipoPaseQr === 'vip' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>VIP / Accesos</button></div></div><div><label className="text-xs text-gray-400 font-bold uppercase">Nombre del Titular</label><input type="text" className="w-full bg-gray-700 p-4 rounded-xl font-black mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500" value={nombreLista} onChange={e => setNombreLista(e.target.value)} required placeholder="Ej: Juan Pérez" /></div><div><label className="text-xs text-gray-400 font-bold uppercase">Total de Personas (+Acompañantes)</label><div className="flex items-center mt-1 shadow-inner"><button type="button" onClick={() => setCantLista(Math.max(1, cantLista - 1))} className="bg-gray-600 w-1/3 py-4 rounded-l-xl font-black text-2xl active:bg-gray-500">-</button><input type="number" className="w-1/3 bg-gray-700 py-4 text-center font-black text-purple-400 text-2xl focus:outline-none" value={cantLista} readOnly /><button type="button" onClick={() => setCantLista(cantLista + 1)} className="bg-gray-600 w-1/3 py-4 rounded-r-xl font-black text-2xl active:bg-gray-500">+</button></div></div><button type="submit" disabled={loading || !isOnline} className="w-full bg-purple-600 hover:bg-purple-500 py-5 rounded-2xl font-black text-xl uppercase shadow-[0_0_20px_rgba(147,51,234,0.4)] transition active:scale-95 mt-4 disabled:opacity-50">Generar Pase ✨</button></form></div>
            )}
            <div className={`space-y-6 ${user.rol === 'puerta' ? 'lg:col-span-2 max-w-xl mx-auto w-full' : ''}`}>
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex justify-between shadow-xl"><div className="text-center"><p className="text-xs text-gray-400 font-bold uppercase">Gratis (Adentro)</p><p className="text-4xl font-black text-green-400">{personasListaIngresadas}</p></div><div className="text-center"><p className="text-xs text-gray-400 font-bold uppercase">QRs Activos</p><p className="text-4xl font-black text-yellow-400">{listasVip.filter(l => l.estado === 'pendiente').length}</p></div></div>
              <div className="flex gap-3"><div className="relative flex-1"><input type="text" placeholder="Escribe DNI o Código..." className="w-full bg-gray-800 p-4 pl-12 rounded-xl border border-gray-700 font-black text-lg focus:outline-none focus:border-purple-500 shadow-inner" value={filtroQR} onChange={e => setFiltroQR(e.target.value)} /><span className="absolute left-4 top-4 text-xl">🔍</span></div><button onClick={() => setMostrarEscaner(true)} disabled={!isOnline} className="bg-purple-600 hover:bg-purple-500 px-6 rounded-xl font-black text-3xl shadow-[0_0_15px_rgba(147,51,234,0.5)] transition active:scale-95 flex items-center justify-center disabled:opacity-50">📷</button></div>
              <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl h-[60vh] flex flex-col"><h2 className="text-xl font-black uppercase text-white mb-4 border-b border-gray-700 pb-2">📋 Listas y Accesos</h2><div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">{listasFiltradas.length === 0 ? <p className="text-center text-gray-500 py-10 font-bold uppercase">No hay pases generados.</p> : listasFiltradas.map(l => (<div key={l.id} className={`p-5 rounded-2xl border-2 transition ${l.estado === 'ingresado' ? 'bg-green-900/10 border-green-900/50 opacity-50' : 'bg-gray-800 border-gray-600 shadow-lg'}`}><div className="flex justify-between items-start"><div><p className="font-black text-lg uppercase text-white leading-tight">{l.nombre}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{l.tipo_pase} | Cód: <span className="text-yellow-400 font-bold">{l.codigo}</span></p><p className="text-sm text-blue-400 font-bold mt-2">Ingresados: {l.ingresados || 0} / {l.cantidad}</p></div>{user.rol === 'admin' && (<button onClick={() => descargarInvitacion(l)} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg shadow transition">⬇️ QR</button>)}</div>{l.estado === 'ingresado' ? (<div className="mt-3 text-center bg-green-900/40 py-2 rounded-lg"><span className="text-green-500 font-black text-sm uppercase">✅ Completado</span></div>) : (<button onClick={() => procesarEscaneoAutomatico(l.codigo)} disabled={!isOnline} className="w-full mt-3 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-black text-sm uppercase shadow-lg active:scale-95 transition disabled:opacity-50">Ingreso Parcial (+)</button>)}</div>))}</div></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (vista === 'boleteria' || user.rol === 'boleteria') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}{renderModalValidacionMP()}
        {!sesionActiva ? (<div className="flex-1 flex flex-col items-center justify-center text-center"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2></div>) : (
          <div className="max-w-md mx-auto w-full mt-4 bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl"><h2 className="text-3xl font-black uppercase text-center text-indigo-400 mb-8 tracking-widest">🎟️ TAQUILLA</h2><form onSubmit={venderEntradas} className="space-y-6"><div><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Tipo de Pulsera</label><div className="flex space-x-2"><button type="button" onClick={() => setTipoEntradaVenta('General')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${tipoEntradaVenta === 'General' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}>General</button><button type="button" onClick={() => setTipoEntradaVenta('VIP')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${tipoEntradaVenta === 'VIP' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}>Pase VIP</button></div></div><div><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Precio Unitario Oficial ($)</label><div className="w-full bg-gray-900 p-4 rounded-xl font-black text-2xl text-center text-gray-300 border border-gray-700">${precioActualTaquilla}</div></div><div><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Cantidad a Vender</label><div className="flex items-center shadow-inner rounded-xl overflow-hidden"><button type="button" onClick={() => setCantEntradas(Math.max(1, cantEntradas - 1))} className="bg-gray-600 w-1/3 py-4 font-black text-3xl active:bg-gray-500 transition">-</button><input type="number" className="w-1/3 bg-gray-700 py-4 text-center font-black text-3xl focus:outline-none" value={cantEntradas} readOnly /><button type="button" onClick={() => setCantEntradas(cantEntradas + 1)} className="bg-gray-600 w-1/3 py-4 font-black text-3xl active:bg-gray-500 transition">+</button></div></div><div className="bg-black/50 p-4 rounded-xl border border-gray-600 text-center"><span className="text-sm font-bold text-gray-400 block uppercase mb-1">Total a Cobrar</span><span className="text-5xl font-black text-green-400">${cantEntradas * precioActualTaquilla}</span></div><div><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Método de Pago</label><div className="flex space-x-2"><button type="button" onClick={() => setPagoEntrada('efectivo')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${pagoEntrada === 'efectivo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>💵 Efectivo</button><button type="button" onClick={() => setPagoEntrada('transferencia')} className={`flex-1 py-4 rounded-xl font-black uppercase transition ${pagoEntrada === 'transferencia' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>📱 Transf</button></div></div><button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-6 rounded-xl font-black text-2xl uppercase shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-95 transition">✅ COBRAR</button></form></div>
        )}
      </div>
    );
  }

  if (vista === 'proveedores') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8 flex flex-col">
        {barraHeader}
        {modalProv && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md"><h2 className="text-xl font-black uppercase text-orange-400 mb-4">Ingreso de: {modalProv.nombre}</h2><form onSubmit={guardarRegistroProv} className="space-y-4"><select className="w-full bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={tipoProvReg} onChange={e => setTipoProvReg(e.target.value)}><option value="bebida">📦 Mercadería (Suma a Stock)</option><option value="deuda">📄 Deuda Extra (Ej: Flete)</option></select>{tipoProvReg === 'bebida' ? (<><select className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none" value={provBebidaId} onChange={e => setProvBebidaId(e.target.value)} required><option value="">-- Selecciona producto que llegó --</option>{bebidas.map(b => <option key={b.id} value={b.id}>{b.nombre} (Stock: {b.stock})</option>)}</select><div className="flex gap-2"><input type="number" placeholder="Cant. traída" className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={provCant} onChange={e => setProvCant(e.target.value)} required /><input type="number" placeholder="$ Costo Unit." className="w-1/2 bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={provCosto} onChange={e => setProvCosto(e.target.value)} required /></div></>) : (<><input type="text" placeholder="Concepto deuda" className="w-full bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={provConceptoDeuda} onChange={e => setProvConceptoDeuda(e.target.value)} required /><input type="number" placeholder="Monto total $" className="w-full bg-gray-700 p-3 rounded-lg font-bold focus:outline-none" value={provCosto} onChange={e => setProvCosto(e.target.value)} required /></>)}<div className="flex space-x-2 pt-2"><button type="button" onClick={() => setModalProv(null)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold uppercase">Cancelar</button><button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-500 py-3 rounded-lg font-black uppercase shadow">Guardar</button></div></form></div></div>
        )}
        <div className="max-w-6xl mx-auto mt-6 flex-1 w-full">
          <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4"><div><h2 className="text-2xl font-black uppercase text-orange-400">🚚 Proveedores y Stock</h2><p className="text-sm text-gray-400">Al cargar mercadería acá, el stock de la barra se actualiza solo.</p></div><form onSubmit={crearProveedor} className="flex w-full md:w-auto"><input type="text" placeholder="Nombre Prov." className="w-full bg-gray-700 p-3 rounded-l-xl focus:outline-none" value={nuevoProvNombre} onChange={e => setNuevoProvNombre(e.target.value)} required /><button type="submit" className="bg-orange-600 px-6 font-bold rounded-r-xl" disabled={!isOnline}>Añadir</button></form></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {proveedores.map(p => {
              const subtotal = (p.compras || []).reduce((acc, c) => acc + ((c.cantidad||1) * c.costo), 0); const totalPagar = subtotal - (p.descuento || 0);
              return (
                <div key={p.id} className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl relative flex flex-col"><button onClick={() => eliminarProveedor(p.id, p.nombre)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition">❌</button><h3 className="text-xl font-black text-white uppercase mb-4 pr-8 border-b border-gray-700 pb-2">{p.nombre}</h3><div className="bg-gray-700/50 p-3 rounded-xl flex-1 max-h-[200px] overflow-y-auto mb-4 border border-gray-600 space-y-2 custom-scrollbar">{(!p.compras || p.compras.length === 0) ? <p className="text-gray-500 text-sm text-center mt-4 font-bold uppercase">Sin deudas.</p> : p.compras.map(c => (<div key={c.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg text-sm shadow border border-gray-700"><div className="flex-1 pr-2"><p className="font-bold text-white line-clamp-1">{c.producto}</p><p className="text-[10px] text-gray-400">{c.tipo==='bebida'?`${c.cantidad}x (Stock sumado)`:'Cargo extra'}</p></div><span className="font-black text-orange-400 text-lg">${(c.cantidad||1) * c.costo}</span></div>))}</div><div className="space-y-1 mb-3 bg-gray-900 p-4 rounded-xl border border-gray-700"><div className="flex justify-between text-xs text-gray-400 font-bold"><span>Subtotal:</span><span>${subtotal}</span></div><div className="flex justify-between text-xs text-yellow-400 font-bold"><span>Descuento:</span><span>-${p.descuento || 0}</span></div><hr className="border-gray-700 my-2"/><div className="flex justify-between text-lg font-black text-white"><span>DEUDA:</span><span className="text-orange-400">${totalPagar}</span></div></div><div className="flex space-x-2 mb-3"><button onClick={() => {setModalProv(p); setTipoProvReg('bebida');}} className="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-xl font-black text-xs uppercase shadow transition active:scale-95" disabled={!isOnline}>+ Sumar</button><button onClick={() => aplicarDescuentoProv(p.id, p.descuento)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black py-3 rounded-xl font-black text-xs uppercase shadow transition active:scale-95" disabled={!isOnline}>🎁 Desc.</button></div><button onClick={() => pagarDeudaProveedor(p, totalPagar)} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black text-sm uppercase shadow-[0_0_15px_rgba(220,38,38,0.4)] transition active:scale-95" disabled={!isOnline}>💸 Pagar con Caja</button></div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: POS BARRA 
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {barraHeader}{renderModalValidacionMP()}
      {!sesionActiva ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center"><p className="text-6xl mb-4">🔒</p><h2 className="text-2xl font-bold text-red-400">Caja Cerrada</h2></div>
      ) : (
        <div className="flex-1 p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-[1400px] mx-auto lg:h-[calc(100vh-90px)] overflow-y-auto lg:overflow-hidden">
          <div className="lg:col-span-2 space-y-3 lg:overflow-y-auto lg:pr-2 custom-scrollbar lg:h-full pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
              {bebidas.map((item) => (
                <button type="button" key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-3 lg:p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}>
                  <div><span className="text-[10px] font-black uppercase text-purple-500 block mb-1">{item.categoria}</span><p className="font-bold text-xs lg:text-sm line-clamp-2 leading-tight">{item.nombre}</p></div>
                  <div className="mt-2 flex justify-between items-end"><span className="text-base lg:text-lg font-black text-green-400">${item.precio}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock < 10 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Stk: {item.stock}</span></div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col h-[500px] lg:h-full shadow-2xl">
            <div><h2 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 border-b border-gray-700 pb-2">Ticket Actual</h2></div>
            <div className="flex-1 overflow-y-auto pr-1 my-2 space-y-2 custom-scrollbar">
              {carrito.length === 0 ? (
                <div className="text-center py-10 text-gray-600"><p className="text-4xl mb-2">🍹</p><p className="text-xs font-bold uppercase">Toque productos para agregar</p></div>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700/40 p-2 rounded-lg border border-gray-600">
                    <div className="flex-1 mr-2"><p className="font-bold text-xs line-clamp-1">{item.nombre}</p><p className="text-xs text-green-400 font-black">${item.precio * item.cantidad}</p></div>
                    <div className="flex items-center space-x-1"><button type="button" onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">-</button><span className="font-black text-sm w-4 text-center">{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-8 h-8 rounded-lg font-black text-sm active:bg-gray-500">+</button></div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-700 mt-auto">
              <div className="flex justify-between items-end mb-3"><span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span><span className="text-3xl font-black text-green-400 leading-none">${carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}</span></div>
              <div className="flex space-x-2 mb-3"><button type="button" onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>💵 Efec</button><button type="button" onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📱 Transf</button><button type="button" onClick={() => setMetodoPagoPOS('fiado')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition ${metodoPagoPOS === 'fiado' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>📝 Anotar</button></div>
              {metodoPagoPOS === 'fiado' && (<input type="text" placeholder="Nombre de quien saca anotado..." className="w-full mb-3 bg-gray-900 border border-gray-700 p-3 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-center uppercase" value={nombreFiado} onChange={e => setNombreFiado(e.target.value)} required />)}
              <button type="button" onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition active:scale-95 text-lg uppercase tracking-widest">{loading ? '...' : 'COBRAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
