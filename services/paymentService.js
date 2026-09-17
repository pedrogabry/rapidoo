import { ref, update } from "firebase/database";
import { database } from "../firebaseConfig";
import { PAYMENT_CONFIG, ORDER_STATUS } from "../paymentConfig";

/**
 * Serviço responsável pela comunicação com o Mercado Pago e atualização de status no Firebase Database.
 */

// Criar pagamento Pix/Cartão via Backend ou simulação Sandbox
export async function criarPagamentoMercadoPago(pedido) {
  const backendUrl = PAYMENT_CONFIG.BACKEND_URL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${backendUrl}/api/pedidos/criar-pagamento`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pedido }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        sucesso: true,
        pagamentoId: data.paymentId || data.id,
        qrCode: data.qrCode || data.qr_code,
        qrCodeBase64: data.qrCodeBase64 || data.qr_code_base64,
        ticketUrl: data.ticketUrl || data.ticket_url,
      };
    }
  } catch (error) {
    console.warn("Backend do Mercado Pago indisponível/timeout. Utilizando modo Sandbox/Offline de fallback.");
  }

  // Fallback / Modo Sandbox quando o backend local não estiver rodando
  const mockPaymentId = `MP-SANDBOX-${Date.now()}`;
  const mockPixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${pedido.pedidoId || "efood-key"}5204000053039865405${(pedido.total || 0).toFixed(2)}5802BR5915EFOOD_RESTAURANT6009SAO_PAULO62070503***63041D2B`;

  return {
    sucesso: true,
    isSandboxFallback: true,
    pagamentoId: mockPaymentId,
    qrCode: mockPixCopiaECola,
    qrCodeBase64: null,
    ticketUrl: "https://www.mercadopago.com.br",
  };
}

// Atualizar status do pedido no Firebase Realtime Database
export async function atualizarStatusPedido(pedidoId, novoStatus, usuarioId = null) {
  if (!pedidoId) {
    throw new Error("ID do pedido não fornecido para atualização de status.");
  }

  try {
    const updates = {};
    updates[`pedidos/${pedidoId}/status`] = novoStatus;
    updates[`pedidos/${pedidoId}/atualizadoEm`] = new Date().toISOString();

    if (usuarioId && usuarioId !== "anonimo") {
      updates[`usuarios/${usuarioId}/pedidos/${pedidoId}/status`] = novoStatus;
      updates[`usuarios/${usuarioId}/pedidos/${pedidoId}/atualizadoEm`] = new Date().toISOString();
    }

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do pedido no Firebase:", error);
    throw new Error("Não foi possível atualizar o status do pedido no banco de dados.");
  }
}

// Simular confirmação de pagamento para testes
export async function simularAprovacaoPagamento(pedidoId, usuarioId) {
  return await atualizarStatusPedido(pedidoId, ORDER_STATUS.PAGAMENTO_APROVADO, usuarioId);
}

// Simular recusa de pagamento para testes
export async function simularRecusaPagamento(pedidoId, usuarioId) {
  return await atualizarStatusPedido(pedidoId, ORDER_STATUS.PAGAMENTO_RECUSADO, usuarioId);
}
