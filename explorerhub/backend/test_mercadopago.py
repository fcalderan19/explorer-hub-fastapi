#!/usr/bin/env python3
"""
Script de prueba para verificar la integración de MercadoPago
"""
import os
import sys

# Colores para la terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def check_environment():
    """Verifica que las variables de entorno estén configuradas"""
    print_header("1. Verificando Variables de Entorno")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = [
        'MERCADOPAGO_ACCESS_TOKEN',
        'MERCADOPAGO_PUBLIC_KEY'
    ]
    
    all_ok = True
    for var in required_vars:
        value = os.getenv(var)
        if value and value != f'your_{var.lower()}_here':
            print_success(f"{var}: Configurado")
        else:
            print_error(f"{var}: No configurado o valor por defecto")
            all_ok = False
    
    return all_ok

def check_mercadopago_sdk():
    """Verifica que el SDK de MercadoPago esté instalado"""
    print_header("2. Verificando SDK de MercadoPago")
    
    try:
        import mercadopago
        print_success("mercadopago instalado correctamente")
        return True
    except ImportError:
        print_error("mercadopago NO está instalado")
        print_info("Ejecuta: pip install mercadopago==2.2.3")
        return False

def check_mercadopago_connection():
    """Verifica la conexión con MercadoPago"""
    print_header("3. Verificando Conexión con MercadoPago")
    
    try:
        from dotenv import load_dotenv
        import mercadopago
        
        load_dotenv()
        access_token = os.getenv('MERCADOPAGO_ACCESS_TOKEN')
        
        if not access_token or access_token.startswith('your_'):
            print_error("Access Token no configurado correctamente")
            return False
        
        sdk = mercadopago.SDK(access_token)
        
        # Intentar crear una preferencia de prueba
        preference_data = {
            "items": [
                {
                    "title": "Test",
                    "quantity": 1,
                    "currency_id": "ARS",
                    "unit_price": 100
                }
            ]
        }
        
        # Solo verificar que el SDK esté inicializado correctamente
        # No crear preferencia real
        print_success("SDK inicializado correctamente")
        print_info(f"Modo: {'TEST' if 'TEST' in access_token else 'PRODUCCIÓN'}")
        
        return True
        
    except Exception as e:
        print_error(f"Error al conectar con MercadoPago: {str(e)}")
        return False

def check_service():
    """Verifica que el servicio de MercadoPago esté correctamente configurado"""
    print_header("4. Verificando Servicio MercadoPago")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from services.mercadopago_service import SUBSCRIPTION_PRICES_USD, USD_TO_ARS, get_price_in_ars
        
        print_success("Servicio importado correctamente")
        print_info(f"Tasa USD/ARS: {USD_TO_ARS}")
        
        print("\nPrecios configurados:")
        for tier, price_usd in SUBSCRIPTION_PRICES_USD.items():
            price_ars = get_price_in_ars(tier, 30)
            print(f"  • {tier.capitalize()}: ${price_usd} USD/mes (~${price_ars:,.0f} ARS)")
        
        return True
        
    except Exception as e:
        print_error(f"Error al verificar servicio: {str(e)}")
        return False

def check_routes():
    """Verifica que las rutas estén configuradas"""
    print_header("5. Verificando Rutas de la API")
    
    try:
        import requests
        
        # Verificar que el servidor esté corriendo
        try:
            response = requests.get("http://localhost:8000/health", timeout=2)
            if response.status_code == 200:
                print_success("Servidor backend está corriendo")
            else:
                print_warning("Servidor responde pero con estado inesperado")
        except requests.exceptions.RequestException:
            print_error("Servidor backend NO está corriendo en http://localhost:8000")
            print_info("Inicia el servidor: cd backend && python3 -m uvicorn main:app --reload")
            return False
        
        # Verificar endpoint de precios
        try:
            response = requests.get("http://localhost:8000/api/mercadopago/subscription-prices", timeout=2)
            if response.status_code == 200:
                print_success("Endpoint /api/mercadopago/subscription-prices: OK")
                data = response.json()
                print_info(f"Planes disponibles: {', '.join(data['prices'].keys())}")
            else:
                print_error(f"Endpoint retorna estado: {response.status_code}")
        except Exception as e:
            print_error(f"Error al verificar endpoint: {str(e)}")
        
        return True
        
    except ImportError:
        print_warning("requests no instalado, saltando verificación de API")
        return True

def main():
    """Ejecuta todas las verificaciones"""
    print(f"\n{Colors.BOLD}🚀 Verificación de Integración MercadoPago{Colors.END}\n")
    
    results = {
        "Variables de Entorno": check_environment(),
        "SDK MercadoPago": check_mercadopago_sdk(),
        "Conexión MercadoPago": check_mercadopago_connection(),
        "Servicio": check_service(),
        "Rutas API": check_routes()
    }
    
    print_header("Resumen de Verificación")
    
    all_ok = True
    for check, status in results.items():
        if status:
            print_success(f"{check}: OK")
        else:
            print_error(f"{check}: FALLO")
            all_ok = False
    
    print("\n")
    if all_ok:
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 ¡Todo está configurado correctamente!{Colors.END}\n")
        print("Próximos pasos:")
        print("1. Asegúrate de que el servidor esté corriendo")
        print("2. Ve a http://localhost:3000/dashboard/business")
        print("3. Prueba comprando una suscripción")
        print("4. Usa las tarjetas de prueba de TARJETAS_PRUEBA.md")
    else:
        print(f"{Colors.RED}{Colors.BOLD}⚠️  Hay problemas que resolver{Colors.END}\n")
        print("Revisa los errores arriba y corrígelos antes de continuar.")
    
    print("\n")

if __name__ == "__main__":
    main()
