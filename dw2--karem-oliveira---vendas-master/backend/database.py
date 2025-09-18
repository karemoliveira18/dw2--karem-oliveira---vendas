"""
Configuração do banco de dados SQLite
Engine, SessionLocal e Base para SQLAlchemy
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Caminho do arquivo de banco SQLite
DATABASE_URL = "sqlite:///./app.db"

# Engine do SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Necessário para SQLite
    echo=False  # Alterar para True se quiser ver as queries SQL no log
)

# SessionLocal para criar sessões de banco
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos declarativos
Base = declarative_base()

def get_db():
    """
    Dependency para obter sessão do banco de dados
    Usado nos endpoints FastAPI com Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Função para inicializar o banco (criar tabelas)
    Chamada quando necessário criar estrutura inicial
    """
    Base.metadata.create_all(bind=engine)
