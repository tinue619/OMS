import { eventBus } from './core/EventBus.js';
import { store } from './core/Store.js';
import { router } from './core/Router.js';
import { authModule } from './modules/AuthModule.js';
import { dataModule } from './modules/DataModule.js';
import { EVENTS, APP_CONFIG } from './utils/constants.js';

/**
 * Главный класс приложения OMS
 */
class App {
    constructor() {
        this.isInitialized = false;
        this.currentView = null;
        this.modules = new Map();
        
        console.log(`🚀 Запуск ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}`);
        
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            // Инициализируем ядро
            await this.initCore();
            
            // Регистрируем модули
            this.registerModules();
            
            // Настраиваем роутинг
            this.setupRouting();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            // Инициализируем UI
            await this.initUI();
            
            this.isInitialized = true;
            
            // Скрываем экран загрузки
            this.hideLoadingScreen();
            
            // Генерируем событие готовности приложения
            eventBus.emit(EVENTS.APP_READY);
            
            console.log('✅ Приложение OMS готово к работе');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            this.showError('Ошибка запуска приложения', error.message);
        }
    }

    /**
     * Инициализация ядра системы
     */
    async initCore() {
        // EventBus уже инициализирован при импорте
        eventBus.setDebug(APP_CONFIG.DEBUG);
        
        // Store уже инициализирован при импорте
        console.log('✅ Ядро системы инициализировано');
    }

    /**
     * Регистрация модулей
     */
    registerModules() {
        // Модули уже создаются при импорте и сами себя инициализируют
        this.modules.set('auth', authModule);
        this.modules.set('data', dataModule);
        
        console.log('✅ Модули зарегистрированы:', Array.from(this.modules.keys()));
    }

    /**
     * Настройка роутинга
     */
    setupRouting() {
        // Маршрут по умолчанию
        router.addRoute('/', () => this.showDashboard(), { name: 'dashboard' });
        
        // Авторизация
        router.addRoute('/login', () => this.showLogin(), { name: 'login' });
        router.addRoute('/logout', () => this.logout(), { name: 'logout' });
        
        // Основные разделы
        router.addRoute('/orders', () => this.showOrders(), { name: 'orders' });
        router.addRoute('/orders/:id', (route) => this.showOrderDetails(route.params.id), { name: 'order-details' });
        router.addRoute('/processes', () => this.showProcesses(), { name: 'processes' });
        router.addRoute('/products', () => this.showProducts(), { name: 'products' });
        router.addRoute('/users', () => this.showUsers(), { name: 'users' });
        router.addRoute('/analytics', () => this.showAnalytics(), { name: 'analytics' });
        router.addRoute('/settings', () => this.showSettings(), { name: 'settings' });
        
        // Хуки роутера
        router.beforeEach((to, from) => {
            // Проверка аутентификации
            if (to.path !== '/login' && !authModule.isAuthenticated()) {
                router.push('/login');
                return false;
            }
            return true;
        });

        router.afterEach((to, from) => {
            // Обновляем заголовок страницы
            document.title = this.getPageTitle(to.name);
            
            // Логируем переход
            if (APP_CONFIG.DEBUG) {
                console.log(`🔄 Переход: ${from?.path || 'initial'} → ${to.path}`);
            }
        });
        
        console.log('✅ Роутинг настроен');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // События аутентификации
        eventBus.on(EVENTS.USER_LOGIN, (user) => {
            console.log('👤 Пользователь вошел:', user.name);
            router.push('/');
        });

        eventBus.on(EVENTS.USER_LOGOUT, () => {
            console.log('👤 Пользователь вышел');
            router.push('/login');
        });

        // Обработка ошибок
        eventBus.on(EVENTS.ERROR, (error) => {
            console.error('❌ Ошибка приложения:', error);
            this.showNotification('error', error.message || 'Произошла ошибка');
        });

        // Глобальные обработчики
        window.addEventListener('error', (event) => {
            console.error('❌ Глобальная ошибка:', event.error);
            eventBus.emit(EVENTS.ERROR, {
                message: 'Критическая ошибка',
                error: event.error
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Необработанное отклонение Promise:', event.reason);
            eventBus.emit(EVENTS.ERROR, {
                message: 'Ошибка асинхронной операции',
                error: event.reason
            });
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', this.debounce(() => {
            eventBus.emit('window:resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 250));

        console.log('✅ Обработчики событий настроены');
    }

    /**
     * Инициализация UI
     */
    async initUI() {
        // Проверяем, авторизован ли пользователь
        if (authModule.isAuthenticated()) {
            // Показываем главный интерфейс
            await this.showMainInterface();
        } else {
            // Показываем экран входа
            router.push('/login');
        }
    }

    /**
     * Показать главный интерфейс
     */
    async showMainInterface() {
        const app = document.getElementById('app');
        const user = authModule.getCurrentUser();
        
        app.innerHTML = `
            <div class="main-app">
                <header class="header">
                    <div class="container">
                        <div class="header-content">
                            <div class="header-logo">
                                <h1>OMS</h1>
                                <span class="version">v${APP_CONFIG.VERSION}</span>
                            </div>
                            <nav class="header-nav">
                                <ul class="nav">
                                    <li class="nav-item">
                                        <a href="#/" class="nav-link" data-route="/">Панель</a>
                                    </li>
                                    <li class="nav-item">
                                        <a href="#/orders" class="nav-link" data-route="/orders">Заказы</a>
                                    </li>
                                    <li class="nav-item">
                                        <a href="#/processes" class="nav-link" data-route="/processes">Процессы</a>
                                    </li>
                                    ${user.role === 'admin' ? `
                                    <li class="nav-item">
                                        <a href="#/users" class="nav-link" data-route="/users">Пользователи</a>
                                    </li>
                                    <li class="nav-item">
                                        <a href="#/analytics" class="nav-link" data-route="/analytics">Аналитика</a>
                                    </li>
                                    ` : ''}
                                </ul>
                            </nav>
                            <div class="header-actions">
                                <div class="user-info">
                                    <span>👤 ${user.name}</span>
                                </div>
                                <button class="btn btn-sm btn-secondary theme-toggle" id="themeToggle">
                                    🌙
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="app.logout()">
                                    Выйти
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
                <main class="main-content" id="mainContent">
                    <div class="container">
                        <div class="loading-spinner"></div>
                        <p class="text-center">Загрузка...</p>
                    </div>
                </main>
            </div>
            <div id="modalContainer"></div>
            <div id="toastContainer" class="toast-container"></div>
        `;

        // Настраиваем переключатель темы
        this.setupThemeToggle();
        
        // Настраиваем навигацию
        this.setupNavigation();
        
        // Инициализируем контент по умолчанию
        router.handleRoute();
    }

    /**
     * Настройка переключателя темы
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = current === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }

    /**
     * Настройка навигации
     */
    setupNavigation() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-route]');
            if (link) {
                event.preventDefault();
                const route = link.getAttribute('data-route');
                router.push(route);
                
                // Обновляем активный элемент
                document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
            }
        });
    }

    /**
     * Обработчики маршрутов
     */
    showDashboard() {
        this.setMainContent(`
            <div class="dashboard">
                <h2>Панель управления</h2>
                <div id="dashboardStats" class="stats-grid">
                    <div class="loading-spinner"></div>
                </div>
                <div id="dashboardCharts">
                    <div class="card">
                        <div class="card-header">
                            <h3>Активность за неделю</h3>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">График активности будет здесь</p>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        this.loadDashboardData();
    }

    showLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container d-flex justify-center items-center h-full">
                <div class="card" style="width: 400px;">
                    <div class="card-header text-center">
                        <h2>Вход в OMS</h2>
                        <p class="text-muted">Система управления заказами</p>
                    </div>
                    <div class="card-body">
                        <form id="loginForm">
                            <div class="form-group">
                                <label class="form-label">Пользователь</label>
                                <input type="text" name="username" class="form-input" placeholder="Имя, email или телефон" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Пароль</label>
                                <input type="password" name="password" class="form-input" placeholder="Пароль" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-full">Войти</button>
                            <div id="loginError" class="alert alert-danger hidden" style="margin-top: 1rem;"></div>
                        </form>
                    </div>
                    <div class="card-footer text-center">
                        <small class="text-muted">
                            По умолчанию: Администратор / 1488
                        </small>
                    </div>
                </div>
            </div>
        `;

        // Обработчик формы
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const username = formData.get('username');
            const password = formData.get('password');
            
            const result = await authModule.login(username, password);
            
            if (!result.success) {
                const errorEl = document.getElementById('loginError');
                errorEl.textContent = result.error;
                errorEl.classList.remove('hidden');
            }
        });
    }

    showOrders() {
        this.setMainContent(`
            <div class="orders-view">
                <div class="d-flex justify-between items-center" style="margin-bottom: 2rem;">
                    <h2>Заказы</h2>
                    <button class="btn btn-primary" onclick="app.showCreateOrderModal()">
                        Создать заказ
                    </button>
                </div>
                <div id="processBoard" class="process-board">
                    <div class="loading-spinner"></div>
                    <p class="text-center">Загрузка заказов...</p>
                </div>
            </div>
        `);
        
        this.loadOrdersBoard();
    }

    showProcesses() {
        this.setMainContent(`
            <div class="processes-view">
                <h2>Управление процессами</h2>
                <div id="processesContent">
                    <div class="loading-spinner"></div>
                    <p>Загрузка процессов...</p>
                </div>
            </div>
        `);
    }

    showUsers() {
        this.setMainContent(`
            <div class="users-view">
                <h2>Пользователи</h2>
                <div id="usersContent">
                    <div class="loading-spinner"></div>
                    <p>Загрузка пользователей...</p>
                </div>
            </div>
        `);
    }

    showAnalytics() {
        this.setMainContent(`
            <div class="analytics-view">
                <h2>Аналитика</h2>
                <div id="analyticsContent">
                    <div class="loading-spinner"></div>
                    <p>Загрузка аналитики...</p>
                </div>
            </div>
        `);
    }

    /**
     * Вспомогательные методы
     */
    setMainContent(html) {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `<div class="container">${html}</div>`;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    getPageTitle(routeName) {
        const titles = {
            'dashboard': 'Панель управления',
            'login': 'Вход в систему',
            'orders': 'Заказы',
            'processes': 'Процессы',
            'users': 'Пользователи',
            'analytics': 'Аналитика',
            'settings': 'Настройки'
        };
        
        return `${titles[routeName] || 'Страница'} - OMS`;
    }

    async loadDashboardData() {
        try {
            // Создаем демо-данные если их нет
            await this.createDemoDataIfNeeded();
            
            const stats = store.getGetter('stats');
            const statsContainer = document.getElementById('dashboardStats');
            
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalOrders}</div>
                        <div class="stat-label">Всего заказов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.ordersInProgress}</div>
                        <div class="stat-label">В работе</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.ordersCompleted}</div>
                        <div class="stat-label">Завершено</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.activeUsers}</div>
                        <div class="stat-label">Активных пользователей</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка загрузки данных панели:', error);
        }
    }

    async loadOrdersBoard() {
        try {
            const processes = store.getGetter('processes');
            const orders = store.getGetter('orders');
            const boardContainer = document.getElementById('processBoard');
            
            if (!boardContainer) return;
            
            // Создаем колонки процессов
            let boardHTML = '';
            
            // Колонка "Новые заказы"
            const newOrders = orders.filter(order => !order.currentProcessId);
            boardHTML += this.createProcessColumn(
                'Новые заказы', 
                newOrders,
                'new'
            );
            
            // Колонки процессов
            processes.forEach(process => {
                const processOrders = orders.filter(order => order.currentProcessId === process.id);
                boardHTML += this.createProcessColumn(
                    process.name, 
                    processOrders,
                    'process',
                    process.id
                );
            });
            
            // Колонка "Завершено"
            boardHTML += this.createProcessColumn(
                'Завершено', 
                [],
                'done'
            );
            
            boardContainer.innerHTML = boardHTML;
            
        } catch (error) {
            console.error('Ошибка загрузки доски заказов:', error);
            const boardContainer = document.getElementById('processBoard');
            if (boardContainer) {
                boardContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Ошибка загрузки заказов: ${error.message}
                    </div>
                `;
            }
        }
    }

    createProcessColumn(title, orders, type, processId = null) {
        const ordersHTML = orders.map(order => this.createOrderCard(order)).join('');
        
        return `
            <div class="process-column" data-process-id="${processId || type}">
                <div class="process-header">
                    <div class="process-title">${title}</div>
                    <div class="process-count">${orders.length} заказов</div>
                </div>
                <div class="process-body">
                    ${ordersHTML}
                </div>
            </div>
        `;
    }

    createOrderCard(order) {
        const product = store.getGetter('getProductById')(order.productId);
        const productName = product ? product.name : 'Неизвестное изделие';
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-number">#${order.number || order.id}</div>
                    <div class="order-status ${this.getOrderStatusClass(order)}">
                        ${this.getOrderStatusText(order)}
                    </div>
                </div>
                <div class="order-info">
                    <div class="order-client">${order.clientName}</div>
                    <div class="order-product">${productName}</div>
                </div>
                <div class="order-meta">
                    <div class="order-date">${this.formatDate(order.createdAt)}</div>
                    <div class="order-quantity">Кол-во: ${order.quantity || 1}</div>
                </div>
            </div>
        `;
    }

    getOrderStatusClass(order) {
        if (!order.currentProcessId) return 'done';
        if (order.defectInfo?.isDefective) return 'problem';
        return 'progress';
    }

    getOrderStatusText(order) {
        if (!order.currentProcessId) return 'Готово';
        if (order.defectInfo?.isDefective) return 'Брак';
        return 'В работе';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    async logout() {
        try {
            await authModule.logout();
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    showNotification(type, message, duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">${this.getNotificationTitle(type)}</div>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        container.appendChild(toast);

        // Автоудаление
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);

        // Закрытие по клику
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    getNotificationTitle(type) {
        const titles = {
            'success': 'Успешно',
            'error': 'Ошибка',
            'warning': 'Предупреждение',
            'info': 'Информация'
        };
        return titles[type] || 'Уведомление';
    }

    showError(title, message) {
        console.error(`${title}: ${message}`);
        this.showNotification('error', `${title}: ${message}`);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showCreateOrderModal() {
        // Заглушка для создания заказа
        this.showNotification('info', 'Функция создания заказа будет реализована в следующих компонентах');
    }

    async createDemoDataIfNeeded() {
        const processes = store.getGetter('processes');
        const products = store.getGetter('products');
        const orders = store.getGetter('orders');
        
        // Создаем демо-процессы если их нет
        if (processes.length === 0) {
            const demoProcesses = [
                { id: 1, name: 'Раскрой', position: 0 },
                { id: 2, name: 'Обработка', position: 1 },
                { id: 3, name: 'Сборка', position: 2 },
                { id: 4, name: 'Контроль', position: 3 }
            ];
            
            store.commit('SET_PROCESSES', demoProcesses);
        }
        
        // Создаем демо-изделия если их нет
        if (products.length === 0) {
            const demoProducts = [
                { id: 1, name: 'Окно ПВХ 1200x1400', processes: [1, 2, 3, 4] },
                { id: 2, name: 'Дверь входная', processes: [1, 2, 3, 4] },
                { id: 3, name: 'Стеклопакет', processes: [1, 3, 4] }
            ];
            
            store.commit('SET_PRODUCTS', demoProducts);
        }
        
        // Создаем демо-заказы если их нет
        if (orders.length === 0) {
            const demoOrders = [
                {
                    id: 1,
                    number: '241201-001',
                    clientName: 'Иванов Иван Иванович',
                    clientPhone: '+7 777 123 4567',
                    productId: 1,
                    quantity: 2,
                    currentProcessId: 1,
                    status: 'in_progress',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    number: '241201-002',
                    clientName: 'Петров Петр Петрович',
                    clientPhone: '+7 777 987 6543',
                    productId: 2,
                    quantity: 1,
                    currentProcessId: 2,
                    status: 'in_progress',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    number: '241130-015',
                    clientName: 'Сидоров Сидор Сидорович',
                    clientPhone: '+7 777 555 1234',
                    productId: 1,
                    quantity: 3,
                    currentProcessId: null,
                    status: 'completed',
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                }
            ];
            
            store.commit('SET_ORDERS', demoOrders);
        }
    }
}

// Создаем и запускаем приложение
const app = new App();

// Глобальный доступ для отладки и совместимости
window.app = app;

export default app;