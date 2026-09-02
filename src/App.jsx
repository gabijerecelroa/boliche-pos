import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [vistaCierre, setVistaCierre] = useState(false);

  // Estados de Caja
  const [bebidas, setBebidas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState('efectivo');

  // Estados del Dashboard y Cierre
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransf, setTotalTransf] = useState(0);
  const [nombreFiesta, setNombreFiesta] = useState('NOCHE DE OLIMPUS');
  const [ticketCierre, setTicketCierre] = useState(null);

  // Formulario de Movimientos (Gastos/Ingresos)
  const [movTipo, setMovTipo] = useState('salida');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMetodo, setMovMetodo] = useState('efectivo');

  // Formulario nuevo producto
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevaCat, setNuevaCat] = useState('bebida');

  const cargarDatos = async () => {
    const { data: prods } = await supabase.from('bebidas').select('*').order('id');
    if (prods) setBebidas(prods);

    if (user?.rol === 'admin') {
      let efec = 0;
      let transf = 0;

      const { data: ventas } = await supabase.from('ventas').select('total, metodo_pago');
      if (ventas) {
        ventas.forEach(v => {
          if (v.metodo_pago === 'transferencia') transf += Number(v.total);
          else efec += Number(v.total);
        });
      }

      const { data: movs } = await supabase.from('movimientos').select('tipo, monto, metodo_pago');
      if (movs) {
        movs.forEach(m => {
          const monto = Number(m.monto);
          if (m.tipo === 'entrada') {
            if (m.metodo_pago === 'transferencia') transf += monto; else efec += monto;
          } else {
            if (m.metodo_pago === 'transferencia') transf -= monto; else efec -= monto;
          }
        });
      }
      setTotalEfectivo(efec);
      setTotalTransf(transf);
    }
  };

  useEffect(() => {
    if (user) cargarDatos();
  }, [user, vistaAdmin, vistaCierre]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('cajeros').select('*').eq('usuario', username).eq('password', password).single();
    setLoading(false);
    if (error || !data) alert('❌ Usuario o contraseña incorrectos.');
    else { setUser(data); if (data.rol === 'admin') setVistaAdmin(true); }
  };

  const editarPrecio = async (id, nombre, precioActual) => {
    const nuevo = prompt(`Nuevo precio para ${nombre}:`, precioActual);
    if (nuevo && !isNaN(nuevo)) { await supabase.from('bebidas').update({ precio: Number(nuevo) }).eq('id', id); cargarDatos(); }
  };

  const agregarStock = async (id, nombre, stockActual) => {
    const sumar = prompt(`¿Cuánto stock vas a sumar a ${nombre}? (Actual: ${stockActual}):`, "10");
    if (sumar && !isNaN(sumar)) { await supabase.from('bebidas').update({ stock: stockActual + Number(sumar) }).eq('id', id); cargarDatos(); }
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('bebidas').insert([{ nombre: nuevoNombre, precio: Number(nuevoPrecio), stock: Number(nuevoStock), categoria: nuevaCat }]);
    setNuevoNombre(''); setNuevoPrecio(''); setNuevoStock(''); cargarDatos(); setLoading(false); alert('✅ Producto agregado');
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();
    if (!movConcepto || !movMonto) return;
    setLoading(true);
    await supabase.from('movimientos').insert([{ cajero: user.usuario, tipo: movTipo, concepto: movConcepto, monto: Number(movMonto), metodo_pago: movMetodo }]);
    setMovConcepto(''); setMovMonto(''); cargarDatos(); setLoading(false); alert('✅ Movimiento registrado');
  };

  const procesarCierreCaja = async () => {
    if (!confirm('⚠️ ¿Estás seguro de realizar el Cierre de Caja definitivo de la noche?')) return;
    
    const fechaActual = new Date().toLocaleDateString();
    const horaCierre = new Date().toLocaleTimeString();
    const totalNeto = totalEfectivo + totalTransf;

    const resumenCierre = {
      fiesta: nombreFiesta,
      fecha: fechaActual,
      hora: horaCierre,
      responsable: user.usuario,
      efectivo: totalEfectivo,
      transferencia: totalTransf,
      total_general: totalNeto
    };

    setTicketCierre(resumenCierre);
    setVistaCierre(false);
  };

  // ----- FUNCIONES CAJA -----
  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return alert('⚠️ Sin stock');
    const existe = carrito.find((item) => item.id === producto.id);
    if (existe && existe.cantidad >= producto.stock) return alert('⚠️ Supera el stock');
    if (existe) setCarrito(carrito.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    else setCarrito([...carrito, { ...producto, cantidad: 1 }]);
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(carrito.map((item) => {
      if (item.id === id) { const nuevaCant = item.cantidad + delta; return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null; }
      return item;
    }).filter(Boolean));
  };

  const calcularTotal = () => carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    setLoading(true);
    const totalVenta = calcularTotal();
    const { data: ventaData, error } = await supabase.from('ventas').insert([{ cajero: user.usuario, total: totalVenta, detalles: carrito, metodo_pago: metodoPagoPOS }]).select().single();
    
    if (!error) {
      for (const item of carrito) await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
      setTicketActual({ id: ventaData.id, cajero: user.usuario, fecha: new Date().toLocaleTimeString(), items: [...carrito], total: totalVenta, metodo_pago: metodoPagoPOS });
      setCarrito([]); cargarDatos();
    }
    setLoading(false);
  };

  // ----- RENDERIZADO DE TICKETS Y PANTALLAS -----

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h1 className="text-3xl font-bold text-center text-white mb-8 tracking-widest">CNX POS</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg">Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  // TICKET DE CIERRE DE CAJA
  if (ticketCierre) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="bg-white text-black p-6 rounded w-full max-w-sm text-center font-mono border border-gray-400">
          <h2 className="text-xl font-black uppercase text-red-600">CIERRE DE CAJA</h2>
          <p className="text-sm font-bold">{ticketCierre.fiesta}</p>
          <hr className="my-2 border-dashed border-gray-400" />
          <div className="text-left text-xs space-y-1 mb-2">
            <p><b>Fecha:</b> {ticketCierre.fecha}</p>
            <p><b>Hora de Cierre:</b> {ticketCierre.hora}</p>
            <p><b>Responsable:</b> {ticketCierre.responsable}</p>
          </div>
          <hr className="my-2 border-dashed border-gray-400" />
          <div className="text-left text-sm space-y-2">
            <div className="flex justify-between"><span>Efectivo (Cajón):</span><span className="font-bold">${ticketCierre.efectivo}</span></div>
            <div className="flex justify-between"><span>Transferencias/MP:</span><span className="font-bold">${ticketCierre.transferencia}</span></div>
          </div>
          <hr className="my-2 border-dashed border-gray-400" />
          <h3 className="text-xl font-black text-right text-green-700">NETO: ${ticketCierre.total_general}</h3>
          <p className="text-[10px] text-gray-500 mt-4 uppercase">Control Financiero - CNX Eventos</p>
        </div>
        <div className="mt-6 flex space-x-4">
          <button onClick={() => window.print()} className="bg-green-600 px-6 py-3 rounded-lg font-bold">🖨️ Imprimir Cierre</button>
          <button onClick={() => setTicketCierre(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-bold">➡️ Finalizar</button>
        </div>
      </div>
    );
  }

  // TICKET DE COMANDA DE BARRA
  if (ticketActual) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="bg-white text-black p-6 rounded w-full max-w-xs text-center font-mono">
          <h2 className="text-xl font-bold uppercase">BARRA CNX</h2>
          <hr className="my-2 border-dashed border-gray-400" />
          <div className="text-left text-xs mb-2"><p><b>Ticket:</b> #{ticketActual.id}</p><p><b>Cajero:</b> {ticketActual.cajero}</p><p><b>Hora:</b> {ticketActual.fecha}</p></div>
          <hr className="my-2 border-dashed border-gray-400" />
          <div className="text-left space-y-1">
            {ticketActual.items.map((it) => (<div key={it.id} className="flex justify-between text-sm"><span>{it.cantidad}x {it.nombre}</span><span>${it.precio * it.cantidad}</span></div>))}
          </div>
          <hr className="my-2 border-dashed border-gray-400" />
          <h3 className="text-lg font-bold text-right">TOTAL: ${ticketActual.total}</h3>
          <p className="text-xs text-center mt-2 uppercase font-bold text-gray-700 bg-gray-200 py-1 rounded">PAGO: {ticketActual.metodo_pago}</p>
        </div>
        <div className="mt-6 flex space-x-4">
          <button onClick={() => window.print()} className="bg-green-600 px-6 py-3 rounded-lg font-bold">🖨️ Imprimir</button>
          <button onClick={() => setTicketActual(null)} className="bg-purple-600 px-6 py-3 rounded-lg font-bold">➡️ Continuar</button>
        </div>
      </div>
    );
  }

  // PANTALLA DE CIERRE DE CAJA (MODAL ADMIN)
  if (vistaCierre) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md">
          <h2 className="text-xl font-black text-red-400 mb-4 uppercase">Configurar Cierre de Caja</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Nombre del Evento / Fiesta</label>
              <input type="text" className="w-full bg-gray-700 p-3 rounded font-bold text-white focus:outline-none" value={nombreFiesta} onChange={e => setNombreFiesta(e.target.value)} />
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg space-y-2 border border-gray-600 text-sm">
              <div className="flex justify-between"><span>Efectivo en Cajón:</span><span className="font-bold text-green-400">${totalEfectivo}</span></div>
              <div className="flex justify-between"><span>Transferencias:</span><span className="font-bold text-blue-400">${totalTransf}</span></div>
              <hr className="border-gray-600" />
              <div className="flex justify-between text-base"><span>Total Recaudado:</span><span className="font-black text-green-400">${totalEfectivo + totalTransf}</span></div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => setVistaCierre(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold">Cancelar</button>
            <button onClick={procesarCierreCaja} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold">Confirmar Cierre 🔒</button>
          </div>
        </div>
      </div>
    );
  }

  if (vistaAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
        <header className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div><h1 className="text-xl lg:text-2xl font-black text-purple-400 tracking-widest">PANEL ADMIN CNX</h1></div>
          <div className="flex space-x-2">
            <button onClick={() => setVistaCierre(true)} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-bold text-xs">🔒 Cierre de Caja</button>
            <button onClick={() => setVistaAdmin(false)} className="bg-blue-600 px-3 py-2 rounded-lg font-bold text-xs">➡️ Caja</button>
            <button onClick={() => setUser(null)} className="bg-red-900 px-3 py-2 rounded-lg font-bold text-xs">Salir</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-900/40 p-6 rounded-xl border border-green-800 text-center flex flex-col justify-center">
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total General (Efectivo + Transf)</h2>
            <p className="text-4xl font-black text-green-400">${totalEfectivo + totalTransf}</p>
          </div>
          <div className="bg-blue-900/40 p-6 rounded-xl border border-blue-800 text-center flex flex-col justify-center">
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Caja FÍSICA (Efectivo)</h2>
            <p className="text-3xl font-bold text-blue-400">${totalEfectivo}</p>
          </div>
          <div className="bg-purple-900/40 p-6 rounded-xl border border-purple-800 text-center flex flex-col justify-center">
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Banco / MP (Transferencias)</h2>
            <p className="text-3xl font-bold text-purple-400">${totalTransf}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 lg:col-span-1">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wider text-yellow-400">💵 Registrar Movimiento</h2>
            <form onSubmit={registrarMovimiento} className="space-y-3">
              <select className="w-full bg-gray-700 p-2 rounded focus:outline-none" value={movTipo} onChange={e => setMovTipo(e.target.value)}>
                <option value="salida">🔴 Salida / Retiro (Gastos)</option>
                <option value="entrada">🟢 Entrada (Ingreso Extra)</option>
              </select>
              <input type="text" placeholder="Concepto (ej. Hielo, Pago Staff)" className="w-full bg-gray-700 p-2 rounded focus:outline-none" value={movConcepto} onChange={e => setMovConcepto(e.target.value)} required />
              <input type="number" placeholder="Monto $" className="w-full bg-gray-700 p-2 rounded focus:outline-none" value={movMonto} onChange={e => setMovMonto(e.target.value)} required />
              <select className="w-full bg-gray-700 p-2 rounded focus:outline-none" value={movMetodo} onChange={e => setMovMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
              <button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-2 rounded-lg font-bold">Registrar</button>
            </form>
            
            <hr className="my-6 border-gray-700" />
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">➕ Agregar al Menú</h2>
            <form onSubmit={crearProducto} className="space-y-3">
              <input type="text" placeholder="Nombre" className="w-full bg-gray-700 p-2 rounded" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required />
              <div className="flex space-x-2">
                <input type="number" placeholder="Precio $" className="w-1/2 bg-gray-700 p-2 rounded" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} required />
                <input type="number" placeholder="Stock" className="w-1/2 bg-gray-700 p-2 rounded" value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required />
              </div>
              <select className="w-full bg-gray-700 p-2 rounded" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}>
                <option value="bebida">Bebida</option><option value="combo">Combo</option><option value="entrada">Entrada</option>
              </select>
              <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded-lg font-bold">Agregar Producto</button>
            </form>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 lg:col-span-2">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">Gestión de Precios y Stock</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2">
              {bebidas.map(b => (
                <div key={b.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <p className="font-bold mb-2">{b.nombre}</p>
                  <div className="flex justify-between items-center mb-3 text-sm">
                    <span className="text-green-400 font-bold">${b.precio}</span>
                    <span className="text-gray-300">Stock: {b.stock}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => editarPrecio(b.id, b.nombre, b.precio)} className="flex-1 bg-gray-600 py-1.5 rounded text-xs font-bold">Cambiar $</button>
                    <button onClick={() => agregarStock(b.id, b.nombre, b.stock)} className="flex-1 bg-blue-600 py-1.5 rounded text-xs font-bold">+ Stock</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista Caja (POS)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-purple-400">CNX POS</h1>
          <p className="text-xs text-gray-400">Cajero: <span className="text-white font-bold">{user.usuario}</span></p>
        </div>
        <div className="flex space-x-2">
          {user.rol === 'admin' && (<button onClick={() => setVistaAdmin(true)} className="bg-blue-600 text-xs px-3 py-2 rounded font-semibold">⚙️ Panel</button>)}
          <button onClick={() => setUser(null)} className="bg-red-600 text-xs px-3 py-2 rounded font-semibold">Cerrar Sesión</button>
        </div>
      </header>
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider">Menú de Barra & Puerta</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bebidas.map((item) => (
              <button key={item.id} onClick={() => agregarAlCarrito(item)} className={`p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${item.stock > 0 ? 'bg-gray-800 border-gray-700 hover:border-purple-500' : 'bg-gray-800/40 border-gray-800 opacity-50'}`}>
                <div><span className="text-xs font-bold uppercase text-purple-400 block mb-1">{item.categoria}</span><p className="font-bold text-sm line-clamp-2">{item.nombre}</p></div>
                <div className="mt-3 flex justify-between items-end"><span className="text-lg font-extrabold text-green-400">${item.precio}</span><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">Stock: {item.stock}</span></div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between h-[550px] lg:h-auto">
          <div>
            <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider mb-3">Orden Actual</h2>
            {carrito.length === 0 ? (
              <div className="text-center py-12 text-gray-500"><p className="text-4xl mb-2">🍹</p><p className="text-sm">Selecciona productos</p></div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-2.5 rounded-lg border border-gray-600">
                    <div className="flex-1 mr-2"><p className="font-semibold text-xs">{item.nombre}</p><p className="text-xs text-green-400 font-bold">${item.precio * item.cantidad}</p></div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => cambiarCantidad(item.id, -1)} className="bg-gray-600 w-7 h-7 rounded text-sm font-bold">-</button>
                      <span className="font-bold text-sm px-1">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.id, 1)} className="bg-gray-600 w-7 h-7 rounded text-sm font-bold">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex justify-between items-center mb-3"><span className="text-gray-400 uppercase text-xs font-semibold">Total</span><span className="text-2xl font-black text-green-400">${calcularTotal()}</span></div>
            
            <div className="flex space-x-2 mb-3">
              <button onClick={() => setMetodoPagoPOS('efectivo')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${metodoPagoPOS === 'efectivo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>💵 Efectivo</button>
              <button onClick={() => setMetodoPagoPOS('transferencia')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${metodoPagoPOS === 'transferencia' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>📱 Transferencia</button>
            </div>

            <button onClick={procesarVenta} disabled={carrito.length === 0 || loading} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200">{loading ? 'Procesando...' : 'Cobrar e Imprimir 🖨️'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
