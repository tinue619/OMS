import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { EVENTS } from '../utils/constants.js';
import { createProcessValidator } from '../utils/validators.js';
import { generateId } from '../utils/helpers.js';

/**
 * Модуль управления процессами
 */
export class ProcessModule {
    constructor() {
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupStore();
        this.setupEventListeners();
        
        this.isInitialized = true;
        eventBus.emit(EVENTS.APP_INIT, { module: 'ProcessModule' });
    }

    /**
     * Настройка Store
     */
    setupStore() {
        // Действия для процессов
        store.registerAction('createProcess', async (context, processData) => {
            return this.createProcess(processData);
        });

        store.registerAction('updateProcess', async (context, { id, data }) => {
            return this.updateProcess(id, data);
        });

        store.registerAction('deleteProcess', async (context, processId) => {
            return this.deleteProcess(processId);
        });

        store.registerAction('reorderProcesses', async (context, processIds) => {
            return this.reorderProcesses(processIds);
        });
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        eventBus.on(EVENTS.PROCESS_CREATED, () => {
            this.refreshProcessBoard();
        });

        eventBus.on(EVENTS.PROCESS_UPDATED, () => {
            this.refreshProcessBoard();
        });

        eventBus.on(EVENTS.PROCESS_DELETED, () => {
            this.refreshProcessBoard();
        });
    }

    /**
     * Создание нового процесса
     */
    async createProcess(processData) {
        try {
            // Валидация
            const validator = createProcessValidator();
            if (!validator.validate(processData)) {
                return {
                    success: false,
                    errors: validator.getAllErrors()
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для создания процесса'
                };
            }

            // Получаем максимальную позицию
            const processes = store.getGetter('processes');
            const maxPosition = processes.length > 0 ? 
                Math.max(...processes.map(p => p.position)) : -1;

            const newProcess = {
                id: generateId('process'),
                name: processData.name.trim(),
                description: processData.description?.trim() || '',
                position: maxPosition + 1,
                color: processData.color || this.getRandomColor(),
                isActive: true,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                updatedAt: new Date().toISOString()
            };

            // Добавляем в store
            store.commit('ADD_PROCESS', newProcess);
            
            // Генерируем событие
            eventBus.emit(EVENTS.PROCESS_CREATED, newProcess);

            return {
                success: true,
                process: newProcess
            };

        } catch (error) {
            console.error('❌ Ошибка создания процесса:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Обновление процесса
     */
    async updateProcess(processId, updateData) {
        try {
            const process = store.getGetter('getProcessById')(processId);
            if (!process) {
                return {
                    success: false,
                    error: 'Процесс не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для редактирования процесса'
                };
            }

            const updatedProcess = {
                ...process,
                ...updateData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Обновляем в store
            store.commit('UPDATE_PROCESS', updatedProcess);
            
            // Генерируем событие
            eventBus.emit(EVENTS.PROCESS_UPDATED, updatedProcess);

            return {
                success: true,
                process: updatedProcess
            };

        } catch (error) {
            console.error('❌ Ошибка обновления процесса:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Удаление процесса
     */
    async deleteProcess(processId) {
        try {
            const process = store.getGetter('getProcessById')(processId);
            if (!process) {
                return {
                    success: false,
                    error: 'Процесс не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для удаления процесса'
                };
            }

            // Проверяем, есть ли заказы в этом процессе
            const ordersInProcess = store.getGetter('getOrdersByProcess')(processId);
            if (ordersInProcess.length > 0) {
                return {
                    success: false,
                    error: `Невозможно удалить процесс. В нем находится ${ordersInProcess.length} заказов.`
                };
            }

            // Удаляем процесс из изделий
            const products = store.getGetter('products');
            products.forEach(product => {
                if (product.processes.includes(processId)) {
                    const updatedProcesses = product.processes.filter(id => id !== processId);
                    store.commit('UPDATE_PRODUCT', {
                        id: product.id,
                        processes: updatedProcesses
                    });
                }
            });

            // Удаляем процесс из пользователей
            const users = store.getGetter('users');
            users.forEach(user => {
                if (user.processes && user.processes.includes(processId)) {
                    const updatedProcesses = user.processes.filter(id => id !== processId);
                    store.commit('UPDATE_USER', {
                        id: user.id,
                        processes: updatedProcesses
                    });
                }
            });

            // Удаляем из store
            store.commit('REMOVE_PROCESS', processId);
            
            // Генерируем событие
            eventBus.emit(EVENTS.PROCESS_DELETED, { id: processId, process });

            return {
                success: true
            };

        } catch (error) {
            console.error('❌ Ошибка удаления процесса:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Изменение порядка процессов
     */
    async reorderProcesses(processIds) {
        try {
            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для изменения порядка процессов'
                };
            }

            const processes = store.getGetter('processes');
            const reorderedProcesses = processIds.map((id, index) => {
                const process = processes.find(p => p.id === id);
                return {
                    ...process,
                    position: index,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser.id
                };
            });

            // Обновляем все процессы
            reorderedProcesses.forEach(process => {
                store.commit('UPDATE_PROCESS', process);
            });
            
            // Генерируем событие
            eventBus.emit(EVENTS.PROCESS_REORDERED, reorderedProcesses);

            return {
                success: true,
                processes: reorderedProcesses
            };

        } catch (error) {
            console.error('❌ Ошибка изменения порядка процессов:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Получение статистики по процессу
     */
    getProcessStats(processId) {
        const orders = store.getGetter('orders');
        const processOrders = orders.filter(order => order.currentProcessId === processId);
        
        return {
            totalOrders: processOrders.length,
            defectOrders: processOrders.filter(order => order.defectInfo?.isDefective).length,
            avgTimeInProcess: this.calculateAvgTimeInProcess(processOrders),
            oldestOrder: this.getOldestOrder(processOrders)
        };
    }

    /**
     * Вычисление среднего времени в процессе
     */
    calculateAvgTimeInProcess(orders) {
        if (orders.length === 0) return 0;
        
        const now = new Date();
        const totalTime = orders.reduce((sum, order) => {
            const enteredProcess = this.getLastProcessEntryTime(order);
            if (enteredProcess) {
                return sum + (now - new Date(enteredProcess));
            }
            return sum;
        }, 0);
        
        return Math.round(totalTime / orders.length / (1000 * 60 * 60)); // в часах
    }

    /**
     * Получение времени входа в текущий процесс
     */
    getLastProcessEntryTime(order) {
        const history = order.history || [];
        const lastMove = history
            .filter(event => event.type === 'moved')
            .reverse()
            .find(event => event.data?.toProcess?.id === order.currentProcessId);
        
        return lastMove ? lastMove.timestamp : order.createdAt;
    }

    /**
     * Получение самого старого заказа в процессе
     */
    getOldestOrder(orders) {
        if (orders.length === 0) return null;
        
        return orders.reduce((oldest, order) => {
            const orderTime = this.getLastProcessEntryTime(order);
            const oldestTime = this.getLastProcessEntryTime(oldest);
            
            return new Date(orderTime) < new Date(oldestTime) ? order : oldest;
        });
    }

    /**
     * Получение случайного цвета для процесса
     */
    getRandomColor() {
        const colors = [
            '#3B82F6', // blue
            '#10B981', // emerald
            '#F59E0B', // amber
            '#EF4444', // red
            '#8B5CF6', // violet
            '#06B6D4', // cyan
            '#84CC16', // lime
            '#F97316', // orange
            '#EC4899', // pink
            '#6B7280'  // gray
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Обновление доски процессов
     */
    refreshProcessBoard() {
        eventBus.emit('ui:refreshProcessBoard');
    }

    /**
     * Получение информации о модуле
     */
    getModuleInfo() {
        return {
            name: 'ProcessModule',
            version: '1.0.0',
            isInitialized: this.isInitialized
        };
    }
}

// Создаем глобальный экземпляр
export const processModule = new ProcessModule();

// Глобальный доступ для совместимости
window.processModule = processModule;

export default processModule;