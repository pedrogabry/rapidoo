const { getFirebaseAdmin } = require("../../server/firebaseAdmin");

const ASAAS_CHECKOUT_URL = "https://api-sandbox.asaas.com/v3/checkouts";
const ALLOWED_BILLING_TYPES = ["PIX", "CREDIT_CARD"];
const CHECKOUT_ITEM_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzF4AAAAASUVORK5CYII=";

function sendJson(res, status, body) {
  return res.status(status).json(body);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;

  const allowedOrigins = (process.env.PAYMENT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowedOrigins.includes(origin)) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return true;
}

function parseBody(body) {
  if (body && typeof body === "object") return body;
  if (typeof body !== "string") return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function isPaid(order) {
  const paymentStatus = String(order.pagamento?.status || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();
  return ["pago", "paid", "received", "received_in_cash"].includes(paymentStatus) ||
    ["pagamento_aprovado", "pago", "paid"].includes(orderStatus);
}

function isPayable(order) {
  return ["pendente_pagamento", "aguardando_pagamento"].includes(order.status);
}

function validateOrder(order) {
  const total = Number(order.total);
  if (!Number.isFinite(total) || total <= 0 || Math.round(total * 100) !== total * 100) {
    return { error: "invalid_value" };
  }

  if (
    !Array.isArray(order.itens) ||
    order.itens.length === 0 ||
    order.itens.some(
      (item) =>
        !item ||
        typeof item.nome !== "string" ||
        !item.nome.trim() ||
        !Number.isInteger(Number(item.quantidade)) ||
        Number(item.quantidade) < 1
    )
  ) {
    return { error: "invalid_items" };
  }

  return { total };
}

async function updateCreatingPayment(paymentRef, changes) {
  return paymentRef.transaction((current) => {
    if (!current || current.status !== "criando") return;
    return {
      ...current,
      ...changes,
      atualizadoEm: new Date().toISOString(),
    };
  });
}

module.exports = async function createPayment(req, res) {
  if (!applyCors(req, res)) {
    return sendJson(res, 403, { message: "Origem não autorizada." });
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { message: "Método não permitido." });
  }

  const authorization = req.headers.authorization || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return sendJson(res, 401, { message: "Faça login para continuar." });
  }

  const body = parseBody(req.body);
  const orderId = body?.orderId;
  if (
    typeof orderId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)
  ) {
    return sendJson(res, 400, { message: "Pedido inválido." });
  }

  const asaasApiKey = process.env.ASAAS_API_KEY;
  if (!asaasApiKey) {
    return sendJson(res, 503, { message: "Serviço de pagamento indisponível." });
  }

  try {
    const { auth, database } = getFirebaseAdmin();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(tokenMatch[1], true);
    } catch {
      return sendJson(res, 401, { message: "Sessão inválida. Entre novamente." });
    }

    const orderRef = database.ref(`pedidos/${orderId}`);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists()) {
      return sendJson(res, 404, { message: "Pedido não encontrado." });
    }

    const order = orderSnapshot.val();
    if (order.userId !== decodedToken.uid) {
      return sendJson(res, 403, { message: "Você não pode pagar este pedido." });
    }
    if (isPaid(order)) {
      return sendJson(res, 409, { message: "Este pedido já está pago." });
    }
    if (!isPayable(order)) {
      return sendJson(res, 409, { message: "Este pedido não pode mais ser pago." });
    }

    const validation = validateOrder(order);
    if (validation.error === "invalid_value") {
      return sendJson(res, 422, { message: "O valor armazenado para este pedido é inválido." });
    }
    if (validation.error) {
      return sendJson(res, 422, { message: "Os itens deste pedido são inválidos." });
    }

    const existingPayment = order.pagamento;
    if (existingPayment?.status === "pendente" && existingPayment.checkoutUrl) {
      return sendJson(res, 200, {
        orderId,
        checkoutId: existingPayment.checkoutId,
        checkoutUrl: existingPayment.checkoutUrl,
        billingTypes: existingPayment.billingTypes || ALLOWED_BILLING_TYPES,
        reused: true,
      });
    }
    if (existingPayment && existingPayment.status !== "falhou") {
      return sendJson(res, 409, {
        message: "Já existe uma tentativa de pagamento em processamento para este pedido.",
      });
    }

    const createdAt = new Date().toISOString();
    const reservation = await orderRef.transaction((currentOrder) => {
      if (
        !currentOrder ||
        currentOrder.userId !== decodedToken.uid ||
        !isPayable(currentOrder) ||
        isPaid(currentOrder) ||
        (currentOrder.pagamento && currentOrder.pagamento.status !== "falhou")
      ) {
        return;
      }

      return {
        ...currentOrder,
        pagamento: {
          provider: "asaas",
          status: "criando",
          billingTypes: ALLOWED_BILLING_TYPES,
          externalReference: orderId,
          criadoEm: createdAt,
          atualizadoEm: createdAt,
        },
      };
    });

    if (!reservation.committed) {
      const latestOrder = reservation.snapshot.val();
      const latestPayment = latestOrder?.pagamento;
      if (latestPayment?.status === "pendente" && latestPayment.checkoutUrl) {
        return sendJson(res, 200, {
          orderId,
          checkoutId: latestPayment.checkoutId,
          checkoutUrl: latestPayment.checkoutUrl,
          billingTypes: latestPayment.billingTypes || ALLOWED_BILLING_TYPES,
          reused: true,
        });
      }
      if (latestOrder && isPaid(latestOrder)) {
        return sendJson(res, 409, { message: "Este pedido já está pago." });
      }
      return sendJson(res, 409, {
        message: "Já existe uma tentativa de pagamento em processamento para este pedido.",
      });
    }

    const lockedOrder = reservation.snapshot.val();
    const lockedValidation = validateOrder(lockedOrder);
    if (lockedValidation.error) {
      await updateCreatingPayment(orderRef.child("pagamento"), {
        status: "falhou",
        codigoErro: lockedValidation.error,
      });
      return sendJson(res, 422, {
        message: lockedValidation.error === "invalid_value"
          ? "O valor armazenado para este pedido é inválido."
          : "Os itens deste pedido são inválidos.",
      });
    }

    const itemDescription = lockedOrder.itens
      .map((item) => `${item.nome} x${Number(item.quantidade)}`)
      .join(", ")
      .slice(0, 150);
    const returnBase = `rapidoo://checkout?orderId=${encodeURIComponent(orderId)}`;

    let asaasResponse;
    let checkout;
    try {
      asaasResponse = await fetch(ASAAS_CHECKOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasApiKey,
        },
        body: JSON.stringify({
          billingTypes: ALLOWED_BILLING_TYPES,
          chargeTypes: ["DETACHED"],
          minutesToExpire: 60,
          externalReference: orderId,
          callback: {
            successUrl: `${returnBase}&result=success`,
            cancelUrl: `${returnBase}&result=cancel`,
          },
          items: [
            {
              name: "Pedido Rapidoo",
              description: itemDescription,
              imageBase64: CHECKOUT_ITEM_IMAGE_BASE64,
              quantity: 1,
              value: lockedValidation.total,
            },
          ],
          customerData: decodedToken.email
            ? { email: decodedToken.email }
            : undefined,
        }),
        signal: AbortSignal.timeout(20000),
      });
      checkout = await asaasResponse.json().catch(() => null);
    } catch (error) {
      await updateCreatingPayment(orderRef.child("pagamento"), {
        status: "resultado_indeterminado",
        codigoErro: "ASAAS_UNREACHABLE",
      }).catch(() => {});
      console.error("Asaas checkout request failed", error.name || "NetworkError");
      return sendJson(res, 503, { message: "Não foi possível confirmar a criação do checkout. Tente novamente mais tarde." });
    }

    if (!asaasResponse.ok) {
      console.error("Asaas checkout rejected", asaasResponse.status);
      const isDefinitiveRejection = asaasResponse.status >= 400 && asaasResponse.status < 500;
      await updateCreatingPayment(orderRef.child("pagamento"), {
        status: isDefinitiveRejection ? "falhou" : "resultado_indeterminado",
        codigoErro: isDefinitiveRejection ? "ASAAS_REJECTED" : "ASAAS_UNAVAILABLE",
      }).catch(() => {});
      return sendJson(res, 502, { message: "O Asaas não conseguiu iniciar o checkout." });
    }

    if (!checkout?.id || !checkout?.link) {
      await updateCreatingPayment(orderRef.child("pagamento"), {
        status: "resultado_indeterminado",
        codigoErro: "ASAAS_INVALID_RESPONSE",
      }).catch(() => {});
      console.error("Asaas checkout response was incomplete");
      return sendJson(res, 502, { message: "Não foi possível confirmar a criação do checkout." });
    }

    const savedPayment = await orderRef.child("pagamento").transaction((current) => {
      if (!current || current.status !== "criando") return;
      return {
        ...current,
        status: "pendente",
        checkoutId: checkout.id,
        checkoutUrl: checkout.link,
        atualizadoEm: new Date().toISOString(),
      };
    });

    if (!savedPayment.committed) {
      console.error("Asaas checkout created but could not be linked to order");
      return sendJson(res, 503, { message: "Checkout criado, mas não foi possível salvar o vínculo com o pedido." });
    }

    return sendJson(res, 201, {
      orderId,
      checkoutId: checkout.id,
      checkoutUrl: checkout.link,
      billingTypes: ALLOWED_BILLING_TYPES,
      reused: false,
    });
  } catch (error) {
    console.error("Payment endpoint failed", error.code || error.name || "UnknownError");
    return sendJson(res, 503, { message: "Serviço de pagamento indisponível." });
  }
};