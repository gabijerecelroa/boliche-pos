import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preference = new Preference(client);

  try {
    const { titulo, precio, cantidad, tipoPase, origin } = req.body;

    const response = await preference.create({
      body: {
        items: [{
          id: 'entrada_web',
          title: titulo,
          quantity: Number(cantidad),
          unit_price: Number(precio),
          currency_id: 'ARS',
        }],
        // Redirigimos de vuelta a tu página con el estado del pago
        back_urls: {
          success: `${origin}?pago=exito`,
          failure: `${origin}?pago=fallo`,
          pending: `${origin}?pago=pendiente`
        },
        auto_return: "approved"
      }
    });

    res.status(200).json({ url_pago: response.init_point });
  } catch (error) {
    console.error("Error Mercado Pago:", error);
    res.status(500).json({ error: 'Fallo al conectar con MP' });
  }
}
