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
    'all': 'fa-layer-group',
    'accessories': 'fa-soap',
    'baths': 'fa-bath',
    'heaters': 'fa-fire',
    'doors': 'fa-door-open',
    'shower-cabins': 'fa-shower',
    'shower-enclosures': 'fa-border-style',
    'tiles': 'fa-th',
    'flooring': 'fa-layer-group',
    'furniture': 'fa-couch',
    'towel-warmers': 'fa-temperature-high',
    'radiators': 'fa-th-large',
    'sanitary': 'fa-faucet',
    'installation': 'fa-tools',
    'drains': 'fa-grip-lines',
    'mixers': 'fa-faucet',
    'promotions': 'fa-tags'
};

// Генерация многоуровневых фильтров с выпадающими подкатегориями
export const renderFilters = (categoriesData, products, container) => {
    const counts = products.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    const totalCount = products.length;

    container.innerHTML = categoriesData.map(cat => {
        const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
        const icon = categoryIcons[cat.id] || 'fa-cube';
        const count = cat.id === 'all' ? totalCount : (counts[cat.name] || 0);
        const isActive = cat.id === 'all' ? 'active' : '';
        
        let html = `
        <li class="category-item ${isActive} ${hasSubcategories ? 'has-subcategories' : ''}" 
            data-category-id="${cat.id}" 
            data-category-name="${cat.name}">
            <div class="category-main">
                <span class="category-icon"><i class="fas ${icon}"></i></span>
                <span class="category-label">${cat.name}</span>
                <span class="category-count-pill">${count}</span>
                ${hasSubcategories ? '<i class="fas fa-chevron-down category-chevron"></i>' : ''}
            </div>
        `;
        
        if (hasSubcategories) {
            html += `<ul class="subcategory-list">`;
            cat.subcategories.forEach(sub => {
                const subCount = counts[sub.name] || 0;
                html += `
                    <li class="subcategory-item" 
                        data-category-id="${sub.id}" 
                        data-category-name="${sub.name}"
                        data-parent="${sub.parent}">
                        <span class="subcategory-label">${sub.name}</span>
                        <span class="category-count-pill">${subCount}</span>
                    </li>
                `;
            });
            html += `</ul>`;
        }
        
        html += `</li>`;
        return html;
    }).join('');
    
    // Добавляем обработчик для раскрытия/скрытия подкатегорий
    setTimeout(() => {
        container.querySelectorAll('.category-main').forEach(mainItem => {
            mainItem.addEventListener('click', (e) => {
                const parent = mainItem.parentElement;
                if (parent.classList.contains('has-subcategories')) {
                    parent.classList.toggle('expanded');
                    e.stopPropagation();
                }
            });
        });
    }, 100);
};

// Переключение активного класса
export const setActiveFilter = (categoryId) => {
    const items = document.querySelectorAll('.category-item, .subcategory-item');
    items.forEach(item => {
        if (item.dataset.categoryId === categoryId) {
            item.classList.add('active');
            // Если это подкатегория, раскрываем родительскую категорию
            if (item.classList.contains('subcategory-item')) {
                const parentCategory = item.closest('.category-item');
                if (parentCategory) {
                    parentCategory.classList.add('expanded');
                }
            }
        } else {
            item.classList.remove('active');
        }
    });
};