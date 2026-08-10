# Pasarelas de Pago — Integración

El sistema soporta dos pasarelas de pago reales integradas en modo sandbox/staging.

---

## PayPal (Internacional)

### Credenciales
- **Client ID y Client Secret** en `.env` raíz como `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`
- **VITE_PAYPAL_CLIENT_ID** en `.env` para el frontend (SDK de botones)
- **PAYPAL_WEBHOOK_ID** para verificación de firma en webhooks
- **PAYPAL_ENVIRONMENT** = `SANDBOX` o `PRODUCTION`
- **PYG_TO_USD_RATE** — tasa de conversión, configurable desde BD (`SystemConfig` key: `exchange_rates`)

### Arquitectura
- **Backend:** `backend/src/services/paypal.service.js`
  - `getAccessToken()` — OAuth2 client_credentials con cache en memoria
  - `createOrder()` — crea orden PayPal Orders API v2, convierte PYG a USD
  - `captureOrder()` — cobra la orden aprobada, guarda payment en BD, activa empresa
  - `pygToUsd()` — async, lee tasa desde SystemConfig (BD) → .env → 7500
- **Controller:** `backend/src/controllers/payments.controller.js`
  - `POST /api/payments/create-order` — devuelve `orderId` al frontend
  - `POST /api/payments/capture-order` — captura después de aprobación en popup
- **Frontend:** `frontend/src/pages/Checkout.jsx`
  - Usa `@paypal/react-paypal-js` con `PayPalScriptProvider` + `PayPalButtons`
  - Locale: `es_ES`
  - Flujo: botón PayPal → popup login cuenta sandbox → aprobación → capture → comprobante
- **Webhook:** `POST /api/webhooks/paypal`
  - Verifica firma via PayPal API (`/v1/notifications/verify-webhook-signature`)
  - Maneja: PAYMENT.CAPTURE.COMPLETED, DENIED, REVERSED, BILLING.SUBSCRIPTION.EXPIRED/CANCELLED, CUSTOMER.DISPUTE.CREATED
  - Requiere ngrok para pruebas locales

### Flujo completo
1. Frontend llama `POST /api/payments/create-order` con `{ planId }`
2. Backend crea orden en PayPal con monto en USD (convertido desde PYG)
3. Frontend recibe `orderId`, el SDK abre popup de PayPal
4. Usuario aprueba con cuenta sandbox (email/password de cuenta Personal)
5. Frontend llama `POST /api/payments/capture-order` con `{ orderId, planId }`
6. Backend captura, guarda payment con `paypalOrderId` y `paypalCaptureId`, activa empresa
7. Frontend muestra comprobante

### Sandbox
- URL base: `https://api-m.sandbox.paypal.com`
- Cuentas: en [developer.paypal.com/dashboard/accounts](https://developer.paypal.com/dashboard/accounts)
- Cuenta PERSONAL (buyer) para pagar — cuenta BUSINESS (seller) para credenciales
- **No acepta tarjetas reales** en sandbox — solo login con cuenta PayPal de prueba
- El popup puede mostrarse en inglés a pesar del locale (limitación sandbox)

---

## AdamsPay (Paraguay — Local)

### Credenciales
- **ADAMSPAY_API_KEY** = `ap-f8c6648160316fe2fb3636a3` (staging)
- **ADAMSPAY_API_SECRET** = `08bf36e5e5e629714181627a00be72cd`
- **ADAMSPAY_ENVIRONMENT** = `STAGING` o `PRODUCTION`

### Medios de pago soportados
- Tarjetas de crédito Visa/Mastercard (Infonet, Bancard VPOS)
- Tarjetas de débito Visa/Mastercard
- Zimple
- Tigo Money
- Billetera Personal
- Red de cobranzas Infonet
- Simulador (staging)

### Arquitectura
- **Backend:** `backend/src/services/adamspay.service.js`
  - `createDebt()` — crea una "deuda" con docId único, monto en PYG, validPeriod de 24hs
  - `getDebt()` — consulta estado de una deuda por docId
  - `deleteDebt()` — cancela una deuda pendiente
  - Auth: header `apikey: <API_KEY>`
  - URL base staging: `https://staging.adamspay.com/api/v1`
- **Controller:** `backend/src/controllers/payments.controller.js`
  - `POST /api/payments/adamspay/create` — crea deuda, devuelve `payUrl`
  - `POST /api/payments/adamspay/verify/:docId` — verifica si fue pagada
- **Frontend:** `frontend/src/pages/Checkout.jsx`
  - Botón "Pagar con AdamsPay" debajo del de PayPal
  - Redirige al usuario al `payUrl` de AdamsPay
  - Al volver, lee `sessionStorage('adamspay_docId')` y llama verify
- **Webhook:** `POST /api/webhooks/adamspay`
  - AdamsPay llama cuando la deuda cambia de estado
  - Detecta pago por `amount.paid >= amount.value` (no tiene campo `status`)
  - Registra en audit_logs

### Flujo completo
1. Frontend llama `POST /api/payments/adamspay/create` con `{ planId }`
2. Backend crea deuda en AdamsPay con `docId = companyId-planId-timestamp`
3. Backend devuelve `payUrl` al frontend
4. Frontend guarda `docId` en `sessionStorage` y redirige al `payUrl`
5. Usuario paga en el portal de AdamsPay (simulador en staging)
6. AdamsPay redirige al `URL de retorno` configurada en el portal de comercios
7. Frontend detecta retorno (params en URL o sessionStorage), espera `authLoading`, llama verify
8. Backend consulta `GET /debts/:docId`, compara `amount.paid >= amount.value`
9. Si pagado: crea payment, suscripción, activa empresa, devuelve paymentId
10. Frontend obtiene comprobante con `GET /api/payments/receipt/:paymentId`

### Estructura de la deuda (respuesta de AdamsPay)
```json
{
  "meta": { "status": "success" },
  "debt": {
    "docId": "uuid-PLANID-timestamp",
    "label": "Suscripcion plan X",
    "payUrl": "https://staging.adamspay.com/pay/...",
    "amount": {
      "currency": "PYG",
      "value": "1390000.000000",
      "paid": "1390000.000000"
    }
  }
}
```
- `amount.value` viene como string decimal — parsear con `parseInt()`
- El pago está completo cuando `parseFloat(paid) >= parseFloat(value)`

### Configuración del portal de comercios
- URL: [staging.adamspay.com](https://staging.adamspay.com) (login con cuenta de comercio)
- **URL de retorno:** `http://localhost:5173/checkout`
- **Webhook:** `https://TU-URL.ngrok-free.app/api/webhooks/adamspay`
- **Servicios habilitados:** Simulador (staging). En producción habilitar los proveedores reales.

### Postman Collection
- Archivo: `postman_website_tesis820_test.json` en la raíz del proyecto
- Contiene: crear/leer/modificar/borrar deudas, transacciones, giros, usuarios, contratos

---

## Comprobante de pago (punto 36 Apuntes UNIDA)

Endpoint: `GET /api/payments/receipt/:paymentId`

El comprobante se adapta automáticamente según `payment.paymentMethod`:
- `"paypal"` → muestra "Pago via PayPal" con captureId
- `"adamspay"` → muestra "Pago via AdamsPay — Tarjeta · Tigo Money · Zimple"
- `"card"` → muestra marca y últimos 4 dígitos

Campos del comprobante: número de recibo autonumerado (`REC-YYYYMM-XXXXXXXX`), datos del emisor, datos del pagador, concepto/plan/período, monto en guaraníes + en letras, forma de pago, trazabilidad (ID transacción, fecha), leyenda legal.

---

## Webhook

Ambas pasarelas tienen webhook configurado en:
- PayPal: `POST /api/webhooks/paypal` (con verificación de firma)
- AdamsPay: `POST /api/webhooks/adamspay` (sin firma — valida por docId)

Registrados en `backend/src/routes/webhook.routes.js`, sin middleware de auth JWT.
Controller: `backend/src/controllers/webhook.controller.js`

Para pruebas locales necesitás **ngrok** exponiendo el puerto 4000:
```bash
ngrok http 4000
```
Y registrar la URL en el panel de cada pasarela.

---

## Variables de entorno relacionadas

```env
# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENVIRONMENT=SANDBOX
PYG_TO_USD_RATE=7500
PAYPAL_WEBHOOK_ID=...
VITE_PAYPAL_CLIENT_ID=...

# AdamsPay
ADAMSPAY_API_KEY=ap-...
ADAMSPAY_API_SECRET=...
ADAMSPAY_ENVIRONMENT=STAGING
```

En `docker-compose.yml` se pasan explícitamente al backend y frontend.

---

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `backend/src/services/paypal.service.js` | OAuth2, createOrder, captureOrder |
| `backend/src/services/adamspay.service.js` | createDebt, getDebt, deleteDebt |
| `backend/src/controllers/payments.controller.js` | Todos los endpoints de pago |
| `backend/src/controllers/webhook.controller.js` | Webhooks PayPal + AdamsPay |
| `backend/src/routes/payments.routes.js` | Rutas de pagos |
| `backend/src/routes/webhook.routes.js` | Rutas de webhooks |
| `frontend/src/pages/Checkout.jsx` | UI checkout con ambas pasarelas |
| `frontend/src/services/api.js` | Interceptor 401 con protección retorno pasarela |
| `backend/prisma/schema.prisma` | Modelo Payment con paypalOrderId/CaptureId |
