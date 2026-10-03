import { auth } from "../firebaseConfig";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function createAsaasPayment(orderId) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Entre na sua conta para iniciar o pagamento.");
  }
  if (!API_BASE_URL) {
    throw new Error("A URL da API de pagamentos não foi configurada.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(
    `${API_BASE_URL.replace(/\/+$/, "")}/api/payments/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderId }),
    }
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Não foi possível iniciar o pagamento.");
  }

  return result;
}