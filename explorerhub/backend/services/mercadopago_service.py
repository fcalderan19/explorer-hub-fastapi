"""
Servicio para integración con MercadoPago
"""
import mercadopago
from config import settings
from typing import Dict, Any

# Inicializar SDK de MercadoPago
sdk = None
if settings.mercadopago_access_token:
    sdk = mercadopago.SDK(settings.mercadopago_access_token)

# Precios mensuales en USD
SUBSCRIPTION_PRICES_USD = {
    "basic": 5,
    "premium": 10,
    "enterprise": 15
}

# Tasa de conversión aproximada USD a ARS (deberías actualizarla periódicamente)
USD_TO_ARS = 1000  # Actualizar según tasa actual


def get_price_in_ars(tier: str, duration_days: int) -> float:
    """
    Calcula el precio en pesos argentinos basado en el tier y la duración
    
    Args:
        tier: "basic", "premium", o "enterprise"
        duration_days: número de días de suscripción
    
    Returns:
        Precio en ARS
    """
    if tier not in SUBSCRIPTION_PRICES_USD:
        raise ValueError(f"Tier inválido: {tier}")
    
    # Precio mensual en USD
    monthly_price_usd = SUBSCRIPTION_PRICES_USD[tier]
    
    # Calcular precio proporcional según duración
    months = duration_days / 30
    total_usd = monthly_price_usd * months
    
    # Convertir a ARS
    total_ars = total_usd * USD_TO_ARS
    
    return round(total_ars, 2)


def create_subscription_preference(
    business_id: int,
    business_name: str,
    tier: str,
    duration_days: int,
    user_email: str
) -> Dict[str, Any]:
    """
    Crea una preferencia de pago en MercadoPago para una suscripción
    
    Args:
        business_id: ID del negocio
        business_name: Nombre del negocio
        tier: "basic", "premium", o "enterprise"
        duration_days: número de días de suscripción
        user_email: email del usuario que realiza el pago
    
    Returns:
        Diccionario con la información de la preferencia de pago
    """
    if not sdk:
        raise Exception("MercadoPago no está configurado. Agrega MERCADOPAGO_ACCESS_TOKEN en .env")
    
    # Calcular precio en ARS
    price_ars = get_price_in_ars(tier, duration_days)
    
    # Etiquetas para el tier
    tier_labels = {
        "basic": "Básico",
        "premium": "Premium",
        "enterprise": "Enterprise"
    }
    
    # Obtener URL base desde CORS_ORIGINS
    base_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
    
    # Crear la preferencia
    preference_data = {
        "items": [
            {
                "title": f"Suscripción {tier_labels[tier]} - {business_name}",
                "description": f"Suscripción {tier_labels[tier]} por {duration_days} días para {business_name}",
                "quantity": 1,
                "currency_id": "ARS",
                "unit_price": price_ars
            }
        ],
        "payer": {
            "email": user_email
        },
        "back_urls": {
            "success": f"{base_url}/dashboard/business?subscription_success=true&business_id={business_id}",
            "failure": f"{base_url}/dashboard/business?subscription_failure=true",
            "pending": f"{base_url}/dashboard/business?subscription_pending=true&business_id={business_id}"
        },
        "auto_return": "approved",
        "external_reference": f"sub_{business_id}_{tier}_{duration_days}",
        "notification_url": f"{base_url}/api/mercadopago/webhook",
        "statement_descriptor": "ExplorerHub",
        "metadata": {
            "business_id": business_id,
            "tier": tier,
            "duration_days": duration_days
        }
    }
    
    # Crear preferencia en MercadoPago
    preference_response = sdk.preference().create(preference_data)
    
    if preference_response["status"] == 201:
        return {
            "id": preference_response["response"]["id"],
            "init_point": preference_response["response"]["init_point"],
            "sandbox_init_point": preference_response["response"]["sandbox_init_point"],
            "price_ars": price_ars,
            "price_usd": SUBSCRIPTION_PRICES_USD[tier] * (duration_days / 30)
        }
    else:
        raise Exception(f"Error al crear preferencia: {preference_response}")


def process_payment_notification(payment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesa una notificación de pago de MercadoPago
    
    Args:
        payment_data: Datos del pago recibidos del webhook
    
    Returns:
        Información procesada del pago
    """
    if not sdk:
        raise Exception("MercadoPago no está configurado")
    
    # Obtener información del pago
    payment_id = payment_data.get("id")
    
    if not payment_id:
        raise ValueError("ID de pago no proporcionado")
    
    # Consultar el pago en MercadoPago
    payment_info = sdk.payment().get(payment_id)
    
    if payment_info["status"] != 200:
        raise Exception(f"Error al obtener información del pago: {payment_info}")
    
    payment = payment_info["response"]
    
    return {
        "payment_id": payment["id"],
        "status": payment["status"],
        "status_detail": payment["status_detail"],
        "external_reference": payment.get("external_reference"),
        "metadata": payment.get("metadata", {}),
        "transaction_amount": payment["transaction_amount"],
        "date_approved": payment.get("date_approved")
    }
