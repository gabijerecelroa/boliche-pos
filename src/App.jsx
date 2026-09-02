import { useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Consultamos a Supabase si el usuario y la clave coinciden
    const { data, error } = await supabase
      .from('cajeros')
      .select('*')
      .eq('usuario', username)
      .eq('password', password)
      .single();

    setLoading(false);

    if (error || !data) {
      alert('❌ Error: Usuario o contraseña incorrectos.');
    } else {
      alert('✅ ¡Bienvenido! Ingresando a la caja como: ' + data.usuario);
      // Aquí más adelante lo mandaremos a la pantalla de ventas
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-white mb-8 tracking-widest">CNX POS</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">Usuario</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors"
              placeholder="cajero1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-lg shadow-purple-500/30"
          >
            {loading ? 'Verificando...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
