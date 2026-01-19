import { products as defaultProducts } from '../data/products.js';

const API_URL = '/api/products.php';

class ProductService {
    constructor() {
        this.products = [];
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return this.products;
        try {
            const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('Failed to load products');
            const data = await res.json();
            this.products = Array.isArray(data) ? data : [];
        } catch (e) {
            // Fallback для режима без PHP
            this.products = [...defaultProducts];
        }
        this.loaded = true;
        return this.products;
    }

    getAll() {
        return this.products;
    }

    getById(id) {
        return this.products.find(p => p.id == id);
    }

    async add(product) {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        const created = await res.json();
        if (created && created.id) {
            this.products.push(created);
        }
        return created;
    }

    async update(id, updatedFields) {
        const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFields)
        });
        const updated = await res.json();
        const index = this.products.findIndex(p => p.id == id);
        if (index !== -1) {
            this.products[index] = updated;
        }
        return updated;
    }

    async delete(id) {
        await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        this.products = this.products.filter(p => p.id != id);
    }

    async importBulk(items) {
        const res = await fetch(`${API_URL}?action=import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items)
        });
        const text = await res.text();
        if (!text.trim()) {
            throw new Error('Пустой ответ от сервера');
        }
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            throw new Error('Некорректный ответ сервера');
        }
        if (Array.isArray(data)) {
            this.products = data;
        }
        return data;
    }

    exportToJSON() {
        return JSON.stringify(this.products, null, 4);
    }
}

export const productService = new ProductService();