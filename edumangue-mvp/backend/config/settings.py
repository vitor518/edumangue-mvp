"""Configurações do projeto EduMangue (MVP EdTech)."""
import os
from datetime import timedelta
from pathlib import Path
 
import dj_database_url
from dotenv import load_dotenv
 
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
 
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-key-troque-em-producao")
if not DEBUG and SECRET_KEY.startswith("dev-insecure"):
    raise RuntimeError("Defina DJANGO_SECRET_KEY em produção.")
 
ALLOWED_HOSTS = [h for h in os.getenv("DJANGO_ALLOWED_HOSTS", "*" if DEBUG else "").split(",") if h]
 
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "core",
    "academico",
    "atividades",
    "comunicacao",
]
 
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
 
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
 
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
 
# SQLite no desenvolvimento; defina DATABASE_URL=postgres://... em produção.
# `or` trata DATABASE_URL vazio (ex.: linha "DATABASE_URL=" no .env) como não definido.
DATABASES = {
    "default": dj_database_url.parse(
        os.getenv("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'db.sqlite3'}", conn_max_age=60
    )
}
 
AUTH_USER_MODEL = "core.Usuario"
 
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
 
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
 
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
 
CORS_ALLOWED_ORIGINS = [
    o for o in os.getenv("CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000").split(",") if o
]
 
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": None,
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"login": "10/min"},
}
 
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}
 
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv("DJANGO_SSL_REDIRECT", "1") == "1"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
 
import sys  # noqa: E402
if "test" in sys.argv:  # hash rápido só nos testes
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
 