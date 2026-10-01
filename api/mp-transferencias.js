export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&status=approved&limit=15', {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    
    const data = await response.json();
    
    if (data.results) {
      const transacciones = data.results.map(p => {
        // Buscamos el nombre real escondido en los datos del banco (CVU/CBU) o en su perfil de MP
        const nombreCVU = p.point_of_interaction?.transaction_data?.bank_info?.payer?.account_holder_name;
        const nombreMP = p.payer?.first_name ? `${p.payer.first_name} ${p.payer.last_name || ''}`.trim() : null;
        const nombreReal = nombreCVU || nombreMP;

        // Limpiamos el texto feo de "Bank Transfer"
        let descripcionLimpia = p.description;
        if (descripcionLimpia === 'Bank Transfer' || descripcionLimpia === 'Transferencia de cuenta de terceros' || !descripcionLimpia) {
            descripcionLimpia = nombreReal ? `Transf. de ${nombreReal}` : 'Transferencia Bancaria';
        }

        return {
          id: p.id,
          monto: p.transaction_amount,
          descripcion: descripcionLimpia,
          fecha: new Date(p.date_created).toLocaleString('es-AR'),
          email: p.payer?.email || 'App Mercado Pago'
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
