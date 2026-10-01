export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&status=approved&limit=15', {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    
    const data = await response.json();
    
    if (data.results) {
      const transacciones = data.results.map(p => {
        let descripcionLimpia = p.description;
        
        // Si es una transferencia manual o genérica, la emprolijamos limpiamente
        if (!descripcionLimpia || descripcionLimpia === 'Bank Transfer' || descripcionLimpia === 'Transferencia de cuenta de terceros' || descripcionLimpia.includes('Transferencia') || descripcionLimpia.toLowerCase().includes('gunsandlazaro')) {
            descripcionLimpia = 'Transferencia Alias / CVU';
        }

        return {
          id: p.id,
          monto: p.transaction_amount,
          descripcion: descripcionLimpia,
          fecha: new Date(p.date_created).toLocaleString('es-AR'),
          email: '' // Sin correos molestos de relleno
        };
      });
      res.status(200).json(transacciones);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error("Error MP:", error);
    res.status(500).json({ error: 'Fallo al conectar' });
  }
}
