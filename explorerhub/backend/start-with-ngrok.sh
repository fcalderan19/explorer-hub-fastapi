#!/bin/bash

# Script para iniciar el backend con ngrok
# Uso: ./start-with-ngrok.sh

echo "🚀 Iniciando backend con ngrok..."
echo ""

# Verificar si ngrok está autenticado
if ! ngrok config check &>/dev/null; then
    echo "❌ Error: ngrok no está autenticado"
    echo ""
    echo "Por favor:"
    echo "1. Ve a https://dashboard.ngrok.com/signup"
    echo "2. Copia tu authtoken"
    echo "3. Ejecuta: ngrok config add-authtoken TU_AUTHTOKEN"
    echo ""
    exit 1
fi

# Iniciar ngrok en background
echo "📡 Iniciando túnel ngrok..."
ngrok http 8000 --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

# Esperar a que ngrok se inicie
sleep 3

# Obtener la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: No se pudo obtener la URL de ngrok"
    kill $NGROK_PID
    exit 1
fi

echo "✅ Túnel ngrok activo: $NGROK_URL"
echo ""

# Actualizar .env con la nueva URL
echo "📝 Actualizando .env..."
if [ -f .env ]; then
    # Backup del .env original
    cp .env .env.backup
    
    # Actualizar CORS_ORIGINS
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=[\"$NGROK_URL\",\"http://localhost:3000\"]|" .env
    
    echo "✅ .env actualizado (backup en .env.backup)"
else
    echo "❌ Error: No se encontró el archivo .env"
    kill $NGROK_PID
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Configuración lista!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL pública:     $NGROK_URL"
echo "🏠 Frontend local:  http://localhost:3000"
echo "🔧 Backend local:   http://localhost:8000"
echo "📊 Dashboard ngrok: http://localhost:4040"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Iniciando backend..."
echo ""

# Activar el entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Iniciar uvicorn
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Al salir, matar ngrok
trap "kill $NGROK_PID" EXIT
