"""
Utilidades de autenticação e segurança
JWT, hash de senhas, validação de tokens
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import User

# Configurações de segurança
SECRET_KEY = "seu-secret-key-super-secreto-aqui-mude-em-producao-123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Contexto para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esquema de autenticação Bearer
security = HTTPBearer()

# ========== FUNÇÕES DE HASH ==========

def hash_password(password: str) -> str:
    """Gera hash da senha usando bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha confere com o hash"""
    return pwd_context.verify(plain_password, hashed_password)

# ========== FUNÇÕES JWT ==========

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Cria token JWT com dados do usuário"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodifica token JWT e retorna dados do usuário"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ========== DEPENDÊNCIAS DE AUTENTICAÇÃO ==========

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependência que retorna o usuário atual autenticado"""
    
    # Decodifica o token
    payload = decode_access_token(credentials.credentials)
    
    # Extrai dados do usuário
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Busca usuário no banco
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependência que verifica se o usuário atual é admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Privilégios de administrador necessários."
        )
    return current_user

# ========== FUNÇÕES DE AUTENTICAÇÃO ==========

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Autentica usuário com email e senha"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.senha_hash):
        return None
    return user

def create_user_tokens(user: User) -> Dict[str, Any]:
    """Cria tokens JWT para o usuário"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "is_admin": user.is_admin
        }, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
