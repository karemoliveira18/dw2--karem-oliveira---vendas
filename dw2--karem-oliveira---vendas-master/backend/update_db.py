"""
Script simplificado para atualização do banco de dados
Cria tabela User sem dependências do FastAPI
"""

import sys
from decimal import Decimal
from database import SessionLocal, engine
from models import Base, Produto, User
from passlib.context import CryptContext

# Contexto para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Gera hash da senha usando bcrypt"""
    return pwd_context.hash(password)

def criar_usuario_admin():
    """Criar usuário administrador padrão"""
    db = SessionLocal()
    
    try:
        # Verificar se já existe o admin
        admin_existente = db.query(User).filter(User.email == "admin@loja.com").first()
        if admin_existente:
            print("👤 Usuário admin já existe: admin@loja.com")
            return
        
        # Criar usuário admin
        admin_user = User(
            email="admin@loja.com",
            senha_hash=hash_password("admin123"),
            nome="Administrador",
            telefone="(11) 99999-9999",
            endereco="Rua da Loja, 123 - Centro",
            is_admin=True
        )
        
        db.add(admin_user)
        db.commit()
        print("👤 Usuário admin criado:")
        print("   📧 Email: admin@loja.com")
        print("   🔑 Senha: admin123")
        print("   🛡️  Tipo: Administrador")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar usuário admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 ATUALIZAÇÃO DO BANCO - CRIANDO TABELA USER")
    print("=" * 50)
    
    # Criar tabelas se não existirem
    Base.metadata.create_all(bind=engine)
    
    criar_usuario_admin()
    
    print("\n✅ Banco atualizado com sucesso!")
    print("   - Tabela 'users' criada")
    print("   - Usuário admin disponível")
