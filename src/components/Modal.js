import BaseComponent from '../core/BaseComponent.js';
import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { EVENTS } from '../utils/constants.js';

/**
 * Универсальный компонент модального окна
 */
export class Modal extends BaseComponent {
    getDefaultOptions() {
        return {
            title: 'Модальное окно',
            size: 'medium', // small, medium, large
            closeOnBackdrop: true,
            closeOnEscape: true,
            showCloseButton: true,
            footer: true
        };
    }

    getInitialState() {
        return {
            isVisible: false,
            content: '',
            loading: false
        };
    }

    init() {
        super.init();
        this.createModal();
    }

    createModal() {
        // Создаем модальное окно в body
        const modalContainer = document.getElementById('modalContainer') || document.body;
        const modalElement = document.createElement('div');
        modalElement.className = 'modal';
        modalElement.setAttribute('data-component-id', this.id);
        modalContainer.appendChild(modalElement);
        
        this.element = modalElement;
        this.render();
    }

    template() {
        const sizeClass = `modal-${this.options.size}`;
        
        return `
            <div class="modal-backdrop" ${this.options.closeOnBackdrop ? 'data-close-modal' : ''}></div>
            <div class="modal-dialog ${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">${this.options.title}</h4>
                        ${this.options.showCloseButton ? 
                            '<button type="button" class="modal-close" data-close-modal>&times;</button>' : ''
                        }
                    </div>
                    <div class="modal-body">
                        ${this.state.loading ? 
                            '<div class="loading-spinner"></div><p class="text-center">Загрузка...</p>' :
                            this.state.content
                        }
                    </div>
                    ${this.options.footer ? this.renderFooter() : ''}
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-close-modal>Отмена</button>
                <button type="button" class="btn btn-primary" data-save-modal>Сохранить</button>
            </div>
        `;
    }

    bindEvents() {
        // Закрытие модального окна
        this.element.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-close-modal')) {
                this.close();
            }
        });

        // Сохранение
        this.element.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-save-modal')) {
                this.handleSave();
            }
        });

        // Закрытие по Escape
        if (this.options.closeOnEscape) {
            this.handleEscapeKey = (e) => {
                if (e.key === 'Escape' && this.state.isVisible) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.handleEscapeKey);
        }

        // Обработка форм
        this.element.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });
    }

    /**
     * Открыть модальное окно
     */
    open(content = '', options = {}) {
        this.options = { ...this.options, ...options };
        this.setState({ 
            isVisible: true, 
            content: content 
        });
        
        this.element.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Фокус на первом элементе формы
        setTimeout(() => {
            const firstInput = this.element.querySelector('input, select, textarea, button');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);

        eventBus.emit(EVENTS.MODAL_OPEN, { modal: this });
    }

    /**
     * Закрыть модальное окно
     */
    close() {
        this.setState({ isVisible: false });
        this.element.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        eventBus.emit(EVENTS.MODAL_CLOSE, { modal: this });
    }

    /**
     * Установить содержимое
     */
    setContent(content) {
        this.setState({ content: content });
    }

    /**
     * Установить заголовок
     */
    setTitle(title) {
        this.options.title = title;
        const titleElement = this.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Показать загрузку
     */
    showLoading() {
        this.setState({ loading: true });
    }

    /**
     * Скрыть загрузку
     */
    hideLoading() {
        this.setState({ loading: false });
    }

    /**
     * Обработка сохранения
     */
    handleSave() {
        const form = this.element.querySelector('form');
        if (form) {
            this.handleFormSubmit({ target: form });
        } else {
            this.emit('modal:save', { modal: this });
        }
    }

    /**
     * Обработка отправки формы
     */
    handleFormSubmit(e) {
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        this.emit('modal:formSubmit', { 
            modal: this, 
            form: form, 
            data: data 
        });
    }

    /**
     * Показать ошибку в модальном окне
     */
    showError(message) {
        const existingError = this.element.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger modal-error';
        errorDiv.textContent = message;
        
        const modalBody = this.element.querySelector('.modal-body');
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
    }

    /**
     * Скрыть ошибку
     */
    hideError() {
        const errorElement = this.element.querySelector('.modal-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Уничтожение компонента
     */
    destroy() {
        if (this.handleEscapeKey) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
        
        document.body.classList.remove('modal-open');
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        super.destroy();
    }
}

/**
 * Фабричные методы для создания типичных модальных окон
 */
export class ModalFactory {
    /**
     * Создать модальное окно подтверждения
     */
    static createConfirmModal(title, message, onConfirm, onCancel = null) {
        const modal = new Modal(document.createElement('div'), {
            title: title,
            size: 'small',
            footer: false
        });

        const content = `
            <p>${message}</p>
            <div class="modal-actions" style="margin-top: 1.5rem; text-align: right;">
                <button type="button" class="btn btn-secondary" data-cancel style="margin-right: 0.5rem;">Отмена</button>
                <button type="button" class="btn btn-danger" data-confirm>Подтвердить</button>
            </div>
        `;

        modal.open(content);

        // Обработчики
        modal.element.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-confirm')) {
                if (onConfirm) onConfirm();
                modal.close();
                setTimeout(() => modal.destroy(), 300);
            } else if (e.target.hasAttribute('data-cancel')) {
                if (onCancel) onCancel();
                modal.close();
                setTimeout(() => modal.destroy(), 300);
            }
        });

        return modal;
    }

    /**
     * Создать модальное окно с формой
     */
    static createFormModal(title, formHtml, onSubmit, options = {}) {
        const modal = new Modal(document.createElement('div'), {
            title: title,
            size: options.size || 'medium',
            ...options
        });

        modal.open(formHtml);

        // Обработчик отправки формы
        modal.on('modal:formSubmit', ({ data, form }) => {
            if (onSubmit) {
                onSubmit(data, form, modal);
            }
        });

        return modal;
    }

    /**
     * Создать модальное окно информации
     */
    static createInfoModal(title, content, size = 'medium') {
        const modal = new Modal(document.createElement('div'), {
            title: title,
            size: size,
            footer: false
        });

        const infoContent = `
            <div class="modal-info">
                ${content}
            </div>
            <div class="modal-actions" style="margin-top: 1.5rem; text-align: right;">
                <button type="button" class="btn btn-primary" data-close-modal>OK</button>
            </div>
        `;

        modal.open(infoContent);
        
        // Автоуничтожение при закрытии
        modal.on('modal:close', () => {
            setTimeout(() => modal.destroy(), 300);
        });

        return modal;
    }
}

export default Modal;