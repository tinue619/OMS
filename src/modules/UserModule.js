import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { EVENTS, USER_ROLES, ROLE_PERMISSIONS } from '../utils/constants.js';
import { createUserValidator } from '../utils/validators.js';
import { generateId } from '../utils/helpers.js';

/**
 * Модуль управления пользователями
 */
export class UserModule {
    constructor() {
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupStore();
        this.setupEventListeners();
        
        this.isInitialized = true;
        eventBus.emit(EVENTS.APP_INIT, { module: 'UserModule' });
    }

    /**
     * Настройка Store
     */
    setupStore() {
        // Действия для пользователей
        store.registerAction('createUser', async (context, userData) => {
            return this.createUser(userData);
        });

        store.registerAction('updateUser', async (context, { id, data }) => {
            return this.updateUser(id, data);
        });

        store.registerAction('deleteUser', async (context, userId) => {
            return this.deleteUser(userId);
        });

        store.registerAction('toggleUserStatus', async (context, userId) => {
            return this.toggleUserStatus(userId);
        });

        store.registerAction('assignProcessesToUser', async (context, { userId, processIds }) => {
            return this.assignProcessesToUser(userId, processIds);
        });
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        eventBus.on(EVENTS.USER_CREATED, () => {
            this.refreshUserList();
        });

        eventBus.on(EVENTS.USER_UPDATED, () => {
            this.refreshUserList();
        });

        eventBus.on(EVENTS.USER_DELETED, () => {
            this.refreshUserList();
        });
    }

    /**
     * Создание нового пользователя
     */
    async createUser(userData) {
        try {
            // Валидация
            const validator = createUserValidator();
            if (!validator.validate(userData)) {
                return {
                    success: false,
                    errors: validator.getAllErrors()
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для создания пользователя'
                };
            }

            // Проверяем уникальность
            const users = store.getGetter('users');
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

            const newUser = {
                id: generateId('user'),
                name: userData.name.trim(),
                email: userData.email?.trim() || '',
                phone: userData.phone?.trim() || '',
                password: userData.password, // В реальном проекте должен быть захешированным
                role: userData.role || USER_ROLES.OPERATOR,
                processes: userData.processes || [],
                permissions: this.getRolePermissions(userData.role),
                isActive: true,
                canCreateOrders: userData.canCreateOrders !== false,
                avatar: userData.avatar || null,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                updatedAt: new Date().toISOString(),
                lastLoginAt: null
            };

            // Добавляем в store
            store.commit('ADD_USER', newUser);
            
            // Генерируем событие
            eventBus.emit(EVENTS.USER_CREATED, newUser);

            return {
                success: true,
                user: newUser
            };

        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Обновление пользователя
     */
    async updateUser(userId, updateData) {
        try {
            const user = store.getGetter('getUserById')(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            const canEdit = currentUser.isAdmin || userId === currentUser.id;
            if (!canEdit) {
                return {
                    success: false,
                    error: 'Недостаточно прав для редактирования пользователя'
                };
            }

            // Обычные пользователи не могут менять роль и критичные поля
            if (!currentUser.isAdmin) {
                delete updateData.role;
                delete updateData.isActive;
                delete updateData.permissions;
            }

            // Обновляем права при изменении роли
            if (updateData.role && updateData.role !== user.role) {
                updateData.permissions = this.getRolePermissions(updateData.role);
            }

            const updatedUser = {
                ...user,
                ...updateData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Обновляем в store
            store.commit('UPDATE_USER', updatedUser);
            
            // Если обновляем текущего пользователя, обновляем и в AuthModule
            if (userId === currentUser.id) {
                store.commit('SET_CURRENT_USER', updatedUser);
            }
            
            // Генерируем событие
            eventBus.emit(EVENTS.USER_UPDATED, updatedUser);

            return {
                success: true,
                user: updatedUser
            };

        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Удаление пользователя
     */
    async deleteUser(userId) {
        try {
            const user = store.getGetter('getUserById')(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для удаления пользователя'
                };
            }

            // Нельзя удалить самого себя
            if (userId === currentUser.id) {
                return {
                    success: false,
                    error: 'Нельзя удалить самого себя'
                };
            }

            // Нельзя удалить последнего администратора
            const admins = store.getGetter('users').filter(u => u.role === USER_ROLES.ADMIN);
            if (user.role === USER_ROLES.ADMIN && admins.length === 1) {
                return {
                    success: false,
                    error: 'Нельзя удалить последнего администратора'
                };
            }

            // Удаляем из store
            store.commit('REMOVE_USER', userId);
            
            // Генерируем событие
            eventBus.emit(EVENTS.USER_DELETED, { id: userId, user });

            return {
                success: true
            };

        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Переключение статуса пользователя (активен/неактивен)
     */
    async toggleUserStatus(userId) {
        try {
            const user = store.getGetter('getUserById')(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для изменения статуса пользователя'
                };
            }

            // Нельзя деактивировать самого себя
            if (userId === currentUser.id) {
                return {
                    success: false,
                    error: 'Нельзя деактивировать самого себя'
                };
            }

            const newStatus = !user.isActive;
            const updatedUser = {
                ...user,
                isActive: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            if (!newStatus) {
                updatedUser.deactivatedAt = new Date().toISOString();
                updatedUser.deactivatedBy = currentUser.id;
            }

            // Обновляем в store
            store.commit('UPDATE_USER', updatedUser);
            
            // Генерируем событие
            eventBus.emit(EVENTS.USER_UPDATED, updatedUser);

            return {
                success: true,
                user: updatedUser
            };

        } catch (error) {
            console.error('❌ Ошибка изменения статуса пользователя:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Назначение процессов пользователю
     */
    async assignProcessesToUser(userId, processIds) {
        try {
            const user = store.getGetter('getUserById')(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            }

            const currentUser = store.getGetter('currentUser');
            
            // Проверяем права доступа
            if (!currentUser.isAdmin) {
                return {
                    success: false,
                    error: 'Недостаточно прав для назначения процессов'
                };
            }

            // Проверяем существование процессов
            const processes = store.getGetter('processes');
            const validProcessIds = processIds.filter(id => 
                processes.some(p => p.id === id)
            );

            const updatedUser = {
                ...user,
                processes: validProcessIds,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };

            // Обновляем в store
            store.commit('UPDATE_USER', updatedUser);
            
            // Генерируем событие
            eventBus.emit(EVENTS.USER_UPDATED, updatedUser);

            return {
                success: true,
                user: updatedUser
            };

        } catch (error) {
            console.error('❌ Ошибка назначения процессов:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Получение прав для роли
     */
    getRolePermissions(role) {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Проверка права пользователя
     */
    userHasPermission(user, permission) {
        if (user.role === USER_ROLES.ADMIN) return true;
        return user.permissions?.includes(permission) || false;
    }

    /**
     * Получение пользователей по роли
     */
    getUsersByRole(role) {
        const users = store.getGetter('users');
        return users.filter(user => user.role === role && user.isActive);
    }

    /**
     * Получение пользователей с доступом к процессу
     */
    getUsersWithProcessAccess(processId) {
        const users = store.getGetter('users');
        return users.filter(user => 
            user.isActive && 
            (user.role === USER_ROLES.ADMIN || user.processes?.includes(processId))
        );
    }

    /**
     * Получение статистики пользователей
     */
    getUserStats() {
        const users = store.getGetter('users');
        
        return {
            total: users.length,
            active: users.filter(u => u.isActive).length,
            inactive: users.filter(u => !u.isActive).length,
            byRole: {
                [USER_ROLES.ADMIN]: users.filter(u => u.role === USER_ROLES.ADMIN).length,
                [USER_ROLES.MANAGER]: users.filter(u => u.role === USER_ROLES.MANAGER).length,
                [USER_ROLES.OPERATOR]: users.filter(u => u.role === USER_ROLES.OPERATOR).length,
                [USER_ROLES.VIEWER]: users.filter(u => u.role === USER_ROLES.VIEWER).length
            }
        };
    }

    /**
     * Поиск пользователей
     */
    searchUsers(query) {
        if (!query || query.trim() === '') {
            return store.getGetter('users');
        }

        const searchTerm = query.toLowerCase().trim();
        const users = store.getGetter('users');
        
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.phone.includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Обновление списка пользователей в UI
     */
    refreshUserList() {
        eventBus.emit('ui:refreshUserList');
    }

    /**
     * Получение информации о модуле
     */
    getModuleInfo() {
        return {
            name: 'UserModule',
            version: '1.0.0',
            isInitialized: this.isInitialized
        };
    }
}

// Создаем глобальный экземпляр
export const userModule = new UserModule();

// Глобальный доступ для совместимости
window.userModule = userModule;

export default userModule;