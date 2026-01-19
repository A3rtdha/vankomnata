import { renderProducts, renderProductsSkeleton, initNotifications, updateCartCounter, toggleCart, renderCart, renderFilters, setActiveFilter } from './modules/ui.js';
import { cartService } from './modules/cart.js';
import { productService } from './modules/productService.js';
import { authService } from './modules/authService.js';
import { categories as categoriesData } from './data/categories.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('productsGrid');
    const sidebarList = document.getElementById('sidebarCategories');
    const showToast = initNotifications();

    // --- LOAD DATA ---
    await productService.load();
    const products = productService.getAll();

    renderFilters(categoriesData, products, sidebarList);
    renderProductsSkeleton(grid, 6);

    // --- UPDATE STATS IN HERO ---
    const updateStats = () => {
        const totalProductsEl = document.getElementById('totalProducts');
        const totalCategoriesEl = document.getElementById('totalCategories');
        if (totalProductsEl) totalProductsEl.textContent = products.length;
        // Подсчитываем общее количество категорий (без "Все категории")
        const totalCategories = categoriesData.filter(c => c.id !== 'all').length;
        if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories;
    };
    updateStats();

    // --- PRICE RANGE SETUP ---
    const priceMinInput = document.getElementById('priceMin');
    const priceMaxInput = document.getElementById('priceMax');
    const priceRangeMin = document.getElementById('priceRangeMin');
    const priceRangeMax = document.getElementById('priceRangeMax');
    const priceRangeFill = document.querySelector('.price-range');

    const maxProductPrice = Math.max(...products.map(p => p.price));
    const minProductPrice = 0;
    const stepPrice = 1000;

    if (priceRangeMin && priceRangeMax) {
        priceRangeMin.min = String(minProductPrice);
        priceRangeMin.max = String(maxProductPrice);
        priceRangeMin.step = String(stepPrice);
        priceRangeMin.value = String(minProductPrice);

        priceRangeMax.min = String(minProductPrice);
        priceRangeMax.max = String(maxProductPrice);
        priceRangeMax.step = String(stepPrice);
        priceRangeMax.value = String(maxProductPrice);
    }

    const clampRangeValues = () => {
        let minVal = Number(priceRangeMin.value);
        let maxVal = Number(priceRangeMax.value);
        if (minVal > maxVal - stepPrice) minVal = maxVal - stepPrice;
        if (maxVal < minVal + stepPrice) maxVal = minVal + stepPrice;
        priceRangeMin.value = String(minVal);
        priceRangeMax.value = String(maxVal);
        return { minVal, maxVal };
    };

    const updateRangeUI = () => {
        if (!priceRangeFill) return;
        const minVal = Number(priceRangeMin.value);
        const maxVal = Number(priceRangeMax.value);
        const range = maxProductPrice - minProductPrice || 1;
        const left = ((minVal - minProductPrice) / range) * 100;
        const right = 100 - ((maxVal - minProductPrice) / range) * 100;
        priceRangeFill.style.left = `${left}%`;
        priceRangeFill.style.right = `${right}%`;
    };

    const syncInputsFromRange = () => {
        const { minVal, maxVal } = clampRangeValues();
        if (priceMinInput) priceMinInput.value = String(minVal);
        if (priceMaxInput) priceMaxInput.value = String(maxVal);
        updateRangeUI();
    };

    const syncRangeFromInputs = () => {
        const minVal = Number(priceMinInput.value || minProductPrice);
        const maxVal = Number(priceMaxInput.value || maxProductPrice);
        priceRangeMin.value = String(minVal);
        priceRangeMax.value = String(maxVal);
        clampRangeValues();
        updateRangeUI();
    };

    if (priceMinInput && priceMaxInput) {
        priceMinInput.value = String(minProductPrice);
        priceMaxInput.value = String(maxProductPrice);
    }
    if (priceRangeMin && priceRangeMax) {
        updateRangeUI();
        priceRangeMin.addEventListener('input', syncInputsFromRange);
        priceRangeMax.addEventListener('input', syncInputsFromRange);
    }
    if (priceMinInput) priceMinInput.addEventListener('input', syncRangeFromInputs);
    if (priceMaxInput) priceMaxInput.addEventListener('input', syncRangeFromInputs);

    // --- GET URL PARAMS ---
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('category');

    // --- STATE ---
    let currentCategoryId = categoryIdFromUrl || 'all';
    let currentCategoryName = '';
    let minPrice = 0;
    let maxPrice = 999999;
    let searchQuery = '';

    // Получить имя категории по ID
    const getCategoryNameById = (categoryId) => {
        for (const cat of categoriesData) {
            if (cat.id === categoryId) return cat.name;
            if (cat.subcategories) {
                const sub = cat.subcategories.find(s => s.id === categoryId);
                if (sub) return sub.name;
            }
        }
        return 'Каталог';
    };

    // Update page title based on category
    const updatePageTitle = (categoryId) => {
        const titleEl = document.getElementById('catalogTitle');
        const breadcrumbEl = document.getElementById('breadcrumbCategory');

        const categoryName = getCategoryNameById(categoryId);

        if (categoryId && categoryId !== 'all') {
            titleEl.textContent = categoryName;
            breadcrumbEl.textContent = categoryName;
            document.title = `${categoryName} | Ванная комната`;
        } else {
            titleEl.textContent = 'Каталог';
            breadcrumbEl.textContent = 'Каталог';
            document.title = 'Каталог | Ванная комната';
        }
    };

    // Update results count
    const updateResultsCount = (count) => {
        const resultsEl = document.getElementById('resultsCount');
        if (resultsEl) {
            const word = count === 1 ? 'товар' : count < 5 ? 'товара' : 'товаров';
            resultsEl.textContent = `Найдено ${count} ${word}`;
        }
    };

    // Apply staggered animation to cards
    const applyStaggeredAnimation = () => {
        const cards = grid.querySelectorAll('.product-card');
        cards.forEach((card, index) => {
            card.style.setProperty('--card-index', index);
        });
    };

    // Динамическая минимальная высота для грида чтобы не было дёрганий
    const updateGridMinHeight = (itemCount) => {
        if (!grid) return;
        
        if (itemCount === 0) {
            grid.style.minHeight = '400px';
            return;
        }
        
        // Вычисляем примерную высоту на основе количества товаров
        const gridWidth = grid.offsetWidth || 1000;
        const cardsPerRow = Math.floor(gridWidth / 304) || 1; // 280px card + 24px gap
        const rows = Math.ceil(itemCount / cardsPerRow);
        const estimatedHeight = rows * 500; // примерная высота карточки + gap
        
        grid.style.minHeight = `${Math.max(600, estimatedHeight)}px`;
    };

    // Apply filters
    const applyFilters = () => {
        const filtered = products.filter(p => {
            const matchCat = currentCategoryId === 'all' || p.category === currentCategoryName;
            const matchSearch = p.name.toLowerCase().includes(searchQuery);
            const matchPrice = p.price >= minPrice && p.price <= maxPrice;
            return matchCat && matchSearch && matchPrice;
        });
        
        // Устанавливаем минимальную высоту ПЕРЕД рендером для плавности
        updateGridMinHeight(filtered.length);
        
        renderProducts(filtered, grid);
        updatePageTitle(currentCategoryId);
        updateResultsCount(filtered.length);
        
        // Apply staggered animation after render
        requestAnimationFrame(() => {
            applyStaggeredAnimation();
        });
    };

    // Reset filters
    const resetFilters = () => {
        currentCategoryId = 'all';
        currentCategoryName = '';
        minPrice = 0;
        maxPrice = maxProductPrice;
        searchQuery = '';
        
        document.getElementById('searchInput').value = '';
        document.getElementById('priceMin').value = String(minProductPrice);
        document.getElementById('priceMax').value = String(maxProductPrice);
        if (priceRangeMin && priceRangeMax) {
            priceRangeMin.value = String(minProductPrice);
            priceRangeMax.value = String(maxProductPrice);
            updateRangeUI();
        }
        
        setActiveFilter('all');
        applyFilters();
        
        window.history.pushState({}, '', window.location.pathname);
    };

    // Reset button listener
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    // View toggle (grid/list)
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            if (view === 'list') {
                grid.classList.add('list-view');
            } else {
                grid.classList.remove('list-view');
            }
        });
    });

    // Set initial category name from URL
    if (currentCategoryId !== 'all') {
        currentCategoryName = getCategoryNameById(currentCategoryId);
    }
    
    // Set initial filter from URL
    setActiveFilter(currentCategoryId);
    setTimeout(() => applyFilters(), 150);

    // Add scroll indicator for categories
    const checkScrollIndicator = () => {
        const scrollable = document.querySelector('.sidebar-scrollable');
        if (scrollable) {
            const hasScroll = scrollable.scrollHeight > scrollable.clientHeight;
            scrollable.classList.toggle('has-scroll', hasScroll);
        }
    };
    
    // Check on load and on window resize
    setTimeout(checkScrollIndicator, 200);
    window.addEventListener('resize', checkScrollIndicator);

    // Sticky toolbar effect
    const toolbar = document.querySelector('.products-toolbar');
    let lastScrollY = window.scrollY;
    
    const handleToolbarSticky = () => {
        if (!toolbar) return;
        
        const toolbarTop = toolbar.getBoundingClientRect().top;
        const isStuck = toolbarTop <= 90;
        
        toolbar.classList.toggle('is-stuck', isStuck);
    };
    
    window.addEventListener('scroll', handleToolbarSticky, { passive: true });

    cartService.subscribe(updateCartCounter);

    // --- EVENT LISTENERS ---

    // Category and subcategory click
    sidebarList.addEventListener('click', (e) => {
        // Проверяем клик по основной категории
        const categoryItem = e.target.closest('.category-item:not(.subcategory-item)');
        const subcategoryItem = e.target.closest('.subcategory-item');
        
        if (subcategoryItem) {
            // Клик по подкатегории
            e.stopPropagation();
            currentCategoryId = subcategoryItem.dataset.categoryId;
            currentCategoryName = subcategoryItem.dataset.categoryName;
            setActiveFilter(currentCategoryId);
            authService.trackInterest(currentCategoryName);
            applyFilters();

            // Update URL without reload
            const newUrl = `${window.location.pathname}?category=${encodeURIComponent(currentCategoryId)}`;
            window.history.pushState({}, '', newUrl);
        } else if (categoryItem) {
            // Клик по родительской категории
            if (!e.target.closest('.category-main')) return;
            
            // Если у категории нет подкатегорий, фильтруем
            if (!categoryItem.classList.contains('has-subcategories')) {
                currentCategoryId = categoryItem.dataset.categoryId;
                currentCategoryName = categoryItem.dataset.categoryName;
                setActiveFilter(currentCategoryId);
                authService.trackInterest(currentCategoryName);
                applyFilters();

                // Update URL without reload
                const newUrl = currentCategoryId === 'all' 
                    ? window.location.pathname 
                    : `${window.location.pathname}?category=${encodeURIComponent(currentCategoryId)}`;
                window.history.pushState({}, '', newUrl);
            }
        }
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    // Price filter
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        const minVal = document.getElementById('priceMin').value;
        const maxVal = document.getElementById('priceMax').value;
        minPrice = minVal ? Number(minVal) : minProductPrice;
        maxPrice = maxVal ? Number(maxVal) : maxProductPrice;
        applyFilters();
    });

    // Add to cart
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-add-to-cart');
        if (!btn) return;
        const product = productService.getById(btn.dataset.id);
        if (product && product.stock === 0) {
            showToast('Нет в наличии');
            return;
        }
        cartService.addItem(btn.dataset.id);
        showToast();
    });

    // Cart controls
    document.getElementById('openCartBtn').addEventListener('click', () => toggleCart(true));
    document.getElementById('closeCart').addEventListener('click', () => toggleCart(false));
    document.getElementById('cartOverlay').addEventListener('click', () => toggleCart(false));

    document.getElementById('cartItemsContainer').addEventListener('click', (e) => {
        const btnIncrease = e.target.closest('.js-increase');
        const btnDecrease = e.target.closest('.js-decrease');
        if (btnIncrease) cartService.addItem(btnIncrease.dataset.id);
        else if (btnDecrease) cartService.removeItem(btnDecrease.dataset.id);
    });

    // --- AUTH ---
    window.toggleModal = (id, show) => {
        const modal = document.getElementById(id);
        if (show) modal.classList.add('open');
        else modal.classList.remove('open');
    };

    window.authService = authService;

    const currentUser = authService.getCurrentUser();
    const authBtn = document.getElementById('authBtn');

    if (currentUser) {
        authBtn.innerHTML = '<i class="fas fa-user-check" style="color: var(--color-accent)"></i>';
        authBtn.onclick = () => {
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('userInterest').textContent = authService.getTopInterest();
            toggleModal('userModal', true);
        };
    } else {
        authBtn.onclick = () => {
            toggleModal('loginModal', true);
        };
    }

    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const l = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        const loginError = document.getElementById('loginError');
        
        if (loginError) {
            loginError.textContent = '';
            loginError.style.display = 'none';
        }

        const res = authService.login(l, p);
        if (!res.success && loginError) {
            loginError.textContent = res.msg;
            loginError.style.display = 'block';
        }
    });

    // --- CHECKOUT ---
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartBody = document.getElementById('cartItemsContainer');
    const cartFooter = document.querySelector('.cart-footer');

    checkoutBtn.addEventListener('click', () => {
        if (cartService.getCount() === 0) {
            alert('Корзина пуста!');
            return;
        }

        cartBody.innerHTML = `
            <div class="checkout-form">
                <h3 style="margin-bottom:20px;">Оформление</h3>
                <form id="orderForm">
                    <div class="form-group">
                        <input type="text" name="fullName" class="form-control" placeholder="Ваше имя" required style="margin-bottom:10px;">
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" class="form-control" placeholder="Телефон" required style="margin-bottom:10px;">
                    </div>
                    <div class="form-group">
                        <input type="text" name="address" class="form-control" placeholder="Адрес доставки" required style="margin-bottom:20px;">
                    </div>
                    <button type="submit" class="btn btn-block">Подтвердить заказ</button>
                    <button type="button" id="backToCart" class="btn btn-block" style="background:#eee; color:#333; margin-top:10px;">Назад</button>
                </form>
            </div>
        `;
        cartFooter.style.display = 'none';

        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'Обработка...';

            setTimeout(() => {
                cartService.clear();
                cartBody.innerHTML = `
                    <div class="checkout-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Спасибо за заказ!</h3>
                        <p>Менеджер свяжется с вами в ближайшее время.</p>
                    </div>
                `;
                setTimeout(() => {
                    toggleCart(false);
                    cartFooter.style.display = 'block';
                }, 3000);
            }, 1500);
        });

        document.getElementById('backToCart').addEventListener('click', () => {
            cartFooter.style.display = 'block';
            renderCart();
        });
    });
});
