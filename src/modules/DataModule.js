import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { appStorage } from '../utils/storage.js';
import { EVENTS, DEFAULT_ADMIN } from '../utils/constants.js';
import { deepClone } from '../utils/helpers.js';

/**
 * Модуль управления данными
 */
export class DataModule {
    constructor() {
        this.isInitialized = false;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupStore();
        this.setupEventListeners();
        this.loadData();
        
        this.isInitialized = true;
        eventBus.emit(EVENTS.APP_INIT, { module: 'DataModule' });
    }

    /**
     * Настройка хранилища
     */
    setupStore() {
        // Инициализация состояния
        store.state = {
            ...store.state,
            users: [DEFAULT_ADMIN],
            processes: [],
            products: [],
            orders: [],
            currentUser: null,
            loading: {
                users: false,
                processes: false,
                products: false,
                orders: false
            }
        };

        // Мутации для пользователей
        store.registerMutation('SET_USERS', (state, users) => {
            state.users = users;
        });

        store.registerMutation('ADD_USER', (state, user) => {
            state.users.push(user);
        });

        store.registerMutation('UPDATE_USER', (state, updatedUser) => {
            const index = state.users.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) {
                state.users[index] = { ...state.users[index], ...updatedUser };
            }
        });

        store.registerMutation('REMOVE_USER', (state, userId) => {
            state.users = state.users.filter(u => u.id !== userId);
        });

        // Мутации для процессов
        store.registerMutation('SET_PROCESSES', (state, processes) => {
            state.processes = processes;
        });

        store.registerMutation('ADD_PROCESS', (state, process) => {
            state.processes.push(process);
        });

        store.registerMutation('UPDATE_PROCESS', (state, updatedProcess) => {
            const index = state.processes.findIndex(p => p.id === updatedProcess.id);
            if (index !== -1) {
                state.processes[index] = { ...state.processes[index], ...updatedProcess };
            }
        });

        store.registerMutation('REMOVE_PROCESS', (state, processId) => {
            state.processes = state.processes.filter(p => p.id !== processId);
        });

        // Мутации для изделий
        store.registerMutation('SET_PRODUCTS', (state, products) => {
            state.products = products;
        });

        store.registerMutation('ADD_PRODUCT', (state, product) => {
            state.products.push(product);
        });

        store.registerMutation('UPDATE_PRODUCT', (state, updatedProduct) => {
            const index = state.products.findIndex(p => p.id === updatedProduct.id);
            if (index !== -1) {
                state.products[index] = { ...state.products[index], ...updatedProduct };
            }
        });

        store.registerMutation('REMOVE_PRODUCT', (state, productId) => {
            state.products = state.products.filter(p => p.id !== productId);
        });

        // Мутации для заказов
        store.registerMutation('SET_ORDERS', (state, orders) => {
            state.orders = orders;
        });

        store.registerMutation('ADD_ORDER', (state, order) => {
            state.orders.push(order);
        });

        store.registerMutation('UPDATE_ORDER', (state, updatedOrder) => {
            const index = state.orders.findIndex(o => o.id === updatedOrder.id);
            if (index !== -1) {
                state.orders[index] = { ...state.orders[index], ...updatedOrder };
            }
        });

        store.registerMutation('REMOVE_ORDER', (state, orderId) => {
            state.orders = state.orders.filter(o => o.id !== orderId);
        });

        // Мутации для загрузки
        store.registerMutation('SET_LOADING', (state, { type, loading }) => {
            state.loading[type] = loading;
        });

        // Действия
        this.registerActions();
        
        // Геттеры
        this.registerGetters();
    }

    /**
     * Регистрация действий
     */
    registerActions() {
        // Общие действия
        store.registerAction('saveData', async (context) => {
            return this.saveData();
        });

        store.registerAction('loadData', async (context) => {
            return this.loadData();
        });
    }

    /**
     * Регистрация геттеров
     */
    registerGetters() {
        // Пользователи
        store.registerGetter('users', (state) => state.users);
        store.registerGetter('getUserById', (state) => (id) => 
            state.users.find(u => u.id === id)
        );

        // Процессы
        store.registerGetter('processes', (state) => 
            state.processes.sort((a, b) => a.position - b.position)
        );
        store.registerGetter('getProcessById', (state) => (id) => 
            state.processes.find(p => p.id === id)
        );

        // Изделия
        store.registerGetter('products', (state) => state.products);
        store.registerGetter('getProductById', (state) => (id) => 
            state.products.find(p => p.id === id)
        );

        // Заказы
        store.registerGetter('orders', (state) => state.orders);
        store.registerGetter('getOrderById', (state) => (id) => 
            state.orders.find(o => o.id === id)
        );
        store.registerGetter('getOrdersByProcess', (state) => (processId) => 
            state.orders.filter(o => o.currentProcessId === processId)
        );

        // Статистика
        store.registerGetter('stats', (state) => ({
            totalUsers: state.users.length,
            activeUsers: state.users.filter(u => u.isActive !== false).length,
            totalProcesses: state.processes.length,
            totalProducts: state.products.length,
            totalOrders: state.orders.length,
            ordersInProgress: state.orders.filter(o => o.currentProcessId).length,
            ordersCompleted: state.orders.filter(o => !o.currentProcessId).length
        }));

        // Загрузка
        store.registerGetter('loading', (state) => state.loading);
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Автосохранение при изменениях
        eventBus.on('store:mutation', (data) => {
            if (data.name.includes('ADD_') || 
                data.name.includes('UPDATE_') || 
                data.name.includes('REMOVE_') ||
                data.name.includes('SET_')) {
                this.saveData();
            }
        });
    }

    /**
     * Загрузка всех данных
     */
    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            eventBus.emit(EVENTS.LOADING_START, { source: 'data' });

            const data = appStorage.getAppData();
            
            // Загружаем данные в store
            if (data.users && data.users.length > 0) {
                store.commit('SET_USERS', data.users);
            }
            
            if (data.processes) {
                store.commit('SET_PROCESSES', data.processes);
            }
            
            if (data.products) {
                store.commit('SET_PRODUCTS', data.products);
            }
            
            if (data.orders) {
                store.commit('SET_ORDERS', data.orders);
            }

            console.log('✅ Данные загружены', data);
            return data;

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            eventBus.emit(EVENTS.ERROR, { 
                message: 'Ошибка загрузки данных',
                error 
            });
            throw error;
        } finally {
            this.isLoading = false;
            eventBus.emit(EVENTS.LOADING_END, { source: 'data' });
        }
    }

    /**
     * Сохранение всех данных
     */
    async saveData() {
        try {
            const data = {
                users: store.getGetter('users'),
                processes: store.getGetter('processes'),
                products: store.getGetter('products'),
                orders: store.getGetter('orders')
            };

            const success = appStorage.setAppData(data);
            
            if (success) {
                console.log('✅ Данные сохранены');
            } else {
                console.warn('⚠️ Не удалось сохранить данные');
            }

            return success;

        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
            eventBus.emit(EVENTS.ERROR, { 
                message: 'Ошибка сохранения данных',
                error 
            });
            return false;
        }
    }

    /**
     * Получение информации о модуле
     */
    getModuleInfo() {
        const stats = store.getGetter('stats');
        
        return {
            name: 'DataModule',
            version: '1.0.0',
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            stats
        };
    }
}

// Создаем глобальный экземпляр
export const dataModule = new DataModule();

// Глобальный доступ для совместимости
window.dataModule = dataModule;

export default dataModule;