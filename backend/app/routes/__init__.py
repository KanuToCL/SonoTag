from app.routes.classify import router as classify_router
from app.routes.debug import router as debug_router
from app.routes.health import router as health_router
from app.routes.media import router as media_router
from app.routes.youtube import router as youtube_router

all_routers = [
    health_router,
    classify_router,
    youtube_router,
    media_router,
    debug_router,
]
