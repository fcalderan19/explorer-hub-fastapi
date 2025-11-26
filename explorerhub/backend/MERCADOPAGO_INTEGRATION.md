# Integración de MercadoPago para Suscripciones

Este documento explica cómo configurar la integración de MercadoPago para el sistema de suscripciones de negocios en ExplorerHub.

## Características

- ✅ Tres planes de suscripción: Básico ($5 USD/mes), Premium ($10 USD/mes) y Enterprise ($15 USD/mes)
- ✅ Conversión automática de USD a ARS (pesos argentinos)
- ✅ Integración completa con la pasarela de pago de MercadoPago
- ✅ Webhook para activación automática de suscripciones al recibir el pago
- ✅ Soporte para diferentes duraciones (30, 90, 180, 365 días)

## Precios de Suscripción

| Plan | Precio Mensual (USD) | Precio Mensual (ARS) |
|------|---------------------|---------------------|
| Básico | $5 USD | ~$5,000 ARS* |
| Premium | $10 USD | ~$10,000 ARS* |
| Enterprise | $15 USD | ~$15,000 ARS* |

*La conversión se realiza automáticamente según la tasa configurada (USD_TO_ARS en `services/mercadopago_service.py`)

## Configuración

### 1. Obtener credenciales de MercadoPago

1. Visita [MercadoPago Developers](https://www.mercadopago.com.ar/developers/panel/credentials)
2. Inicia sesión con tu cuenta de MercadoPago
3. Ve a "Credenciales"
4. Copia tus credenciales:
   - **Para pruebas**: Usa las credenciales de TEST
   - **Para producción**: Usa las credenciales de PRODUCCIÓN

### 2. Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

Esto instalará el SDK de MercadoPago (`mercadopago==2.2.3`)

### 4. Actualizar tasa de conversión USD/ARS

Edita el archivo `backend/services/mercadopago_service.py` y actualiza la variable `USD_TO_ARS` con la tasa actual:

```python
# Tasa de conversión aproximada USD a ARS (actualizar según tasa actual)
USD_TO_ARS = 1000  # Actualizar según tasa vigente
```

## Flujo de Compra

### Frontend

1. El usuario selecciona un negocio, plan y duración
2. Hace clic en "Comprar"
3. Se crea una preferencia de pago en MercadoPago
4. El usuario es redirigido a la pasarela de MercadoPago
5. Completa el pago en MercadoPago
6. Es redirigido de vuelta a la aplicación

### Backend

1. **POST** `/api/mercadopago/create-subscription-preference`
   - Crea una preferencia de pago
   - Calcula el precio en ARS
   - Retorna el `init_point` para redirección

2. **POST** `/api/mercadopago/webhook` (Webhook)
   - MercadoPago notifica el estado del pago
   - Si el pago es aprobado, se activa la suscripción automáticamente
   - Se guarda el registro del pago en la base de datos

3. **GET** `/api/mercadopago/subscription-prices`
   - Obtiene los precios de todas las suscripciones
   - Incluye conversión a ARS

## URLs de Redirección

El sistema configura automáticamente las siguientes URLs de retorno:

- **Éxito**: `/dashboard/business?subscription_success=true`
- **Fallo**: `/dashboard/business?subscription_failure=true`
- **Pendiente**: `/dashboard/business?subscription_pending=true`

## Webhook Configuration

Para que MercadoPago pueda notificar los pagos, necesitas configurar la URL del webhook:

1. En producción, la URL será: `https://tu-dominio.com/api/mercadopago/webhook`
2. Para desarrollo local, puedes usar [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 8000
   ```
3. Copia la URL de ngrok y agrégala como webhook en el panel de MercadoPago

## Endpoints de la API

### Crear Preferencia de Pago
```http
POST /api/mercadopago/create-subscription-preference
Authorization: Bearer {token}
Content-Type: application/json

{
  "business_id": 123,
  "tier": "premium",
  "duration_days": 30
}
```

**Respuesta:**
```json
{
  "preference_id": "123456789-abcd-1234-5678-abcdef123456",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "price_ars": 5000.0,
  "price_usd": 5.0
}
```

### Obtener Precios
```http
GET /api/mercadopago/subscription-prices
```

**Respuesta:**
```json
{
  "prices": {
    "basic": {
      "monthly_usd": 5,
      "monthly_ars": 5000.0,
      "quarterly_usd": 15,
      "quarterly_ars": 15000.0,
      ...
    },
    ...
  },
  "usd_to_ars_rate": 1000
}
```

## Testing

### Tarjetas de Prueba de MercadoPago

Para probar pagos, usa estas tarjetas de prueba:

| Tarjeta | Número | CVV | Fecha |
|---------|--------|-----|-------|
| Visa | 4509 9535 6623 3704 | 123 | 11/25 |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 |

**Usuario de prueba:**
- Email: test_user_123456789@testuser.com
- Contraseña: qatest123

Más información: [Testing en MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

## Seguridad

- ✅ El Access Token de MercadoPago nunca se expone al frontend
- ✅ Todas las transacciones requieren autenticación JWT
- ✅ Verificación de propiedad del negocio antes de crear preferencias
- ✅ Validación de datos en backend antes de procesar
- ✅ Webhook recibe notificaciones de forma segura

## Monitoreo de Pagos

Puedes ver todos los pagos procesados en:
- Panel de MercadoPago: [https://www.mercadopago.com.ar/activities](https://www.mercadopago.com.ar/activities)
- Base de datos (colección `payments`)

## Troubleshooting

### Error: "MercadoPago no está configurado"
**Solución**: Verifica que las variables `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY` estén en tu archivo `.env`

### El webhook no se ejecuta
**Solución**: 
1. Verifica que la URL del webhook esté correctamente configurada en MercadoPago
2. En desarrollo local, usa ngrok para exponer tu servidor
3. Revisa los logs del servidor para ver si hay errores

### Conversión USD/ARS incorrecta
**Solución**: Actualiza la variable `USD_TO_ARS` en `services/mercadopago_service.py` con la tasa actual

## Próximas Mejoras

- [ ] API para obtener tasa de cambio en tiempo real
- [ ] Panel de administración de pagos
- [ ] Suscripciones recurrentes automáticas
- [ ] Descuentos y cupones
- [ ] Integración con otros métodos de pago

## Soporte

Para más información sobre MercadoPago:
- [Documentación Oficial](https://www.mercadopago.com.ar/developers/es/docs)
- [SDK Python](https://github.com/mercadopago/sdk-python)
