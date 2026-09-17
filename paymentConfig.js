// Configuração Centralizada de Pagamento, Mercado Pago, Firebase e Ambiente para o aplicativo efood

export const PAYMENT_CONFIG = {
  // Public Key do Mercado Pago (Segura para o Frontend Mobile)
  MERCADO_PAGO_PUBLIC_KEY: "APP_USR-da97463f-xxxx-xxxx-xxxx-xxxxxxxxxxxx",

  // URL da API / Backend que executa chamadas com o Access Token Secreto
  BACKEND_URL: "http://localhost:8000", // Altere para a URL de produção (ex: "https://api.seudominio.com")

  // URL do Webhook cadastrada no Mercado Pago
  WEBHOOK_URL: "https://api.seudominio.com/api/pedidos/webhook/mercadopago/",

  // Ambiente de Testes ou Produção
  IS_SANDBOX: true,
  ENVIRONMENT: "sandbox", // 'sandbox' | 'production'

  // Configurações do Firebase Realtime Database
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCn6xyxuUiiIr_NyhE9aZ9hRMC-MAeYYq4",
    authDomain: "rapidoo-802c5.firebaseapp.com",
    databaseURL: "https://rapidoo-802c5-default-rtdb.firebaseio.com",
    projectId: "rapidoo-802c5",
    storageBucket: "rapidoo-802c5.firebasestorage.app",
    messagingSenderId: "689207452460",
    appId: "1:689207452460:web:19996b463d0961fcf5c289",
  },
};

// Enum de Status do Pedido no efood
export const ORDER_STATUS = {
  AGUARDANDO_PAGAMENTO: "aguardando_pagamento",
  PAGAMENTO_APROVADO: "pagamento_aprovado",
  EM_PREPARO: "em_preparo",
  PRONTO: "pronto",
  SAIU_PARA_ENTREGA: "saiu_para_entrega",
  ENTREGUE: "entregue",
  CANCELADO: "cancelado",
  PAGAMENTO_RECUSADO: "pagamento_recusado",
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: "Aguardando Pagamento",
  [ORDER_STATUS.PAGAMENTO_APROVADO]: "Pagamento Aprovado",
  [ORDER_STATUS.EM_PREPARO]: "Em Preparo",
  [ORDER_STATUS.PRONTO]: "Pedido Pronto",
  [ORDER_STATUS.SAIU_PARA_ENTREGA]: "Saiu para Entrega",
  [ORDER_STATUS.ENTREGUE]: "Entregue",
  [ORDER_STATUS.CANCELADO]: "Cancelado",
  [ORDER_STATUS.PAGAMENTO_RECUSADO]: "Pagamento Recusado",
};
