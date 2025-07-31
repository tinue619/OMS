import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { userStorage } from '../utils/storage.js';
import { EVENTS, USER_ROLES, DEFAULT_ADMIN, ROLE_PERMISSIONS, VALIDATION } from '../utils/constants.js';
import { createUserValidator } from '../utils/validators.js';

/**
 * Модуль аутентификации и авторизации
 */
export class AuthModule {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupStore();
        this.setupEventListeners();
        this.loadCurrentUser();
        
        this.isInitialized = true;
        eventBus.emit(EVENTS.APP_INIT, { module: 'AuthModule' });
    }

    /**
     * Настройка хранилища
     */
    setupStore() {
        // Мутации
        store.registerMutation('SET_CURRENT_USER', (state, user) => {
            state.currentUser = user;
        });

        store.registerMutation('CLEAR_CURRENT_USER', (state) => {
            state.currentUser = null;
        });

        // Действия
        store.registerAction('login', async (context, credentials) => {
            return this.login(credentials.username, credentials.password);
        });

        store.registerAction('logout', async (context) => {
            return this.logout();
        });

        // Геттеры
        store.registerGetter('currentUser', (state) => state.currentUser);
        store.registerGetter('isAuthenticated', (state) => !!state.currentUser);
        store.registerGetter('userRole', (state) => state.currentUser?.role || null);
        store.registerGetter('isAdmin', (state) => state.currentUser?.role === USER_ROLES.ADMIN);
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        eventBus.on(EVENTS.USER_LOGOUT, () => {
            this.logout();
        });
    }

    /**
     * Загрузка текущего пользователя из хранилища
     */
    loadCurrentUser() {
        const savedUser = userStorage.getCurrentUser();
        if (savedUser) {
            this.setCurrentUser(savedUser);
            return true;
        }
        return false;
    }

    /**
     * Вход в систему
     */
    async login(username, password) {
        try {
            eventBus.emit(EVENTS.LOADING_START, { source: 'auth' });

            // В реальном приложении здесь был бы запрос к API
            const user = await this.authenticateUser(username, password);
            
            if (user) {
                this.setCurrentUser(user);
                eventBus.emit(EVENTS.USER_LOGIN, user);
                return { success: true, user };
            } else {
                return { 
                    success: false, 
                    error: 'Неверное имя пользователя или пароль' 
                };
            }
        } catch (error) {
            console.error('❌ Ошибка входа:', error);
            return { 
                success: false, 
                error: 'Ошибка при входе в систему' 
            };
        } finally {
            eventBus.emit(EVENTS.LOADING_END, { source: 'auth' });
        }
    }

    /**
     * Аутентификация пользователя (заглушка)
     */
    async authenticateUser(username, password) {
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, 500));

        // Получаем пользователей из store
        const users = store.getGetter('users') || [DEFAULT_ADMIN];
        
        // Поиск пользователя
        const user = users.find(u => 
            (u.name === username || u.email === username || u.phone === username) &&
            u.password === password &&
            u.isActive !== false
        );

        if (user) {
            // Возвращаем копию без пароля
            const { password: _, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                lastLoginAt: new Date().toISOString()
            };
        }

        return null;
    }

    /**
     * Выход из системы
     */
    async logout() {
        try {
            const user = this.currentUser;
            
            // Очищаем данные
            this.clearCurrentUser();
            
            eventBus.emit(EVENTS.USER_LOGOUT, user);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка выхода:', error);
            return { 
                success: false, 
                error: 'Ошибка при выходе из системы' 
            };
        }
    }

    /**
     * Установка текущего пользователя
     */
    setCurrentUser(user) {
        this.currentUser = user;
        store.commit('SET_CURRENT_USER', user);
        userStorage.setCurrentUser(user);
    }

    /**
     * Очистка текущего пользователя
     */
    clearCurrentUser() {
        this.currentUser = null;
        store.commit('CLEAR_CURRENT_USER');
        userStorage.clearUserData();
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Проверка аутентификации
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Проверка роли пользователя
     */
    hasRole(role) {
        return this.currentUser?.role === role;
    }

    /**
     * Проверка прав доступа
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Админ имеет все права
        if (this.currentUser.role === USER_ROLES.ADMIN) {
            return true;
        }

        // Проверяем права для роли
        const rolePermissions = ROLE_PERMISSIONS[this.currentUser.role] || [];
        return rolePermissions.includes(permission);
    }

    /**
     * Проверка доступа к процессу
     */
    canAccessProcess(processId) {
        if (!this.currentUser) return false;
        
        // Админ имеет доступ ко всем процессам
        if (this.currentUser.role === USER_ROLES.ADMIN) {
            return true;
        }

        // Проверяем доступ к конкретному процессу
        return this.currentUser.processes?.includes(processId) || false;
    }

    /**
     * Регистрация пользователя (только для админа)
     */
    async registerUser(userData) {
        if (!this.hasRole(USER_ROLES.ADMIN)) {
            return {
                success: false,
                error: 'Недостаточно прав для создания пользователя'
            };
        }

        try {
            // Валидация данных
            const validator = createUserValidator();
            if (!validator.validate(userData)) {
                return {
                    success: false,
                    error: 'Ошибка валидации',
                    errors: validator.getAllErrors()
                };
            }

            // Проверка уникальности
            const users = store.getGetter('users') || [];
            const existingUser = users.find(u => 
                u.email === userData.email || 
                u.phone === userData.phone ||
                u.name === userData.name
            );

            if (existingUser) {
                return {
                    success: false,
                    error: 'Пользователь с такими данными уже существует'
                };
            }

            // Создание пользователя
            const newUser = {
                id: Date.now(),
                ...userData,
                isActive: true,
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.id
            };

            // Добавляем пользователя через store
            await store.dispatch('addUser', newUser);

            eventBus.emit(EVENTS.USER_CREATED, newUser);

            return { success: true, user: newUser };

        } catch (error) {
            console.error('❌ Ошибка регистрации пользователя:', error);
            return {
                success: false,
                error: 'Ошибка при создании пользователя'
            };
        }
    }

    /**
     * Обновление профиля пользователя
     */
    async updateProfile(userData) {
        if (!this.currentUser) {
            return { success: false, error: 'Не авторизован' };
        }

        try {
            // Пользователь может редактировать только свой профиль или админ любой
            const canEdit = userData.id === this.currentUser.id || 
                           this.hasRole(USER_ROLES.ADMIN);

            if (!canEdit) {
                return {
                    success: false,
                    error: 'Недостаточно прав для редактирования'
                };
            }

            // Обновляем пользователя через store
            await store.dispatch('updateUser', userData);

            // Если обновляем текущего пользователя, обновляем и локальные данные
            if (userData.id === this.currentUser.id) {
                this.setCurrentUser({ ...this.currentUser, ...userData });
            }

            eventBus.emit(EVENTS.USER_UPDATED, userData);

            return { success: true, user: userData };

        } catch (error) {
            console.error('❌ Ошибка обновления профиля:', error);
            return {
                success: false,
                error: 'Ошибка при обновлении профиля'
            };
        }
    }

    /**
     * Смена пароля
     */
    async changePassword(oldPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, error: 'Не авторизован' };
        }

        try {
            // Проверяем старый пароль
            const isValidOldPassword = await this.authenticateUser(
                this.currentUser.name, 
                oldPassword
            );

            if (!isValidOldPassword) {
                return {
                    success: false,
                    error: 'Неверный текущий пароль'
                };
            }

            // Валидируем новый пароль
            if (newPassword.length < VALIDATION.PASSWORD.MIN_LENGTH) {
                return {
                    success: false,
                    error: `Пароль должен содержать минимум ${VALIDATION.PASSWORD.MIN_LENGTH} символов`
                };
            }

            // Обновляем пароль
            await store.dispatch('updateUser', {
                id: this.currentUser.id,
                password: newPassword
            });

            return { success: true };

        } catch (error) {
            console.error('❌ Ошибка смены пароля:', error);
            return {
                success: false,
                error: 'Ошибка при смене пароля'
            };
        }
    }

    /**
     * Деактивация пользователя
     */
    async deactivateUser(userId) {
        if (!this.hasRole(USER_ROLES.ADMIN)) {
            return {
                success: false,
                error: 'Недостаточно прав'
            };
        }

        if (userId === this.currentUser.id) {
            return {
                success: false,
                error: 'Нельзя деактивировать самого себя'
            };
        }

        try {
            await store.dispatch('updateUser', {
                id: userId,
                isActive: false,
                deactivatedAt: new Date().toISOString(),
                deactivatedBy: this.currentUser.id
            });

            eventBus.emit(EVENTS.USER_UPDATED, { id: userId, isActive: false });

            return { success: true };

        } catch (error) {
            console.error('❌ Ошибка деактивации пользователя:', error);
            return {
                success: false,
                error: 'Ошибка при деактивации пользователя'
            };
        }
    }

    /**
     * Получение информации о модуле
     */
    getModuleInfo() {
        return {
            name: 'AuthModule',
            version: '1.0.0',
            isInitialized: this.isInitialized,
            currentUser: this.currentUser?.name || null,
            isAuthenticated: this.isAuthenticated()
        };
    }
}

// Создаем глобальный экземпляр
export const authModule = new AuthModule();

// Глобальный доступ для совместимости
window.authModule = authModule;

export default authModule;