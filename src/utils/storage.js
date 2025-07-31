import { STORAGE_KEYS, APP_CONFIG } from './constants.js';
import { deepClone } from './helpers.js';

/**
 * Система хранения данных с поддержкой версионирования и миграций
 */
export class Storage {
    constructor(prefix = APP_CONFIG.STORAGE_PREFIX) {
        this.prefix = prefix;
        this.version = '1.0.0';
        this.migrations = new Map();
        this.cache = new Map();
        
        this.init();
    }

    /**
     * Инициализация хранилища
     */
    init() {
        // Проверяем поддержку localStorage
        if (!this.isSupported()) {
            console.warn('⚠️ localStorage не поддерживается');
            return;
        }

        // Выполняем миграции если нужно
        this.runMigrations();
    }

    /**
     * Проверка поддержки localStorage
     */
    isSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Получение полного ключа с префиксом
     */
    getKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Сохранение данных
     */
    set(key, value, options = {}) {
        if (!this.isSupported()) {
            console.warn('⚠️ Невозможно сохранить данные');
            return false;
        }

        try {
            const data = {
                value: deepClone(value),
                timestamp: Date.now(),
                version: this.version,
                expires: options.expires || null
            };

            const fullKey = this.getKey(key);
            localStorage.setItem(fullKey, JSON.stringify(data));
            
            // Обновляем кэш
            this.cache.set(key, data);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
            return false;
        }
    }

    /**
     * Получение данных
     */
    get(key, defaultValue = null) {
        if (!this.isSupported()) {
            return defaultValue;
        }

        try {
            // Сначала проверяем кэш
            if (this.cache.has(key)) {
                const cached = this.cache.get(key);
                if (!this.isExpired(cached)) {
                    return deepClone(cached.value);
                } else {
                    this.cache.delete(key);
                    this.remove(key);
                }
            }

            const fullKey = this.getKey(key);
            const stored = localStorage.getItem(fullKey);
            
            if (!stored) {
                return defaultValue;
            }

            const data = JSON.parse(stored);
            
            // Проверяем срок действия
            if (this.isExpired(data)) {
                this.remove(key);
                return defaultValue;
            }

            // Добавляем в кэш
            this.cache.set(key, data);
            
            return deepClone(data.value);
        } catch (error) {
            console.error('❌ Ошибка получения данных:', error);
            return defaultValue;
        }
    }

    /**
     * Проверка истечения срока действия
     */
    isExpired(data) {
        if (!data.expires) return false;
        return Date.now() > data.expires;
    }

    /**
     * Удаление данных
     */
    remove(key) {
        if (!this.isSupported()) {
            return false;
        }

        try {
            const fullKey = this.getKey(key);
            localStorage.removeItem(fullKey);
            this.cache.delete(key);
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления данных:', error);
            return false;
        }
    }

    /**
     * Проверка существования ключа
     */
    has(key) {
        if (!this.isSupported()) {
            return false;
        }

        return localStorage.getItem(this.getKey(key)) !== null;
    }

    /**
     * Получение всех ключей с префиксом
     */
    keys() {
        if (!this.isSupported()) {
            return [];
        }

        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }

    /**
     * Очистка всех данных с префиксом
     */
    clear() {
        if (!this.isSupported()) {
            return false;
        }

        try {
            const keys = this.keys();
            keys.forEach(key => this.remove(key));
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки данных:', error);
            return false;
        }
    }

    /**
     * Получение размера хранилища
     */
    size() {
        return this.keys().length;
    }

    /**
     * Экспорт всех данных
     */
    export() {
        const data = {};
        const keys = this.keys();
        
        keys.forEach(key => {
            data[key] = this.get(key);
        });
        
        return {
            version: this.version,
            timestamp: Date.now(),
            data
        };
    }

    /**
     * Импорт данных
     */
    import(exportData, options = {}) {
        if (!exportData || !exportData.data) {
            throw new Error('Неверный формат данных для импорта');
        }

        const { clearBefore = false } = options;
        
        if (clearBefore) {
            this.clear();
        }

        let imported = 0;
        let errors = 0;

        Object.keys(exportData.data).forEach(key => {
            try {
                this.set(key, exportData.data[key]);
                imported++;
            } catch (error) {
                console.error(`❌ Ошибка импорта ключа ${key}:`, error);
                errors++;
            }
        });

        return { imported, errors };
    }

    /**
     * Добавление миграции
     */
    addMigration(version, migrationFn) {
        this.migrations.set(version, migrationFn);
    }

    /**
     * Выполнение миграций
     */
    runMigrations() {
        const currentVersion = this.get('_version', '0.0.0');
        
        if (currentVersion === this.version) {
            return; // Миграции не нужны
        }

        console.log(`🔄 Выполнение миграций с ${currentVersion} до ${this.version}`);

        // Сортируем миграции по версии
        const sortedMigrations = Array.from(this.migrations.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        for (const [version, migration] of sortedMigrations) {
            if (version > currentVersion && version <= this.version) {
                try {
                    console.log(`🔄 Миграция на версию ${version}`);
                    migration(this);
                } catch (error) {
                    console.error(`❌ Ошибка миграции ${version}:`, error);
                }
            }
        }

        // Обновляем версию
        this.set('_version', this.version);
    }

    /**
     * Получение информации о хранилище
     */
    getInfo() {
        return {
            version: this.version,
            prefix: this.prefix,
            supported: this.isSupported(),
            size: this.size(),
            cacheSize: this.cache.size,
            keys: this.keys()
        };
    }
}

/**
 * Специализированные хранилища для разных типов данных
 */

/**
 * Хранилище для настроек пользователя
 */
export class UserStorage extends Storage {
    constructor() {
        super('oms_user_');
        
        // Добавляем миграции
        this.addMigration('1.0.0', this.migrate_1_0_0.bind(this));
    }

    /**
     * Миграция 1.0.0
     */
    migrate_1_0_0(storage) {
        // Пример миграции - переименование ключей
        const oldUserData = storage.get('user', null);
        if (oldUserData) {
            storage.set('currentUser', oldUserData);
            storage.remove('user');
        }
    }

    /**
     * Сохранение текущего пользователя
     */
    setCurrentUser(user) {
        return this.set(STORAGE_KEYS.CURRENT_USER, user);
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        return this.get(STORAGE_KEYS.CURRENT_USER);
    }

    /**
     * Очистка данных пользователя
     */
    clearUserData() {
        this.remove(STORAGE_KEYS.CURRENT_USER);
    }
}

/**
 * Хранилище для данных приложения
 */
export class AppStorage extends Storage {
    constructor() {
        super('oms_app_');
    }

    /**
     * Сохранение заказов
     */
    setOrders(orders) {
        return this.set(STORAGE_KEYS.ORDERS, orders);
    }

    /**
     * Получение заказов
     */
    getOrders() {
        return this.get(STORAGE_KEYS.ORDERS, []);
    }

    /**
     * Сохранение процессов
     */
    setProcesses(processes) {
        return this.set(STORAGE_KEYS.PROCESSES, processes);
    }

    /**
     * Получение процессов
     */
    getProcesses() {
        return this.get(STORAGE_KEYS.PROCESSES, []);
    }

    /**
     * Сохранение изделий
     */
    setProducts(products) {
        return this.set(STORAGE_KEYS.PRODUCTS, products);
    }

    /**
     * Получение изделий
     */
    getProducts() {
        return this.get(STORAGE_KEYS.PRODUCTS, []);
    }

    /**
     * Сохранение пользователей
     */
    setUsers(users) {
        return this.set(STORAGE_KEYS.USERS, users);
    }

    /**
     * Получение пользователей
     */
    getUsers() {
        return this.get(STORAGE_KEYS.USERS, []);
    }

    /**
     * Сохранение всех данных одновременно
     */
    setAppData(data) {
        const success = [];
        
        if (data.orders) success.push(this.setOrders(data.orders));
        if (data.processes) success.push(this.setProcesses(data.processes));
        if (data.products) success.push(this.setProducts(data.products));
        if (data.users) success.push(this.setUsers(data.users));
        
        return success.every(result => result);
    }

    /**
     * Получение всех данных
     */
    getAppData() {
        return {
            orders: this.getOrders(),
            processes: this.getProcesses(),
            products: this.getProducts(),
            users: this.getUsers()
        };
    }
}

// Глобальные экземпляры
export const userStorage = new UserStorage();
export const appStorage = new AppStorage();

// Глобальный доступ для совместимости
window.userStorage = userStorage;
window.appStorage = appStorage;

export default {
    Storage,
    UserStorage,
    AppStorage,
    userStorage,
    appStorage
};