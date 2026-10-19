import { MercadoPagoConfig, Preference } from 'mercadopago';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preference = new Preference(client);
  try {
    const { titulo, precio, cantidad, tipoPase, origin, datosCompra } = req.body;
    const cleanOrigin = origin && origin.includes('?') ? origin : `${origin}/?tienda=true`;
    // Encriptamos los datos en Base64 dentro de external_reference (100% compatible con MP)
    const extRef = datosCompra ? Buffer.from(JSON.stringify(datosCompra)).toString('base64') : '';

    const response = await preference.create({
      body: {
        items: [{ 
          id: tipoPase === 'box' ? 'box_vip' : 'entrada_web', 
          title: titulo, 
          quantity: Number(cantidad), 
          unit_price: Number(precio), 
          currency_id: 'ARS' 
        }],
        external_reference: extRef,
        back_urls: { 
          success: cleanOrigin, 
          failure: cleanOrigin, 
          pending: cleanOrigin 
        },
        auto_return: "approved"
      }
    });
    res.status(200).json({ url_pago: response.init_point });
  } catch (error) { 
    console.error("Error Checkout MP:", error);
    res.status(500).json({ error: 'Fallo al conectar con MP' }); 
  }
}
