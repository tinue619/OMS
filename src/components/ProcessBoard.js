import BaseComponent from '../core/BaseComponent.js';
import { OrderFormFactory } from './OrderForm.js';
import { ModalFactory } from './Modal.js';
import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { orderModule } from '../modules/OrderModule.js';
import { EVENTS } from '../utils/constants.js';
import { formatDate } from '../utils/helpers.js';

/**
 * Компонент доски процессов с drag & drop
 */
export class ProcessBoard extends BaseComponent {
    getDefaultOptions() {
        return {
            allowDragDrop: true,
            showNewColumn: true,
            showCompletedColumn: true
        };
    }

    getInitialState() {
        return {
            processes: [],
            orders: [],
            draggedOrder: null,
            dragOverColumn: null
        };
    }

    init() {
        super.init();
        this.loadData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Обновление при изменении данных
        eventBus.on('ui:refreshOrderBoard', () => {
            this.loadData();
        });

        eventBus.on(EVENTS.ORDER_CREATED, () => {
            this.loadData();
        });

        eventBus.on(EVENTS.ORDER_UPDATED, () => {
            this.loadData();
        });

        eventBus.on(EVENTS.ORDER_MOVED, () => {
            this.loadData();
        });
    }

    async loadData() {
        try {
            const processes = store.getGetter('processes');
            const orders = store.getGetter('orders');
            
            this.setState({
                processes: processes,
                orders: orders
            });
            
        } catch (error) {
            console.error('Ошибка загрузки данных доски:', error);
        }
    }

    template() {
        return `
            <div class="process-board-container">
                <div class="board-header">
                    <div class="board-title">
                        <h2>Доска заказов</h2>
                        <div class="board-stats">
                            <span class="stat-item">Всего: ${this.state.orders.length}</span>
                            <span class="stat-item">В работе: ${this.getOrdersInProgress().length}</span>
                            <span class="stat-item">Завершено: ${this.getCompletedOrders().length}</span>
                        </div>
                    </div>
                    <div class="board-actions">
                        <button class="btn btn-primary" data-action="create-order">
                            <span>+</span> Создать заказ
                        </button>
                    </div>
                </div>
                <div class="process-board" id="processBoard">
                    ${this.renderBoard()}
                </div>
            </div>
        `;
    }

    renderBoard() {
        let boardHtml = '';
        
        // Колонка "Новые заказы"
        if (this.options.showNewColumn) {
            boardHtml += this.renderProcessColumn(
                'Новые заказы',
                this.getNewOrders(),
                null,
                'new-orders'
            );
        }
        
        // Колонки процессов
        this.state.processes.forEach(process => {
            const processOrders = this.getOrdersByProcess(process.id);
            boardHtml += this.renderProcessColumn(
                process.name,
                processOrders,
                process.id,
                'process',
                process.color
            );
        });
        
        // Колонка "Завершено"
        if (this.options.showCompletedColumn) {
            boardHtml += this.renderProcessColumn(
                'Завершено',
                this.getCompletedOrders(),
                0,
                'completed'
            );
        }
        
        return boardHtml;
    }

    renderProcessColumn(title, orders, processId, type, color = null) {
        const columnClass = `process-column ${type}`;
        const dragDropAttrs = this.options.allowDragDrop ? 
            `data-process-id="${processId}" ondrop="event.preventDefault()" ondragover="event.preventDefault()"` : '';
        
        const headerStyle = color ? `style="border-left: 4px solid ${color}"` : '';
        
        return `
            <div class="${columnClass}" ${dragDropAttrs}>
                <div class="process-header" ${headerStyle}>
                    <div class="process-title">${title}</div>
                    <div class="process-count">${orders.length}</div>
                    ${processId !== null && processId !== 0 ? `
                        <div class="process-actions">
                            <button class="btn-icon" data-action="process-menu" data-process-id="${processId}">
                                ⋮
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="process-body" data-process-id="${processId}">
                    ${orders.map(order => this.renderOrderCard(order)).join('')}
                    ${orders.length === 0 ? `
                        <div class="empty-column">
                            <p>Нет заказов</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderOrderCard(order) {
        const product = store.getGetter('getProductById')(order.productId);
        const productName = product ? product.name : 'Неизвестное изделие';
        
        const statusClass = this.getOrderStatusClass(order);
        const priorityClass = this.getPriorityClass(order.priority);
        
        const dragAttrs = this.options.allowDragDrop ? 
            `draggable="true" data-order-id="${order.id}"` : '';
        
        return `
            <div class="order-card ${statusClass} ${priorityClass}" ${dragAttrs}>
                <div class="order-header">
                    <div class="order-number">#${order.number}</div>
                    <div class="order-priority">${this.getPriorityIcon(order.priority)}</div>
                </div>
                
                <div class="order-info">
                    <div class="order-client">${order.clientName}</div>
                    <div class="order-product">${productName}</div>
                    ${order.quantity > 1 ? `<div class="order-quantity">Кол-во: ${order.quantity}</div>` : ''}
                </div>
                
                ${order.comment ? `
                    <div class="order-comment">
                        <small>${order.comment}</small>
                    </div>
                ` : ''}
                
                <div class="order-meta">
                    <div class="order-date">${this.formatOrderDate(order.createdAt)}</div>
                    ${order.deadline ? `
                        <div class="order-deadline ${this.isOverdue(order.deadline) ? 'overdue' : ''}">
                            ⏰ ${this.formatOrderDate(order.deadline)}
                        </div>
                    ` : ''}
                </div>
                
                ${order.defectInfo?.isDefective ? `
                    <div class="order-defect">
                        <span class="defect-badge">⚠️ Брак</span>
                        <small>${order.defectInfo.reason}</small>
                    </div>
                ` : ''}
                
                <div class="order-actions">
                    <button class="btn-icon" data-action="order-menu" data-order-id="${order.id}">
                        ⋮
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Создание заказа
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="create-order"]')) {
                OrderFormFactory.openCreateModal();
            }
        });

        // Меню заказа
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="order-menu"]')) {
                const orderId = parseInt(e.target.closest('[data-action="order-menu"]').dataset.orderId);
                this.showOrderMenu(e.target, orderId);
            }
        });

        // Клик по карточке заказа
        this.element.addEventListener('click', (e) => {
            const orderCard = e.target.closest('.order-card');
            if (orderCard && !e.target.closest('[data-action]')) {
                const orderId = parseInt(orderCard.dataset.orderId);
                this.showOrderDetails(orderId);
            }
        });

        // Drag & Drop события
        if (this.options.allowDragDrop) {
            this.setupDragAndDrop();
        }
    }

    setupDragAndDrop() {
        // Начало перетаскивания
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('order-card')) {
                const orderId = parseInt(e.target.dataset.orderId);
                this.setState({ draggedOrder: orderId });
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // Окончание перетаскивания
        this.element.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('order-card')) {
                e.target.classList.remove('dragging');
                this.setState({ draggedOrder: null, dragOverColumn: null });
                
                // Убираем подсветку со всех колонок
                this.element.querySelectorAll('.process-column').forEach(col => {
                    col.classList.remove('drag-over');
                });
            }
        });

        // Вход в область сброса
        this.element.addEventListener('dragenter', (e) => {
            const column = e.target.closest('.process-column');
            if (column && this.state.draggedOrder) {
                column.classList.add('drag-over');
            }
        });

        // Выход из области сброса
        this.element.addEventListener('dragleave', (e) => {
            const column = e.target.closest('.process-column');
            if (column && !column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });

        // Разрешить сброс
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        // Сброс заказа
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const column = e.target.closest('.process-column');
            if (column && this.state.draggedOrder) {
                const targetProcessId = column.dataset.processId;
                const parsedProcessId = targetProcessId === 'null' ? null : 
                                     targetProcessId === '0' ? 0 : 
                                     parseInt(targetProcessId);
                
                this.moveOrderToProcess(this.state.draggedOrder, parsedProcessId);
                column.classList.remove('drag-over');
            }
        });
    }

    async moveOrderToProcess(orderId, toProcessId) {
        try {
            const result = await orderModule.moveOrder(orderId, toProcessId);
            
            if (result.success) {
                eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                    type: 'success',
                    message: 'Заказ перемещен'
                });
            } else {
                eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                    type: 'error',
                    message: result.error
                });
            }
            
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
        }
    }

    showOrderMenu(button, orderId) {
        const order = store.getGetter('getOrderById')(orderId);
        if (!order) return;

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="view-order">👁️ Просмотр</div>
            <div class="context-menu-item" data-action="edit-order">✏️ Редактировать</div>
            <div class="context-menu-separator"></div>
            ${!order.defectInfo?.isDefective ? `
                <div class="context-menu-item" data-action="send-defect">⚠️ Брак</div>
            ` : `
                <div class="context-menu-item" data-action="fix-defect">✅ Исправить брак</div>
            `}
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete-order">🗑️ Удалить</div>
        `;

        this.showContextMenu(menu, button, (action) => {
            switch (action) {
                case 'view-order':
                    this.showOrderDetails(orderId);
                    break;
                case 'edit-order':
                    OrderFormFactory.openEditModal(orderId);
                    break;
                case 'send-defect':
                    this.showDefectModal(orderId);
                    break;
                case 'fix-defect':
                    this.showFixDefectModal(orderId);
                    break;
                case 'delete-order':
                    this.confirmDeleteOrder(orderId);
                    break;
            }
        });
    }

    showContextMenu(menu, button, onAction) {
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.zIndex = '1000';

        document.body.appendChild(menu);

        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                onAction(action);
                menu.remove();
            }
        });

        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                }
            }, { once: true });
        }, 0);
    }

    showOrderDetails(orderId) {
        const order = store.getGetter('getOrderById')(orderId);
        if (!order) return;

        const product = store.getGetter('getProductById')(order.productId);
        const currentProcess = order.currentProcessId ? 
            store.getGetter('getProcessById')(order.currentProcessId) : null;

        const content = `
            <div class="order-details">
                <div class="detail-section">
                    <h4>Основная информация</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Номер заказа:</label>
                            <span>#${order.number}</span>
                        </div>
                        <div class="detail-item">
                            <label>Клиент:</label>
                            <span>${order.clientName}</span>
                        </div>
                        <div class="detail-item">
                            <label>Телефон:</label>
                            <span>${order.clientPhone || 'Не указан'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Изделие:</label>
                            <span>${product ? product.name : 'Неизвестное изделие'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Количество:</label>
                            <span>${order.quantity}</span>
                        </div>
                        <div class="detail-item">
                            <label>Текущий процесс:</label>
                            <span>${currentProcess ? currentProcess.name : 'Завершен'}</span>
                        </div>
                    </div>
                </div>

                ${order.comment ? `
                    <div class="detail-section">
                        <h4>Комментарий</h4>
                        <p>${order.comment}</p>
                    </div>
                ` : ''}

                ${Object.keys(order.customFields || {}).length > 0 ? `
                    <div class="detail-section">
                        <h4>Дополнительные поля</h4>
                        <div class="detail-grid">
                            ${Object.entries(order.customFields).map(([key, value]) => `
                                <div class="detail-item">
                                    <label>${key}:</label>
                                    <span>${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4>История заказа</h4>
                    <div class="order-history">
                        ${this.renderOrderHistory(order.history || [])}
                    </div>
                </div>
            </div>
        `;

        ModalFactory.createInfoModal(`Заказ #${order.number}`, content, 'large');
    }

    renderOrderHistory(history) {
        if (history.length === 0) {
            return '<p class="text-muted">История пуста</p>';
        }

        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(event => `
                <div class="history-item">
                    <div class="history-icon">${this.getHistoryIcon(event.type)}</div>
                    <div class="history-content">
                        <div class="history-text">${this.getHistoryText(event)}</div>
                        <div class="history-meta">
                            <span class="history-user">${event.user?.name || 'Система'}</span>
                            <span class="history-date">${formatDate(event.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    getHistoryIcon(type) {
        const icons = {
            'created': '✨',
            'moved': '➡️',
            'updated': '✏️',
            'defect_sent': '⚠️',
            'defect_fixed': '✅'
        };
        return icons[type] || '📝';
    }

    getHistoryText(event) {
        switch (event.type) {
            case 'created':
                return 'Заказ создан';
            case 'moved':
                const from = event.data?.fromProcess?.name || 'Начало';
                const to = event.data?.toProcess?.name || 'Завершено';
                return `Перемещен: ${from} → ${to}`;
            case 'updated':
                return 'Заказ обновлен';
            case 'defect_sent':
                return `Отправлен в брак: ${event.data?.reason || ''}`;
            case 'defect_fixed':
                return 'Брак исправлен';
            default:
                return 'Неизвестное действие';
        }
    }

    showDefectModal(orderId) {
        const content = `
            <form id="defectForm">
                <div class="form-group">
                    <label class="form-label">Причина брака *</label>
                    <textarea name="reason" class="form-textarea" rows="3" 
                              placeholder="Опишите причину брака" required></textarea>
                </div>
            </form>
        `;

        const modal = ModalFactory.createFormModal(
            'Отправить в брак',
            content,
            async (data, form, modal) => {
                try {
                    modal.showLoading();
                    const result = await orderModule.sendOrderToDefect(orderId, data.reason);
                    
                    if (result.success) {
                        modal.close();
                        setTimeout(() => modal.destroy(), 300);
                        eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                            type: 'success',
                            message: 'Заказ отправлен в брак'
                        });
                    } else {
                        modal.hideLoading();
                        modal.showError(result.error);
                    }
                } catch (error) {
                    modal.hideLoading();
                    modal.showError('Ошибка при отправке в брак');
                }
            }
        );
    }

    confirmDeleteOrder(orderId) {
        const order = store.getGetter('getOrderById')(orderId);
        if (!order) return;

        ModalFactory.createConfirmModal(
            'Удалить заказ',
            `Вы уверены, что хотите удалить заказ #${order.number}?<br><br>Это действие нельзя отменить.`,
            async () => {
                try {
                    const result = await orderModule.deleteOrder(orderId);
                    
                    if (result.success) {
                        eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                            type: 'success',
                            message: 'Заказ удален'
                        });
                    } else {
                        eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                            type: 'error',
                            message: result.error
                        });
                    }
                } catch (error) {
                    eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                        type: 'error',
                        message: 'Ошибка при удалении заказа'
                    });
                }
            }
        );
    }

    // Вспомогательные методы
    getNewOrders() {
        return this.state.orders.filter(order => !order.currentProcessId);
    }

    getOrdersInProgress() {
        return this.state.orders.filter(order => order.currentProcessId);
    }

    getCompletedOrders() {
        return this.state.orders.filter(order => order.status === 'completed');
    }

    getOrdersByProcess(processId) {
        return this.state.orders.filter(order => order.currentProcessId === processId);
    }

    getOrderStatusClass(order) {
        if (order.defectInfo?.isDefective) return 'status-problem';
        if (!order.currentProcessId) return 'status-done';
        return 'status-progress';
    }

    getPriorityClass(priority) {
        return `priority-${priority || 'normal'}`;
    }

    getPriorityIcon(priority) {
        const icons = {
            'low': '🔵',
            'normal': '',
            'high': '🟡',
            'urgent': '🔴'
        };
        return icons[priority] || '';
    }

    formatOrderDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    isOverdue(deadline) {
        return new Date(deadline) < new Date();
    }
}

export default ProcessBoard;