"""
Script para popular o banco de dados com produtos educacionais de exemplo
Execute: python seed.py
"""

import sys
from decimal import Decimal
from database import SessionLocal, engine
from models import Base, Produto, User
from auth import hash_password

# Dados dos produtos educacionais
PRODUTOS_SEED = [
    # Livros Didáticos
    {
        "nome": "Matemática - 6º Ano",
        "descricao": "Livro didático de matemática para ensino fundamental, com exercícios práticos e teoria completa",
        "preco": Decimal("89.90"),
        "estoque": 45,
        "categoria": "Livros",
        "sku": "LIV001",
        "imagem_filename": "matematica-6-ano.jpg"
    },
    {
        "nome": "Português - Ensino Médio",
        "descricao": "Gramática, literatura e redação para estudantes do ensino médio",
        "preco": Decimal("95.50"),
        "estoque": 32,
        "categoria": "Livros",
        "sku": "LIV002"
    },
    {
        "nome": "História do Brasil - 9º Ano",
        "descricao": "História do Brasil desde o descobrimento até os dias atuais, com mapas e ilustrações",
        "preco": Decimal("78.90"),
        "estoque": 28,
        "categoria": "Livros",
        "sku": "LIV003",
        "imagem_filename": "historia-brasil-9-ano.png"
    },
    {
        "nome": "Ciências - 7º Ano",
        "descricao": "Biologia, física e química introdutória para ensino fundamental",
        "preco": Decimal("85.00"),
        "estoque": 38,
        "categoria": "Livros",
        "sku": "LIV004"
    },
    {
        "nome": "Atlas Geográfico Escolar",
        "descricao": "Atlas completo com mapas do Brasil e do mundo, ideal para estudos geográficos",
        "preco": Decimal("125.90"),
        "estoque": 15,
        "categoria": "Livros",
        "sku": "LIV005"
    },

    # Material Escolar
    {
        "nome": "Kit Cadernos Universitários (5 unidades)",
        "descricao": "Conjunto de 5 cadernos universitários de 100 folhas cada, capas variadas",
        "preco": Decimal("42.90"),
        "estoque": 67,
        "categoria": "Material Escolar",
        "sku": "MAT001",
        "imagem_filename": "kit-cadernos-universitarios.png"
    },
    {
        "nome": "Estojo Completo com Zíper",
        "descricao": "Estojo de 3 compartimentos com 2 canetas, 2 lápis, borracha, apontador e régua",
        "preco": Decimal("35.90"),
        "estoque": 89,
        "categoria": "Material Escolar",
        "sku": "MAT002"
    },
    {
        "nome": "Mochila Escolar Grande",
        "descricao": "Mochila resistente com compartimento para notebook, várias cores disponíveis",
        "preco": Decimal("159.90"),
        "estoque": 24,
        "categoria": "Material Escolar",
        "sku": "MAT003",
        "imagem_filename": "mochila-escolar-grande.png"
    },
    {
        "nome": "Kit Canetas Coloridas (12 cores)",
        "descricao": "Conjunto de canetas esferográficas coloridas para anotações e trabalhos",
        "preco": Decimal("18.90"),
        "estoque": 156,
        "categoria": "Material Escolar",
        "sku": "MAT004",
        "imagem_filename": "kit-canetas-coloridas.png"
    },
    {
        "nome": "Calculadora Científica",
        "descricao": "Calculadora científica com 240 funções, ideal para matemática e física",
        "preco": Decimal("89.90"),
        "estoque": 43,
        "categoria": "Material Escolar",
        "sku": "MAT005",
        "imagem_filename": "calculadora-cientifica.png"
    },
    {
        "nome": "Papel A4 Sulfite (500 folhas)",
        "descricao": "Resma de papel sulfite branco 75g/m², ideal para impressões e trabalhos",
        "preco": Decimal("28.90"),
        "estoque": 95,
        "categoria": "Material Escolar",
        "sku": "MAT006"
    },

    # Uniformes
    {
        "nome": "Camisa Polo Azul - Tamanho M",
        "descricao": "Camisa polo em tecido piquet, cor azul marinho, tamanho médio",
        "preco": Decimal("65.90"),
        "estoque": 34,
        "categoria": "Uniformes",
        "sku": "UNI001",
        "imagem_filename": "camisa-polo-azul.png"
    },
    {
        "nome": "Calça Escolar Azul - Tamanho 40",
        "descricao": "Calça escolar em tecido gabardine, cor azul marinho, numeração 40",
        "preco": Decimal("89.90"),
        "estoque": 28,
        "categoria": "Uniformes",
        "sku": "UNI002"
    },
    {
        "nome": "Jaqueta de Inverno - Tamanho G",
        "descricao": "Jaqueta escolar com capuz, forro interno, cor azul marinho",
        "preco": Decimal("149.90"),
        "estoque": 19,
        "categoria": "Uniformes",
        "sku": "UNI003"
    },
    {
        "nome": "Tênis Escolar Preto - N° 38",
        "descricao": "Tênis escolar em couro sintético, cor preta, numeração 38",
        "preco": Decimal("119.90"),
        "estoque": 22,
        "categoria": "Uniformes",
        "sku": "UNI004"
    },

    # Eletrônicos
    {
        "nome": "Tablet Educacional 10 polegadas",
        "descricao": "Tablet com aplicativos educacionais pré-instalados, ideal para estudos digitais",
        "preco": Decimal("699.90"),
        "estoque": 8,
        "categoria": "Eletrônicos",
        "sku": "ELE001",
        "imagem_filename": "tablet-educacional.png"
    },
    {
        "nome": "Fones de Ouvido com Microfone",
        "descricao": "Headset para aulas online e atividades multimídia, com controle de volume",
        "preco": Decimal("89.90"),
        "estoque": 56,
        "categoria": "Eletrônicos",
        "sku": "ELE002",
        "imagem_filename": "fones-ouvido-microfone.png"
    },
    {
        "nome": "Pen Drive 32GB",
        "descricao": "Pen drive USB 3.0 de 32GB para armazenar trabalhos e projetos escolares",
        "preco": Decimal("45.90"),
        "estoque": 78,
        "categoria": "Eletrônicos",
        "sku": "ELE003"
    },
    {
        "nome": "Mouse Óptico USB",
        "descricao": "Mouse óptico com fio USB, ideal para uso com computadores e notebooks",
        "preco": Decimal("25.90"),
        "estoque": 134,
        "categoria": "Eletrônicos",
        "sku": "ELE004"
    },

    # Esportes
    {
        "nome": "Bola de Futebol Oficial",
        "descricao": "Bola de futebol oficial size 5, adequada para jogos e treinamentos escolares",
        "preco": Decimal("89.90"),
        "estoque": 26,
        "categoria": "Esportes",
        "sku": "ESP001",
        "imagem_filename": "bola-futebol-oficial.png"
    },
    {
        "nome": "Kit Raquetes de Tênis de Mesa",
        "descricao": "Conjunto com 2 raquetes, 3 bolinhas e rede para tênis de mesa",
        "preco": Decimal("125.90"),
        "estoque": 14,
        "categoria": "Esportes",
        "sku": "ESP002"
    },
    {
        "nome": "Corda de Pular Profissional",
        "descricao": "Corda de pular com cabo de aço revestido e punhos ergonômicos",
        "preco": Decimal("35.90"),
        "estoque": 67,
        "categoria": "Esportes",
        "sku": "ESP003"
    },
    {
        "nome": "Squeeze Escolar 500ml",
        "descricao": "Garrafa squeeze em plástico livre de BPA, com bico dosador",
        "preco": Decimal("22.90"),
        "estoque": 98,
        "categoria": "Esportes",
        "sku": "ESP004"
    },

    # Arte e Criatividade
    {
        "nome": "Kit Lápis de Cor (36 cores)",
        "descricao": "Conjunto de lápis de cor premium com 36 tonalidades diferentes",
        "preco": Decimal("78.90"),
        "estoque": 45,
        "categoria": "Arte",
        "sku": "ART001"
    },
    {
        "nome": "Tinta Guache (12 tubos)",
        "descricao": "Kit de tintas guache coloridas em tubos de 15ml cada, cores vibrantes",
        "preco": Decimal("42.90"),
        "estoque": 38,
        "categoria": "Arte",
        "sku": "ART002"
    },
    {
        "nome": "Papel Cartão Colorido (50 folhas)",
        "descricao": "Papel cartão em cores variadas, ideal para trabalhos manuais e colagens",
        "preco": Decimal("32.90"),
        "estoque": 72,
        "categoria": "Arte",
        "sku": "ART003"
    }
]

def criar_produtos():
    """Criar produtos no banco de dados"""
    # Criar sessão do banco
    db = SessionLocal()
    
    try:
        print("🌱 Iniciando seed do banco de dados...")
        
        # Verificar se já existem produtos
        produtos_existentes = db.query(Produto).count()
        if produtos_existentes > 0:
            print(f"⚠️  Já existem {produtos_existentes} produtos no banco.")
            resposta = input("Deseja continuar e adicionar mais produtos? (s/N): ")
            if resposta.lower() != 's':
                print("❌ Seed cancelado pelo usuário.")
                return
        
        # Criar produtos
        produtos_criados = 0
        produtos_erro = 0
        
        for produto_data in PRODUTOS_SEED:
            try:
                # Verificar se SKU já existe
                if produto_data.get('sku'):
                    existing = db.query(Produto).filter(Produto.sku == produto_data['sku']).first()
                    if existing:
                        print(f"⚠️  SKU {produto_data['sku']} já existe, pulando...")
                        continue
                
                # Criar produto
                produto = Produto(**produto_data)
                db.add(produto)
                produtos_criados += 1
                
            except Exception as e:
                print(f"❌ Erro ao criar produto {produto_data['nome']}: {e}")
                produtos_erro += 1
                continue
        
        # Confirmar transação
        db.commit()
        
        print(f"\n✅ Seed concluído com sucesso!")
        print(f"📊 Produtos criados: {produtos_criados}")
        print(f"⚠️  Produtos com erro: {produtos_erro}")
        print(f"📦 Total de produtos no banco: {db.query(Produto).count()}")
        
        # Mostrar resumo por categoria
        print(f"\n📋 Resumo por categoria:")
        categorias = db.query(Produto.categoria).distinct().all()
        for categoria in categorias:
            nome_categoria = categoria[0]
            count = db.query(Produto).filter(Produto.categoria == nome_categoria).count()
            print(f"   {nome_categoria}: {count} produtos")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro geral no seed: {e}")
        
    finally:
        db.close()

def limpar_produtos():
    """Limpar todos os produtos do banco (usar com cuidado!)"""
    db = SessionLocal()
    
    try:
        count = db.query(Produto).count()
        if count == 0:
            print("📭 Não há produtos para limpar.")
            return
        
        print(f"⚠️  ATENÇÃO: Isso irá deletar {count} produtos do banco!")
        confirmacao = input("Digite 'CONFIRMAR' para prosseguir: ")
        
        if confirmacao == "CONFIRMAR":
            db.query(Produto).delete()
            db.commit()
            print("🗑️  Todos os produtos foram removidos do banco.")
        else:
            print("❌ Operação cancelada.")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao limpar produtos: {e}")
    finally:
        db.close()

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
    print("🏪 LOJA ESCOLAR - SEED DO BANCO DE DADOS")
    print("=" * 50)
    
    # Criar tabelas se não existirem
    Base.metadata.create_all(bind=engine)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--limpar":
        limpar_produtos()
    else:
        criar_produtos()
        criar_usuario_admin()
    
    print("\n🎯 Para testar a API:")
    print("   1. Execute: uvicorn app:app --reload")
    print("   2. Acesse: http://localhost:8000/docs")
    print("   3. Teste o endpoint GET /produtos")
    print("   4. Faça login com: admin@loja.com / admin123")
    print("\n🧹 Para limpar o banco: python seed.py --limpar")
