# Delivery Backend

Backend independente do aplicativo Expo, preparado para Vercel Functions. O diretório `api/` contém as funções serverless; o backend não inclui telas nem depende do Expo.

## Deploy na Vercel

1. Crie um repositório Git separado contendo o conteúdo de `delivery-backend/`, ou conecte o repositório atual e configure `delivery-backend` como **Root Directory** do projeto Vercel.
2. Configure as variáveis de ambiente abaixo para os ambientes Vercel que utilizar.
3. Faça o deploy. Não é necessário Express, servidor permanente, Docker ou `vercel.json`.
4. Copie a URL pública fornecida pela Vercel.
5. Configure essa URL como `EXPO_PUBLIC_API_BASE_URL` no ambiente de build do aplicativo Expo e gere um novo build do app.

A Vercel reconhece `api/payments/create.js` como `POST /api/payments/create` a partir da raiz deste projeto. A lógica da função foi mantida igual à Etapa 1.

## Variáveis da Vercel

- `ASAAS_API_KEY`: chave privada do Asaas Sandbox.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON da conta de serviço Firebase com acesso administrativo. Armazene somente como variável sensível no backend.
- `FIREBASE_DATABASE_URL`: URL do Firebase Realtime Database usado pelo app.
- `PAYMENT_ALLOWED_ORIGINS`: lista separada por vírgulas das origens web autorizadas; chamadas nativas do app não enviam `Origin`.

Não há valores de credenciais neste repositório. Não use prefixo `EXPO_PUBLIC_` para nenhuma dessas variáveis.

## Variável do aplicativo

O aplicativo usa apenas `EXPO_PUBLIC_API_BASE_URL`, definida no ambiente de build Expo como a URL pública real do backend. Ela não contém segredo.

## Dependências e runtime

O backend depende somente de `firebase-admin`. O runtime Node da Vercel fornece `fetch`, `AbortSignal.timeout` e as APIs de função usadas pela implementação. O `package.json` declara suporte a Node `>=22 <25`.

Pedidos continuam no Firebase Realtime Database. A função valida o Firebase ID token, reserva o pagamento em `pedidos/{orderId}`, preserva `externalReference = orderId` e cria um Checkout Asaas Sandbox limitado a Pix e cartão de crédito. Reserva, reutilização de checkout pendente e bloqueio de resultado indeterminado são mantidos.

O endpoint de webhook e a confirmação financeira não estão implementados nesta etapa.