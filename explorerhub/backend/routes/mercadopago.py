"""
Rutas para integración con MercadoPago
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from auth import get_current_active_user
from models.user import UserInDB
from database import get_database
from services.mercadopago_service import create_subscription_preference, process_payment_notification
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/create-subscription-preference")
async def create_preference(
    subscription_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """
    Crea una preferencia de pago en MercadoPago para una suscripción
    
    subscription_data debe incluir:
    - business_id: ID del negocio
    - tier: "basic", "premium", o "enterprise"
    - duration_days: número de días de suscripción (ej: 30, 90, 365)
    """
    business_id = subscription_data.get("business_id")
    tier = subscription_data.get("tier")
    duration_days = subscription_data.get("duration_days")
    
    if not business_id or not tier or not duration_days:
        raise HTTPException(
            status_code=400,
            detail="business_id, tier y duration_days son requeridos"
        )
    
    # Verificar que el negocio existe
    business = await db.businesses.find_one({"id": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    # Verificar que el usuario es el dueño del negocio
    if business["owner_id"] != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Solo el dueño del negocio puede comprar suscripciones"
        )
    
    # Validar tier
    if tier not in ["basic", "premium", "enterprise"]:
        raise HTTPException(
            status_code=400,
            detail="Tier debe ser 'basic', 'premium' o 'enterprise'"
        )
    
    try:
        # Crear preferencia en MercadoPago
        preference = create_subscription_preference(
            business_id=business_id,
            business_name=business.get("name", "Tu negocio"),
            tier=tier,
            duration_days=duration_days,
            user_email=current_user.email
        )
        
        return {
            "preference_id": preference["id"],
            "init_point": preference["init_point"],
            "sandbox_init_point": preference["sandbox_init_point"],
            "price_ars": preference["price_ars"],
            "price_usd": preference["price_usd"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear preferencia de pago: {str(e)}"
        )


@router.post("/webhook")
async def mercadopago_webhook(request: Request, db = Depends(get_database)):
    """
    Webhook para recibir notificaciones de MercadoPago sobre pagos
    """
    try:
        # Obtener datos del webhook
        body = await request.json()
        
        # MercadoPago envía notificaciones de tipo "payment"
        if body.get("type") == "payment":
            payment_data = body.get("data", {})
            
            # Procesar la notificación
            payment_info = process_payment_notification(payment_data)
            
            # Si el pago fue aprobado, activar la suscripción
            if payment_info["status"] == "approved":
                # Extraer metadata
                metadata = payment_info["metadata"]
                business_id = metadata.get("business_id")
                tier = metadata.get("tier")
                duration_days = metadata.get("duration_days")
                
                if business_id and tier and duration_days:
                    # Activar la suscripción
                    business = await db.businesses.find_one({"id": business_id})
                    
                    if business:
                        current_time = datetime.utcnow()
                        
                        # Si ya tiene suscripción activa, extender desde la fecha actual de expiración
                        if business.get("is_subscribed") and business.get("subscription_ends_at"):
                            if business["subscription_ends_at"] > current_time:
                                subscription_ends_at = business["subscription_ends_at"] + timedelta(days=duration_days)
                            else:
                                subscription_ends_at = current_time + timedelta(days=duration_days)
                        else:
                            subscription_ends_at = current_time + timedelta(days=duration_days)
                        
                        # Actualizar la suscripción
                        await db.businesses.update_one(
                            {"id": business_id},
                            {
                                "$set": {
                                    "is_subscribed": True,
                                    "subscription_tier": tier,
                                    "subscription_ends_at": subscription_ends_at,
                                    "updated_at": current_time
                                }
                            }
                        )
                        
                        # Guardar registro del pago
                        await db.payments.insert_one({
                            "payment_id": payment_info["payment_id"],
                            "business_id": business_id,
                            "tier": tier,
                            "duration_days": duration_days,
                            "amount": payment_info["transaction_amount"],
                            "status": payment_info["status"],
                            "date_approved": payment_info.get("date_approved"),
                            "created_at": current_time
                        })
        
        return {"status": "ok"}
    
    except Exception as e:
        print(f"Error procesando webhook de MercadoPago: {str(e)}")
        # Devolver 200 de todas formas para que MercadoPago no reintente
        return {"status": "error", "message": str(e)}


@router.get("/subscription-prices")
async def get_subscription_prices():
    """
    Obtiene los precios de las suscripciones
    """
    from services.mercadopago_service import SUBSCRIPTION_PRICES_USD, USD_TO_ARS, get_price_in_ars
    
    prices = {}
    for tier in ["basic", "premium", "enterprise"]:
        prices[tier] = {
            "monthly_usd": SUBSCRIPTION_PRICES_USD[tier],
            "monthly_ars": get_price_in_ars(tier, 30),
            "quarterly_usd": SUBSCRIPTION_PRICES_USD[tier] * 3,
            "quarterly_ars": get_price_in_ars(tier, 90),
            "semiannual_usd": SUBSCRIPTION_PRICES_USD[tier] * 6,
            "semiannual_ars": get_price_in_ars(tier, 180),
            "annual_usd": SUBSCRIPTION_PRICES_USD[tier] * 12,
            "annual_ars": get_price_in_ars(tier, 365)
        }
    
    return {
        "prices": prices,
        "usd_to_ars_rate": USD_TO_ARS
    }


@router.post("/manual-subscription-activation")
async def manual_subscription_activation(
    subscription_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """
    Activa una suscripción manualmente (solo para desarrollo local)
    
    Este endpoint permite activar suscripciones sin pasar por el flujo completo
    de MercadoPago, útil cuando estás en localhost y no puedes recibir webhooks.
    
    subscription_data debe incluir:
    - business_id: ID del negocio
    - tier: "basic", "premium", o "enterprise"
    - duration_days: número de días de suscripción
    """
    from datetime import datetime as dt, timedelta
    
    business_id = subscription_data.get("business_id")
    tier = subscription_data.get("tier")
    duration_days = subscription_data.get("duration_days")
    
    if not business_id or not tier or not duration_days:
        raise HTTPException(
            status_code=400,
            detail="business_id, tier y duration_days son requeridos"
        )
    
    # Verificar que el negocio existe
    business = await db.businesses.find_one({"id": business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    
    # Verificar que el usuario es el dueño del negocio
    if business["owner_id"] != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Solo el dueño del negocio puede activar suscripciones"
        )
    
    # Validar tier
    if tier not in ["basic", "premium", "enterprise"]:
        raise HTTPException(
            status_code=400,
            detail="Tier debe ser 'basic', 'premium' o 'enterprise'"
        )
    
    # Calcular fecha de vencimiento
    current_time = dt.utcnow()
    
    # Si ya tiene suscripción activa, extender desde la fecha actual de expiración
    if business.get("is_subscribed") and business.get("subscription_ends_at"):
        if business["subscription_ends_at"] > current_time:
            subscription_ends_at = business["subscription_ends_at"] + timedelta(days=duration_days)
        else:
            subscription_ends_at = current_time + timedelta(days=duration_days)
    else:
        subscription_ends_at = current_time + timedelta(days=duration_days)
    
    # Actualizar la suscripción
    await db.businesses.update_one(
        {"id": business_id},
        {
            "$set": {
                "is_subscribed": True,
                "subscription_tier": tier,
                "subscription_ends_at": subscription_ends_at,
                "updated_at": current_time
            }
        }
    )
    
    return {
        "message": "Suscripción activada manualmente",
        "business_id": business_id,
        "tier": tier,
        "duration_days": duration_days,
        "expires_at": subscription_ends_at.isoformat()
    }
