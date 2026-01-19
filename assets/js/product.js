import { cartService } from './modules/cart.js';
import { productService } from './modules/productService.js';
import { renderCart, toggleCart, updateCartCounter, initNotifications } from './modules/ui.js';

const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(price);
};

const renderStars = (count) => {
    const stars = Array.from({ length: 5 }).map((_, i) => {
        return `<i class="${i < count ? 'fas' : 'far'} fa-star"></i>`;
    });
    return `<span class="rating-stars">${stars.join('')}</span>`;
};

const getBadgeClass = (label) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('хит')) return 'badge-hit';
    if (normalized.includes('нов')) return 'badge-new';
    if (normalized.includes('скид')) return 'badge-sale';
    if (normalized.includes('прем')) return 'badge-premium';
    return '';
};

document.addEventListener('DOMContentLoaded', async () => {
    const showToast = initNotifications();

    const productSection = document.getElementById('productSection');
    const productNotFound = document.getElementById('productNotFound');

    const productImage = document.getElementById('productImage');
    const productTitle = document.getElementById('productTitle');
    const productCategory = document.getElementById('productCategory');
    const productSku = document.getElementById('productSku');
    const productRating = document.getElementById('productRating');
    const productStock = document.getElementById('productStock');
    const productPrice = document.getElementById('productPrice');
    const productOldPrice = document.getElementById('productOldPrice');
    const productDesc = document.getElementById('productDesc');
    const productSpecs = document.getElementById('productSpecs');
    const productBadge = document.getElementById('productBadge');
    const productCrumb = document.getElementById('productCrumb');

    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyInput = document.getElementById('qtyInput');
    const addToCartBtn = document.getElementById('addToCartBtn');

    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');

    await productService.load();
    cartService.subscribe(updateCartCounter);
    renderCart();

    openCartBtn.addEventListener('click', () => toggleCart(true));
    closeCartBtn.addEventListener('click', () => toggleCart(false));
    cartOverlay.addEventListener('click', () => toggleCart(false));

    document.getElementById('cartItemsContainer').addEventListener('click', (e) => {
        const btnIncrease = e.target.closest('.js-increase');
        const btnDecrease = e.target.closest('.js-decrease');

        if (btnIncrease) cartService.addItem(btnIncrease.dataset.id);
        else if (btnDecrease) cartService.removeItem(btnDecrease.dataset.id);
    });

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = productService.getById(id);

    if (!product) {
        productSection.style.display = 'none';
        productNotFound.style.display = 'block';
        document.title = 'Товар не найден | Ванная комната';
        return;
    }

    document.title = `${product.name} | Ванная комната`;
    productCrumb.textContent = product.name;
    productImage.src = product.img;
    productImage.alt = product.name;
    productTitle.textContent = product.name;
    productCategory.textContent = product.category;
    productSku.textContent = `Артикул: ${product.id}`;

    if (product.badge) {
        productBadge.textContent = product.badge;
        productBadge.className = `product-badge ${getBadgeClass(product.badge)}`.trim();
        productBadge.style.display = 'inline-flex';
    }

    if (product.rating) {
        const filled = Math.round(product.rating);
        productRating.innerHTML = `
            ${renderStars(filled)}
            <span class="rating-val">${product.rating.toFixed(1)}</span>
            <span class="rating-count">(${product.reviews || 0})</span>
        `;
    } else {
        productRating.style.display = 'none';
    }

    if (typeof product.stock === 'number') {
        const inStock = product.stock > 0;
        productStock.textContent = inStock ? `В наличии: ${product.stock}` : 'Нет в наличии';
        productStock.className = `product-stock ${inStock ? 'in-stock' : 'out-stock'}`;
        if (!inStock) {
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'Нет в наличии';
        }
    }

    productPrice.textContent = formatPrice(product.price);
    if (product.oldPrice && product.oldPrice > product.price) {
        productOldPrice.textContent = formatPrice(product.oldPrice);
        productOldPrice.style.display = 'inline';
    }

    productDesc.textContent = product.desc || 'Подробности будут добавлены в ближайшее время.';
    productSpecs.innerHTML = `
        <li><strong>Категория:</strong> ${product.category}</li>
        <li><strong>Артикул:</strong> ${product.id}</li>
        <li><strong>Наличие:</strong> ${typeof product.stock === 'number' ? product.stock : 'уточняйте'}</li>
    `;

    qtyMinus.addEventListener('click', () => {
        const current = Number(qtyInput.value) || 1;
        qtyInput.value = Math.max(1, current - 1);
    });
    qtyPlus.addEventListener('click', () => {
        const current = Number(qtyInput.value) || 1;
        qtyInput.value = current + 1;
    });

    addToCartBtn.addEventListener('click', () => {
        const qty = Math.max(1, Number(qtyInput.value) || 1);
        if (product.stock === 0) {
            showToast('Нет в наличии');
            return;
        }
        for (let i = 0; i < qty; i++) {
            cartService.addItem(product.id);
        }
        showToast();
    });

    document.querySelector('.tab-buttons').addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(el => el.classList.toggle('active', el === btn));
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
    });
});
