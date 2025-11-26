# 🚀 Configuración de MercadoPago con ngrok (Localhost + Flujo Completo)

## ✅ Solución Simple y Profesional

**ngrok** crea un túnel público a tu localhost, permitiendo que MercadoPago redirija correctamente.

---

## 📦 Instalación de ngrok (5 minutos)

### Opción 1: Con Snap (Recomendado para Ubuntu)
```bash
sudo snap install ngrok
```

### Opción 2: Descarga Manual
1. Ve a: https://ngrok.com/download
2. Descarga el binario para Linux
3. Descomprime: `unzip ngrok-*.zip`
4. Mueve a bin: `sudo mv ngrok /usr/local/bin/`

---

## 🔧 Configuración (2 minutos)

### Paso 1: Crear Cuenta en ngrok (Gratis)
1. Ve a: https://dashboard.ngrok.com/signup
2. Regístrate (gratis)
3. Copia tu **authtoken** del dashboard

### Paso 2: Autenticar ngrok
```bash
ngrok config add-authtoken TU_AUTHTOKEN_AQUI
```

---

## 🚀 Uso Diario

### Paso 1: Inicia tu Backend (como siempre)
```bash
cd /home/facundo/Desktop/explorer-hub-fastapi/explorerhub/backend
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Paso 2: En otra terminal, inicia ngrok
```bash
ngrok http 8000
```

Verás algo así:
```
Session Status                online
Account                       tu_cuenta (Plan: Free)
Version                       3.x.x
Region                        South America (sa)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok-free.app -> http://localhost:8000
```

**Copia la URL de "Forwarding"**: `https://abc123xyz.ngrok-free.app`

### Paso 3: Actualiza tu .env TEMPORALMENTE
```bash
# En backend/.env
# Cambia de:
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]

# A (agrega la URL de ngrok):
CORS_ORIGINS=["https://abc123xyz.ngrok-free.app","http://localhost:3000","http://localhost:3001"]
```

### Paso 4: Reinicia el servidor backend
- Detén el servidor (Ctrl+C)
- Vuelve a iniciar:
```bash
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Paso 5: ¡Listo! Úsalo normalmente
- **Frontend**: Sigue usando `http://localhost:3000` como siempre
- **MercadoPago**: Ahora puede redirigir y enviar webhooks ✅

---

## 🎯 Flujo Completo que Funciona

```
Usuario → Comprar → MercadoPago → Paga → Webhook (ngrok) → Activación Automática → Redirección → Dashboard
```

**TODO automático, sin activación manual** ✅

---

## 💡 Ventajas de ngrok

✅ **Flujo completo** como en producción  
✅ **Redirección automática** después del pago  
✅ **Webhooks funcionan** (activación automática)  
✅ **Fácil de usar** (un solo comando)  
✅ **Gratis** para desarrollo  
✅ **Tu código NO cambia** (solo .env)  

---

## 📋 Workflow Diario Simplificado

**Cada vez que desarrolles:**

1. Terminal 1 - Backend:
```bash
cd backend && source venv/bin/activate && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. Terminal 2 - ngrok:
```bash
ngrok http 8000
```

3. Terminal 3 - Frontend:
```bash
cd .. && npm run dev
```

**Si la URL de ngrok cambia**, actualiza `.env` y reinicia backend.

---

## 🔄 Script Automático (Opcional)

Crea un archivo `start-dev.sh` en la raíz del proyecto:

```bash
#!/bin/bash

echo "🚀 Iniciando entorno de desarrollo..."

# Terminal 1: Backend
gnome-terminal -- bash -c "cd backend && source venv/bin/activate && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000; exec bash"

# Esperar 2 segundos
sleep 2

# Terminal 2: ngrok
gnome-terminal -- bash -c "ngrok http 8000; exec bash"

# Esperar 2 segundos
sleep 2

# Terminal 3: Frontend
gnome-terminal -- bash -c "npm run dev; exec bash"

echo "✅ Todo iniciado!"
echo "📝 No olvides copiar la URL de ngrok y actualizar .env si cambió"
```

Ejecuta:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

---

## ⚠️ Importante

### URL de ngrok cambia cada vez
- Cada vez que inicias ngrok, obtienes una **nueva URL**
- **Solución**: Con cuenta gratis, la URL es aleatoria
- **Upgrade** ($8/mes): Puedes tener una URL fija

### Para desarrollo es suficiente:
1. Inicia ngrok
2. Copia la nueva URL
3. Actualiza `.env`
4. Reinicia backend

**Toma 30 segundos** ⚡

---

## 🆚 Comparación

| Método | Ventajas | Tiempo Setup |
|--------|----------|--------------|
| **Activación Manual** | Simple, no requiere nada | 0 min |
| **ngrok (recomendado)** | Flujo completo automático | 5 min (una vez) |
| **Producción** | Todo automático siempre | Requiere deploy |

---

## 🎓 Próximos Pasos

1. **Instala ngrok**: `sudo snap install ngrok`
2. **Regístrate gratis**: https://dashboard.ngrok.com/signup
3. **Copia tu authtoken** del dashboard
4. **Autentica**: `ngrok config add-authtoken TU_TOKEN`
5. **Inicia ngrok**: `ngrok http 8000`
6. **Actualiza .env** con la URL de ngrok
7. **¡Prueba el flujo completo!** 🎉

---

**¿Listo para configurar ngrok?** Te guío paso a paso si quieres 🚀
