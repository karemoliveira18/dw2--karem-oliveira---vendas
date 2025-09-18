"""
FastAPI Application - Mini Sistema de Vendas
Backend principal com endpoints para gestão de produtos, carrinho e autenticação
"""

from fastapi import FastAPI, HTTPException, Depends, status, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import logging
from decimal import Decimal
import os
import uuid
import aiofiles

from database import get_db, engine
from models import (
    Base, Produto, Pedido, ItemPedido, User,
    ProdutoCreate, ProdutoUpdate, ProdutoResponse, 
    CarrinhoConfirmar, PedidoResponse,
    UserCreate, UserLogin, UserUpdate, UserResponse, Token
)
from auth import (
    hash_password, authenticate_user, create_user_tokens,
    get_current_user, get_current_admin_user
)

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar tabelas no banco
Base.metadata.create_all(bind=engine)

# Instância FastAPI
app = FastAPI(
    title="Loja Escolar API",
    description="API REST para catálogo de produtos e carrinho de compras",
    version="1.0.0"
)

# Configuração CORS para frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["System"])
async def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return {
        "status": "ok",
        "message": "Loja Escolar API está rodando",
        "version": "1.0.0"
    }

@app.get("/", tags=["System"])
async def root():
    """Endpoint raiz com informações da API"""
    return {
        "message": "Bem-vindo à Loja Escolar API",
        "docs": "/docs",
        "health": "/health"
    }

# ========================================
# ENDPOINTS DE PRODUTOS
# ========================================

@app.get("/produtos", response_model=List[ProdutoResponse], tags=["Produtos"])
async def listar_produtos(
    search: Optional[str] = Query(None, description="Buscar por nome ou descrição"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    sort: Optional[str] = Query("nome", description="Campo para ordenação (nome, preco)"),
    order: Optional[str] = Query("asc", description="Direção da ordenação (asc, desc)"),
    db: Session = Depends(get_db)
):
    """Listar produtos com filtros opcionais e ordenação"""
    try:
        query = db.query(Produto)
        
        # Filtro de busca por nome ou descrição
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    Produto.nome.ilike(search_term),
                    Produto.descricao.ilike(search_term)
                )
            )
        
        # Filtro por categoria
        if categoria:
            query = query.filter(Produto.categoria == categoria)
        
        # Ordenação
        if sort == "preco":
            if order == "desc":
                query = query.order_by(desc(Produto.preco))
            else:
                query = query.order_by(asc(Produto.preco))
        else:  # ordenar por nome (padrão)
            if order == "desc":
                query = query.order_by(desc(Produto.nome))
            else:
                query = query.order_by(asc(Produto.nome))
        
        produtos = query.all()
        logger.info(f"Listando {len(produtos)} produtos (filtros: search={search}, categoria={categoria})")
        
        return produtos
        
    except Exception as e:
        logger.error(f"Erro ao listar produtos: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/produtos", response_model=ProdutoResponse, status_code=status.HTTP_201_CREATED, tags=["Produtos"])
async def criar_produto(produto_data: ProdutoCreate, db: Session = Depends(get_db)):
    """Criar novo produto"""
    try:
        # Verificar se SKU já existe (se fornecido)
        if produto_data.sku:
            existing_sku = db.query(Produto).filter(Produto.sku == produto_data.sku).first()
            if existing_sku:
                raise HTTPException(status_code=400, detail=f"SKU '{produto_data.sku}' já existe")
        
        # Criar novo produto
        db_produto = Produto(**produto_data.dict())
        db.add(db_produto)
        db.commit()
        db.refresh(db_produto)
        
        logger.info(f"Produto criado: {db_produto.nome} (ID: {db_produto.id})")
        return db_produto
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar produto: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/produtos/{produto_id}", response_model=ProdutoResponse, tags=["Produtos"])
async def obter_produto(produto_id: int, db: Session = Depends(get_db)):
    """Obter produto por ID"""
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    return produto

@app.put("/produtos/{produto_id}", response_model=ProdutoResponse, tags=["Produtos"])
async def atualizar_produto(produto_id: int, produto_data: ProdutoUpdate, db: Session = Depends(get_db)):
    """Atualizar produto existente"""
    try:
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Verificar se SKU já existe em outro produto (se fornecido)
        if produto_data.sku and produto_data.sku != produto.sku:
            existing_sku = db.query(Produto).filter(
                Produto.sku == produto_data.sku,
                Produto.id != produto_id
            ).first()
            if existing_sku:
                raise HTTPException(status_code=400, detail=f"SKU '{produto_data.sku}' já existe")
        
        # Atualizar campos
        for field, value in produto_data.dict().items():
            setattr(produto, field, value)
        
        db.commit()
        db.refresh(produto)
        
        logger.info(f"Produto atualizado: {produto.nome} (ID: {produto_id})")
        return produto
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar produto {produto_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/produtos/{produto_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Produtos"])
async def deletar_produto(produto_id: int, db: Session = Depends(get_db)):
    """Deletar produto"""
    try:
        produto = db.query(Produto).filter(Produto.id == produto_id).first()
        
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        db.delete(produto)
        db.commit()
        
        logger.info(f"Produto deletado: {produto.nome} (ID: {produto_id})")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar produto {produto_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ========================================
# ENDPOINT DE CARRINHO
# ========================================

@app.post("/carrinho/confirmar", response_model=PedidoResponse, tags=["Carrinho"])
async def confirmar_carrinho(dados_carrinho: CarrinhoConfirmar, db: Session = Depends(get_db)):
    """Confirmar pedido do carrinho com validação de estoque e aplicação de cupom"""
    try:
        if not dados_carrinho.itens:
            raise HTTPException(status_code=400, detail="Carrinho não pode estar vazio")
        
        itens_confirmados = []
        total_bruto = Decimal('0.00')
        
        # Validar cada item e calcular totais
        for item in dados_carrinho.itens:
            produto = db.query(Produto).filter(Produto.id == item.produto_id).first()
            
            if not produto:
                raise HTTPException(
                    status_code=422, 
                    detail=f"Produto com ID {item.produto_id} não encontrado"
                )
            
            if produto.estoque < item.quantidade:
                raise HTTPException(
                    status_code=422,
                    detail=f"Estoque insuficiente para '{produto.nome}'. Disponível: {produto.estoque}, Solicitado: {item.quantidade}"
                )
            
            subtotal = produto.preco * item.quantidade
            total_bruto += subtotal
            
            itens_confirmados.append({
                'produto': produto,
                'quantidade': item.quantidade,
                'subtotal': subtotal
            })
        
        # Aplicar desconto do cupom
        desconto = Decimal('0.00')
        cupom_usado = None
        
        if dados_carrinho.cupom and dados_carrinho.cupom.upper() == "ALUNO10":
            desconto = total_bruto * Decimal('0.10')  # 10% de desconto
            cupom_usado = "ALUNO10"
        
        total_final = total_bruto - desconto
        
        # Criar pedido
        pedido = Pedido(
            total_bruto=total_bruto,
            desconto=desconto,
            total_final=total_final,
            cupom_usado=cupom_usado
        )
        
        db.add(pedido)
        db.flush()  # Para obter o ID do pedido
        
        # Criar itens do pedido e atualizar estoque
        itens_pedido_response = []
        
        for item_data in itens_confirmados:
            produto = item_data['produto']
            quantidade = item_data['quantidade']
            subtotal = item_data['subtotal']
            
            # Criar item do pedido
            item_pedido = ItemPedido(
                pedido_id=pedido.id,
                produto_id=produto.id,
                nome_produto=produto.nome,
                preco_unitario=produto.preco,
                quantidade=quantidade,
                subtotal=subtotal
            )
            
            db.add(item_pedido)
            
            # Atualizar estoque
            produto.estoque -= quantidade
            
            # Dados para resposta
            itens_pedido_response.append({
                'produto_id': produto.id,
                'nome': produto.nome,
                'preco_unitario': float(produto.preco),
                'quantidade': quantidade,
                'subtotal': float(subtotal)
            })
        
        db.commit()
        db.refresh(pedido)
        
        logger.info(f"Pedido confirmado: ID {pedido.id}, Total: R$ {total_final}")
        
        # Retornar resposta estruturada
        return {
            'id': pedido.id,
            'total_bruto': float(total_bruto),
            'desconto': float(desconto),
            'total_final': float(total_final),
            'cupom_usado': cupom_usado,
            'data': pedido.data,
            'itens': itens_pedido_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao confirmar carrinho: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ========================================
# ENDPOINT ADICIONAL - CATEGORIAS
# ========================================

@app.get("/categorias", tags=["Utilitários"])
async def listar_categorias(db: Session = Depends(get_db)):
    """Listar todas as categorias disponíveis"""
    try:
        categorias = db.query(Produto.categoria).distinct().all()
        categorias_list = [cat[0] for cat in categorias if cat[0]]
        
        return sorted(categorias_list)
        
    except Exception as e:
        logger.error(f"Erro ao listar categorias: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ========================================
# ENDPOINTS DE AUTENTICAÇÃO
# ========================================

@app.post("/auth/register", response_model=Token, tags=["Autenticação"])
async def registrar_usuario(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar novo usuário"""
    try:
        # Verificar se o email já existe
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está cadastrado"
            )
        
        # Criar usuário com senha hasheada
        hashed = hash_password(user_data.senha)
        db_user = User(
            email=user_data.email,
            senha_hash=hashed,
            nome=user_data.nome,
            telefone=user_data.telefone,
            endereco=user_data.endereco
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Criar tokens
        tokens = create_user_tokens(db_user)
        
        # Criar resposta com dados do usuário
        user_response = UserResponse.from_orm(db_user)
        
        logger.info(f"Usuário registrado: {user_data.email}")
        
        return Token(
            access_token=tokens["access_token"],
            token_type=tokens["token_type"],
            user=user_response
        )
        
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já está em uso"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao registrar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/auth/login", response_model=Token, tags=["Autenticação"])
async def login_usuario(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login do usuário"""
    try:
        # Autenticar usuário
        user = authenticate_user(db, user_credentials.email, user_credentials.senha)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Criar tokens
        tokens = create_user_tokens(user)
        
        # Criar resposta com dados do usuário
        user_response = UserResponse.from_orm(user)
        
        logger.info(f"Login realizado: {user.email}")
        
        return Token(
            access_token=tokens["access_token"],
            token_type=tokens["token_type"],
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ========================================
# ENDPOINTS DE USUÁRIO
# ========================================

@app.get("/users/me", response_model=UserResponse, tags=["Usuário"])
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Obter perfil do usuário logado"""
    return UserResponse.from_orm(current_user)

@app.put("/users/me", response_model=UserResponse, tags=["Usuário"])
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar perfil do usuário logado"""
    try:
        # Atualizar apenas campos fornecidos
        if user_update.nome is not None:
            current_user.nome = user_update.nome
        if user_update.telefone is not None:
            current_user.telefone = user_update.telefone
        if user_update.endereco is not None:
            current_user.endereco = user_update.endereco
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Perfil atualizado: {current_user.email}")
        
        return UserResponse.from_orm(current_user)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar perfil: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/users/avatar", tags=["Usuário"])
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload de avatar do usuário"""
    try:
        # Validar tipo de arquivo
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo deve ser uma imagem"
            )
        
        # Validar tamanho (máximo 5MB)
        if file.size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo muito grande. Máximo 5MB"
            )
        
        # Criar diretório se não existir
        avatar_dir = "uploads/avatars"
        os.makedirs(avatar_dir, exist_ok=True)
        
        # Gerar nome único para o arquivo
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
        file_path = os.path.join(avatar_dir, filename)
        
        # Salvar arquivo
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Remover avatar anterior se existir
        if current_user.avatar_filename:
            old_path = os.path.join(avatar_dir, current_user.avatar_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        
        # Atualizar banco
        current_user.avatar_filename = filename
        db.commit()
        
        logger.info(f"Avatar atualizado: {current_user.email}")
        
        return {
            "message": "Avatar enviado com sucesso",
            "avatar_filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload de avatar: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
