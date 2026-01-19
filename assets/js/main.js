import { renderProducts, renderProductsSkeleton, initNotifications, updateCartCounter, toggleCart, renderCart, renderFilters, setActiveFilter } from './modules/ui.js';
import { cartService } from './modules/cart.js';
import { productService } from './modules/productService.js';
import { authService } from './modules/authService.js';
import { geoService } from './modules/geoService.js';
import { pagesContent } from './data/pages.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('productsGrid');
    const sidebarList = document.getElementById('sidebarCategories'); // Новый ID контейнера
    const showToast = initNotifications();

    // --- ДАННЫЕ ---
    await productService.load();
    const products = productService.getAll();
    const categories = [...new Set(products.map(p => p.category))];

    renderFilters(categories, sidebarList);
    renderProductsSkeleton(grid, 6);
    setTimeout(() => renderProducts(products, grid), 150);

    cartService.subscribe(updateCartCounter);

    // --- STATE ФИЛЬТРОВ ---
    let currentCategory = 'Все';
    let minPrice = 0;
    let maxPrice = 999999;
    let searchQuery = '';

    // Функция применения всех фильтров разом
    const applyFilters = () => {
        const filtered = products.filter(p => {
            const matchCat = currentCategory === 'Все' || p.category === currentCategory;
            const matchSearch = p.name.toLowerCase().includes(searchQuery);
            const matchPrice = p.price >= minPrice && p.price <= maxPrice;

            return matchCat && matchSearch && matchPrice;
        });

        renderProducts(filtered, grid);
    };

    // 1. Клик по категории
    sidebarList.addEventListener('click', (e) => {
        const item = e.target.closest('.category-item');
        if (!item) return;

        currentCategory = item.dataset.category;
        setActiveFilter(currentCategory);
        authService.trackInterest(currentCategory);
        applyFilters();
    });

    // 2. Поиск (переместили input в сайдбар)
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    // 3. Цена
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        const minVal = document.getElementById('priceMin').value;
        const maxVal = document.getElementById('priceMax').value;

        minPrice = minVal ? Number(minVal) : 0;
        maxPrice = maxVal ? Number(maxVal) : 999999;

        applyFilters();
    });

    // --- 3. Обработчики событий (остальное без изменений) ---
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

    document.getElementById('openCartBtn').addEventListener('click', () => toggleCart(true));
    document.getElementById('closeCart').addEventListener('click', () => toggleCart(false));
    document.getElementById('cartOverlay').addEventListener('click', () => toggleCart(false));

    document.getElementById('cartItemsContainer').addEventListener('click', (e) => {
        const btnIncrease = e.target.closest('.js-increase');
        const btnDecrease = e.target.closest('.js-decrease');

        if (btnIncrease) cartService.addItem(btnIncrease.dataset.id);
        else if (btnDecrease) cartService.removeItem(btnDecrease.dataset.id);
    });

    window.scrollToCatalog = () => {
        document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    };

    // --- 4. AUTH & USER LOGIC ---

    // Глобальная функция для модалок (чтобы работала из HTML onclick)
    window.toggleModal = (id, show) => {
        const modal = document.getElementById(id);
        if (show) modal.classList.add('open');
        else modal.classList.remove('open');
    };

    // Делаем сервисы глобальными для onclick хендлеров в HTML
    window.authService = authService;
    window.geoService = geoService;

    const loginError = document.getElementById('loginError');

    // Кнопка в хедере (Логин или Профиль)
    const currentUser = authService.getCurrentUser();
    const authBtn = document.getElementById('authBtn');

    if (currentUser) {
        // Если вошел - иконка юзера зеленая
        authBtn.innerHTML = '<i class="fas fa-user-check" style="color: var(--color-accent)"></i>';
        authBtn.onclick = () => {
            // Заполняем данные кабинета перед открытием
            document.getElementById('userNameDisplay').textContent = currentUser.name;
            document.getElementById('userInterest').textContent = authService.getTopInterest();
            toggleModal('userModal', true);
        };
    } else {
        // Если гость - открываем форму входа
        authBtn.onclick = () => {
            if (loginError) {
                loginError.textContent = '';
                loginError.style.display = 'none';
            }
            toggleModal('loginModal', true);
        };
    }

    // Обработка формы входа
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const l = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();

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

    // --- CHECKOUT LOGIC ---
    // Находим кнопку оформления в сайдбаре (она динамическая или статическая?
    // В нашем HTML она статическая в <aside>, так что можно навесить сразу)

    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartBody = document.getElementById('cartItemsContainer');
    const cartFooter = document.querySelector('.cart-footer');

    // Хак: заменяем обработчик, чтобы не дублировать
    // (Лучше бы через ID, но у нас там класс. Давай добавим обработчик аккуратно)

    checkoutBtn.addEventListener('click', () => {
        if (cartService.getCount() === 0) {
            alert('Корзина пуста!');
            return;
        }

        // 1. Скрываем товары и футер корзины
        cartBody.innerHTML = `
            <div class="checkout-form">
                <h3 style="margin-bottom:20px;">Оформление</h3>
                <form id="orderForm">
                    <div class="form-group">
                        <input type="text" name="fullName" autocomplete="name" class="form-control" placeholder="Ваше имя" required style="margin-bottom:10px;">
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" inputmode="tel" autocomplete="tel" class="form-control" placeholder="Телефон" required style="margin-bottom:10px;">
                    </div>
                    <div class="form-group">
                        <input type="text" name="address" autocomplete="street-address" class="form-control" placeholder="Адрес доставки" required style="margin-bottom:20px;">
                    </div>
                    <button type="submit" class="btn btn-block">Подтвердить заказ</button>
                    <button type="button" id="backToCart" class="btn btn-block" style="background:#eee; color:#333; margin-top:10px;">Назад</button>
                </form>
            </div>
        `;
        cartFooter.style.display = 'none'; // Скрываем кнопку "Оформить"

        // 2. Логика формы
        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();

            // Имитация отправки на сервер
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'Обработка...';

            setTimeout(() => {
                cartService.clear(); // Очищаем корзину

                cartBody.innerHTML = `
                    <div class="checkout-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Спасибо за заказ!</h3>
                        <p>Менеджер свяжется с вами в ближайшее время.</p>
                    </div>
                `;

                // Через 3 секунды закрываем корзину
                setTimeout(() => {
                    toggleCart(false);
                    // Возвращаем вид корзины (сброс стилей произойдет при следующем рендере cartService)
                    cartFooter.style.display = 'block';
                }, 3000);
            }, 1500);
        });

        // Кнопка "Назад"
        document.getElementById('backToCart').addEventListener('click', () => {
            cartFooter.style.display = 'block';
            renderCart(); // Перерисовываем товары обратно
        });
    });

    // --- GEO MODAL HANDLER ---
    document.getElementById('cityForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const cityValue = document.getElementById('cityInput').value;
        geoService.trySaveCity(cityValue);
    });

    // --- 5. GEO & COMPLIANCE ---
    geoService.init();

    // --- 6. SIMPLE ROUTER ---
    const homePage = document.getElementById('homePage');
    const infoPage = document.getElementById('infoPage');
    const infoTitle = document.getElementById('infoTitle');
    const infoContentEl = document.getElementById('infoContent');

    window.router = {
        navigate(pageId) {
            const data = pagesContent[pageId];
            if (!data) return;

            // 1. Скролл наверх
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 2. Анимация исчезновения текущего контента
            homePage.classList.add('fade-out');
            infoPage.classList.add('fade-out');

            setTimeout(() => {
                // 3. Подмена контента
                infoTitle.textContent = data.title;
                infoContentEl.innerHTML = data.content;

                // 4. Переключение видимости
                homePage.style.display = 'none';
                infoPage.style.display = 'block';

                // 5. Анимация появления
                // Небольшая задержка, чтобы браузер понял смену display
                setTimeout(() => {
                    infoPage.classList.remove('fade-out');
                }, 50);
            }, 300); // Ждем пока пройдет анимация fade-out
        },

        goHome() {
            window.scrollTo({ top: 0, behavior: 'smooth' });

            infoPage.classList.add('fade-out');

            setTimeout(() => {
                infoPage.style.display = 'none';
                homePage.style.display = 'block';

                // Хак: сбрасываем opacity homePage (если оно было скрыто)
                // Сначала даем ему отрисоваться
                setTimeout(() => {
                    homePage.classList.remove('fade-out');
                }, 50);
            }, 300);
        }
    };

    // --- 7. PRODUCT QUICK VIEW MODAL ---
});