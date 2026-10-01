export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&status=approved&limit=15', {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    
    const data = await response.json();
    
    if (data.results) {
      const transacciones = data.results.map(p => {
        // Escaneamos todos los cajones posibles donde MP esconde el nombre
        const n1 = p.point_of_interaction?.transaction_data?.bank_info?.payer?.account_holder_name;
        const n2 = p.payer?.first_name ? `${p.payer.first_name} ${p.payer.last_name || ''}`.trim() : null;
        const n3 = p.additional_info?.payer?.first_name ? `${p.additional_info.payer.first_name} ${p.additional_info.payer.last_name || ''}`.trim() : null;
        const n4 = p.transaction_details?.bank_transfer_payer_name;
        
        let nombreReal = n1 || n2 || n3 || n4;

        // Limpieza por si MP manda datos vacíos de relleno
        if (!nombreReal || nombreReal.toLowerCase().includes('null')) {
            nombreReal = null;
        }

        let descripcionLimpia = p.description;
        
        // Si la descripción es fea o genérica, la reemplazamos
        if (!descripcionLimpia || descripcionLimpia === 'Bank Transfer' || descripcionLimpia === 'Transferencia de cuenta de terceros' || descripcionLimpia.includes('Transferencia')) {
            if (nombreReal) {
                descripcionLimpia = `Transf. de ${nombreReal}`;
            } else if (p.payer?.email && !p.payer.email.includes('mercadopago')) {
                // PLAN B: Usar el inicio del correo si no hay nombre oficial
                const emailName = p.payer.email.split('@')[0].toUpperCase();
                descripcionLimpia = `Transf. de ${emailName}`;
            } else {
                descripcionLimpia = 'Transferencia Bancaria';
            }
        }

        return {
          id: p.id,
          monto: p.transaction_amount,
          descripcion: descripcionLimpia,
          fecha: new Date(p.date_created).toLocaleString('es-AR'),
          email: p.payer?.email || 'N/A'
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
