/**
 * Константы приложения
 */

// Основные настройки
export const APP_CONFIG = {
    NAME: 'OMS',
    VERSION: '2.0.0',
    DEBUG: true,
    STORAGE_PREFIX: 'oms_'
};

// Ключи для localStorage
export const STORAGE_KEYS = {
    USER_DATA: 'userData',
    ORDERS: 'orders',
    PROCESSES: 'processes', 
    PRODUCTS: 'products',
    USERS: 'users',
    CURRENT_USER: 'currentUser',
    SETTINGS: 'settings'
};

// События системы
export const EVENTS = {
    // Пользователь
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    USER_CREATED: 'user:created',
    USER_UPDATED: 'user:updated',
    USER_DELETED: 'user:deleted',
    
    // Заказы
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    ORDER_DELETED: 'order:deleted',
    ORDER_MOVED: 'order:moved',
    ORDER_STATUS_CHANGED: 'order:statusChanged',
    
    // Процессы
    PROCESS_CREATED: 'process:created',
    PROCESS_UPDATED: 'process:updated',
    PROCESS_DELETED: 'process:deleted',
    PROCESS_REORDERED: 'process:reordered',
    
    // Изделия
    PRODUCT_CREATED: 'product:created',
    PRODUCT_UPDATED: 'product:updated',
    PRODUCT_DELETED: 'product:deleted',
    
    // UI События
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    NOTIFICATION_SHOW: 'notification:show',
    LOADING_START: 'loading:start',
    LOADING_END: 'loading:end',
    
    // Система
    APP_INIT: 'app:init',
    APP_READY: 'app:ready',
    ERROR: 'app:error'
};

// Статусы заказов
export const ORDER_STATUS = {
    CREATED: 'created',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DEFECT: 'defect'
};

// Типы событий в истории заказов
export const HISTORY_TYPES = {
    CREATED: 'created',
    MOVED: 'moved',
    UPDATED: 'updated',
    DEFECT_SENT: 'defect_sent',
    DEFECT_FIXED: 'defect_fixed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
};

// Роли пользователей
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    OPERATOR: 'operator',
    VIEWER: 'viewer'
};

// Права доступа
export const PERMISSIONS = {
    CREATE_ORDER: 'create_order',
    EDIT_ORDER: 'edit_order',
    DELETE_ORDER: 'delete_order',
    MOVE_ORDER: 'move_order',
    MANAGE_PROCESSES: 'manage_processes',
    MANAGE_PRODUCTS: 'manage_products',
    MANAGE_USERS: 'manage_users',
    VIEW_ANALYTICS: 'view_analytics',
    EXPORT_DATA: 'export_data'
};

// Стандартные роли с правами
export const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: [
        PERMISSIONS.CREATE_ORDER,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.DELETE_ORDER,
        PERMISSIONS.MOVE_ORDER,
        PERMISSIONS.MANAGE_PROCESSES,
        PERMISSIONS.MANAGE_PRODUCTS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.EXPORT_DATA
    ],
    [USER_ROLES.MANAGER]: [
        PERMISSIONS.CREATE_ORDER,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.DELETE_ORDER,
        PERMISSIONS.MOVE_ORDER,
        PERMISSIONS.MANAGE_PROCESSES,
        PERMISSIONS.MANAGE_PRODUCTS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.EXPORT_DATA
    ],
    [USER_ROLES.OPERATOR]: [
        PERMISSIONS.CREATE_ORDER,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.MOVE_ORDER
    ],
    [USER_ROLES.VIEWER]: []
};

// Настройки валидации
export const VALIDATION = {
    ORDER_NUMBER: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 20,
        PATTERN: /^[A-Za-z0-9\-_]+$/
    },
    CLIENT_NAME: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 100
    },
    PHONE: {
        PATTERN: /^[\+]?[1-9][\d]{0,15}$/
    },
    EMAIL: {
        PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    PASSWORD: {
        MIN_LENGTH: 4,
        MAX_LENGTH: 50
    }
};

// CSS классы
export const CSS_CLASSES = {
    // Состояния
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    WARNING: 'warning',
    
    // Видимость
    HIDDEN: 'hidden',
    VISIBLE: 'visible',
    
    // Активность
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DISABLED: 'disabled',
    
    // Размеры
    SMALL: 'small',
    MEDIUM: 'medium', 
    LARGE: 'large',
    
    // Статусы заказов
    ORDER_NEW: 'order-new',
    ORDER_PROGRESS: 'order-progress',
    ORDER_DONE: 'order-done',
    ORDER_PROBLEM: 'order-problem'
};

// Сообщения по умолчанию
export const MESSAGES = {
    LOADING: 'Загрузка...',
    ERROR_GENERIC: 'Произошла ошибка',
    ERROR_NETWORK: 'Ошибка сети',
    ERROR_VALIDATION: 'Ошибка валидации',
    SUCCESS_SAVE: 'Данные сохранены',
    SUCCESS_DELETE: 'Данные удалены',
    CONFIRM_DELETE: 'Вы уверены, что хотите удалить?',
    NO_DATA: 'Нет данных для отображения'
};

// Настройки анимации
export const ANIMATION = {
    DURATION: {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500
    },
    EASING: {
        EASE: 'ease',
        EASE_IN: 'ease-in',
        EASE_OUT: 'ease-out',
        EASE_IN_OUT: 'ease-in-out'
    }
};

// Пользователь по умолчанию (администратор)
export const DEFAULT_ADMIN = {
    id: 1,
    name: 'Администратор',
    email: 'admin@oms.local',
    phone: '+7 777 777 7777',
    password: '1488', // В реальном проекте должен быть захешированным
    role: USER_ROLES.ADMIN,
    processes: [],
    isActive: true,
    createdAt: new Date().toISOString()
};

// Настройки пагинации
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZES: [5, 10, 25, 50, 100],
    MAX_VISIBLE_PAGES: 7
};

// Форматы дат
export const DATE_FORMATS = {
    SHORT: 'DD.MM.YYYY',
    LONG: 'DD.MM.YYYY HH:mm',
    TIME: 'HH:mm',
    ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ'
};

// Экспорт всех констант как единого объекта
export default {
    APP_CONFIG,
    STORAGE_KEYS,
    EVENTS,
    ORDER_STATUS,
    HISTORY_TYPES,
    USER_ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    VALIDATION,
    CSS_CLASSES,
    MESSAGES,
    ANIMATION,
    DEFAULT_ADMIN,
    PAGINATION,
    DATE_FORMATS
};