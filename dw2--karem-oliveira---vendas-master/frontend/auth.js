/**
 * Gerenciador de Autenticação - Frontend
 * Responsável por login, registro, tokens JWT e estado do usuário
 */

class AuthManager {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.token = localStorage.getItem('auth_token');
        this.user = this.loadUserFromStorage();
        this.listeners = [];
        this.useMockData = true; // Usar dados mock quando backend não disponível
        this.mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        
        // Criar usuário admin padrão se não existir
        this.initMockAdmin();
    }

    // ========== GERENCIAMENTO DE TOKEN ==========

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
        this.notifyListeners();
    }

    getToken() {
        return this.token;
    }

    getAuthHeaders() {
        if (!this.token) return {};
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // ========== GERENCIAMENTO DE USUÁRIO ==========

    setUser(user) {
        this.user = user;
        if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('auth_user');
        }
        this.notifyListeners();
    }

    getUser() {
        return this.user;
    }

    loadUserFromStorage() {
        const userData = localStorage.getItem('auth_user');
        return userData ? JSON.parse(userData) : null;
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.user && this.user.is_admin;
    }

    // ========== EVENTOS ==========

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback({
            isAuthenticated: this.isAuthenticated(),
            user: this.user,
            token: this.token
        }));
    }

    // ========== API CALLS ==========

    async register(userData) {
        try {
            // Tentar backend real primeiro
            if (!this.useMockData) {
                const response = await fetch(`${this.baseURL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Erro no registro');
                }

                // Salvar token e dados do usuário
                this.setToken(data.access_token);
                this.setUser(data.user);

                return { success: true, data };
            }

            // Fallback para dados mock
            return this.registerMock(userData);

        } catch (error) {
            console.error('Erro no registro, usando mock:', error);
            // Se falhar, usar mock
            return this.registerMock(userData);
        }
    }

    registerMock(userData) {
        // Verificar se email já existe
        const existingUser = this.mockUsers.find(u => u.email === userData.email);
        if (existingUser) {
            return { success: false, error: 'Email já está cadastrado' };
        }

        // Criar novo usuário mock
        const newUser = {
            id: Date.now(),
            email: userData.email,
            nome: userData.nome,
            telefone: userData.telefone || null,
            endereco: userData.endereco || null,
            avatar_filename: null,
            is_admin: false,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        // Salvar senha (em produção seria hash)
        this.mockUsers.push({
            ...newUser,
            senha: userData.senha
        });
        localStorage.setItem('mock_users', JSON.stringify(this.mockUsers));

        // Gerar token mock
        const token = `mock_token_${Date.now()}`;
        
        // Salvar token e usuário
        this.setToken(token);
        this.setUser(newUser);

        return { 
            success: true, 
            data: { 
                access_token: token,
                token_type: 'bearer',
                user: newUser 
            } 
        };
    }

    async login(email, password) {
        try {
            // Tentar backend real primeiro
            if (!this.useMockData) {
                const response = await fetch(`${this.baseURL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, senha: password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Erro no login');
                }

                // Salvar token e dados do usuário
                this.setToken(data.access_token);
                this.setUser(data.user);

                return { success: true, data };
            }

            // Fallback para dados mock
            return this.loginMock(email, password);

        } catch (error) {
            console.error('Erro no login, usando mock:', error);
            // Se falhar, usar mock
            return this.loginMock(email, password);
        }
    }

    loginMock(email, password) {
        // Procurar usuário nos dados mock
        const user = this.mockUsers.find(u => u.email === email && u.senha === password);
        
        if (!user) {
            return { success: false, error: 'Email ou senha incorretos' };
        }

        // Gerar token mock
        const token = `mock_token_${Date.now()}`;
        
        // Criar dados do usuário (sem senha)
        const userData = {
            id: user.id,
            email: user.email,
            nome: user.nome,
            telefone: user.telefone,
            endereco: user.endereco,
            avatar_filename: user.avatar_filename,
            is_admin: user.is_admin,
            criado_em: user.criado_em,
            atualizado_em: user.atualizado_em
        };

        // Salvar token e usuário
        this.setToken(token);
        this.setUser(userData);

        return { 
            success: true, 
            data: { 
                access_token: token,
                token_type: 'bearer',
                user: userData 
            } 
        };
    }

    async logout() {
        this.setToken(null);
        this.setUser(null);
        return { success: true };
    }

    async getProfile() {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Não autenticado' };
        }

        try {
            const response = await fetch(`${this.baseURL}/users/me`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Erro ao buscar perfil');
            }

            // Atualizar dados do usuário
            this.setUser(data);

            return { success: true, data };

        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            
            // Se token inválido, fazer logout
            if (error.message.includes('Token') || error.message.includes('401')) {
                this.logout();
            }
            
            return { success: false, error: error.message };
        }
    }

    async updateProfile(profileData) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Não autenticado' };
        }

        try {
            // Tentar backend real primeiro
            if (!this.useMockData) {
                const response = await fetch(`${this.baseURL}/users/me`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(profileData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Erro ao atualizar perfil');
                }

                // Atualizar dados do usuário
                this.setUser(data);

                return { success: true, data };
            }

            // Fallback para dados mock
            return this.updateProfileMock(profileData);

        } catch (error) {
            console.error('Erro ao atualizar perfil, usando mock:', error);
            // Se falhar, usar mock
            return this.updateProfileMock(profileData);
        }
    }

    async uploadAvatar(file) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Não autenticado' };
        }

        try {
            // Tentar backend real primeiro
            if (!this.useMockData) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${this.baseURL}/users/avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Erro no upload');
                }

                // Atualizar perfil para obter novo avatar
                await this.getProfile();

                return { success: true, data };
            }

            // Fallback para dados mock
            return this.uploadAvatarMock(file);

        } catch (error) {
            console.error('Erro no upload de avatar, usando mock:', error);
            // Se falhar, usar mock
            return this.uploadAvatarMock(file);
        }
    }

    // ========== MÉTODOS MOCK ==========

    initMockAdmin() {
        const adminExists = this.mockUsers.find(u => u.email === 'admin@loja.com');
        if (!adminExists) {
            const admin = {
                id: 1,
                email: 'admin@loja.com',
                senha: 'admin123',
                nome: 'Administrador',
                telefone: '(11) 99999-9999',
                endereco: 'Rua da Loja, 123 - Centro',
                avatar_filename: null,
                is_admin: true,
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };
            this.mockUsers.push(admin);
            localStorage.setItem('mock_users', JSON.stringify(this.mockUsers));
        }
    }

    async updateProfileMock(profileData) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Não autenticado' };
        }

        // Encontrar usuário nos dados mock
        const userIndex = this.mockUsers.findIndex(u => u.id === this.user.id);
        if (userIndex === -1) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        // Atualizar dados
        this.mockUsers[userIndex] = {
            ...this.mockUsers[userIndex],
            nome: profileData.nome || this.mockUsers[userIndex].nome,
            telefone: profileData.telefone || this.mockUsers[userIndex].telefone,
            endereco: profileData.endereco || this.mockUsers[userIndex].endereco,
            atualizado_em: new Date().toISOString()
        };

        // Salvar no localStorage
        localStorage.setItem('mock_users', JSON.stringify(this.mockUsers));

        // Atualizar usuário atual
        const updatedUser = {
            id: this.mockUsers[userIndex].id,
            email: this.mockUsers[userIndex].email,
            nome: this.mockUsers[userIndex].nome,
            telefone: this.mockUsers[userIndex].telefone,
            endereco: this.mockUsers[userIndex].endereco,
            avatar_filename: this.mockUsers[userIndex].avatar_filename,
            is_admin: this.mockUsers[userIndex].is_admin,
            criado_em: this.mockUsers[userIndex].criado_em,
            atualizado_em: this.mockUsers[userIndex].atualizado_em
        };

        this.setUser(updatedUser);

        return { success: true, data: updatedUser };
    }

    async uploadAvatarMock(file) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Não autenticado' };
        }

        // Simular upload criando URL do arquivo
        const avatarUrl = URL.createObjectURL(file);
        const filename = `avatar_${this.user.id}_${Date.now()}.jpg`;

        // Encontrar usuário nos dados mock
        const userIndex = this.mockUsers.findIndex(u => u.id === this.user.id);
        if (userIndex === -1) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        // Atualizar dados
        this.mockUsers[userIndex].avatar_filename = filename;
        this.mockUsers[userIndex].atualizado_em = new Date().toISOString();

        // Salvar no localStorage
        localStorage.setItem('mock_users', JSON.stringify(this.mockUsers));
        localStorage.setItem(`avatar_${filename}`, avatarUrl);

        // Atualizar usuário atual
        const updatedUser = { ...this.user, avatar_filename: filename };
        this.setUser(updatedUser);

        return { 
            success: true, 
            data: { 
                message: 'Avatar enviado com sucesso (mock)', 
                avatar_filename: filename 
            } 
        };
    }

    // ========== VALIDAÇÕES ==========

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password && password.length >= 6;
    }

    validateName(name) {
        return name && name.trim().length >= 2;
    }
}

// Instância global do AuthManager
const authManager = new AuthManager();

// Export para uso em outros arquivos
window.authManager = authManager;
