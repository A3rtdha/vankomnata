import { cartService } from './cart.js';

// Форматер цены
const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(price);
};

export const renderProducts = (products, container) => {
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="products-empty">
                <strong>Ничего не найдено</strong>
                <div>Попробуйте изменить фильтры или поиск.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => `
        <article class="product-card ${product.stock === 0 ? 'is-out' : ''}">
            <div class="product-img-wrapper">
                ${product.badge ? `<span class="product-badge ${getBadgeClass(product.badge)}">${product.badge}</span>` : ''}
                <a href="product.html?id=${product.id}" class="product-link product-link-media" aria-label="${product.name}">
                    <img src="${product.img}" alt="${product.name}" class="product-img" loading="lazy">
                </a>
                <div class="product-img-actions">
                    <a class="quick-view-btn" href="product.html?id=${product.id}">Открыть карточку</a>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <a href="product.html?id=${product.id}" class="product-link product-link-title">
                    <h3 class="product-title">${product.name}</h3>
                </a>
                ${renderRating(product)}
                ${renderStock(product)}
                <div class="product-footer">
                    <span>
                        <span class="price">${formatPrice(product.price)}</span>
                        ${product.oldPrice && product.oldPrice > product.price ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>` : ''}
                    </span>
                    <button class="add-btn js-add-to-cart"
                            data-id="${product.id}"
                            ${product.stock === 0 ? 'disabled aria-disabled="true"' : ''}
                            aria-label="Добавить ${product.name} в корзину">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </article>
    `).join('');
};

const getBadgeClass = (label) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('хит')) return 'badge-hit';
    if (normalized.includes('нов')) return 'badge-new';
    if (normalized.includes('скид')) return 'badge-sale';
    if (normalized.includes('прем')) return 'badge-premium';
    return '';
};

const renderRating = (product) => {
    if (!product.rating) return '';
    const filled = Math.round(product.rating);
    return `
        <div class="product-rating">
            ${renderStars(filled)}
            <span class="rating-val">${product.rating.toFixed(1)}</span>
            <span class="rating-count">(${product.reviews || 0})</span>
        </div>
    `;
};

const renderStars = (count) => {
    const stars = Array.from({ length: 5 }).map((_, i) => {
        return `<i class="${i < count ? 'fas' : 'far'} fa-star"></i>`;
    });
    return `<span class="rating-stars">${stars.join('')}</span>`;
};

const renderStock = (product) => {
    if (typeof product.stock !== 'number') return '';
    const inStock = product.stock > 0;
    return `
        <div class="product-stock ${inStock ? 'in-stock' : 'out-stock'}">
            ${inStock ? `В наличии: ${product.stock}` : 'Нет в наличии'}
        </div>
    `;
};

export const renderProductsSkeleton = (container, count = 6) => {
    container.innerHTML = Array.from({ length: count }).map(() => `
        <article class="product-card skeleton-card"></article>
    `).join('');
};

export const initNotifications = () => {
    const toast = document.getElementById('toast');
    let timer;
    const defaultMsg = toast.dataset.default || toast.textContent;

    return (message) => {
        toast.textContent = message || defaultMsg;
        toast.classList.add('active');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('active'), 2500);
    };
};

export const renderCart = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalSum');
    const items = cartService.getCartDetails();

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:50px;">Корзина пуста</p>';
        totalEl.textContent = formatPrice(0);
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="cart-item">
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.name}</h4>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                
                <div class="cart-item-controls">
                    <button class="qty-btn js-decrease" data-id="${item.id}">−</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn js-increase" data-id="${item.id}">+</button>
                </div>
            </div>
            <!-- Итоговая цена за позицию -->
            <div style="font-family: var(--font-heading); font-size: 1.1rem; white-space: nowrap;">
                ${formatPrice(item.totalPrice)}
            </div>
        </div>
    `).join('');

    totalEl.textContent = formatPrice(cartService.getTotalSum());
};

// Функция управления видимостью сайдбара
export const toggleCart = (isOpen) => {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');

    if (isOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
};

// Функция обновления счетчика (чуть изменена сигнатура)
export const updateCartCounter = (service) => {
    const count = service.getCount();
    const el = document.getElementById('cartCount');
    el.textContent = count;

    // Анимация только если кол-во изменилось
    el.style.transform = 'scale(1.2)';
    setTimeout(() => el.style.transform = 'scale(1)', 200);

    // Перерисовываем содержимое корзины, если она открыта
    renderCart();

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        if (!checkoutBtn.dataset.label) {
            checkoutBtn.dataset.label = checkoutBtn.textContent.trim() || 'Оформить заказ';
        }
        const hasItems = count > 0;
        checkoutBtn.disabled = !hasItems;
        checkoutBtn.textContent = hasItems ? checkoutBtn.dataset.label : 'Корзина пуста';
    }
};

// Словарь иконок для категорий (маппинг)
const categoryIcons = {
    'Все': 'fa-layer-group',
    'Аксессуары': 'fa-soap',
    'Хранение': 'fa-box-open',
    'Текстиль': 'fa-tshirt', // или fa-rug
    'Атмосфера': 'fa-fire',
    'Интерьер': 'fa-couch', // или fa-lightbulb
    'Сантехника': 'fa-faucet', // на случай расширения
    'Ванны': 'fa-bath'
};

// Генерация кнопок фильтров
export const renderFilters = (categories, container) => {
    const allCategories = ['Все', ...categories];

    // В реальном проекте мы бы считали кол-во товаров, тут пока фейк или пусто
    container.innerHTML = allCategories.map(cat => `
        <li class="category-item ${cat === 'Все' ? 'active' : ''}" data-category="${cat}">
            <span>${cat}</span>
            <i class="fas fa-chevron-right" style="font-size: 0.7rem; opacity: 0.3;"></i>
        </li>
    `).join('');
};

// Переключение активного класса
export const setActiveFilter = (category) => {
    const items = document.querySelectorAll('.category-item');
    items.forEach(item => {
        if (item.dataset.category === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
};