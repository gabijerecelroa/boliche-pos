export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    // Le pedimos a MP los últimos 15 pagos aprobados, ordenados del más nuevo al más viejo
    const response = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&status=approved&limit=15', {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });
    
    const data = await response.json();
    
    if (data.results) {
      const transacciones = data.results.map(p => ({
        id: p.id,
        monto: p.transaction_amount,
        descripcion: p.description,
        // Convertimos la hora de MP a nuestra hora local
        fecha: new Date(p.date_created).toLocaleString('es-AR'),
        email: p.payer?.email || 'Usuario de MP'
      }));
      res.status(200).json(transacciones);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error("Error Mercado Pago:", error);
    res.status(500).json({ error: 'Fallo al conectar con MP' });
  }
}
