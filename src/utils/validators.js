import { VALIDATION } from './constants.js';

/**
 * Система валидации данных
 */

/**
 * Базовый класс валидатора
 */
export class Validator {
    constructor() {
        this.rules = new Map();
        this.errors = new Map();
    }

    /**
     * Добавление правила валидации
     */
    addRule(field, validator, message) {
        if (!this.rules.has(field)) {
            this.rules.set(field, []);
        }
        this.rules.get(field).push({ validator, message });
        return this;
    }

    /**
     * Валидация данных
     */
    validate(data) {
        this.errors.clear();
        let isValid = true;

        for (const [field, rules] of this.rules) {
            const value = data[field];
            
            for (const rule of rules) {
                if (!rule.validator(value, data)) {
                    this.addError(field, rule.message);
                    isValid = false;
                    break; // Первая ошибка останавливает валидацию поля
                }
            }
        }

        return isValid;
    }

    /**
     * Добавление ошибки
     */
    addError(field, message) {
        if (!this.errors.has(field)) {
            this.errors.set(field, []);
        }
        this.errors.get(field).push(message);
    }

    /**
     * Получение ошибок для поля
     */
    getErrors(field) {
        return this.errors.get(field) || [];
    }

    /**
     * Получение всех ошибок
     */
    getAllErrors() {
        const errors = {};
        for (const [field, fieldErrors] of this.errors) {
            errors[field] = fieldErrors;
        }
        return errors;
    }

    /**
     * Получение первой ошибки для поля
     */
    getFirstError(field) {
        const errors = this.getErrors(field);
        return errors.length > 0 ? errors[0] : null;
    }

    /**
     * Проверка наличия ошибок
     */
    hasErrors() {
        return this.errors.size > 0;
    }

    /**
     * Очистка ошибок
     */
    clearErrors() {
        this.errors.clear();
    }
}

/**
 * Предустановленные валидаторы
 */
export const validators = {
    /**
     * Обязательное поле
     */
    required: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    },

    /**
     * Минимальная длина
     */
    minLength: (min) => (value) => {
        if (!value) return true; // Пропускаем пустые значения
        return value.toString().length >= min;
    },

    /**
     * Максимальная длина
     */
    maxLength: (max) => (value) => {
        if (!value) return true;
        return value.toString().length <= max;
    },

    /**
     * Соответствие регулярному выражению
     */
    pattern: (regex) => (value) => {
        if (!value) return true;
        return regex.test(value.toString());
    },

    /**
     * Email адрес
     */
    email: (value) => {
        if (!value) return true;
        return VALIDATION.EMAIL.PATTERN.test(value);
    },

    /**
     * Номер телефона
     */
    phone: (value) => {
        if (!value) return true;
        return VALIDATION.PHONE.PATTERN.test(value);
    },

    /**
     * Числовое значение
     */
    numeric: (value) => {
        if (!value) return true;
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    /**
     * Целое число
     */
    integer: (value) => {
        if (!value) return true;
        return Number.isInteger(Number(value));
    },

    /**
     * Минимальное значение
     */
    min: (minimum) => (value) => {
        if (!value) return true;
        return Number(value) >= minimum;
    },

    /**
     * Максимальное значение
     */
    max: (maximum) => (value) => {
        if (!value) return true;
        return Number(value) <= maximum;
    },

    /**
     * Диапазон значений
     */
    range: (min, max) => (value) => {
        if (!value) return true;
        const num = Number(value);
        return num >= min && num <= max;
    },

    /**
     * Одно из значений
     */
    oneOf: (options) => (value) => {
        if (!value) return true;
        return options.includes(value);
    },

    /**
     * Подтверждение пароля
     */
    confirmed: (field) => (value, data) => {
        return value === data[field];
    },

    /**
     * Уникальное значение в массиве
     */
    unique: (array, key = null) => (value) => {
        if (!value || !Array.isArray(array)) return true;
        
        return !array.some(item => {
            const itemValue = key ? item[key] : item;
            return itemValue === value;
        });
    },

    /**
     * Дата
     */
    date: (value) => {
        if (!value) return true;
        const date = new Date(value);
        return !isNaN(date.getTime());
    },

    /**
     * Дата не раньше чем
     */
    dateAfter: (minDate) => (value) => {
        if (!value) return true;
        const date = new Date(value);
        const min = new Date(minDate);
        return date >= min;
    },

    /**
     * Дата не позже чем
     */
    dateBefore: (maxDate) => (value) => {
        if (!value) return true;
        const date = new Date(value);
        const max = new Date(maxDate);
        return date <= max;
    },

    /**
     * URL адрес
     */
    url: (value) => {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Пользовательский валидатор
     */
    custom: (fn) => fn
};

/**
 * Создание валидатора для формы заказа
 */
export function createOrderValidator() {
    const validator = new Validator();
    
    validator
        .addRule('clientName', validators.required, 'Имя клиента обязательно')
        .addRule('clientName', validators.minLength(VALIDATION.CLIENT_NAME.MIN_LENGTH), 
                `Минимум ${VALIDATION.CLIENT_NAME.MIN_LENGTH} символа`)
        .addRule('clientName', validators.maxLength(VALIDATION.CLIENT_NAME.MAX_LENGTH), 
                `Максимум ${VALIDATION.CLIENT_NAME.MAX_LENGTH} символов`)
        
        .addRule('clientPhone', validators.phone, 'Неверный формат телефона')
        
        .addRule('productId', validators.required, 'Выберите изделие')
        .addRule('productId', validators.numeric, 'Неверный ID изделия')
        
        .addRule('quantity', validators.required, 'Количество обязательно')
        .addRule('quantity', validators.integer, 'Количество должно быть целым числом')
        .addRule('quantity', validators.min(1), 'Количество должно быть больше 0');
    
    return validator;
}

/**
 * Создание валидатора для пользователя
 */
export function createUserValidator() {
    const validator = new Validator();
    
    validator
        .addRule('name', validators.required, 'Имя обязательно')
        .addRule('name', validators.minLength(2), 'Минимум 2 символа')
        .addRule('name', validators.maxLength(100), 'Максимум 100 символов')
        
        .addRule('email', validators.email, 'Неверный формат email')
        
        .addRule('phone', validators.phone, 'Неверный формат телефона')
        
        .addRule('password', validators.required, 'Пароль обязателен')
        .addRule('password', validators.minLength(VALIDATION.PASSWORD.MIN_LENGTH), 
                `Минимум ${VALIDATION.PASSWORD.MIN_LENGTH} символа`)
        .addRule('password', validators.maxLength(VALIDATION.PASSWORD.MAX_LENGTH), 
                `Максимум ${VALIDATION.PASSWORD.MAX_LENGTH} символов`)
        
        .addRule('role', validators.required, 'Роль обязательна');
    
    return validator;
}

/**
 * Создание валидатора для процесса
 */
export function createProcessValidator() {
    const validator = new Validator();
    
    validator
        .addRule('name', validators.required, 'Название процесса обязательно')
        .addRule('name', validators.minLength(2), 'Минимум 2 символа')
        .addRule('name', validators.maxLength(100), 'Максимум 100 символов')
        
        .addRule('position', validators.required, 'Позиция обязательна')
        .addRule('position', validators.integer, 'Позиция должна быть целым числом')
        .addRule('position', validators.min(0), 'Позиция не может быть отрицательной');
    
    return validator;
}

/**
 * Создание валидатора для изделия
 */
export function createProductValidator() {
    const validator = new Validator();
    
    validator
        .addRule('name', validators.required, 'Название изделия обязательно')
        .addRule('name', validators.minLength(2), 'Минимум 2 символа')
        .addRule('name', validators.maxLength(100), 'Максимум 100 символов')
        
        .addRule('processes', validators.required, 'Выберите хотя бы один процесс')
        .addRule('processes', (value) => Array.isArray(value) && value.length > 0, 
                'Должен быть выбран хотя бы один процесс');
    
    return validator;
}

/**
 * Валидация формы в реальном времени
 */
export class FormValidator {
    constructor(form, validator, options = {}) {
        this.form = form;
        this.validator = validator;
        this.options = {
            validateOnInput: true,
            validateOnBlur: true,
            showErrorsImmediately: false,
            errorClass: 'error',
            validClass: 'valid',
            ...options
        };
        
        this.init();
    }

    /**
     * Инициализация
     */
    init() {
        if (this.options.validateOnInput) {
            this.form.addEventListener('input', this.handleInput.bind(this));
        }
        
        if (this.options.validateOnBlur) {
            this.form.addEventListener('blur', this.handleBlur.bind(this), true);
        }
        
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    /**
     * Обработка ввода
     */
    handleInput(event) {
        const field = event.target;
        if (field.name) {
            this.validateField(field.name, field.value);
        }
    }

    /**
     * Обработка потери фокуса
     */
    handleBlur(event) {
        const field = event.target;
        if (field.name) {
            this.validateField(field.name, field.value);
        }
    }

    /**
     * Обработка отправки формы
     */
    handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        if (this.validateForm(data)) {
            this.onValidSubmit(data);
        } else {
            this.showErrors();
        }
    }

    /**
     * Валидация отдельного поля
     */
    validateField(fieldName, value) {
        const tempValidator = new Validator();
        
        // Копируем правила для этого поля
        if (this.validator.rules.has(fieldName)) {
            tempValidator.rules.set(fieldName, this.validator.rules.get(fieldName));
        }
        
        const isValid = tempValidator.validate({ [fieldName]: value });
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        
        if (field) {
            this.updateFieldVisualState(field, isValid);
            
            if (!isValid) {
                this.showFieldError(field, tempValidator.getFirstError(fieldName));
            } else {
                this.hideFieldError(field);
            }
        }
        
        return isValid;
    }

    /**
     * Валидация всей формы
     */
    validateForm(data) {
        return this.validator.validate(data);
    }

    /**
     * Показ ошибок
     */
    showErrors() {
        for (const [fieldName, errors] of this.validator.errors) {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.updateFieldVisualState(field, false);
                this.showFieldError(field, errors[0]);
            }
        }
    }

    /**
     * Обновление визуального состояния поля
     */
    updateFieldVisualState(field, isValid) {
        field.classList.remove(this.options.errorClass, this.options.validClass);
        field.classList.add(isValid ? this.options.validClass : this.options.errorClass);
    }

    /**
     * Показ ошибки поля
     */
    showFieldError(field, message) {
        let errorElement = field.parentNode.querySelector('.field-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /**
     * Скрытие ошибки поля
     */
    hideFieldError(field) {
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Успешная валидация (переопределяется)
     */
    onValidSubmit(data) {
        console.log('Form is valid:', data);
    }

    /**
     * Очистка всех ошибок
     */
    clearErrors() {
        this.validator.clearErrors();
        
        // Очищаем визуальные индикаторы
        this.form.querySelectorAll(`.${this.options.errorClass}`).forEach(field => {
            field.classList.remove(this.options.errorClass);
        });
        
        this.form.querySelectorAll('.field-error').forEach(error => {
            error.style.display = 'none';
        });
    }
}

export default {
    Validator,
    validators,
    FormValidator,
    createOrderValidator,
    createUserValidator,
    createProcessValidator,
    createProductValidator
};