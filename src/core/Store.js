import { eventBus } from './EventBus.js';

/**
 * Централизованное хранилище состояния приложения
 */
export class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.mutations = new Map();
        this.actions = new Map();
        this.getters = new Map();
        this.subscribers = new Set();
        this.isCommitting = false;
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Регистрация мутации
     */
    registerMutation(name, mutationFn) {
        if (this.mutations.has(name)) {
            console.warn(`⚠️ Мутация '${name}' уже зарегистрирована`);
        }
        this.mutations.set(name, mutationFn);
    }

    /**
     * Регистрация действия
     */
    registerAction(name, actionFn) {
        if (this.actions.has(name)) {
            console.warn(`⚠️ Действие '${name}' уже зарегистрировано`);
        }
        this.actions.set(name, actionFn);
    }

    /**
     * Регистрация геттера
     */
    registerGetter(name, getterFn) {
        if (this.getters.has(name)) {
            console.warn(`⚠️ Геттер '${name}' уже зарегистрирован`);
        }
        this.getters.set(name, getterFn);
    }

    /**
     * Выполнение мутации
     */
    commit(mutationName, payload = null) {
        if (!this.mutations.has(mutationName)) {
            throw new Error(`Мутация '${mutationName}' не найдена`);
        }

        const prevState = { ...this.state };
        this.isCommitting = true;

        try {
            const mutation = this.mutations.get(mutationName);
            mutation(this.state, payload);
            
            // Добавляем в историю
            this.addToHistory({
                type: 'mutation',
                name: mutationName,
                payload,
                prevState,
                newState: { ...this.state },
                timestamp: Date.now()
            });

            // Уведомляем подписчиков
            this.notifySubscribers(prevState, this.state, {
                type: 'mutation',
                name: mutationName,
                payload
            });

            // Генерируем событие
            eventBus.emit('store:mutation', {
                name: mutationName,
                payload,
                prevState,
                newState: this.state
            });

        } catch (error) {
            console.error(`❌ Ошибка в мутации '${mutationName}':`, error);
            throw error;
        } finally {
            this.isCommitting = false;
        }
    }

    /**
     * Выполнение действия
     */
    async dispatch(actionName, payload = null) {
        if (!this.actions.has(actionName)) {
            throw new Error(`Действие '${actionName}' не найдено`);
        }

        try {
            const action = this.actions.get(actionName);
            const context = {
                state: this.state,
                commit: (mutation, data) => this.commit(mutation, data),
                dispatch: (action, data) => this.dispatch(action, data),
                getters: this.getAllGetters()
            };

            const result = await action(context, payload);
            
            eventBus.emit('store:action', {
                name: actionName,
                payload,
                result
            });

            return result;
        } catch (error) {
            console.error(`❌ Ошибка в действии '${actionName}':`, error);
            throw error;
        }
    }

    /**
     * Получение значения геттера
     */
    getGetter(getterName) {
        if (!this.getters.has(getterName)) {
            throw new Error(`Геттер '${getterName}' не найден`);
        }

        const getter = this.getters.get(getterName);
        return getter(this.state, this.getAllGetters());
    }

    /**
     * Получение всех геттеров
     */
    getAllGetters() {
        const getters = {};
        this.getters.forEach((getterFn, name) => {
            Object.defineProperty(getters, name, {
                get: () => getterFn(this.state, getters),
                enumerable: true
            });
        });
        return getters;
    }

    /**
     * Получение состояния
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Подписка на изменения
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Возвращаем функцию отписки
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Уведомление подписчиков
     */
    notifySubscribers(prevState, newState, mutation) {
        this.subscribers.forEach(callback => {
            try {
                callback(prevState, newState, mutation);
            } catch (error) {
                console.error('❌ Ошибка в подписчике store:', error);
            }
        });
    }

    /**
     * Добавление в историю
     */
    addToHistory(entry) {
        this.history.push(entry);
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    /**
     * Получение истории изменений
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Очистка истории
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Установка максимального размера истории
     */
    setMaxHistorySize(size) {
        this.maxHistorySize = size;
        if (this.history.length > size) {
            this.history = this.history.slice(-size);
        }
    }

    /**
     * Отладочная информация
     */
    debug() {
        console.group('🏪 Store Debug Info');
        console.log('State:', this.state);
        console.log('Mutations:', Array.from(this.mutations.keys()));
        console.log('Actions:', Array.from(this.actions.keys()));
        console.log('Getters:', Array.from(this.getters.keys()));
        console.log('Subscribers:', this.subscribers.size);
        console.log('History entries:', this.history.length);
        console.groupEnd();
    }
}

// Глобальный экземпляр
export const store = new Store();

// Глобальный доступ для совместимости
window.store = store;