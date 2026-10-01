import { MercadoPagoConfig, Preference } from 'mercadopago';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preference = new Preference(client);
  try {
    const { titulo, precio, cantidad, tipoPase, origin } = req.body;
    const response = await preference.create({
      body: {
        items: [{ id: tipoPase === 'box' ? 'box_vip' : 'entrada_web', title: titulo, quantity: Number(cantidad), unit_price: Number(precio), currency_id: 'ARS' }],
        back_urls: { success: `${origin}`, failure: `${origin}`, pending: `${origin}` },
        auto_return: "approved"
      }
    });
    res.status(200).json({ url_pago: response.init_point });
  } catch (error) { res.status(500).json({ error: 'Fallo al conectar con MP' }); }
}
