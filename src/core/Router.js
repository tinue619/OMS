import { eventBus } from './EventBus.js';

/**
 * Простой роутер для SPA
 */
export class Router {
    constructor(options = {}) {
        this.routes = new Map();
        this.currentRoute = null;
        this.basePath = options.basePath || '/';
        this.hashMode = options.hashMode !== false;
        this.beforeHooks = [];
        this.afterHooks = [];
        
        this.init();
    }

    /**
     * Инициализация роутера
     */
    init() {
        if (this.hashMode) {
            window.addEventListener('hashchange', () => this.handleRoute());
            window.addEventListener('load', () => this.handleRoute());
        } else {
            window.addEventListener('popstate', () => this.handleRoute());
        }
    }

    /**
     * Регистрация маршрута
     */
    addRoute(path, handler, options = {}) {
        const route = {
            path,
            handler,
            name: options.name || null,
            meta: options.meta || {},
            beforeEnter: options.beforeEnter || null
        };
        
        this.routes.set(path, route);
        return this;
    }

    /**
     * Добавление хука перед навигацией
     */
    beforeEach(fn) {
        this.beforeHooks.push(fn);
        return this;
    }

    /**
     * Добавление хука после навигации
     */
    afterEach(fn) {
        this.afterHooks.push(fn);
        return this;
    }

    /**
     * Навигация на маршрут
     */
    push(path, data = null) {
        if (this.hashMode) {
            window.location.hash = path;
        } else {
            history.pushState(data, '', this.basePath + path);
            this.handleRoute();
        }
    }

    /**
     * Замена текущего маршрута
     */
    replace(path, data = null) {
        if (this.hashMode) {
            window.location.replace(window.location.pathname + '#' + path);
        } else {
            history.replaceState(data, '', this.basePath + path);
            this.handleRoute();
        }
    }

    /**
     * Назад в истории
     */
    back() {
        history.back();
    }

    /**
     * Вперед в истории
     */
    forward() {
        history.forward();
    }

    /**
     * Получение текущего пути
     */
    getCurrentPath() {
        if (this.hashMode) {
            return window.location.hash.slice(1) || '/';
        } else {
            return window.location.pathname.replace(this.basePath, '') || '/';
        }
    }

    /**
     * Парсинг параметров из пути
     */
    parseParams(pattern, path) {
        const params = {};
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                const paramName = patternPart.slice(1);
                params[paramName] = pathPart;
            } else if (patternPart !== pathPart) {
                return null;
            }
        }

        return params;
    }

    /**
     * Поиск подходящего маршрута
     */
    findRoute(path) {
        // Точное совпадение
        if (this.routes.has(path)) {
            return {
                route: this.routes.get(path),
                params: {}
            };
        }

        // Поиск с параметрами
        for (const [pattern, route] of this.routes) {
            const params = this.parseParams(pattern, path);
            if (params !== null) {
                return { route, params };
            }
        }

        return null;
    }

    /**
     * Обработка маршрута
     */
    async handleRoute() {
        const path = this.getCurrentPath();
        const routeMatch = this.findRoute(path);

        if (!routeMatch) {
            console.warn(`⚠️ Маршрут не найден: ${path}`);
            eventBus.emit('router:notFound', { path });
            return;
        }

        const { route, params } = routeMatch;
        const routeContext = {
            path,
            params,
            query: this.parseQuery(),
            meta: route.meta,
            name: route.name
        };

        try {
            // Выполняем хуки перед навигацией
            for (const hook of this.beforeHooks) {
                const result = await hook(routeContext, this.currentRoute);
                if (result === false) {
                    return; // Отменяем навигацию
                }
            }

            // Выполняем хук конкретного маршрута
            if (route.beforeEnter) {
                const result = await route.beforeEnter(routeContext, this.currentRoute);
                if (result === false) {
                    return;
                }
            }

            // Сохраняем предыдущий маршрут
            const prevRoute = this.currentRoute;
            this.currentRoute = routeContext;

            // Выполняем обработчик маршрута
            await route.handler(routeContext);

            // Выполняем хуки после навигации
            for (const hook of this.afterHooks) {
                await hook(routeContext, prevRoute);
            }

            // Генерируем события
            eventBus.emit('router:change', {
                from: prevRoute,
                to: routeContext
            });

        } catch (error) {
            console.error(`❌ Ошибка в маршруте ${path}:`, error);
            eventBus.emit('router:error', {
                error,
                route: routeContext
            });
        }
    }

    /**
     * Парсинг query параметров
     */
    parseQuery() {
        const query = {};
        const queryString = window.location.search.slice(1);
        
        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : true;
            });
        }

        return query;
    }

    /**
     * Получение URL с параметрами
     */
    buildUrl(path, params = {}) {
        let url = path;
        
        // Подставляем параметры маршрута
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });
        
        return url;
    }

    /**
     * Проверка, является ли маршрут активным
     */
    isActive(path) {
        return this.getCurrentPath() === path;
    }
}

// Глобальный экземпляр
export const router = new Router();

// Глобальный доступ для совместимости
window.router = router;