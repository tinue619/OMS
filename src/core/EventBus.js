/**
 * Система событий для слабой связанности компонентов
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.debug = false;
    }

    /**
     * Подписка на событие
     */
    on(event, callback, options = {}) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        const listener = {
            callback,
            once: options.once || false,
            context: options.context || null
        };
        
        this.events.get(event).add(listener);
        
        if (this.debug) {
            console.log(`📡 EventBus: подписка на '${event}'`);
        }
        
        // Возвращаем функцию отписки
        return () => this.off(event, callback);
    }

    /**
     * Одноразовая подписка на событие
     */
    once(event, callback, context = null) {
        return this.on(event, callback, { once: true, context });
    }

    /**
     * Отписка от события
     */
    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const listeners = this.events.get(event);
        const toRemove = Array.from(listeners).find(
            listener => listener.callback === callback
        );
        
        if (toRemove) {
            listeners.delete(toRemove);
            if (this.debug) {
                console.log(`📡 EventBus: отписка от '${event}'`);
            }
        }
    }

    /**
     * Генерация события
     */
    emit(event, data = null) {
        if (!this.events.has(event)) return;
        
        if (this.debug) {
            console.log(`📡 EventBus: событие '${event}'`, data);
        }
        
        const listeners = Array.from(this.events.get(event));
        
        listeners.forEach(listener => {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, data);
                } else {
                    listener.callback(data);
                }
                
                // Удаляем одноразовые подписки
                if (listener.once) {
                    this.events.get(event).delete(listener);
                }
            } catch (error) {
                console.error(`❌ Ошибка в обработчике события '${event}':`, error);
            }
        });
    }

    /**
     * Очистка всех подписок
     */
    clear() {
        this.events.clear();
        if (this.debug) {
            console.log('📡 EventBus: все подписки очищены');
        }
    }

    /**
     * Получить количество подписчиков на событие
     */
    getListenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }

    /**
     * Включить/выключить отладку
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Глобальный экземпляр
export const eventBus = new EventBus();

// Глобальный доступ для совместимости
window.eventBus = eventBus;