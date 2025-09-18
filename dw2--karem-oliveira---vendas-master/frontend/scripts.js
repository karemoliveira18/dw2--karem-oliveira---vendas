/**
 * LOJA ESCOLAR - FRONTEND MAIN SCRIPT
 * Sistema de catálogo de produtos com carrinho de compras
 * Versão: 1.0.0 - Esqueleto inicial
 */

/* ========================================
   CONFIGURATION & CONSTANTS
   ======================================== */

const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',
  PRODUCTS_PER_PAGE: 9,
  COUPON_CODE: 'ALUNO10',
  COUPON_DISCOUNT: 0.10, // 10%
  THEME_STORAGE_KEY: 'loja-escolar-theme',
  SORT_STORAGE_KEY: 'loja-escolar-sort',
  CART_STORAGE_KEY: 'loja-escolar-cart'
};

/* ========================================
   GLOBAL STATE
   ======================================== */

const AppState = {
  products: [],
  filteredProducts: [],
  cart: [],
  currentPage: 1,
  totalPages: 1,
  filters: {
    search: '',
    category: '',
    sortField: 'nome',
    sortOrder: 'asc'
  },
  ui: {
    isCartOpen: false,
    isLoading: false,
    theme: 'light'
  }
};

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

/**
 * Formatação de preço para real brasileiro
 * @param {number} price - Preço em decimal
 * @returns {string} Preço formatado (ex: "R$ 29,90")
 */
function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

/**
 * Debounce para otimizar chamadas de busca
 * @param {Function} func - Função a ser executada
 * @param {number} delay - Delay em milliseconds
 * @returns {Function} Função com debounce aplicado
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Anunciar mensagem para screen readers
 * @param {string} message - Mensagem a ser anunciada
 */
function announceToScreenReader(message) {
  const element = document.getElementById('sr-announcements');
  if (element) {
    element.textContent = message;
    setTimeout(() => {
      element.textContent = '';
    }, 1000);
  }
}

/* ========================================
   LOCAL STORAGE HELPERS
   ======================================== */

const Storage = {
  /**
   * Salvar tema no localStorage
   * @param {string} theme - 'light' ou 'dark'
   */
  saveTheme(theme) {
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
  },

  /**
   * Carregar tema do localStorage
   * @returns {string} Tema salvo ou 'light' como padrão
   */
  loadTheme() {
    return localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
  },

  /**
   * Salvar configuração de ordenação
   * @param {Object} sortConfig - {field, order}
   */
  saveSortConfig(sortConfig) {
    localStorage.setItem(CONFIG.SORT_STORAGE_KEY, JSON.stringify(sortConfig));
  },

  /**
   * Carregar configuração de ordenação
   * @returns {Object} Configuração de ordenação
   */
  loadSortConfig() {
    const saved = localStorage.getItem(CONFIG.SORT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { field: 'nome', order: 'asc' };
  },

  /**
   * Salvar carrinho no localStorage
   * @param {Array} cart - Array de itens do carrinho
   */
  saveCart(cart) {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(cart));
  },

  /**
   * Carregar carrinho do localStorage
   * @returns {Array} Array de itens do carrinho
   */
  loadCart() {
    const saved = localStorage.getItem(CONFIG.CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }
};

/* ========================================
   API COMMUNICATION
   ======================================== */

const API = {
/**
 * Fazer requisição para a API (com fallback para dados mock)
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções da requisição (method, body, etc)
 * @returns {Promise} Resposta da API ou dados mock
 */
async request(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('API não disponível, usando dados mock:', error.message);
    
    // Fallback para dados mock quando API não estiver disponível
    if (endpoint === '/produtos' || endpoint.startsWith('/produtos?')) {
      return this.getMockProducts();
    } else if (endpoint === '/health') {
      return { status: 'mock', message: 'Usando dados de exemplo' };
    } else if (endpoint === '/categorias') {
      return ['Livros', 'Material Escolar', 'Uniformes', 'Eletrônicos', 'Esportes', 'Arte'];
    }
    
    throw error;
  }
},

/**
 * Dados mock para desenvolvimento sem backend
 * @returns {Array} Lista de produtos mock
 */
getMockProducts() {
  return [
    {
      id: 1,
      nome: "Matemática - 6º Ano",
      descricao: "Livro didático de matemática para ensino fundamental, com exercícios práticos e teoria completa",
      preco: 89.90,
      estoque: 45,
      categoria: "Livros",
      sku: "LIV001",
      imagem_filename: "matematica-6-ano.jpg",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      nome: "Kit Cadernos Universitários (5 unidades)",
      descricao: "Conjunto de 5 cadernos universitários de 100 folhas cada, capas variadas",
      preco: 42.90,
      estoque: 67,
      categoria: "Material Escolar",
      sku: "MAT001",
      imagem_filename: "kit-cadernos-universitarios.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 3,
      nome: "Camisa Polo Azul - Tamanho M",
      descricao: "Camisa polo em tecido piquet, cor azul marinho, tamanho médio",
      preco: 65.90,
      estoque: 34,
      categoria: "Uniformes",
      sku: "UNI001",
      imagem_filename: "camisa-polo-azul.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 4,
      nome: "Tablet Educacional 10 polegadas",
      descricao: "Tablet com aplicativos educacionais pré-instalados, ideal para estudos digitais",
      preco: 699.90,
      estoque: 8,
      categoria: "Eletrônicos",
      sku: "ELE001",
      imagem_filename: "tablet-educacional.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 5,
      nome: "Bola de Futebol Oficial",
      descricao: "Bola de futebol oficial size 5, adequada para jogos e treinamentos escolares",
      preco: 89.90,
      estoque: 26,
      categoria: "Esportes",
      sku: "ESP001",
      imagem_filename: "bola-futebol-oficial.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 6,
      nome: "Kit Lápis de Cor (36 cores)",
      descricao: "Conjunto de lápis de cor premium com 36 tonalidades diferentes",
      preco: 78.90,
      estoque: 45,
      categoria: "Arte",
      sku: "ART001",
      imagem_filename: "kit-canetas-coloridas.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 7,
      nome: "Mochila Escolar Grande",
      descricao: "Mochila resistente com compartimento para notebook, várias cores disponíveis",
      preco: 159.90,
      estoque: 24,
      categoria: "Material Escolar",
      sku: "MAT003",
      imagem_filename: "mochila-escolar-grande.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 8,
      nome: "Calculadora Científica",
      descricao: "Calculadora científica com 240 funções, ideal para matemática e física",
      preco: 89.90,
      estoque: 43,
      categoria: "Material Escolar",
      sku: "MAT005",
      imagem_filename: "calculadora-cientifica.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 9,
      nome: "História do Brasil - 9º Ano",
      descricao: "História do Brasil desde o descobrimento até os dias atuais, com mapas e ilustrações",
      preco: 78.90,
      estoque: 0, // Produto esgotado para testar
      categoria: "Livros",
      sku: "LIV003",
      imagem_filename: "historia-brasil-9-ano.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    },
    {
      id: 10,
      nome: "Fones de Ouvido com Microfone",
      descricao: "Headset para aulas online e atividades multimídia, com controle de volume",
      preco: 89.90,
      estoque: 56,
      categoria: "Eletrônicos",
      sku: "ELE002",
      imagem_filename: "fones-ouvido-microfone.png",
      criado_em: "2024-01-15T10:30:00Z",
      atualizado_em: "2024-01-15T10:30:00Z"
    }
  ];
},  /**
   * Buscar produtos com filtros
   * @param {Object} filters - Filtros de busca
   * @returns {Promise} Lista de produtos
   */
  async fetchProducts(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('categoria', filters.category);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.order) params.append('order', filters.order);

    const queryString = params.toString();
    const endpoint = `/produtos${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  },

  /**
   * Confirmar pedido do carrinho
   * @param {Object} orderData - Dados do pedido
   * @returns {Promise} Resposta do pedido confirmado
   */
  async confirmOrder(orderData) {
    return this.request('/carrinho/confirmar', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  /**
   * Verificar se API está funcionando
   * @returns {Promise} Status da API
   */
  async healthCheck() {
    return this.request('/health');
  }
};

/* ========================================
   THEME MANAGEMENT
   ======================================== */

const ThemeManager = {
  /**
   * Inicializar tema
   */
  init() {
    const savedTheme = Storage.loadTheme();
    this.setTheme(savedTheme);
    this.bindEvents();
  },

  /**
   * Definir tema
   * @param {string} theme - 'light' ou 'dark'
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.ui.theme = theme;
    
    // Atualizar ícone do botão
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
    
    Storage.saveTheme(theme);
    announceToScreenReader(`Tema alterado para ${theme === 'light' ? 'claro' : 'escuro'}`);
  },

  /**
   * Alternar tema
   */
  toggle() {
    const newTheme = AppState.ui.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  },

  /**
   * Vincular eventos do tema
   */
  bindEvents() {
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }
};

/* ========================================
   CART MANAGEMENT
   ======================================== */

const CartManager = {
  /**
   * Inicializar carrinho
   */
  init() {
    AppState.cart = Storage.loadCart();
    this.bindEvents();
    this.updateUI();
  },

  /**
   * Adicionar produto ao carrinho
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a adicionar
   */
  addProduct(productId, quantity = 1) {
    // Encontrar o produto nos dados
    const produto = AppState.products.find(p => p.id === productId);
    if (!produto) {
      console.error('Produto não encontrado:', productId);
      return;
    }
    
    // Verificar estoque
    if (produto.estoque === 0) {
      announceToScreenReader('Produto fora de estoque');
      return;
    }

    console.log('[DEBUG] addProduct start', { productId, estoqueAntes: produto.estoque, cartBefore: AppState.cart.slice() });
    
    // Verificar se já existe no carrinho
    const existingItem = AppState.cart.find(item => item.productId === productId);

    if (existingItem) {
      // Verificar se não excede o estoque
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > produto.estoque) {
        announceToScreenReader(`Quantidade máxima disponível: ${produto.estoque}`);
        return;
      }

      // Atualiza quantidade e diminui estoque localmente
      existingItem.quantity = newQuantity;
      produto.estoque -= quantity;
    } else {
      AppState.cart.push({
        productId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantity: quantity,
        estoque: produto.estoque - quantity
      });

      // Diminuir estoque no AppState.products para refletir no card
      produto.estoque -= quantity;
    }

    this.saveAndUpdate();
    // Re-renderizar produtos para atualizar o texto de estoque e desabilitar botões se necessário
    ProductsManager.renderProducts();
    console.log('[DEBUG] addProduct end', { productId, estoqueDepois: produto.estoque, cartAfter: AppState.cart.slice() });
    announceToScreenReader(`${produto.nome} adicionado ao carrinho`);
  },

  /**
   * Remover produto do carrinho
   * @param {number} productId - ID do produto
   */
  removeProduct(productId) {
    const item = AppState.cart.find(item => item.productId === productId);
    const produto = AppState.products.find(p => p.id === productId);

    if (item) {
      console.log('[DEBUG] removeProduct start', { productId, itemQuantity: item.quantity, estoqueAntes: produto ? produto.estoque : null });
      // Restaurar o estoque localmente
      if (produto) produto.estoque += item.quantity;

      AppState.cart = AppState.cart.filter(i => i.productId !== productId);
      this.saveAndUpdate();
      ProductsManager.renderProducts();
      console.log('[DEBUG] removeProduct end', { productId, estoqueDepois: produto ? produto.estoque : null, cartAfter: AppState.cart.slice() });
      announceToScreenReader(`${item.nome} removido do carrinho`);
    }
  },

  /**
   * Atualizar quantidade de um item
   * @param {number} productId - ID do produto
   * @param {number} newQuantity - Nova quantidade
   */
  updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      this.removeProduct(productId);
      return;
    }
    
    const item = AppState.cart.find(item => item.productId === productId);
    const produto = AppState.products.find(p => p.id === productId);
    
    if (item && produto) {
      // Calcular diferença entre novo e antigo
      console.log('[DEBUG] updateQuantity start', { productId, oldQuantity: item.quantity, newQuantity, estoqueAntes: produto.estoque });
      const diff = newQuantity - item.quantity;

      // Se aumentando, verificar estoque disponível
      if (diff > 0 && diff > produto.estoque) {
        announceToScreenReader(`Quantidade máxima disponível: ${produto.estoque}`);
        return;
      }

      // Atualizar quantidade e ajustar estoque local
      item.quantity = newQuantity;
      produto.estoque -= diff;

      // Se quantidade zerou, remover item e restaurar estoque caso negativo
      if (newQuantity <= 0) {
        this.removeProduct(productId);
      } else {
        this.saveAndUpdate();
        ProductsManager.renderProducts();
        console.log('[DEBUG] updateQuantity end', { productId, estoqueDepois: produto.estoque, cartAfter: AppState.cart.slice() });
        announceToScreenReader(`Quantidade atualizada para ${newQuantity}`);
      }
    }
  },

  /**
   * Calcular total do carrinho
   * @param {string} coupon - Código do cupom (opcional)
   * @returns {Object} Totais calculados
   */
  calculateTotals(coupon = null) {
    const subtotal = AppState.cart.reduce((sum, item) => {
      return sum + (item.preco * item.quantity);
    }, 0);
    
    const discount = coupon === CONFIG.COUPON_CODE ? subtotal * CONFIG.COUPON_DISCOUNT : 0;
    const total = subtotal - discount;
    
    return { 
      subtotal: parseFloat(subtotal.toFixed(2)), 
      discount: parseFloat(discount.toFixed(2)), 
      total: parseFloat(total.toFixed(2)) 
    };
  },

  /**
   * Aplicar cupom de desconto
   * @param {string} couponCode - Código do cupom
   */
  applyCoupon(couponCode) {
    // TODO: Implementar aplicação de cupom
    console.log(`TODO: Aplicar cupom: ${couponCode}`);
    
    const feedback = document.getElementById('coupon-feedback');
    if (!feedback) return;
    
    if (couponCode === CONFIG.COUPON_CODE) {
      feedback.textContent = '✅ Cupom aplicado! 10% de desconto';
      feedback.className = 'coupon-feedback text-success';
      this.updateTotalsDisplay(couponCode);
    } else {
      feedback.textContent = '❌ Cupom inválido';
      feedback.className = 'coupon-feedback text-error';
    }
  },

  /**
   * Confirmar pedido
   */
  async confirmOrder() {
    // Implementação: validar carrinho, tentar enviar ao backend (se disponível),
    // mostrar mensagem de sucesso "Parabéns — compra concluída", limpar carrinho e
    // atualizar a interface.
    console.log('[DEBUG] confirmOrder called', AppState.cart);

    if (AppState.cart.length === 0) {
      ToastManager.error('Seu carrinho está vazio. Adicione produtos antes de confirmar.');
      return;
    }

    // Preparar dados do pedido
    const orderData = {
      itens: AppState.cart.map(item => ({
        produto_id: item.productId,
        quantidade: item.quantity
      })),
      cupom: null
    };

    // Mostrar loading visual mínimo no botão de confirmar
    const confirmBtn = document.getElementById('confirm-order');
    const originalBtnText = confirmBtn ? confirmBtn.textContent : null;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Confirmando...';
    }

    try {
      // Tentar enviar para o backend quando disponível
      let result = null;
      try {
        result = await API.confirmOrder(orderData);
      } catch (err) {
        // API não disponível ou falhou — log e continuar com fluxo simulado
        console.warn('[WARN] confirmOrder: backend unavailable, proceeding locally', err);
        result = { success: true, message: 'Simulated success (offline)' };
      }

      if (result && result.success) {
        // Mostrar feedback de sucesso para o usuário
        ToastManager.success('Parabéns — compra concluída', 5000);
        announceToScreenReader('Compra concluída com sucesso');

        // Limpar carrinho localmente
        AppState.cart = [];
        CartManager.saveAndUpdate();

        // Fechar drawer do carrinho se aberto
        if (AppState.ui.isCartOpen) {
          this.toggleDrawer();
        }

        console.log('[INFO] Pedido confirmado', result);
      } else {
        const errMsg = (result && result.message) ? result.message : 'Erro ao confirmar pedido';
        ToastManager.error(errMsg, 5000);
        console.error('confirmOrder failed', result);
      }
    } catch (error) {
      console.error('Erro ao confirmar pedido (fatal):', error);
      ToastManager.error('Erro ao confirmar pedido. Tente novamente.');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalBtnText || 'Confirmar pedido';
      }
    }
  },

  /**
   * Abrir/fechar drawer do carrinho
   */
  toggleDrawer() {
    AppState.ui.isCartOpen = !AppState.ui.isCartOpen;
    const drawer = document.getElementById('cart-drawer');
    
    if (drawer) {
      if (AppState.ui.isCartOpen) {
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        // TODO: Focar no título do carrinho
      } else {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
      }
    }
  },

  /**
   * Salvar carrinho e atualizar UI
   */
  saveAndUpdate() {
    Storage.saveCart(AppState.cart);
    this.updateUI();
  },

  /**
   * Atualizar interface do carrinho
   */
  updateUI() {
    this.updateCartBadge();
    this.updateCartDrawer();
    this.updateTotalsDisplay();
  },

  /**
   * Atualizar badge do carrinho
   */
  updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.textContent = totalItems;
      badge.setAttribute('aria-label', `${totalItems} itens no carrinho`);
    }
  },

  /**
   * Atualizar conteúdo do drawer do carrinho
   */
  updateCartDrawer() {
    const cartItemsContainer = document.getElementById('cart-items');
    const confirmButton = document.getElementById('confirm-order');
    
    if (!cartItemsContainer) return;
    
    if (AppState.cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <p>Seu carrinho está vazio</p>
          <p class="cart-empty__hint">Adicione produtos para continuar</p>
        </div>
      `;
      if (confirmButton) confirmButton.disabled = true;
      return;
    }
    
    // Renderizar itens do carrinho
    const itemsHtml = AppState.cart.map(item => this.createCartItemHtml(item)).join('');
    cartItemsContainer.innerHTML = `<div class="cart-items-list">${itemsHtml}</div>`;
    
    // Habilitar botão de confirmação
    if (confirmButton) confirmButton.disabled = false;
    
    // Vincular eventos dos itens
    this.bindCartItemEvents();
  },

  /**
   * Criar HTML de um item do carrinho
   * @param {Object} item - Item do carrinho
   * @returns {string} HTML do item
   */
  createCartItemHtml(item) {
    const subtotal = item.preco * item.quantity;
    
    return `
      <div class="cart-item" data-product-id="${item.productId}">
        <div class="cart-item__info">
          <h4 class="cart-item__name">${item.nome}</h4>
          <p class="cart-item__price">${formatPrice(item.preco)} cada</p>
        </div>
        
        <div class="cart-item__controls">
          <div class="quantity-controls">
            <button 
              type="button" 
              class="quantity-btn quantity-decrease" 
              data-product-id="${item.productId}"
              aria-label="Diminuir quantidade de ${item.nome}"
            >
              -
            </button>
            
            <span class="quantity-display" aria-label="Quantidade: ${item.quantity}">
              ${item.quantity}
            </span>
            
            <button 
              type="button" 
              class="quantity-btn quantity-increase" 
              data-product-id="${item.productId}"
              aria-label="Aumentar quantidade de ${item.nome}"
              ${item.quantity >= item.estoque ? 'disabled' : ''}
            >
              +
            </button>
          </div>
          
          <div class="cart-item__subtotal">
            ${formatPrice(subtotal)}
          </div>
          
          <button 
            type="button" 
            class="cart-item__remove" 
            data-product-id="${item.productId}"
            aria-label="Remover ${item.nome} do carrinho"
            title="Remover item"
          >
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Vincular eventos dos itens do carrinho
   */
  bindCartItemEvents() {
    // Botões de aumentar quantidade
    document.querySelectorAll('.quantity-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = parseInt(e.target.dataset.productId);
        const item = AppState.cart.find(item => item.productId === productId);
        if (item && item.quantity < item.estoque) {
          this.updateQuantity(productId, item.quantity + 1);
        }
      });
    });
    
    // Botões de diminuir quantidade
    document.querySelectorAll('.quantity-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = parseInt(e.target.dataset.productId);
        const item = AppState.cart.find(item => item.productId === productId);
        if (item) {
          this.updateQuantity(productId, item.quantity - 1);
        }
      });
    });
    
    // Botões de remover
    document.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = parseInt(e.target.dataset.productId);
        this.removeProduct(productId);
      });
    });
  },

  /**
   * Atualizar exibição dos totais
   * @param {string} coupon - Cupom aplicado (opcional)
   */
  updateTotalsDisplay(coupon = null) {
    const totals = this.calculateTotals(coupon);
    
    // TODO: Atualizar elementos de total na interface
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
    if (discountEl) discountEl.textContent = `- ${formatPrice(totals.discount)}`;
    if (totalEl) totalEl.textContent = formatPrice(totals.total);
    
    // Mostrar/ocultar linha de desconto
    const discountRow = document.querySelector('.cart-discount');
    if (discountRow) {
      discountRow.style.display = totals.discount > 0 ? 'flex' : 'none';
    }
  },

  /**
   * Vincular eventos do carrinho
   */
  bindEvents() {
    // Toggle do carrinho
    const cartToggle = document.querySelector('.cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', () => this.toggleDrawer());
    }
    
    // Fechar carrinho
    const cartClose = document.querySelector('.cart-drawer__close');
    if (cartClose) {
      cartClose.addEventListener('click', () => this.toggleDrawer());
    }
    
    // Fechar ao clicar no backdrop
    const backdrop = document.querySelector('.cart-drawer__backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.toggleDrawer());
    }
    
    // Fechar com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && AppState.ui.isCartOpen) {
        this.toggleDrawer();
      }
    });
    
    // Aplicar cupom
    const applyCouponBtn = document.getElementById('apply-coupon');
    if (applyCouponBtn) {
      applyCouponBtn.addEventListener('click', () => {
        const couponInput = document.getElementById('coupon-input');
        if (couponInput) {
          this.applyCoupon(couponInput.value.trim().toUpperCase());
        }
      });
    }
    
    // Confirmar pedido
    const confirmBtn = document.getElementById('confirm-order');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmOrder());
    }
  }
};

/* ========================================
   PRODUCTS MANAGEMENT
   ======================================== */

const ProductsManager = {
  /**
   * Inicializar gerenciamento de produtos
   */
  async init() {
    this.bindEvents();
    this.loadSortConfig();
    await this.loadProducts();
  },

  /**
   * Carregar produtos da API
   */
  async loadProducts() {
    try {
      AppState.ui.isLoading = true;
      this.showLoading();
      
      // Carregar produtos (com fallback para mock)
      const products = await API.fetchProducts(AppState.filters);
      
      AppState.products = products;
  console.log('[DEBUG] products loaded', AppState.products);
      this.applyFilters();
      this.renderProducts();
      
      // Carregar categorias para o filtro
      await this.loadCategories();
      
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      this.showError('Erro ao carregar produtos. Verifique sua conexão.');
    } finally {
      AppState.ui.isLoading = false;
      this.hideLoading();
    }
  },

  /**
   * Carregar categorias para o filtro
   */
  async loadCategories() {
    try {
      const categories = await API.request('/categorias');
      const categorySelect = document.getElementById('category-filter');
      
      if (categorySelect && categories.length > 0) {
        // Manter opção "Todas as categorias"
        const currentOptions = categorySelect.innerHTML;
        const categoryOptions = categories.map(cat => 
          `<option value="${cat}">${cat}</option>`
        ).join('');
        
        categorySelect.innerHTML = currentOptions + categoryOptions;
      }
    } catch (error) {
      console.warn('Não foi possível carregar categorias:', error);
    }
  },

  /**
   * Aplicar filtros aos produtos
   */
  applyFilters() {
    let filtered = [...AppState.products];
    
    // Filtro de busca
    if (AppState.filters.search) {
      const search = AppState.filters.search.toLowerCase();
      filtered = filtered.filter(product => 
        product.nome.toLowerCase().includes(search) ||
        (product.descricao && product.descricao.toLowerCase().includes(search))
      );
    }
    
    // Filtro de categoria
    if (AppState.filters.category) {
      filtered = filtered.filter(product => 
        product.categoria === AppState.filters.category
      );
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      const field = AppState.filters.sortField;
      const order = AppState.filters.sortOrder;
      
      let compareResult = 0;
      
      if (field === 'preco') {
        compareResult = a.preco - b.preco;
      } else {
        compareResult = a[field].localeCompare(b[field], 'pt-BR');
      }
      
      return order === 'desc' ? -compareResult : compareResult;
    });
    
    AppState.filteredProducts = filtered;
    this.updatePagination();
  },

  /**
   * Atualizar paginação
   */
  updatePagination() {
    const totalProducts = AppState.filteredProducts.length;
    AppState.totalPages = Math.ceil(totalProducts / CONFIG.PRODUCTS_PER_PAGE);
    
    // Ajustar página atual se necessário
    if (AppState.currentPage > AppState.totalPages) {
      AppState.currentPage = Math.max(1, AppState.totalPages);
    }
    
    this.updatePaginationUI();
  },

  /**
   * Renderizar produtos na grade
   */
  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    const startIndex = (AppState.currentPage - 1) * CONFIG.PRODUCTS_PER_PAGE;
    const endIndex = startIndex + CONFIG.PRODUCTS_PER_PAGE;
    const productsToShow = AppState.filteredProducts.slice(startIndex, endIndex);
    
    if (productsToShow.length === 0) {
      grid.innerHTML = '<div class="loading">Nenhum produto encontrado</div>';
      return;
    }
    
    // Renderizar cards de produtos
    const cardsHtml = productsToShow.map(produto => this.createProductCard(produto)).join('');
    grid.innerHTML = cardsHtml;
    
    // Vincular eventos dos botões de adicionar
    this.bindProductEvents();
  },

  /**
   * Criar HTML do card de produto
   * @param {Object} produto - Dados do produto
   * @returns {string} HTML do card
   */
  createProductCard(produto) {
    const isOutOfStock = produto.estoque === 0;
    const stockText = isOutOfStock ? 'Esgotado' : `${produto.estoque} em estoque`;
    const stockClass = isOutOfStock ? 'text-error' : 'text-muted';
    
    // Definir imagem do produto (usar imagem real se disponível, senão placeholder)
    const productImage = produto.imagem_filename 
      ? `images/${produto.imagem_filename}` 
      : `https://via.placeholder.com/280x200/0EA5E9/FFFFFF?text=${encodeURIComponent(produto.nome)}`;
    
    return `
      <article class="product-card" data-product-id="${produto.id}">
        <div class="product-card__image">
          <img 
            src="${productImage}" 
            alt="${produto.nome}"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/280x200/0EA5E9/FFFFFF?text=${encodeURIComponent(produto.nome)}'"
          />
          ${isOutOfStock ? '<div class="product-card__badge product-card__badge--out-of-stock">Esgotado</div>' : ''}
        </div>
        
        <div class="product-card__content">
          <div class="product-card__category">
            <span class="product-category">${produto.categoria}</span>
          </div>
          
          <h3 class="product-card__title">${produto.nome}</h3>
          
          ${produto.descricao ? `
            <p class="product-card__description">${produto.descricao}</p>
          ` : ''}
          
          <div class="product-card__details">
            <div class="product-card__price">
              <span class="product-price">${formatPrice(produto.preco)}</span>
            </div>
            
            <div class="product-card__stock">
              <span class="${stockClass}">${stockText}</span>
            </div>
          </div>
          
          <div class="product-card__actions">
            <button 
              type="button" 
              class="btn btn--primary product-add-btn" 
              data-product-id="${produto.id}"
              ${isOutOfStock ? 'disabled' : ''}
              aria-label="Adicionar ${produto.nome} ao carrinho"
            >
              <span class="btn-icon" aria-hidden="true">🛒</span>
              ${isOutOfStock ? 'Indisponível' : 'Adicionar'}
            </button>
          </div>
        </div>
      </article>
    `;
  },

  /**
   * Vincular eventos dos produtos
   */
  bindProductEvents() {
    const grid = document.getElementById('products-grid');

    if (!grid) return;

    // Usar event delegation para capturar cliques nos botões de adicionar (ou em seus filhos)
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.product-add-btn');
      if (!btn) return;

      const productId = parseInt(btn.dataset.productId);
      console.log('[DEBUG] product add clicked', { productId });

      if (productId) {
        CartManager.addProduct(productId, 1);

        // Feedback visual temporário
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span aria-hidden="true">✓</span> Adicionado';
        btn.disabled = true;

        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 1500);
      }
    });
  },

  /**
   * Atualizar interface de paginação
   */
  updatePaginationUI() {
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (currentPageEl) currentPageEl.textContent = AppState.currentPage;
    if (totalPagesEl) totalPagesEl.textContent = AppState.totalPages;
    
    if (prevBtn) {
      prevBtn.disabled = AppState.currentPage <= 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = AppState.currentPage >= AppState.totalPages;
    }
  },

  /**
   * Carregar configuração de ordenação salva
   */
  loadSortConfig() {
    const saved = Storage.loadSortConfig();
    AppState.filters.sortField = saved.field;
    AppState.filters.sortOrder = saved.order;
    
    // Atualizar select de ordenação
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = `${saved.field}-${saved.order}`;
    }
  },

  /**
   * Mostrar loading
   */
  showLoading() {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = '<div class="loading" aria-live="polite">Carregando produtos...</div>';
    }
  },

  /**
   * Esconder loading
   */
  hideLoading() {
    // Loading será substituído pelos produtos em renderProducts()
  },

  /**
   * Mostrar erro
   * @param {string} message - Mensagem de erro
   */
  showError(message) {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `<div class="loading text-error">${message}</div>`;
    }
  },

  /**
   * Vincular eventos de produtos
   */
  bindEvents() {
    // Busca com debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      const debouncedSearch = debounce((value) => {
        AppState.filters.search = value;
        AppState.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      }, 300);
      
      searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });
    }
    
    // Filtro de categoria
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        AppState.filters.category = e.target.value;
        AppState.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      });
    }
    
    // Ordenação
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, order] = e.target.value.split('-');
        AppState.filters.sortField = field;
        AppState.filters.sortOrder = order;
        
        Storage.saveSortConfig({ field, order });
        
        this.applyFilters();
        this.renderProducts();
      });
    }
    
    // Paginação
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (AppState.currentPage > 1) {
          AppState.currentPage--;
          this.renderProducts();
          this.updatePaginationUI();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (AppState.currentPage < AppState.totalPages) {
          AppState.currentPage++;
          this.renderProducts();
          this.updatePaginationUI();
        }
      });
    }
    
    // Export
    const exportCsvBtn = document.getElementById('export-csv');
    const exportJsonBtn = document.getElementById('export-json');
    
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
    }
    
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => this.exportData('json'));
    }
  },

  /**
   * Exportar dados dos produtos filtrados
   * @param {string} format - 'csv' ou 'json'
   */
  exportData(format) {
    // TODO: Implementar export de dados
    console.log(`TODO: Exportar dados em formato ${format}`, AppState.filteredProducts);
    announceToScreenReader(`Exportando ${AppState.filteredProducts.length} produtos em formato ${format.toUpperCase()}`);
  }
};

/* ========================================
   TOAST NOTIFICATIONS
   ======================================== */

const ToastManager = {
  /**
   * Mostrar toast de notificação
   * @param {string} message - Mensagem do toast
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duração em ms (0 = permanente)
   */
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="toast__content">
        <span class="toast__icon" aria-hidden="true">${icons[type]}</span>
        <span class="toast__message">${message}</span>
        <button type="button" class="toast__close" aria-label="Fechar notificação">✕</button>
      </div>
    `;
    
    // Adicionar ao container
    container.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });
    
    // Evento de fechar
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => this.hide(toast));
    
    // Auto-remover
    if (duration > 0) {
      setTimeout(() => this.hide(toast), duration);
    }
    
    return toast;
  },
  
  /**
   * Esconder toast
   * @param {HTMLElement} toast - Elemento do toast
   */
  hide(toast) {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hiding');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },
  
  // Métodos de conveniência
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }
};

/* ========================================
   APP INITIALIZATION
   ======================================== */

/**
 * Inicializar aplicação
 */
async function initApp() {
  console.log('🚀 Inicializando Loja Escolar...');
  
  try {
    // Verificar se API está funcionando
    const healthStatus = await API.healthCheck();
    
    if (healthStatus.status === 'mock') {
      ToastManager.warning('Usando dados de exemplo - Backend não conectado', 5000);
      console.log('⚠️ Usando dados mock');
    } else {
      ToastManager.success('Conectado ao servidor com sucesso');
      console.log('✅ API conectada com sucesso');
    }
    
    // Inicializar módulos
    ThemeManager.init();
    CartManager.init();
    await ProductsManager.init();
    
    // Inicializar autenticação
    window.authUIManager = new AuthUIManager();
    
    // Notificar sobre modo mock de autenticação
    if (authManager.useMockData) {
      ToastManager.info('Sistema de autenticação em modo demonstração', 4000);
    }
    
    console.log('✅ Aplicação inicializada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    ToastManager.error('Erro ao inicializar aplicação');
    
    // Mostrar mensagem de erro para o usuário
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="loading text-error">
          <p>❌ Erro ao carregar aplicação</p>
          <p class="text-muted">Recarregue a página ou verifique sua conexão</p>
        </div>
      `;
    }
  }
}

/* ========================================
   AUTHENTICATION UI MANAGER
   ======================================== */

class AuthUIManager {
  constructor() {
    this.initElements();
    this.bindEvents();
    this.setupAuthListeners();
  }

  initElements() {
    // Auth buttons
    this.loginBtn = document.getElementById('login-btn');
    this.registerBtn = document.getElementById('register-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    
    // User area
    this.userLoggedOut = document.getElementById('user-logged-out');
    this.userLoggedIn = document.getElementById('user-logged-in');
    this.userMenuToggle = document.getElementById('user-menu-toggle');
    this.userMenuDropdown = document.getElementById('user-menu-dropdown');
    this.userName = document.getElementById('user-name');
    this.userAvatar = document.getElementById('user-avatar');
    this.profileLink = document.getElementById('profile-link');
    
    // Modals
    this.loginModal = document.getElementById('login-modal');
    this.registerModal = document.getElementById('register-modal');
    this.profileModal = document.getElementById('profile-modal');
    
    // Forms
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.profileForm = document.getElementById('profile-form');
    
    // Switch buttons
    this.switchToRegister = document.getElementById('switch-to-register');
    this.switchToLogin = document.getElementById('switch-to-login');
    
    // Avatar upload
    this.avatarUpload = document.getElementById('avatar-upload');
    this.changeAvatarBtn = document.getElementById('change-avatar-btn');
    this.cancelProfileEdit = document.getElementById('cancel-profile-edit');
  }

  bindEvents() {
    // Modal controls
    this.loginBtn?.addEventListener('click', () => this.openModal('login'));
    this.registerBtn?.addEventListener('click', () => this.openModal('register'));
    this.profileLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openModal('profile');
    });
    
    // Close modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__backdrop') || 
          e.target.classList.contains('modal__close')) {
        this.closeModals();
      }
    });
    
    // User menu toggle
    this.userMenuToggle?.addEventListener('click', () => this.toggleUserMenu());
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        this.closeUserMenu();
      }
    });
    
    // Form submissions
    this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    this.registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
    this.profileForm?.addEventListener('submit', (e) => this.handleProfileUpdate(e));
    
    // Modal switches
    this.switchToRegister?.addEventListener('click', () => {
      this.closeModals();
      this.openModal('register');
    });
    this.switchToLogin?.addEventListener('click', () => {
      this.closeModals();
      this.openModal('login');
    });
    
    // Avatar upload
    this.changeAvatarBtn?.addEventListener('click', () => {
      this.avatarUpload?.click();
    });
    this.avatarUpload?.addEventListener('change', (e) => this.handleAvatarUpload(e));
    
    // Cancel profile edit
    this.cancelProfileEdit?.addEventListener('click', () => this.closeModals());
    
    // Logout
    this.logoutBtn?.addEventListener('click', () => this.handleLogout());
  }

  setupAuthListeners() {
    // Listen for auth state changes
    authManager.addListener((authState) => {
      this.updateUIForAuthState(authState);
    });
    
    // Initial UI update
    this.updateUIForAuthState({
      isAuthenticated: authManager.isAuthenticated(),
      user: authManager.getUser(),
      token: authManager.getToken()
    });
  }

  updateUIForAuthState(authState) {
    if (authState.isAuthenticated && authState.user) {
      // Show logged in state
      this.userLoggedOut.style.display = 'none';
      this.userLoggedIn.style.display = 'block';
      
      // Update user info
      this.userName.textContent = authState.user.nome;
      
      // Update avatar
      if (authState.user.avatar_filename) {
        // Verificar se é avatar mock
        const mockAvatarUrl = localStorage.getItem(`avatar_${authState.user.avatar_filename}`);
        if (mockAvatarUrl) {
          this.userAvatar.src = mockAvatarUrl;
        } else {
          this.userAvatar.src = `http://localhost:8000/uploads/avatars/${authState.user.avatar_filename}`;
        }
        this.userAvatar.style.display = 'block';
      } else {
        this.userAvatar.style.display = 'none';
      }
    } else {
      // Show logged out state
      this.userLoggedOut.style.display = 'flex';
      this.userLoggedIn.style.display = 'none';
    }
  }

  openModal(type) {
    this.closeModals();
    
    switch (type) {
      case 'login':
        this.loginModal.style.display = 'flex';
        break;
      case 'register':
        this.registerModal.style.display = 'flex';
        break;
      case 'profile':
        this.loadProfileData();
        this.profileModal.style.display = 'flex';
        break;
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeModals() {
    this.loginModal.style.display = 'none';
    this.registerModal.style.display = 'none';
    this.profileModal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear forms
    this.loginForm?.reset();
    this.registerForm?.reset();
  }

  toggleUserMenu() {
    const isOpen = this.userMenuDropdown.classList.contains('open');
    if (isOpen) {
      this.closeUserMenu();
    } else {
      this.openUserMenu();
    }
  }

  openUserMenu() {
    this.userMenuDropdown.classList.add('open');
    this.userMenuToggle.setAttribute('aria-expanded', 'true');
  }

  closeUserMenu() {
    this.userMenuDropdown.classList.remove('open');
    this.userMenuToggle.setAttribute('aria-expanded', 'false');
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Basic validation
    if (!authManager.validateEmail(email)) {
      ToastManager.show('E-mail inválido', 'error');
      return;
    }
    
    if (!authManager.validatePassword(password)) {
      ToastManager.show('Senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Entrando...';
    submitBtn.disabled = true;
    
    try {
      const result = await authManager.login(email, password);
      
      if (result.success) {
        ToastManager.show('Login realizado com sucesso!', 'success');
        this.closeModals();
      } else {
        ToastManager.show(result.error, 'error');
      }
    } catch (error) {
      ToastManager.show('Erro no login. Tente novamente.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const formData = {
      email: document.getElementById('register-email').value,
      senha: document.getElementById('register-password').value,
      nome: document.getElementById('register-name').value,
      telefone: document.getElementById('register-phone').value || null,
      endereco: document.getElementById('register-address').value || null
    };
    
    // Basic validation
    if (!authManager.validateEmail(formData.email)) {
      toastManager.show('E-mail inválido', 'error');
      return;
    }
    
    if (!authManager.validatePassword(formData.senha)) {
      toastManager.show('Senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    
    if (!authManager.validateName(formData.nome)) {
      toastManager.show('Nome deve ter pelo menos 2 caracteres', 'error');
      return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Criando conta...';
    submitBtn.disabled = true;
    
    try {
      const result = await authManager.register(formData);
      
      if (result.success) {
        toastManager.show('Conta criada com sucesso!', 'success');
        this.closeModals();
      } else {
        toastManager.show(result.error, 'error');
      }
    } catch (error) {
      toastManager.show('Erro no registro. Tente novamente.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async loadProfileData() {
    const user = authManager.getUser();
    if (!user) return;
    
    // Fill form with current user data
    document.getElementById('profile-name').value = user.nome || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.telefone || '';
    document.getElementById('profile-address').value = user.endereco || '';
    
    // Update avatar display
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const avatarInitials = document.getElementById('profile-avatar-initials');
    
    if (user.avatar_filename) {
      // Verificar se é avatar mock
      const mockAvatarUrl = localStorage.getItem(`avatar_${user.avatar_filename}`);
      if (mockAvatarUrl) {
        avatarImg.src = mockAvatarUrl;
      } else {
        avatarImg.src = `http://localhost:8000/uploads/avatars/${user.avatar_filename}`;
      }
      avatarImg.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarPlaceholder.style.display = 'flex';
      avatarInitials.textContent = user.nome ? user.nome.charAt(0).toUpperCase() : 'U';
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = {
      nome: document.getElementById('profile-name').value,
      telefone: document.getElementById('profile-phone').value || null,
      endereco: document.getElementById('profile-address').value || null
    };
    
    // Basic validation
    if (!authManager.validateName(formData.nome)) {
      toastManager.show('Nome deve ter pelo menos 2 caracteres', 'error');
      return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Salvando...';
    submitBtn.disabled = true;
    
    try {
      const result = await authManager.updateProfile(formData);
      
      if (result.success) {
        toastManager.show('Perfil atualizado com sucesso!', 'success');
        this.closeModals();
      } else {
        toastManager.show(result.error, 'error');
      }
    } catch (error) {
      toastManager.show('Erro ao atualizar perfil. Tente novamente.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastManager.show('Arquivo deve ser uma imagem', 'error');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toastManager.show('Arquivo muito grande. Máximo 5MB', 'error');
      return;
    }
    
    try {
      const result = await authManager.uploadAvatar(file);
      
      if (result.success) {
        toastManager.show('Avatar atualizado com sucesso!', 'success');
        this.loadProfileData(); // Reload profile data to show new avatar
      } else {
        toastManager.show(result.error, 'error');
      }
    } catch (error) {
      toastManager.show('Erro no upload. Tente novamente.', 'error');
    }
  }

  async handleLogout() {
    try {
      await authManager.logout();
      toastManager.show('Logout realizado com sucesso!', 'success');
      this.closeUserMenu();
    } catch (error) {
      toastManager.show('Erro no logout', 'error');
    }
  }
}

/* ========================================
   DOM READY
   ======================================== */

// Aguardar DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// TODO: Implementar módulos separados (api.js, cart.js, ui.js, filters.js)
// TODO: Implementar toast notifications
// TODO: Implementar validações de formulário
// TODO: Implementar cards de produto
// TODO: Implementar modal de administração de produtos
// TODO: Implementar animações e transições
// TODO: Implementar tratamento de erros mais robusto
// TODO: Implementar testes unitários
// TODO: Otimizar performance e acessibilidade
