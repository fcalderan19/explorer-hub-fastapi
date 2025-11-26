# 🚀 Configuración de ngrok para MercadoPago Local

## ⚠️ Problema
MercadoPago requiere URLs públicas HTTPS para:
- Redirecciones después del pago (`back_urls`)
- Webhooks de notificación (`notification_url`)

Como `http://localhost` no es accesible desde internet, MercadoPago rechaza las solicitudes con error 400.

## ✅ Solución: ngrok

ngrok crea un túnel HTTPS público hacia tu `localhost:8000`, permitiendo que MercadoPago funcione en desarrollo local.

---

## 📋 Configuración Inicial (Solo una vez)

### 1. Instalar ngrok (✅ Ya instalado)
```bash
# Ya ejecutado
sudo apt install ngrok
```

### 2. Crear cuenta y autenticar
1. Ve a: https://dashboard.ngrok.com/signup
2. Regístrate gratis con tu email
3. Copia tu **authtoken** desde: https://dashboard.ngrok.com/get-started/your-authtoken
4. Autentica:
```bash
ngrok config add-authtoken TU_AUTHTOKEN_AQUI
```

---

## 🎯 Uso Diario

### Opción A: Script Automático (Recomendado)

```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub/backend
./start-with-ngrok.sh
```

Este script:
- ✅ Inicia ngrok automáticamente
- ✅ Actualiza `.env` con la URL pública
- ✅ Inicia el backend
- ✅ Muestra toda la info necesaria

### Opción B: Manual (3 Terminales)

**Terminal 1 - Backend:**
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub/backend
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - ngrok:**
```bash
ngrok http 8000
```
📋 Copia la URL HTTPS (ej: `https://abc123.ngrok.io`)

**Terminal 3 - Actualizar .env:**
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub/backend
nano .env
```
Actualiza:
```env
CORS_ORIGINS=["https://abc123.ngrok.io","http://localhost:3000"]
```

**Terminal 4 - Frontend:**
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub
npm run dev
```

---

## 🧪 Probar el Flujo Completo

1. **Ir al dashboard:** http://localhost:3000/dashboard/business
2. **Click en "Comprar"** en cualquier plan
3. **Redirige a MercadoPago** ✅
4. **Pagar con tarjeta de prueba:**
   - Tarjeta: `5031 7557 3453 0604`
   - Vencimiento: `11/25`
   - CVV: `123`
   - Nombre: `APRO`
5. **MercadoPago redirige de vuelta** ✅
6. **Suscripción activada automáticamente** ✅

---

## 📊 Monitorear Webhooks

Mientras ngrok está corriendo, abre en tu navegador:
```
http://localhost:4040
```

Verás:
- Todas las solicitudes HTTP recibidas
- Webhooks de MercadoPago
- Datos de las peticiones

---

## ⚙️ URLs Importantes

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend Local | http://localhost:8000 |
| Backend Público (ngrok) | https://XXXXX.ngrok.io (cambia cada vez) |
| Dashboard ngrok | http://localhost:4040 |

---

## ⚠️ Notas Importantes

### URL Temporal (Plan Gratis)
- La URL de ngrok **cambia cada vez** que reinicias ngrok
- Debes actualizar `.env` cada vez
- El script `start-with-ngrok.sh` lo hace automáticamente

### URL Fija (Plan Pago - $8/mes)
Si quieres una URL que no cambie:
```bash
ngrok http 8000 --domain=tu-dominio.ngrok-free.app
```

### Seguridad
- Las credenciales de MercadoPago son de **TEST**
- Nunca uses credenciales de producción en ngrok
- El túnel es temporal y se cierra al salir

---

## 🐛 Troubleshooting

### Error: "ngrok not authenticated"
```bash
ngrok config add-authtoken TU_AUTHTOKEN
```

### Error: "tunnel not found"
Reinicia ngrok y actualiza `.env` con la nueva URL

### Error: "CORS error"
Verifica que `CORS_ORIGINS` en `.env` incluya la URL de ngrok

### Backend no responde
Verifica que uvicorn esté en `--host 0.0.0.0` (no solo `localhost`)

---

## 📚 Recursos

- [Dashboard ngrok](https://dashboard.ngrok.com/)
- [Documentación ngrok](https://ngrok.com/docs)
- [MercadoPago Webhooks](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications/webhooks)
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

---

## ✨ Resumen

```
1. Autenticar ngrok (solo una vez)
2. Ejecutar: ./start-with-ngrok.sh
3. Abrir: http://localhost:3000
4. ¡A probar MercadoPago! 🎉
```
