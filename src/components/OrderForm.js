import BaseComponent from '../core/BaseComponent.js';
import { ModalFactory } from './Modal.js';
import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { orderModule } from '../modules/OrderModule.js';
import { EVENTS } from '../utils/constants.js';

/**
 * Компонент формы создания/редактирования заказа
 */
export class OrderForm extends BaseComponent {
    getDefaultOptions() {
        return {
            mode: 'create', // create или edit
            orderId: null
        };
    }

    getInitialState() {
        return {
            order: null,
            products: [],
            loading: false,
            errors: {}
        };
    }

    init() {
        super.init();
        this.loadData();
    }

    async loadData() {
        this.setState({ loading: true });
        
        try {
            const products = store.getGetter('products');
            
            let order = null;
            if (this.options.mode === 'edit' && this.options.orderId) {
                order = store.getGetter('getOrderById')(this.options.orderId);
            }
            
            this.setState({
                products: products,
                order: order,
                loading: false
            });
            
        } catch (error) {
            console.error('Ошибка загрузки данных формы:', error);
            this.setState({ loading: false });
        }
    }

    template() {
        if (this.state.loading) {
            return `
                <div class="loading-spinner"></div>
                <p class="text-center">Загрузка формы...</p>
            `;
        }

        const order = this.state.order;
        const isEdit = this.options.mode === 'edit';

        return `
            <form id="orderForm" class="order-form">
                <div class="form-group">
                    <label class="form-label">Клиент *</label>
                    <input type="text" name="clientName" class="form-input" 
                           value="${order?.clientName || ''}" 
                           placeholder="ФИО клиента" required>
                    <div class="form-error" data-field="clientName"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Телефон</label>
                    <input type="tel" name="clientPhone" class="form-input" 
                           value="${order?.clientPhone || ''}" 
                           placeholder="+7 777 123 4567">
                    <div class="form-error" data-field="clientPhone"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="clientEmail" class="form-input" 
                           value="${order?.clientEmail || ''}" 
                           placeholder="client@example.com">
                    <div class="form-error" data-field="clientEmail"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Изделие *</label>
                    <select name="productId" class="form-select" required>
                        <option value="">Выберите изделие</option>
                        ${this.state.products.map(product => `
                            <option value="${product.id}" 
                                    ${order?.productId === product.id ? 'selected' : ''}>
                                ${product.name}
                            </option>
                        `).join('')}
                    </select>
                    <div class="form-error" data-field="productId"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Количество *</label>
                    <input type="number" name="quantity" class="form-input" 
                           value="${order?.quantity || 1}" 
                           min="1" max="999" required>
                    <div class="form-error" data-field="quantity"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Приоритет</label>
                    <select name="priority" class="form-select">
                        <option value="low" ${order?.priority === 'low' ? 'selected' : ''}>Низкий</option>
                        <option value="normal" ${!order?.priority || order?.priority === 'normal' ? 'selected' : ''}>Обычный</option>
                        <option value="high" ${order?.priority === 'high' ? 'selected' : ''}>Высокий</option>
                        <option value="urgent" ${order?.priority === 'urgent' ? 'selected' : ''}>Срочный</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Срок выполнения</label>
                    <input type="date" name="deadline" class="form-input" 
                           value="${order?.deadline ? order.deadline.split('T')[0] : ''}">
                </div>

                <div class="form-group">
                    <label class="form-label">Комментарий</label>
                    <textarea name="comment" class="form-textarea" rows="3" 
                              placeholder="Дополнительная информация о заказе">${order?.comment || ''}</textarea>
                </div>

                ${this.renderCustomFields()}
            </form>
        `;
    }

    renderCustomFields() {
        const order = this.state.order;
        const customFields = order?.customFields || {};
        
        let fieldsHtml = '';
        
        // Отображаем существующие кастомные поля
        Object.keys(customFields).forEach(key => {
            fieldsHtml += `
                <div class="form-group custom-field-row">
                    <label class="form-label">
                        <input type="text" class="custom-field-key form-input" 
                               value="${key}" placeholder="Название поля" style="width: 200px; display: inline-block; margin-right: 10px;">
                        <input type="text" class="custom-field-value form-input" 
                               value="${customFields[key]}" placeholder="Значение" style="width: 200px; display: inline-block; margin-right: 10px;">
                        <button type="button" class="btn btn-sm btn-danger remove-custom-field">×</button>
                    </label>
                </div>
            `;
        });

        return `
            <div class="custom-fields-section">
                <div class="form-group">
                    <label class="form-label">Дополнительные поля</label>
                    <div id="customFieldsContainer">
                        ${fieldsHtml}
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" id="addCustomField">
                        + Добавить поле
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Добавление кастомного поля
        this.element.addEventListener('click', (e) => {
            if (e.target.id === 'addCustomField') {
                this.addCustomField();
            }
        });

        // Удаление кастомного поля
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-custom-field')) {
                e.target.closest('.custom-field-row').remove();
            }
        });

        // Валидация в реальном времени
        this.element.addEventListener('input', (e) => {
            if (e.target.classList.contains('form-input') || e.target.classList.contains('form-select')) {
                this.clearFieldError(e.target.name);
            }
        });
    }

    addCustomField() {
        const container = this.element.querySelector('#customFieldsContainer');
        const fieldRow = document.createElement('div');
        fieldRow.className = 'form-group custom-field-row';
        fieldRow.innerHTML = `
            <label class="form-label">
                <input type="text" class="custom-field-key form-input" 
                       placeholder="Название поля" style="width: 200px; display: inline-block; margin-right: 10px;">
                <input type="text" class="custom-field-value form-input" 
                       placeholder="Значение" style="width: 200px; display: inline-block; margin-right: 10px;">
                <button type="button" class="btn btn-sm btn-danger remove-custom-field">×</button>
            </label>
        `;
        container.appendChild(fieldRow);
    }

    collectCustomFields() {
        const customFields = {};
        const fieldRows = this.element.querySelectorAll('.custom-field-row');
        
        fieldRows.forEach(row => {
            const keyInput = row.querySelector('.custom-field-key');
            const valueInput = row.querySelector('.custom-field-value');
            
            if (keyInput && valueInput) {
                const key = keyInput.value.trim();
                const value = valueInput.value.trim();
                
                if (key && value) {
                    customFields[key] = value;
                }
            }
        });
        
        return customFields;
    }

    showFieldError(fieldName, message) {
        const errorElement = this.element.querySelector(`[data-field="${fieldName}"]`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        const field = this.element.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('is-invalid');
        }
    }

    clearFieldError(fieldName) {
        const errorElement = this.element.querySelector(`[data-field="${fieldName}"]`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        const field = this.element.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.remove('is-invalid');
        }
    }

    clearAllErrors() {
        const errorElements = this.element.querySelectorAll('.form-error');
        errorElements.forEach(el => el.style.display = 'none');
        
        const invalidFields = this.element.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => field.classList.remove('is-invalid'));
    }

    showErrors(errors) {
        this.clearAllErrors();
        
        Object.keys(errors).forEach(fieldName => {
            const fieldErrors = errors[fieldName];
            if (fieldErrors && fieldErrors.length > 0) {
                this.showFieldError(fieldName, fieldErrors[0]);
            }
        });
    }

    getFormData() {
        const form = this.element.querySelector('#orderForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Добавляем кастомные поля
        data.customFields = this.collectCustomFields();
        
        // Преобразуем числовые поля
        if (data.quantity) data.quantity = parseInt(data.quantity);
        if (data.productId) data.productId = parseInt(data.productId);
        
        return data;
    }

    async submitForm() {
        try {
            const formData = this.getFormData();
            let result;
            
            if (this.options.mode === 'edit') {
                result = await orderModule.updateOrder(this.options.orderId, formData);
            } else {
                result = await orderModule.createOrder(formData);
            }
            
            if (result.success) {
                this.emit('order:saved', { 
                    order: result.order, 
                    mode: this.options.mode 
                });
                return result;
            } else {
                if (result.errors) {
                    this.showErrors(result.errors);
                }
                throw new Error(result.error || 'Ошибка сохранения заказа');
            }
            
        } catch (error) {
            console.error('Ошибка отправки формы:', error);
            throw error;
        }
    }
}

/**
 * Фабрика для создания модальных окон с формами заказов
 */
export class OrderFormFactory {
    /**
     * Открыть модальное окно создания заказа
     */
    static openCreateModal() {
        const modal = ModalFactory.createFormModal(
            'Создать заказ',
            '<div id="orderFormContainer"></div>',
            async (data, form, modal) => {
                try {
                    modal.showLoading();
                    await orderForm.submitForm();
                    modal.close();
                    setTimeout(() => modal.destroy(), 300);
                } catch (error) {
                    modal.hideLoading();
                    modal.showError(error.message);
                }
            },
            { size: 'large' }
        );

        // Создаем форму внутри модального окна
        const container = modal.element.querySelector('#orderFormContainer');
        const orderForm = new OrderForm(container, { mode: 'create' });

        // Обработчик успешного сохранения
        orderForm.on('order:saved', () => {
            modal.close();
            setTimeout(() => {
                modal.destroy();
                orderForm.destroy();
            }, 300);
            
            // Показываем уведомление
            eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                type: 'success',
                message: 'Заказ успешно создан'
            });
        });

        return { modal, orderForm };
    }

    /**
     * Открыть модальное окно редактирования заказа
     */
    static openEditModal(orderId) {
        const order = store.getGetter('getOrderById')(orderId);
        if (!order) {
            eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                type: 'error',
                message: 'Заказ не найден'
            });
            return;
        }

        const modal = ModalFactory.createFormModal(
            `Редактировать заказ #${order.number}`,
            '<div id="orderFormContainer"></div>',
            async (data, form, modal) => {
                try {
                    modal.showLoading();
                    await orderForm.submitForm();
                    modal.close();
                    setTimeout(() => modal.destroy(), 300);
                } catch (error) {
                    modal.hideLoading();
                    modal.showError(error.message);
                }
            },
            { size: 'large' }
        );

        // Создаем форму внутри модального окна
        const container = modal.element.querySelector('#orderFormContainer');
        const orderForm = new OrderForm(container, { 
            mode: 'edit', 
            orderId: orderId 
        });

        // Обработчик успешного сохранения
        orderForm.on('order:saved', () => {
            modal.close();
            setTimeout(() => {
                modal.destroy();
                orderForm.destroy();
            }, 300);
            
            // Показываем уведомление
            eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
                type: 'success',
                message: 'Заказ успешно обновлен'
            });
        });

        return { modal, orderForm };
    }
}

export default OrderForm;