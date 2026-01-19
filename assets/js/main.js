import { initNotifications, updateCartCounter, toggleCart, renderCart } from './modules/ui.js';
import { cartService } from './modules/cart.js';
import { authService } from './modules/authService.js';
import { geoService } from './modules/geoService.js';
import { pagesContent } from './data/pages.js';

document.addEventListener('DOMContentLoaded', async () => {
    const showToast = initNotifications();

    // --- CART ---
    cartService.subscribe(updateCartCounter);

    document.getElementById('openCartBtn').addEventListener('click', () => toggleCart(true));
    document.getElementById('closeCart').addEventListener('click', () => toggleCart(false));
    document.getElementById('cartOverlay').addEventListener('click', () => toggleCart(false));

    document.getElementById('cartItemsContainer').addEventListener('click', (e) => {
        const btnIncrease = e.target.closest('.js-increase');
        const btnDecrease = e.target.closest('.js-decrease');

        if (btnIncrease) cartService.addItem(btnIncrease.dataset.id);
        else if (btnDecrease) cartService.removeItem(btnDecrease.dataset.id);
    });

    // --- AUTH & USER LOGIC ---
    window.toggleModal = (id, show) => {
        const modal = document.getElementById(id);
        if (show) modal.classList.add('open');
        else modal.classList.remove('open');
    };

    window.authService = authService;
    window.geoService = geoService;

    const loginError = document.getElementById('loginError');
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
            if (loginError) {
                loginError.textContent = '';
                loginError.style.display = 'none';
            }
            toggleModal('loginModal', true);
        };
    }

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

    // --- GEO ---
    document.getElementById('cityForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const cityValue = document.getElementById('cityInput').value;
        geoService.trySaveCity(cityValue);
    });

    geoService.init();

    // --- ROUTER (for info pages) ---
    const homePage = document.getElementById('homePage');
    const infoPage = document.getElementById('infoPage');
    const infoTitle = document.getElementById('infoTitle');
    const infoContentEl = document.getElementById('infoContent');

    window.router = {
        navigate(pageId) {
            const data = pagesContent[pageId];
            if (!data) return;

            window.scrollTo({ top: 0, behavior: 'smooth' });
            homePage.classList.add('fade-out');
            infoPage.classList.add('fade-out');

            setTimeout(() => {
                infoTitle.textContent = data.title;
                infoContentEl.innerHTML = data.content;
                homePage.style.display = 'none';
                infoPage.style.display = 'block';

                setTimeout(() => {
                    infoPage.classList.remove('fade-out');
                }, 50);
            }, 300);
        },

        goHome() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            infoPage.classList.add('fade-out');

            setTimeout(() => {
                infoPage.style.display = 'none';
                homePage.style.display = 'block';

                setTimeout(() => {
                    homePage.classList.remove('fade-out');
                }, 50);
            }, 300);
        }
    };
});
