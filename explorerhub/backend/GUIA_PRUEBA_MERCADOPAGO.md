# 🎯 Guía Rápida de Prueba - Integración MercadoPago

## ✅ Estado de la Implementación

La integración de MercadoPago está **completamente configurada** y lista para probar.

---

## 🚀 Cómo Probar la Funcionalidad

### Paso 1: Asegúrate de que los servidores estén corriendo

#### Backend:
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub/backend
source venv/bin/activate  # o source .venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend:
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub
npm run dev
```

---

### Paso 2: Inicia sesión como usuario de negocio

1. Ve a: `http://localhost:3000`
2. Inicia sesión con una cuenta de **tipo negocio** (business)
3. Asegúrate de tener al menos un negocio creado

---

### Paso 3: Ir a gestionar suscripciones

1. Ve a: `http://localhost:3000/dashboard/business`
2. Haz clic en el botón **"Gestionar Suscripciones"** (ícono de corona dorada)

---

### Paso 4: Seleccionar plan y comprar

1. **Selecciona un negocio** de la lista
2. **Elige un plan**:
   - **Básico**: $5 USD/mes (~$5,000 ARS)
   - **Premium**: $10 USD/mes (~$10,000 ARS)
   - **Enterprise**: $15 USD/mes (~$15,000 ARS)
3. **Selecciona duración**: 30, 90, 180 o 365 días
4. Haz clic en **"Comprar"**

---

### Paso 5: Pagar en MercadoPago (Modo TEST)

Serás redirigido a la página de pago de MercadoPago. **Usa estas tarjetas de prueba**:

#### 💳 Tarjeta Visa (Recomendada)
```
Número:    4509 9535 6623 3704
CVV:       123
Vence:     11/30
Nombre:    APRO (para aprobar)
```

#### 💳 Tarjeta Mastercard
```
Número:    5031 7557 3453 0604
CVV:       123
Vence:     11/30
Nombre:    APRO (para aprobar)
```

#### ⚠️ Importante:
- **Nombre del titular**: Escribe `APRO` para que el pago sea aprobado
- **DNI/Documento**: Cualquier número (ej: 12345678)
- **Email**: Cualquier email válido

#### Otros nombres de prueba:
- `APRO` → Pago aprobado ✅
- `OCHO` → Pago pendiente ⏳
- `CONT` → Pago rechazado (contestar llamada) ❌
- `CALL` → Pago rechazado (validación telefónica) ❌

---

### Paso 6: Confirmación y retorno

1. **Completa el formulario** en MercadoPago con los datos de prueba
2. **Confirma el pago**
3. **Serás redirigido** automáticamente a: `http://localhost:3000/dashboard/business`
4. **Verás un mensaje** de confirmación:
   - ✅ **Éxito**: "¡Pago exitoso! Tu suscripción se activará en breve"
   - ⏳ **Pendiente**: "Tu pago está pendiente de aprobación"
   - ❌ **Rechazado**: "El pago no pudo ser procesado"

---

### Paso 7: Verificar suscripción activada

1. **Espera 3-5 segundos** (el webhook de MercadoPago procesa el pago)
2. **Recarga la página** si es necesario
3. **Verifica que tu negocio** ahora tenga:
   - Badge **"Premium"** / **"Básico"** / **"Enterprise"**
   - Estado de suscripción **activo**
   - Fecha de expiración

---

## 🔍 Solución de Problemas

### Error 401 Unauthorized
**Causa**: Token JWT no válido o ausente
**Solución**: 
1. Cierra sesión y vuelve a iniciar sesión
2. Verifica que estés usando una cuenta de tipo "business"

### No se redirige a MercadoPago
**Causa**: Credenciales de MercadoPago no configuradas
**Solución**:
1. Verifica que en `.env` estén las credenciales:
   ```
   MERCADOPAGO_ACCESS_TOKEN=TEST-488685323005301-112521-8a98535e987de794e35f82623243d862-542789602
   MERCADOPAGO_PUBLIC_KEY=TEST-b2023820-902a-4bd5-bc54-ba118198ac11
   ```
2. Reinicia el servidor backend

### El pago no se refleja en la app
**Causa**: El webhook no se ejecutó
**Solución**:
1. Verifica los logs del servidor backend
2. Espera unos segundos y recarga la página
3. En modo TEST, puede haber demora

### Error al crear preferencia
**Causa**: SDK de MercadoPago no instalado
**Solución**:
```bash
cd backend
source venv/bin/activate
pip install mercadopago==2.2.3
```

---

## 📊 Verificar en Logs

### Logs del Backend (Terminal)
Deberías ver:
```
INFO:     127.0.0.1:XXXXX - "POST /api/mercadopago/create-subscription-preference HTTP/1.1" 200 OK
```

### Logs del Frontend (Consola del navegador F12)
Deberías ver:
```
Creando preferencia de pago...
Respuesta recibida: 200
Datos de preferencia: {...}
Redirigiendo a: https://www.mercadopago.com.ar/checkout/...
```

---

## 🎉 Flujo Completo Exitoso

1. ✅ Usuario hace clic en "Comprar"
2. ✅ Se crea preferencia de pago (200 OK)
3. ✅ Redirección a MercadoPago
4. ✅ Usuario completa pago con tarjeta de prueba
5. ✅ MercadoPago aprueba el pago
6. ✅ Webhook activa la suscripción en la BD
7. ✅ Usuario es redirigido de vuelta a la app
8. ✅ Mensaje de confirmación mostrado
9. ✅ Suscripción visible en el dashboard

---

## 📞 Soporte

Si encuentras algún problema:

1. **Revisa la consola del navegador** (F12 → Console)
2. **Revisa los logs del servidor backend**
3. **Verifica las credenciales** en el archivo `.env`
4. **Consulta**: `MERCADOPAGO_INTEGRATION.md` para más detalles

---

## 🔗 Links Útiles

- **Dashboard**: http://localhost:3000/dashboard/business
- **Backend API**: http://localhost:8000/docs (Swagger UI)
- **Precios API**: http://localhost:8000/api/mercadopago/subscription-prices
- **Panel MercadoPago**: https://www.mercadopago.com.ar/developers/panel

---

**¡Listo para probar! 🚀**
