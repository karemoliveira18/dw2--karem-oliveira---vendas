"""
Modelos SQLAlchemy para o banco de dados
Entidades: Produto, Pedido, ItemPedido e User
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, validator, EmailStr
from datetime import datetime

# ========== MODELOS SQLALCHEMY ==========

class Produto(Base):
    """Modelo de Produto para o banco de dados"""
    __tablename__ = "produtos"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(60), nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    preco = Column(Numeric(10, 2), nullable=False)
    estoque = Column(Integer, nullable=False, default=0)
    categoria = Column(String(50), nullable=False, index=True)
    sku = Column(String(50), nullable=True, unique=True)
    imagem_filename = Column(String(255), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Pedido(Base):
    """Modelo de Pedido para histórico de compras"""
    __tablename__ = "pedidos"
    
    id = Column(Integer, primary_key=True, index=True)
    total_bruto = Column(Numeric(10, 2), nullable=False)
    desconto = Column(Numeric(10, 2), nullable=False, default=0)
    total_final = Column(Numeric(10, 2), nullable=False)
    cupom_usado = Column(String(20), nullable=True)
    data = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamento com itens do pedido
    itens = relationship("ItemPedido", back_populates="pedido")

class ItemPedido(Base):
    """Modelo de Item do Pedido (produto + quantidade)"""
    __tablename__ = "itens_pedido"
    
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    nome_produto = Column(String(60), nullable=False)  # Nome no momento da compra
    preco_unitario = Column(Numeric(10, 2), nullable=False)  # Preço no momento da compra
    quantidade = Column(Integer, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    
    # Relacionamentos
    pedido = relationship("Pedido", back_populates="itens")
    produto = relationship("Produto")

class User(Base):
    """Modelo de Usuário para autenticação e perfil"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=True)
    endereco = Column(Text, nullable=True)
    avatar_filename = Column(String(255), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# ========== SCHEMAS PYDANTIC ==========

class ProdutoBase(BaseModel):
    """Schema base para Produto"""
    nome: str
    descricao: Optional[str] = None
    preco: Decimal
    estoque: int
    categoria: str
    sku: Optional[str] = None
    imagem_filename: Optional[str] = None
    
    @validator('nome')
    def validar_nome(cls, v):
        if not v or len(v.strip()) < 3 or len(v.strip()) > 60:
            raise ValueError('Nome deve ter entre 3 e 60 caracteres')
        return v.strip()
    
    @validator('preco')
    def validar_preco(cls, v):
        if v < Decimal('0.01'):
            raise ValueError('Preço deve ser maior que R$ 0,01')
        return round(v, 2)
    
    @validator('estoque')
    def validar_estoque(cls, v):
        if v < 0:
            raise ValueError('Estoque não pode ser negativo')
        return v
    
    @validator('categoria')
    def validar_categoria(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Categoria é obrigatória')
        return v.strip()

class ProdutoCreate(ProdutoBase):
    """Schema para criação de Produto"""
    pass

class ProdutoUpdate(ProdutoBase):
    """Schema para atualização de Produto"""
    pass

class ProdutoResponse(ProdutoBase):
    """Schema para resposta de Produto"""
    id: int
    criado_em: datetime
    atualizado_em: datetime
    
    class Config:
        orm_mode = True

class ItemCarrinho(BaseModel):
    """Schema para item do carrinho"""
    produto_id: int
    quantidade: int
    
    @validator('quantidade')
    def validar_quantidade(cls, v):
        if v <= 0:
            raise ValueError('Quantidade deve ser maior que zero')
        return v

class CarrinhoConfirmar(BaseModel):
    """Schema para confirmação do carrinho"""
    itens: List[ItemCarrinho]
    cupom: Optional[str] = None
    
    @validator('itens')
    def validar_itens(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Carrinho não pode estar vazio')
        return v

class PedidoResponse(BaseModel):
    """Schema para resposta do pedido confirmado"""
    id: int
    total_bruto: Decimal
    desconto: Decimal
    total_final: Decimal
    cupom_usado: Optional[str]
    data: datetime
    itens: List[dict]  # Lista com detalhes dos itens
    
    class Config:
        orm_mode = True

# ========== SCHEMAS DE AUTENTICAÇÃO ==========

class UserBase(BaseModel):
    """Schema base para User"""
    email: EmailStr
    nome: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    
    @validator('nome')
    def validar_nome(cls, v):
        if not v or len(v.strip()) < 2 or len(v.strip()) > 100:
            raise ValueError('Nome deve ter entre 2 e 100 caracteres')
        return v.strip()

class UserCreate(UserBase):
    """Schema para criação de usuário"""
    senha: str
    
    @validator('senha')
    def validar_senha(cls, v):
        if not v or len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        return v

class UserLogin(BaseModel):
    """Schema para login de usuário"""
    email: EmailStr
    senha: str

class UserUpdate(BaseModel):
    """Schema para atualização de perfil do usuário"""
    nome: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    
    @validator('nome')
    def validar_nome(cls, v):
        if v and (len(v.strip()) < 2 or len(v.strip()) > 100):
            raise ValueError('Nome deve ter entre 2 e 100 caracteres')
        return v.strip() if v else v

class UserResponse(UserBase):
    """Schema para resposta de usuário (sem dados sensíveis)"""
    id: int
    avatar_filename: Optional[str]
    is_admin: bool
    criado_em: datetime
    atualizado_em: datetime
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    """Schema para resposta do token JWT"""
    access_token: str
    token_type: str
    user: UserResponse
