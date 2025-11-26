from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # MongoDB
    mongodb_url: str
    database_name: str = "ExplorerHub"
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Email
    smtp_server: str = "smtp.mailtrap.io"
    smtp_port: int = 2525
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    mail_use_tls: bool = True
    mail_use_ssl: bool = False
    from_email: Optional[str] = None
    from_name: str = "ExplorerHub"
    
    # External APIs
    openweather_api_key: Optional[str] = None
    openroute_api_key: Optional[str] = None
    
    # MercadoPago
    mercadopago_access_token: Optional[str] = None
    mercadopago_public_key: Optional[str] = None
    
    class Config:
        env_file = ".env"


settings = Settings()
