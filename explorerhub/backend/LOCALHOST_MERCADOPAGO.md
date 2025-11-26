# ⚠️ Desarrollo Local con MercadoPago

## Problema: Localhost y Redirecciones

MercadoPago **no puede redirigir a localhost** ni enviar webhooks a tu máquina local porque:

1. Los `back_urls` deben ser URLs públicas (HTTPS)
2. El `notification_url` (webhook) debe ser accesible desde internet

---

## ✅ Solución para Desarrollo Local

### Opción 1: Activación Manual (Simple)

Después de realizar un pago de prueba en MercadoPago:

1. **Ve a MercadoPago** y completa el pago
2. **Copia el Payment ID** de la URL de MercadoPago
3. **Activa manualmente** la suscripción usando el endpoint:

```bash
# Endpoint para activar manualmente (crear este endpoint)
POST http://localhost:8000/api/mercadopago/manual-activation
{
  "business_id": 123,
  "tier": "premium",
  "duration_days": 30
}
```

### Opción 2: Usar ngrok (Recomendado para Testing Completo)

**ngrok** crea un túnel público a tu localhost:

#### Paso 1: Instalar ngrok
```bash
# Descargar de: https://ngrok.com/download
# O con snap:
sudo snap install ngrok
```

#### Paso 2: Iniciar túnel
```bash
# Para el backend (puerto 8000)
ngrok http 8000
```

Obtendrás una URL como: `https://abc123.ngrok.io`

#### Paso 3: Actualizar .env
```bash
# Agregar la URL pública de ngrok
CORS_ORIGINS=["https://abc123.ngrok.io","http://localhost:3000"]
```

#### Paso 4: Reiniciar servidor
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Ahora MercadoPago podrá:
- ✅ Redirigir a tu app
- ✅ Enviar webhooks

---

## 🔧 Activación Manual Simplificada

He creado un endpoint especial para desarrollo:

### Endpoint de Activación Manual

```http
POST /api/mercadopago/manual-subscription-activation
Authorization: Bearer {tu_token}
Content-Type: application/json

{
  "business_id": 123,
  "tier": "premium",
  "duration_days": 30
}
```

### Cómo usarlo:

1. **Realiza el pago** en MercadoPago (modo TEST)
2. **Copia tu token** desde localStorage en el navegador (F12 → Application → Local Storage → token)
3. **Ejecuta** este comando en la terminal:

```bash
curl -X POST http://localhost:8000/api/mercadopago/manual-subscription-activation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "business_id": 1,
    "tier": "premium",
    "duration_days": 30
  }'
```

4. **Recarga** la página de dashboard
5. **Verás** la suscripción activada ✅

---

## 🚀 Para Producción

En producción (con dominio real):

1. **Despliega** en un servidor con dominio (ej: https://tuapp.com)
2. **Configura** las URLs en `.env`:
   ```
   CORS_ORIGINS=["https://tuapp.com"]
   ```
3. **Todo funcionará automáticamente**:
   - ✅ Redirecciones
   - ✅ Webhooks
   - ✅ Activación automática

---

## 📝 Resumen

| Método | Ventajas | Desventajas |
|--------|----------|-------------|
| **Activación Manual** | Simple, no requiere instalación | Requiere paso manual |
| **ngrok** | Testing completo, como producción | Requiere instalación, URL cambia |
| **Producción** | Todo automático | Requiere dominio y hosting |

---

## 🎯 Recomendación

Para desarrollo:
1. **Usa activación manual** para pruebas rápidas
2. **Usa ngrok** cuando necesites probar el flujo completo

Para producción:
- **Despliega** en un servidor con dominio público
