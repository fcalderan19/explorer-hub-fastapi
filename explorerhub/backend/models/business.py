from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


class Location(BaseModel):
    address: str
    city: str
    state: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TicketPricing(BaseModel):
    """Precios de entradas por tipo de visitante"""
    adult_price: Optional[float] = Field(None, ge=0)
    senior_price: Optional[float] = Field(None, ge=0)  # Adultos mayores
    child_price: Optional[float] = Field(None, ge=0)  # Niños


class HotelPricing(BaseModel):
    """Precios de alojamiento"""
    price_per_night: Optional[float] = Field(None, ge=0)
    min_nights: Optional[int] = Field(1, ge=1)  # Mínimo de noches
    max_nights: Optional[int] = Field(None, ge=1)  # Máximo de noches


class RestaurantPricing(BaseModel):
    """Precios de restaurante"""
    reservation_fee: Optional[float] = Field(None, ge=0)  # Cargo por reserva (opcional)
    average_price_per_person: Optional[float] = Field(None, ge=0)  # Precio promedio por persona
    min_consumption: Optional[float] = Field(None, ge=0)  # Consumo mínimo


class WellnessPricing(BaseModel):
    """Precios para centros de bienestar (spa, gimnasio, etc.)"""
    session_price: Optional[float] = Field(None, ge=0)  # Precio por sesión
    package_price: Optional[float] = Field(None, ge=0)  # Precio por paquete
    sessions_in_package: Optional[int] = Field(None, ge=1)  # Sesiones incluidas en paquete


class BusinessBase(BaseModel):
    name: str
    description: str
    categories: List[str] = []  # Cambiado de category: str a categories: List[str]
    location: Location
    phone: Optional[str] = None
    website: Optional[str] = None
    price_level: int = Field(ge=1, le=4)
    images: List[str] = []
    tags: List[str] = []
    allows_bookings: bool = True
    max_capacity: Optional[int] = None  # Cupo máximo de personas
    is_unique: bool = False  # Indica si es una actividad única
    is_subscribed: bool = False  # Indica si el negocio tiene una suscripción activa
    subscription_tier: Optional[str] = None  # Nivel de suscripción: "basic", "premium", "enterprise"
    subscription_ends_at: Optional[datetime] = None  # Fecha de vencimiento de la suscripción
    
    # Diferentes modelos de precios según el tipo de negocio
    ticket_pricing: Optional[TicketPricing] = None  # Para museos, atracciones, actividades, entretenimiento
    hotel_pricing: Optional[HotelPricing] = None  # Para hoteles, hostels
    restaurant_pricing: Optional[RestaurantPricing] = None  # Para restaurantes, cafés
    wellness_pricing: Optional[WellnessPricing] = None  # Para spas, gimnasios


class BusinessCreate(BusinessBase):
    pass


class BusinessInDB(BusinessBase):
    id: Optional[str] = Field(alias="_id", default=None)
    owner_id: str
    rating: float = 0.0
    review_count: int = 0
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_subscribed: bool = False
    subscription_tier: Optional[str] = None
    subscription_ends_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Business(BusinessBase):
    id: int
    owner_id: str
    rating: float
    views: int
    review_count: int
    created_at: datetime
    is_active: bool
    allows_bookings: bool
    max_capacity: Optional[int] = None
    is_unique: bool = False
    is_subscribed: bool = False
    subscription_tier: Optional[str] = None
    subscription_ends_at: Optional[datetime] = None
    
    # Diferentes modelos de precios
    ticket_pricing: Optional[TicketPricing] = None
    hotel_pricing: Optional[HotelPricing] = None
    restaurant_pricing: Optional[RestaurantPricing] = None
    wellness_pricing: Optional[WellnessPricing] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BusinessPublic(BaseModel):
    """Modelo público de negocio sin información de suscripción"""
    id: int
    name: str
    description: str
    categories: List[str] = []
    location: Location
    phone: Optional[str] = None
    website: Optional[str] = None
    price_level: int = Field(ge=1, le=4)
    images: List[str] = []
    tags: List[str] = []
    owner_id: str
    rating: float
    views: int
    review_count: int
    created_at: datetime
    is_active: bool
    allows_bookings: bool
    max_capacity: Optional[int] = None
    is_unique: bool = False  # Added is_unique field to BusinessPublic model
    
    # Diferentes modelos de precios
    ticket_pricing: Optional[TicketPricing] = None
    hotel_pricing: Optional[HotelPricing] = None
    restaurant_pricing: Optional[RestaurantPricing] = None
    wellness_pricing: Optional[WellnessPricing] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
