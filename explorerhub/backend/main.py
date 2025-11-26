from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import Database
from config import settings
from routes import auth, businesses, reviews, trips, promotions, bookings, notifications, favorites, profile, users
from routes import debug as debug_routes
from routes import weather, directions
from routes import migrations
from routes import mercadopago
from pathlib import Path
from flash_sale_checker import check_and_update_flash_sales, deactivate_expired_promotions

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await Database.connect_db()
    
    # Verificar y actualizar ofertas flash al iniciar
    logger = logging.getLogger('uvicorn.error')
    logger.info("🔍 Verificando promociones al iniciar el servidor...")
    try:
        db = Database.get_db()
        
        # Primero desactivar promociones expiradas
        deactivated = await deactivate_expired_promotions(db)
        logger.info(f"✅ Promociones expiradas desactivadas: {deactivated}")
        
        # Luego actualizar flash sales
        updated = await check_and_update_flash_sales(db)
        logger.info(f"✅ Flash sales actualizadas: {updated}")
        
    except Exception as e:
        logger.error(f"❌ Error al verificar promociones: {e}")
    
    yield
    # Shutdown
    await Database.close_db()

app = FastAPI(
    title="ExplorerHub API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
# Allow a developer override to enable all origins for quick debugging.
# Set environment variable BACKEND_ALLOW_ALL_CORS=1 to enable. Do NOT use in production.
allow_all = False
try:
    import os
    allow_all = os.environ.get('BACKEND_ALLOW_ALL_CORS', '0') in ('1', 'true', 'True')
except Exception:
    allow_all = False

origins = ['*'] if allow_all else settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _configure_logging():
    # Ensure our app and uvicorn loggers are set to INFO (or inherit from env/CLI if higher)
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
    for name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        logging.getLogger(name).setLevel(logging.INFO)
    logging.getLogger("explorerhub").setLevel(logging.INFO)


# Log configured CORS origins on startup for diagnostics and ensure logging is configured
@app.on_event('startup')
def log_cors_origins():
    _configure_logging()
    logger = logging.getLogger('uvicorn.error')
    logger.info(f"CORS origins configured: {origins}")
    logger.info("ExplorerHub API started and logging configured")

app.include_router(auth)
app.include_router(businesses)
app.include_router(reviews)
app.include_router(trips)
app.include_router(promotions)
app.include_router(bookings)
app.include_router(notifications)
app.include_router(favorites)
app.include_router(profile)
app.include_router(users)
app.include_router(debug_routes.debug_router)  # Endpoint temporal de diagnóstico
app.include_router(weather.router, prefix="/api/weather", tags=["weather"])
app.include_router(directions.router, prefix="/api/directions", tags=["directions"])
app.include_router(migrations.router)  # Endpoints de migración
app.include_router(mercadopago.router, prefix="/api/mercadopago", tags=["mercadopago"])  # MercadoPago integration

# Mount uploads directory
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "ExplorerHub API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
