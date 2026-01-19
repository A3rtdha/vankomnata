// ИМПОРТИРУЕМ СЕРВИС ВМЕСТО ФАЙЛА
import { productService } from './productService.js';

class CartService {
    constructor() {
        this.cart = this._load();
        this.listeners = [];
    }

    addItem(id) {
        // Приводим к числу, чтобы типы совпадали
        const numericId = Number(id);
        const existingItem = this.cart.find(item => item.id === numericId);

        if (existingItem) {
            existingItem.qty++;
        } else {
            this.cart.push({ id: numericId, qty: 1 });
        }
        this._save();
        this._notify();
    }

    removeItem(id) {
        const numericId = Number(id);
        const index = this.cart.findIndex(item => item.id === numericId);
        if (index !== -1) {
            this.cart[index].qty--;
            if (this.cart[index].qty <= 0) {
                this.cart.splice(index, 1);
            }
            this._save();
            this._notify();
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД
    getCartDetails() {
        return this.cart
            .map(cartItem => {
                // Берем товар из сервиса (актуальной базы)
                const product = productService.getById(cartItem.id);

                // Защита от дурака: если товар удалили из базы, а в корзине он остался
                if (!product) return null;

                return {
                    ...product,
                    qty: cartItem.qty,
                    totalPrice: product.price * cartItem.qty
                };
            })
            .filter(item => item !== null); // Убираем пустые товары (если удаленные)
    }

    getTotalSum() {
        return this.getCartDetails().reduce((sum, item) => sum + item.totalPrice, 0);
    }

    getCount() {
        return this.cart.reduce((sum, item) => sum + item.qty, 0);
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this);
    }

    _notify() {
        this.listeners.forEach(listener => listener(this));
    }

    // Добавь внутрь класса CartService
    clear() {
        this.cart = [];
        this._save();
        this._notify();
    }

    _save() {
        localStorage.setItem('vannaya_cart', JSON.stringify(this.cart));
    }

    _load() {
        const raw = localStorage.getItem('vannaya_cart');
        return raw ? JSON.parse(raw) : [];
    }
}

export const cartService = new CartService();