# rapidoo

## Estrutura dos projetos

Este diretório é o projeto Expo do aplicativo. O backend destinado à Vercel está separado em [`delivery-backend/`](delivery-backend/README.md). Para um repositório Vercel independente, use o conteúdo dessa pasta como raiz do repositório, ou conecte este repositório e configure `delivery-backend` como Root Directory do projeto Vercel.

## Pagamentos

O app envia `POST /api/payments/create` com `orderId` e o Firebase ID token no cabeçalho `Authorization: Bearer ...`. O valor não é enviado pelo app: a API valida a autenticação e lê `total` e `itens` do pedido em `pedidos/{orderId}` no Firebase Realtime Database. Os pedidos não foram migrados para Firestore.

O backend cria Checkout Asaas Sandbox com Pix e cartão de crédito explicitamente habilitados. Ele preserva `externalReference = orderId`, a reserva transacional contra cobranças duplicadas e a reutilização de sessão pendente. A confirmação financeira e o webhook ainda não estão implementados; o retorno do checkout ao app não marca o pedido como pago.

O app precisa somente de `EXPO_PUBLIC_API_BASE_URL`, configurada no ambiente de build Expo com a URL real do backend implantado. Nenhum segredo Asaas ou credencial administrativa Firebase deve ser configurado no app. Consulte o README do backend para as variáveis que devem ficar na Vercel.

O total persistido ainda é criado pelo aplicativo e não é recalculado com preços de catálogo no servidor. Antes de produção, será necessário validar preços e impedir alterações indevidas no pedido por meio das regras do Realtime Database e/ou de lógica server-side confiável.
