import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { EVENTS, HISTORY_TYPES } from '../utils/constants.js';
import { createOrderValidator } from '../utils/validators.js';
import { generateId, formatDate } from '../utils/helpers.js';

/**
 * Модуль управления заказами
 */
export class OrderModule {
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
        eventBus.emit(EVENTS.APP_INIT, { module: 'OrderModule' });
    }

    /**
     * Настройка Store
     */
    setupStore() {
        // Действия для заказов
        store.registerAction('createOrder', async (context, orderData) => {
            return this.createOrder(orderData);
        });

        store.registerAction('updateOrder', async (context, { id, data }) => {
            return this.updateOrder(id, data);
        });

        store.registerAction('deleteOrder', async (context, orderId) => {
            return this.deleteOrder(orderId);
        });

        store.registerAction('moveOrder', async (context, { orderId, toProcessId, reason }) => {
            return this.moveOrder(orderId, toProcessId, reason);
        });

        store.registerAction('sendOrderToDefect', async (context, { orderId, reason }) => {
            return this.sendOrderToDefect(orderId, reason);
        });

        store.registerAction('fixDefectOrder', async (context, { orderId, comment }) => {
            return this.fixDefectOrder(orderId, comment);
        });
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Обновление UI при изменении заказов
        eventBus.on(EVENTS.ORDER_CREATED, () => {
            this.refreshOrderBoard();
        });

        eventBus.on(EVENTS.ORDER_UPDATED, () => {
            this.refreshOrderBoard();
        });

        eventBus.on(EVENTS.ORDER_DELETED, () => {
            this.refreshOrderBoard();
        });
    }

    /**
     * Создание нового заказа
     */
    async createOrder(orderData) {
        try {
            // Валидация
            const validator = createOrderValidator();
            if (!validator.validate(orderData)) {
                return {
                    success: false,
                    errors: validator.getAllErrors()
                };
            }

            // Генерация номера заказа
            const orderNumber = this.generateOrderNumber();
            const currentUser = store.getGetter('currentUser');

            const newOrder = {
                id: generateId('order'),
                number: orderNumber,
                clientName: orderData.clientName,
                clientPhone: orderData.clientPhone || '',
                clientEmail: orderData.clientEmail || '',
                productId: parseInt(orderData.productId),
                quantity: parseInt(orderData.quantity) || 1,
                currentProcessId: null, // Новый заказ начинается без процесса
                status: 'created',
                priority: orderData.priority || 'normal',
                deadline: orderData.deadline || null,
                comment: orderData.comment || '',
                customFields: orderData.customFields || {},
                defectInfo: {
                    isDefective: false,
                    reason: null,
                    fixedAt: null
                },
                history: [{
                    id: generateId('history'),
                    type: HISTORY_TYPES.CREATED,
                    timestamp: new Date().toISOString(),
                    user: currentUser,
                    data: {
                        initialData: orderData
                    }
                }],
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                updatedAt: new Date().toISOString()
            };

            // Добавляем в store
            store.commit('ADD_ORDER', newOrder);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_CREATED, newOrder);

            return {
                success: true,
                order: newOrder
            };

        } catch (error) {
            console.error('❌ Ошибка создания заказа:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Обновление заказа
     */
    async updateOrder(orderId, updateData) {
        try {
            const order = store.getGetter('getOrderById')(orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Заказ не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            const updatedOrder = {
                ...order,
                ...updateData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Добавляем запись в историю
            const historyEvent = {
                id: generateId('history'),
                type: HISTORY_TYPES.UPDATED,
                timestamp: new Date().toISOString(),
                user: currentUser,
                data: {
                    changes: updateData,
                    oldValues: Object.keys(updateData).reduce((acc, key) => {
                        acc[key] = order[key];
                        return acc;
                    }, {})
                }
            };

            updatedOrder.history = [...order.history, historyEvent];

            // Обновляем в store
            store.commit('UPDATE_ORDER', updatedOrder);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_UPDATED, updatedOrder);

            return {
                success: true,
                order: updatedOrder
            };

        } catch (error) {
            console.error('❌ Ошибка обновления заказа:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Удаление заказа
     */
    async deleteOrder(orderId) {
        try {
            const order = store.getGetter('getOrderById')(orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Заказ не найден'
                };
            }

            // Проверяем права доступа
            const currentUser = store.getGetter('currentUser');
            if (!currentUser.isAdmin && order.createdBy !== currentUser.id) {
                return {
                    success: false,
                    error: 'Недостаточно прав для удаления заказа'
                };
            }

            // Удаляем из store
            store.commit('REMOVE_ORDER', orderId);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_DELETED, { id: orderId, order });

            return {
                success: true
            };

        } catch (error) {
            console.error('❌ Ошибка удаления заказа:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Перемещение заказа между процессами
     */
    async moveOrder(orderId, toProcessId, reason = null) {
        try {
            const order = store.getGetter('getOrderById')(orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Заказ не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            const fromProcess = order.currentProcessId ? 
                store.getGetter('getProcessById')(order.currentProcessId) : null;
            const toProcess = toProcessId ? 
                store.getGetter('getProcessById')(toProcessId) : null;

            // Проверяем права доступа к процессам
            if (!this.canUserMoveOrder(order, currentUser, toProcessId)) {
                return {
                    success: false,
                    error: 'Недостаточно прав для перемещения заказа'
                };
            }

            // Обновляем заказ
            const updatedOrder = {
                ...order,
                currentProcessId: toProcessId === 0 ? null : toProcessId,
                status: toProcessId ? 'in_progress' : 'completed',
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Добавляем в историю
            const historyEvent = {
                id: generateId('history'),
                type: HISTORY_TYPES.MOVED,
                timestamp: new Date().toISOString(),
                user: currentUser,
                data: {
                    fromProcess: fromProcess ? { id: fromProcess.id, name: fromProcess.name } : null,
                    toProcess: toProcess ? { id: toProcess.id, name: toProcess.name } : { id: 0, name: 'Завершено' },
                    reason: reason
                }
            };

            updatedOrder.history = [...order.history, historyEvent];

            // Обновляем в store
            store.commit('UPDATE_ORDER', updatedOrder);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_MOVED, {
                order: updatedOrder,
                fromProcessId: order.currentProcessId,
                toProcessId: toProcessId
            });

            return {
                success: true,
                order: updatedOrder
            };

        } catch (error) {
            console.error('❌ Ошибка перемещения заказа:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Отправка заказа в брак
     */
    async sendOrderToDefect(orderId, reason) {
        try {
            const order = store.getGetter('getOrderById')(orderId);
            if (!order) {
                return {
                    success: false,
                    error: 'Заказ не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            const updatedOrder = {
                ...order,
                defectInfo: {
                    isDefective: true,
                    reason: reason,
                    reportedAt: new Date().toISOString(),
                    reportedBy: currentUser.id,
                    fixedAt: null
                },
                status: 'defect',
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Добавляем в историю
            const historyEvent = {
                id: generateId('history'),
                type: HISTORY_TYPES.DEFECT_SENT,
                timestamp: new Date().toISOString(),
                user: currentUser,
                data: {
                    reason: reason,
                    processId: order.currentProcessId
                }
            };

            updatedOrder.history = [...order.history, historyEvent];

            // Обновляем в store
            store.commit('UPDATE_ORDER', updatedOrder);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_STATUS_CHANGED, {
                order: updatedOrder,
                oldStatus: order.status,
                newStatus: 'defect'
            });

            return {
                success: true,
                order: updatedOrder
            };

        } catch (error) {
            console.error('❌ Ошибка отправки заказа в брак:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Исправление брака
     */
    async fixDefectOrder(orderId, comment = '') {
        try {
            const order = store.getGetter('getOrderById')(orderId);
            if (!order || !order.defectInfo.isDefective) {
                return {
                    success: false,
                    error: 'Заказ не найден или не является браком'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            const updatedOrder = {
                ...order,
                defectInfo: {
                    ...order.defectInfo,
                    isDefective: false,
                    fixedAt: new Date().toISOString(),
                    fixedBy: currentUser.id,
                    fixComment: comment
                },
                status: order.currentProcessId ? 'in_progress' : 'completed',
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Добавляем в историю
            const historyEvent = {
                id: generateId('history'),
                type: HISTORY_TYPES.DEFECT_FIXED,
                timestamp: new Date().toISOString(),
                user: currentUser,
                data: {
                    comment: comment,
                    originalReason: order.defectInfo.reason
                }
            };

            updatedOrder.history = [...order.history, historyEvent];

            // Обновляем в store
            store.commit('UPDATE_ORDER', updatedOrder);
            
            // Генерируем событие
            eventBus.emit(EVENTS.ORDER_STATUS_CHANGED, {
                order: updatedOrder,
                oldStatus: 'defect',
                newStatus: updatedOrder.status
            });

            return {
                success: true,
                order: updatedOrder
            };

        } catch (error) {
            console.error('❌ Ошибка исправления брака:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Генерация номера заказа
     */
    generateOrderNumber() {
        const today = new Date();
        const dateStr = today.getFullYear().toString().substr(-2) + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        const orders = store.getGetter('orders');
        const existingNumbers = orders
            .map(o => o.number)
            .filter(n => n && n.startsWith(dateStr))
            .map(n => {
                const parts = n.split('-');
                return parts.length > 1 ? parseInt(parts[1]) : 0;
            })
            .filter(n => !isNaN(n));
        
        const nextNumber = existingNumbers.length > 0 ? 
            Math.max(...existingNumbers) + 1 : 1;
        
        return `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
    }

    /**
     * Проверка прав пользователя на перемещение заказа
     */
    canUserMoveOrder(order, user, toProcessId) {
        // Администратор может все
        if (user.isAdmin) return true;

        // Проверяем доступ к текущему процессу
        if (order.currentProcessId && !user.processes.includes(order.currentProcessId)) {
            return false;
        }

        // Проверяем доступ к целевому процессу
        if (toProcessId && toProcessId !== 0 && !user.processes.includes(toProcessId)) {
            return false;
        }

        return true;
    }

    /**
     * Обновление доски заказов
     */
    refreshOrderBoard() {
        eventBus.emit('ui:refreshOrderBoard');
    }

    /**
     * Получение информации о модуле
     */
    getModuleInfo() {
        return {
            name: 'OrderModule',
            version: '1.0.0',
            isInitialized: this.isInitialized
        };
    }
}

// Создаем глобальный экземпляр
export const orderModule = new OrderModule();

// Глобальный доступ для совместимости
window.orderModule = orderModule;

export default orderModule;