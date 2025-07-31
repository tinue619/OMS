# OMS - Order Management System

Современная система управления заказами, построенная на принципах объектно-ориентированного программирования с использованием ES6+ модулей.

## 🚀 Особенности

- **Модульная архитектура** - чистое разделение ответственности
- **Система событий** - слабосвязанные компоненты
- **Централизованное состояние** - Store pattern для управления данными  
- **Роутинг** - SPA с историей переходов
- **Валидация данных** - типизированная валидация форм
- **Темы оформления** - светлая/темная тема, адаптивность
- **Современный UI** - компонентный подход к интерфейсу

## 📁 Структура проекта

```
OMS/
├── index.html              # Главная страница
├── src/                    # Исходный код
│   ├── core/              # Ядро системы
│   │   ├── EventBus.js    # Система событий
│   │   ├── BaseComponent.js # Базовый класс компонентов
│   │   ├── Store.js       # Управление состоянием
│   │   └── Router.js      # Роутинг
│   ├── modules/           # Бизнес-модули
│   │   ├── AuthModule.js  # Аутентификация
│   │   ├── DataModule.js  # Управление данными
│   │   ├── OrderModule.js # Управление заказами
│   │   ├── ProcessModule.js # Управление процессами
│   │   └── UserModule.js  # Управление пользователями
│   ├── components/        # UI компоненты
│   │   ├── LoginForm.js   # Форма входа
│   │   ├── Header.js      # Заголовок
│   │   ├── ProcessBoard.js # Доска процессов
│   │   ├── OrderCard.js   # Карточка заказа
│   │   ├── Modal.js       # Модальные окна
│   │   └── ...
│   ├── utils/             # Утилиты
│   │   ├── constants.js   # Константы
│   │   ├── helpers.js     # Вспомогательные функции
│   │   ├── validators.js  # Валидация
│   │   └── storage.js     # Работа с хранилищем
│   └── App.js             # Главное приложение
├── styles/                # Стили
│   ├── main.css          # Основные стили
│   ├── components.css    # Стили компонентов
│   └── themes.css        # Темы оформления
└── assets/               # Ресурсы
```

## 🛠 Архитектура

### Ядро системы (Core)

#### EventBus
Централизованная система событий для слабосвязанного взаимодействия компонентов:

```javascript
// Подписка на событие
eventBus.on('order:created', (order) => {
    console.log('Создан заказ:', order);
});

// Генерация события
eventBus.emit('order:created', newOrder);
```

#### Store
Управление состоянием приложения по паттерну Flux:

```javascript
// Мутация
store.commit('ADD_ORDER', order);

// Действие  
await store.dispatch('createOrder', orderData);

// Геттер
const orders = store.getGetter('orders');
```

#### BaseComponent
Базовый класс для всех UI компонентов:

```javascript
class MyComponent extends BaseComponent {
    template() {
        return `<div>Мой компонент</div>`;
    }
    
    bindEvents() {
        this.$('.btn').addEventListener('click', this.handleClick.bind(this));
    }
}
```

### Модули

#### AuthModule
- Аутентификация пользователей
- Управление сессиями  
- Проверка прав доступа
- Регистрация новых пользователей

#### DataModule
- CRUD операции для всех сущностей
- Автосохранение в localStorage
- Управление состоянием загрузки
- Валидация данных перед сохранением

#### OrderModule, ProcessModule, UserModule
Специализированные модули для работы с соответствующими сущностями.

### Компоненты

Переиспользуемые UI компоненты, наследующие от BaseComponent:

```javascript
import BaseComponent from '../core/BaseComponent.js';

export class OrderCard extends BaseComponent {
    getDefaultOptions() {
        return {
            draggable: true,
            clickable: true
        };
    }
    
    template() {
        return `
            <div class="order-card">
                <h3>${this.state.order.number}</h3>
                <p>${this.state.order.clientName}</p>
            </div>
        `;
    }
}
```

## 🎨 Стилизация

### CSS переменные
Все цвета, отступы и размеры вынесены в CSS переменные для удобной кастомизации:

```css
:root {
    --primary-color: #2563eb;
    --spacing-4: 1rem;
    --border-radius: 8px;
}
```

### Темы
Поддержка светлой/темной темы через data-атрибуты:

```css
[data-theme="dark"] {
    --bg-color: #1f2937;
    --text-primary: #f9fafb;
}
```

### Адаптивность
Mobile-first подход с использованием CSS Grid и Flexbox.

## 📊 Управление данными

### Схема данных

#### Пользователь
```javascript
{
    id: Number,
    name: String,
    email: String,
    phone: String,
    role: 'admin' | 'manager' | 'operator' | 'viewer',
    processes: Array<Number>, // ID процессов, к которым есть доступ
    isActive: Boolean,
    createdAt: String,
    updatedAt: String
}
```

#### Процесс
```javascript
{
    id: Number,
    name: String,
    description: String,
    position: Number, // Порядок в цепочке
    color: String,
    createdAt: String,
    updatedAt: String
}
```

#### Изделие
```javascript
{
    id: Number,
    name: String,
    description: String,
    processes: Array<Number>, // Цепочка процессов
    createdAt: String,
    updatedAt: String
}
```

#### Заказ
```javascript
{
    id: Number,
    number: String, // Номер заказа (например: 241201-001)
    clientName: String,
    clientPhone: String,
    productId: Number,
    quantity: Number,
    currentProcessId: Number | null, // null = завершен
    status: 'created' | 'in_progress' | 'completed' | 'cancelled',
    customFields: Object, // Дополнительные поля
    defectInfo: {
        isDefective: Boolean,
        reason: String,
        fixedAt: String
    },
    history: Array<HistoryEvent>,
    createdAt: String,
    updatedAt: String
}
```

#### История заказа
```javascript
{
    id: Number,
    type: 'created' | 'moved' | 'defect_sent' | 'defect_fixed',
    timestamp: String,
    user: Object, // Кто совершил действие
    data: {
        fromProcess: Object,
        toProcess: Object,
        reason: String,
        comment: String
    }
}
```

## 🔧 Валидация

Система валидации построена на композиции валидаторов:

```javascript
import { createOrderValidator } from './utils/validators.js';

const validator = createOrderValidator();
const isValid = validator.validate(orderData);

if (!isValid) {
    const errors = validator.getAllErrors();
    console.log('Ошибки валидации:', errors);
}
```

Предустановленные валидаторы:
- `required` - обязательное поле
- `minLength(n)` - минимальная длина
- `maxLength(n)` - максимальная длина  
- `email` - email адрес
- `phone` - номер телефона
- `numeric` - числовое значение
- `pattern(regex)` - соответствие регулярному выражению

## 🚀 Запуск

1. Склонируйте репозиторий
2. Откройте `index.html` в браузере
3. Войдите используя данные по умолчанию:
   - **Пользователь:** Администратор
   - **Пароль:** 1488

## 🔐 Система ролей

### Администратор (admin)
- Полный доступ ко всем функциям
- Управление пользователями
- Управление процессами и изделиями
- Доступ к аналитике

### Менеджер (manager)  
- Создание и редактирование заказов
- Управление процессами и изделиями
- Просмотр аналитики
- Нет доступа к управлению пользователями

### Оператор (operator)
- Создание заказов
- Перемещение заказов по процессам (только назначенным)
- Нет доступа к административным функциям

### Наблюдатель (viewer)
- Только просмотр заказов и процессов
- Нет прав на изменения

## 📱 Адаптивность

Система полностью адаптирована для мобильных устройств:

- **Tablet (768px+):** Полнофункциональный интерфейс
- **Mobile (< 768px):** Стековое расположение процессов, упрощенная навигация
- **Touch devices:** Поддержка жестов для drag & drop

## 🎯 События системы

### Пользователь
- `user:login` - вход пользователя
- `user:logout` - выход пользователя  
- `user:created` - создан пользователь
- `user:updated` - обновлен пользователь

### Заказы
- `order:created` - создан заказ
- `order:updated` - обновлен заказ
- `order:moved` - заказ перемещен между процессами
- `order:deleted` - заказ удален

### UI
- `modal:open` - открыто модальное окно
- `modal:close` - закрыто модальное окно
- `notification:show` - показано уведомление

## 🛡 Безопасность

- **Валидация входных данных** на клиенте
- **Эскейпинг HTML** для предотвращения XSS
- **Права доступа** к функциям по ролям
- **Безопасное хранение** данных в localStorage

## 🔄 Миграции данных

Система поддерживает версионирование данных и автоматические миграции:

```javascript
// Добавление миграции
storage.addMigration('1.1.0', (storage) => {
    // Логика миграции данных
    const oldData = storage.get('oldKey');
    storage.set('newKey', transformData(oldData));
    storage.remove('oldKey');
});
```

## 📈 Производительность

### Оптимизации
- **Lazy loading** модулей
- **Виртуализация** больших списков
- **Debouncing** пользовательского ввода
- **Кэширование** данных в памяти
- **Минификация** CSS через переменные

### Мониторинг
- Логирование ошибок в консоль
- Отслеживание производительности EventBus
- Метрики использования Store

## 🧪 Тестирование

Рекомендуемый стек для тестирования:

```bash
# Unit тесты
npm install --save-dev jest

# E2E тесты  
npm install --save-dev playwright

# Компонентные тесты
npm install --save-dev @testing-library/dom
```

Пример unit теста:

```javascript
import { EventBus } from './src/core/EventBus.js';

describe('EventBus', () => {
    test('should emit and receive events', () => {
        const bus = new EventBus();
        let received = null;
        
        bus.on('test', (data) => received = data);
        bus.emit('test', 'hello');
        
        expect(received).toBe('hello');
    });
});
```

## 🚧 Дальнейшее развитие

### Планируемые функции
- [ ] TypeScript для типизации
- [ ] Service Workers для оффлайн работы
- [ ] Push-уведомления
- [ ] Экспорт данных (Excel, PDF)
- [ ] Интеграция с внешними API
- [ ] Многоязычность (i18n)
- [ ] Система комментариев к заказам
- [ ] Файловые вложения
- [ ] Продвинутая аналитика с графиками

### Рефакторинг
- [ ] Разделение больших модулей на микромодули
- [ ] Внедрение Dependency Injection
- [ ] Переход на Web Components
- [ ] Оптимизация bundle size

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

### Стандарты кода
- ES6+ модули
- JSDoc комментарии для публичных методов
- Консистентное именование (camelCase для переменных, PascalCase для классов)
- Максимум 100 символов в строке

## 📄 Лицензия

MIT License - подробности в файле `LICENSE`.

## 📞 Поддержка

При возникновении вопросов:
1. Проверьте console браузера на наличие ошибок
2. Убедитесь, что все модули загружены корректно
3. Проверьте localStorage на предмет поврежденных данных

---

**OMS v2.0.0** - Современная система управления заказами с фокусом на производительность и удобство использования.