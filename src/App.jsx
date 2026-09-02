import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de la Caja y Bebidas
  const [bebidas, setBebidas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [ticketActual, setTicketActual] = useState(null);

  // Cargar productos de Supabase
  const cargarProductos = async () => {
    const { data, error } = await supabase.from('bebidas').select('*').order('id');
    if (!error && data) setBebidas(data);
  };

  useEffect(() => {
    if (user) cargarProductos();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('cajeros')
      .select('*')
      .eq('usuario', username)
      .eq('password', password)
      .single();

    setLoading(false);

    if (error || !data) {
      alert('❌ Usuario o contraseña incorrectos.');
    } else {
      setUser(data);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      alert('⚠️ Sin stock disponible');
      return;
    }
    const existe = carrito.find((item) => item.id === producto.id);
    if (existe) {
      if (existe.cantidad >= producto.stock) {
        alert('⚠️ Supera el stock disponible');
        return;
      }
      setCarrito(carrito.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(carrito.map((item) => {
      if (item.id === id) {
        const nuevaCant = item.cantidad + delta;
        return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calcularTotal = () => carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    setLoading(true);

    const totalVenta = calcularTotal();

    // 1. Registrar venta
    const { data: ventaData, error: ventaErr } = await supabase.from('ventas').insert([
      { cajero: user.usuario, total: totalVenta, detalles: carrito }
    ]).select().single();

    if (ventaErr) {
      alert('Error al registrar venta');
      setLoading(false);
      return;
    }

    // 2. Descontar stock
    for (const item of carrito) {
      await supabase.from('bebidas').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
    }

    // 3. Generar Ticket de Comanda
    setTicketActual({
      id: ventaData.id,
      cajero: user.usuario,
      fecha: new Date().toLocaleTimeString(),
      items: [...carrito],
      total: totalVenta
    });

    setCarrito([]);
    await cargarProductos();
    setLoading(false);
  };

  // Vista de Ticket de Comanda para Impresión
  if (ticketActual) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="bg-white text-black p-6 rounded shadow-lg w-full max-w-xs text-center font-mono border border-gray-400">
          <h2 className="text-xl font-bold tracking-wider uppercase">BARRA CNX</h2>
          <p className="text-xs text-gray-600">Ticket de Comanda Bartender</p>
          <hr className="my-2 border-dashed border-gray-400" />
          <p className="text-left text-xs"><b>N° Ticket:</b> #{ticketActual.id}</p>
          <p className="text-left text-xs"><b>Cajero:</b> {ticketActual.cajero}</p>
          <p className="text-left text-xs mb-2"><b>Hora:</b> {ticketActual.fecha}</p>
          <hr className="my-2 border-dashed border-gray-400" />
          <div className="text-left space-y-1">
            {ticketActual.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.cantidad}x {it.nombre}</span>
                <span>${it.precio * it.cantidad}</span>
              </div>
            ))}
          </div>
          <hr className="my-2 border-dashed border-gray-400" />
          <h3 className="text-lg font-bold text-right">TOTAL: ${ticketActual.total}</h3>
          <p className="text-xs text-gray-500 mt-4">Pague en barra - CNX POS</p>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => window.print()}
            className="bg-green-600 px-6 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg"
          >
            🖨️ Imprimir Ticket
          </button>

          <button
            onClick={() => setTicketActual(null)}
            className="bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 shadow-lg"
          >
            ➡️ Nueva Venta
          </button>
        </div>
      </div>
    );
  }

  // Si no está logueado, muestra el Login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h1 className="text-3xl font-bold text-center text-white mb-8 tracking-widest">CNX POS</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-400 text-sm font-semibold mb-2 uppercase">Usuario</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none"
                placeholder="cajero1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-semibold mb-2 uppercase">Contraseña</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg"
            >
              {loading ? 'Verificando...' : 'Abrir Caja'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Interfaz de Ventas en Barra (Cajero Logueado)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Barra Superior */}
      <header className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-purple-400">CNX POS</h1>
          <p className="text-xs text-gray-400">Cajero: <span className="text-white font-bold">{user.usuario}</span></p>
        </div>
        <button
          onClick={() => setUser(null)}
          className="bg-red-600 hover:bg-red-700 text-xs px-3 py-2 rounded font-semibold transition"
        >
          Cerrar Caja
        </button>
      </header>

      {/* Contenido Principal */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full">
        {/* Lista de Bebidas y Combos */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider">Menú de Barra & Puerta</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bebidas.map((item) => (
              <button
                key={item.id}
                onClick={() => agregarAlCarrito(item)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition active:scale-95 ${
                  item.stock > 0
                    ? 'bg-gray-800 border-gray-700 hover:border-purple-500'
                    : 'bg-gray-800/40 border-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase text-purple-400 block mb-1">{item.categoria}</span>
                  <p className="font-bold text-sm line-clamp-2">{item.nombre}</p>
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <span className="text-lg font-extrabold text-green-400">${item.precio}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.stock < 10 ? 'bg-red-900/60 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                    Stock: {item.stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Resumen del Pedido / Carrito */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col justify-between h-[500px] lg:h-auto">
          <div>
            <h2 className="text-sm uppercase font-semibold text-gray-400 tracking-wider mb-3">Orden Actual</h2>
            {carrito.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">🍹</p>
                <p className="text-sm">Selecciona productos del menú</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-2.5 rounded-lg border border-gray-600">
                    <div className="flex-1 mr-2">
                      <p className="font-semibold text-xs">{item.nombre}</p>
                      <p className="text-xs text-green-400 font-bold">${item.precio * item.cantidad}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => cambiarCantidad(item.id, -1)}
                        className="bg-gray-600 hover:bg-gray-500 w-7 h-7 rounded text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm px-1">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(item.id, 1)}
                        className="bg-gray-600 hover:bg-gray-500 w-7 h-7 rounded text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pie del Carrito y Botón Cobrar */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 uppercase text-xs font-semibold">Total a Cobrar</span>
              <span className="text-2xl font-black text-green-400">${calcularTotal()}</span>
            </div>

            <button
              onClick={procesarVenta}
              disabled={carrito.length === 0 || loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200"
            >
              {loading ? 'Procesando...' : 'Cobrar e Imprimir Comanda 🖨️'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
