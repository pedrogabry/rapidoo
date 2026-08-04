const MERCADOPAGO_ACCESS_TOKEN = "APP_USR-7998377317340823-072414-54702968b92112a1957ba9125e6f8bb0-564275116";
const MERCADOPAGO_PUBLIC_KEY = "APP_USR-7fc1aba0-ba1e-4123-b747-7c4003502f43";
const MERCADOPAGO_API_URL = "https://api.mercadopago.com";
const VERCEL_WEBHOOK_URL = "https://rapidoo-vecel-git-main-pedrogabrieloliveiramarques-projects.vercel.app/api/mercadopago-webhook";

export async function createMercadoPagoPreference({ items, externalReference, payerEmail }) {
  if (!MERCADOPAGO_ACCESS_TOKEN || MERCADOPAGO_ACCESS_TOKEN.startsWith("SEU")) {
    throw new Error("Configure o access token do Mercado Pago em services/mercadoPago.js.");
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        title: item.title,
        description: item.description || "Pedido Rapidoo",
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        currency_id: "BRL",
      })),
      payer: {
        email: payerEmail || "cliente@exemplo.com",
      },
      external_reference: String(externalReference || "pedido-rapidoo"),
      auto_return: "approved",
      back_urls: {
        success: "rapidoo://home",
        failure: "rapidoo://home",
        pending: "rapidoo://home",
      },
      notification_url: VERCEL_WEBHOOK_URL,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível criar o checkout do Mercado Pago.");
  }

  return data.init_point || data.sandbox_init_point || data.url;
}
