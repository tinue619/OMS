import { eventBus } from './EventBus.js';

/**
 * Базовый класс для всех компонентов
 */
export class BaseComponent {
    constructor(element, options = {}) {
        this.element = typeof element === 'string' ? 
            document.querySelector(element) : element;
        
        if (!this.element) {
            throw new Error(`Элемент не найден: ${element}`);
        }
        
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = this.getInitialState();
        this.listeners = new Map();
        this.children = new Map();
        this.isDestroyed = false;
        
        // Уникальный ID компонента
        this.id = this.generateId();
        this.element.setAttribute('data-component-id', this.id);
        
        this.init();
    }

    /**
     * Опции по умолчанию (переопределяется в наследниках)
     */
    getDefaultOptions() {
        return {};
    }

    /**
     * Начальное состояние (переопределяется в наследниках)
     */
    getInitialState() {
        return {};
    }

    /**
     * Инициализация компонента
     */
    init() {
        this.bindEvents();
        this.render();
        this.emit('component:init', this);
    }

    /**
     * Привязка событий (переопределяется в наследниках)
     */
    bindEvents() {
        // Переопределяется в наследниках
    }

    /**
     * Рендеринг компонента
     */
    render() {
        if (this.isDestroyed) return;
        
        const html = this.template();
        if (html !== null && html !== undefined) {
            this.element.innerHTML = html;
        }
        
        this.afterRender();
        this.emit('component:render', this);
    }

    /**
     * Действия после рендеринга
     */
    afterRender() {
        // Переопределяется в наследниках
    }

    /**
     * Шаблон компонента (переопределяется в наследниках)
     */
    template() {
        return '';
    }

    /**
     * Обновление состояния
     */
    setState(newState, shouldRender = true) {
        if (this.isDestroyed) return;
        
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        this.emit('component:stateChange', {
            component: this,
            oldState,
            newState: this.state
        });
        
        if (shouldRender) {
            this.render();
        }
    }

    /**
     * Получение текущего состояния
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Подписка на событие
     */
    on(event, callback, context = null) {
        const unsubscribe = eventBus.on(event, callback, { context });
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(unsubscribe);
        
        return unsubscribe;
    }

    /**
     * Генерация события
     */
    emit(event, data = null) {
        eventBus.emit(event, data);
    }

    /**
     * Поиск элемента внутри компонента
     */
    $(selector) {
        return this.element.querySelector(selector);
    }

    /**
     * Поиск всех элементов внутри компонента
     */
    $$(selector) {
        return this.element.querySelectorAll(selector);
    }

    /**
     * Добавление дочернего компонента
     */
    addChild(name, component) {
        if (this.children.has(name)) {
            this.children.get(name).destroy();
        }
        this.children.set(name, component);
    }

    /**
     * Получение дочернего компонента
     */
    getChild(name) {
        return this.children.get(name);
    }

    /**
     * Удаление дочернего компонента
     */
    removeChild(name) {
        if (this.children.has(name)) {
            this.children.get(name).destroy();
            this.children.delete(name);
        }
    }

    /**
     * Показать компонент
     */
    show() {
        this.element.style.display = '';
        this.element.classList.remove('hidden');
        this.emit('component:show', this);
    }

    /**
     * Скрыть компонент
     */
    hide() {
        this.element.style.display = 'none';
        this.element.classList.add('hidden');
        this.emit('component:hide', this);
    }

    /**
     * Переключить видимость
     */
    toggle() {
        if (this.element.style.display === 'none' || 
            this.element.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Добавить CSS класс
     */
    addClass(className) {
        this.element.classList.add(className);
    }

    /**
     * Удалить CSS класс
     */
    removeClass(className) {
        this.element.classList.remove(className);
    }

    /**
     * Переключить CSS класс
     */
    toggleClass(className) {
        this.element.classList.toggle(className);
    }

    /**
     * Проверить наличие CSS класса
     */
    hasClass(className) {
        return this.element.classList.contains(className);
    }

    /**
     * Генерация уникального ID
     */
    generateId() {
        return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Уничтожение компонента
     */
    destroy() {
        if (this.isDestroyed) return;
        
        this.emit('component:beforeDestroy', this);
        
        // Уничтожаем дочерние компоненты
        this.children.forEach(child => child.destroy());
        this.children.clear();
        
        // Отписываемся от всех событий
        this.listeners.forEach(eventListeners => {
            eventListeners.forEach(unsubscribe => unsubscribe());
        });
        this.listeners.clear();
        
        // Очищаем DOM
        if (this.element) {
            this.element.innerHTML = '';
            this.element.removeAttribute('data-component-id');
        }
        
        this.isDestroyed = true;
        this.emit('component:destroy', this);
    }
}

export default BaseComponent;