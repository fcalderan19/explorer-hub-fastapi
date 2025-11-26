#!/bin/bash

# Script para instalar las dependencias de MercadoPago
# Este script debe ejecutarse dentro del entorno virtual o contenedor Python de tu proyecto

echo "🚀 Instalando dependencias de MercadoPago..."

# Verificar si estamos en un entorno virtual
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Entorno virtual detectado: $VIRTUAL_ENV"
    pip install mercadopago==2.2.3
elif command -v pip3 &> /dev/null; then
    echo "⚠️  No se detectó entorno virtual. Instalando con pip3..."
    pip3 install mercadopago==2.2.3 --break-system-packages
else
    echo "❌ pip3 no encontrado. Por favor instala Python 3 y pip."
    exit 1
fi

echo "✅ Instalación completada"
echo ""
echo "📝 Próximos pasos:"
echo "1. Configura las variables MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY en tu archivo .env"
echo "2. Obtén las credenciales en: https://www.mercadopago.com.ar/developers/panel/credentials"
echo "3. Lee la documentación completa en: MERCADOPAGO_INTEGRATION.md"
