import { cartService } from './modules/cart.js';
import { productService } from './modules/productService.js';
import { renderCart, toggleCart, updateCartCounter, initNotifications, renderProducts, bindAddToCart } from './modules/ui.js';

const QUICK_ORDERS_KEY = 'vannaya_quick_orders';
const REVIEWS_API = '/api/reviews.php';

const formatPrice = (price) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(price);

const getBadgeClass = (label) => {
    const normalized = String(label).toLowerCase();
    if (normalized.includes('хит')) return 'badge-hit';
    if (normalized.includes('нов')) return 'badge-new';
    if (normalized.includes('скид')) return 'badge-sale';
    if (normalized.includes('прем')) return 'badge-premium';
    return '';
};

const renderStarsHtml = (rating, half = false) => {
    const full = Math.floor(rating);
    const stars = Array.from({ length: 5 }, (_, i) => {
        if (i < full) return '<i class="fas fa-star"></i>';
        if (half && i === full) return '<i class="fas fa-star-half-alt"></i>';
        return '<i class="far fa-star"></i>';
    });
    return stars.join('');
};

const isOutOfStock = (product) => {
    const stock = product?.stock;
    return stock === 0 || stock === false || stock === 'false' || stock === '0';
};

const formatReviewDate = (iso) => {
    try {
        return new Date(iso).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return '';
    }
};

const getAverageRating = (product, reviews) => {
    if (reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        return sum / reviews.length;
    }
    return Number(product.rating) || 0;
};

const parseJsonResponse = async (res) => {
    const text = await res.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: text.slice(0, 200) };
    }
};

const fetchApprovedReviews = async (productId) => {
    try {
        const res = await fetch(`${REVIEWS_API}?product_id=${encodeURIComponent(productId)}`);
        const data = await parseJsonResponse(res);
        if (!res.ok) {
            console.warn('Отзывы:', data.error || res.status);
            return [];
        }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('Отзывы:', err);
        return [];
    }
};

const submitReviewToApi = async (productId, payload) => {
    const res = await fetch(REVIEWS_API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product_id: Number(productId),
            author: payload.author,
            rating: payload.rating,
            text: payload.text
        })
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
        throw new Error(data.error || data.hint || 'Не удалось отправить отзыв');
    }
    return data;
};

const reviewCountLabel = (total) => {
    if (total === 1) return '1 отзыв';
    if (total >= 2 && total <= 4) return `${total} отзыва`;
    return `${total} отзывов`;
};

document.addEventListener('DOMContentLoaded', async () => {
    const showToast = initNotifications();

    window.toggleModal = (id, show) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.toggle('open', show);
    };

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-close-modal');
            if (id) window.toggleModal(id, false);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    const productSection = document.getElementById('productSection');
    const productDetails = document.getElementById('productDetails');
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
    const buyOneClickBtn = document.getElementById('buyOneClickBtn');

    const summaryScore = document.getElementById('summaryScore');
    const summaryStars = document.getElementById('summaryStars');
    const summaryCount = document.getElementById('summaryCount');
    const productReviewsList = document.getElementById('productReviewsList');
    const writeReviewBtn = document.getElementById('writeReviewBtn');
    const relatedProductsGrid = document.getElementById('relatedProductsGrid');

    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartBody = document.getElementById('cartItemsContainer');
    const cartFooter = document.querySelector('.cart-footer');

    let currentProduct = null;
    let selectedReviewRating = 5;

    await productService.load();
    cartService.subscribe(updateCartCounter);
    renderCart();

    bindAddToCart(
        document.getElementById('relatedProductsGrid'),
        (id) => productService.getById(id),
        (message) => showToast(message)
    );

    openCartBtn?.addEventListener('click', () => toggleCart(true));
    closeCartBtn?.addEventListener('click', () => toggleCart(false));
    cartOverlay?.addEventListener('click', () => toggleCart(false));

    cartBody?.addEventListener('click', (e) => {
        const btnIncrease = e.target.closest('.js-increase');
        const btnDecrease = e.target.closest('.js-decrease');
        if (btnIncrease) cartService.addItem(btnIncrease.dataset.id);
        else if (btnDecrease) cartService.removeItem(btnDecrease.dataset.id);
    });

    const initCheckout = () => {
        checkoutBtn?.addEventListener('click', () => {
            if (cartService.getCount() === 0) {
                showToast('Корзина пуста');
                return;
            }

            cartBody.innerHTML = `
                <div class="checkout-form">
                    <h3>Оформление</h3>
                    <form id="orderForm">
                        <div class="form-group">
                            <input type="text" name="fullName" autocomplete="name" class="form-control" placeholder="Ваше имя" required>
                        </div>
                        <div class="form-group">
                            <input type="tel" name="phone" inputmode="tel" autocomplete="tel" class="form-control" placeholder="Телефон" required>
                        </div>
                        <div class="form-group">
                            <input type="text" name="address" autocomplete="street-address" class="form-control" placeholder="Адрес доставки" required>
                        </div>
                        <button type="submit" class="btn btn-block btn-submit">Подтвердить заказ</button>
                        <button type="button" id="backToCart" class="btn btn-block btn-back">Назад в корзину</button>
                    </form>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';

            document.getElementById('orderForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button[type="submit"]');
                if (btn) btn.textContent = 'Обработка...';

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
                        if (cartFooter) cartFooter.style.display = 'block';
                        renderCart();
                    }, 3000);
                }, 1500);
            });

            document.getElementById('backToCart')?.addEventListener('click', () => {
                if (cartFooter) cartFooter.style.display = 'block';
                renderCart();
            });
        });
    };

    initCheckout();

    const escapeHtml = (str) => {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    const updateProductRatingDisplay = (product, reviews) => {
        const avg = getAverageRating(product, reviews);
        const total = reviews.length;

        if (avg > 0) {
            productRating.innerHTML = `
                <span class="rating-stars">${renderStarsHtml(avg)}</span>
                <span class="rating-val">${avg.toFixed(1)}</span>
                <a href="#productReviews" class="rating-count rating-count-link">(${total} ${total === 1 ? 'отзыв' : total >= 2 && total <= 4 ? 'отзыва' : 'отзывов'})</a>
            `;
        } else {
            productRating.innerHTML =
                '<span class="rating-count">Пока без оценок · <a href="#productReviews" class="rating-count-link">станьте первым</a></span>';
        }
    };

    const renderReviewsSection = (product, reviews) => {
        const avg = getAverageRating(product, reviews);
        const rounded = Math.round(avg * 10) / 10;
        const hasHalf = avg - Math.floor(avg) >= 0.25 && avg - Math.floor(avg) < 0.75;

        if (summaryScore) summaryScore.textContent = reviews.length > 0 ? rounded.toFixed(1) : '—';
        if (summaryStars) {
            summaryStars.innerHTML =
                reviews.length > 0
                    ? renderStarsHtml(avg, hasHalf)
                    : '<span class="reviews-no-rating">Пока без оценок</span>';
        }
        if (summaryCount) {
            summaryCount.textContent =
                reviews.length > 0 ? reviewCountLabel(reviews.length) : 'Станьте первым — оставьте отзыв';
        }

        if (!productReviewsList) return;

        if (reviews.length === 0) {
            productReviewsList.innerHTML = `
                <div class="reviews-empty">
                    <p>Пока нет опубликованных отзывов. Ваш отзыв появится после проверки модератором.</p>
                </div>
            `;
            return;
        }

        productReviewsList.innerHTML = reviews
            .map((review) => {
                const initial = (review.author || '?').charAt(0).toUpperCase();
                const dateSrc = review.created_at || review.date;
                return `
                    <article class="review-item">
                        <header class="review-header">
                            <div class="review-author-info">
                                <div class="review-avatar" aria-hidden="true">${initial}</div>
                                <div>
                                    <div class="review-author">${escapeHtml(review.author)}</div>
                                    <div class="review-date">${formatReviewDate(dateSrc)}</div>
                                </div>
                            </div>
                            <div class="review-item-stars rating-stars" aria-label="Оценка ${review.rating} из 5">
                                ${renderStarsHtml(Number(review.rating))}
                            </div>
                        </header>
                        <p class="review-text">${escapeHtml(review.text)}</p>
                    </article>
                `;
            })
            .join('');
    };

    const renderRelatedProducts = (product) => {
        if (!relatedProductsGrid) return;

        const all = productService.getAll();
        const sameCategory = all.filter((p) => p.id != product.id && p.category === product.category);
        const others = all.filter((p) => p.id != product.id && p.category !== product.category);
        const related = [...sameCategory, ...others].slice(0, 4);

        if (related.length === 0) {
            relatedProductsGrid.closest('.related-products')?.setAttribute('hidden', '');
            return;
        }

        renderProducts(related, relatedProductsGrid);
    };

    const setRatingSelector = (value) => {
        selectedReviewRating = value;
        const hidden = document.getElementById('selectedRating');
        if (hidden) hidden.value = String(value);

        document.querySelectorAll('#ratingSelector [data-rating]').forEach((star) => {
            const r = Number(star.getAttribute('data-rating'));
            star.className = r <= value ? 'fas fa-star' : 'fa-regular fa-star';
        });
    };

    const showNotFound = () => {
        productSection.hidden = true;
        if (productDetails) productDetails.hidden = true;
        productNotFound.hidden = false;
        document.title = 'Товар не найден | Ванная комната';
    };

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = productService.getById(id);

    if (!product) {
        showNotFound();
        return;
    }

    currentProduct = product;

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
        productBadge.hidden = false;
    } else {
        productBadge.hidden = true;
    }

    let approvedReviews = await fetchApprovedReviews(product.id);
    updateProductRatingDisplay(product, approvedReviews);

    const out = isOutOfStock(product);
    if (typeof product.stock === 'number' || product.stock != null) {
        productStock.textContent = out ? 'Нет в наличии' : `В наличии: ${product.stock} шт.`;
        productStock.className = `product-stock ${out ? 'out-stock' : 'in-stock'}`;
    }

    if (out) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Нет в наличии';
        buyOneClickBtn.disabled = true;
    }

    productPrice.textContent = formatPrice(product.price);
    if (product.oldPrice && product.oldPrice > product.price) {
        productOldPrice.textContent = formatPrice(product.oldPrice);
        productOldPrice.hidden = false;
    } else {
        productOldPrice.hidden = true;
    }

    productDesc.textContent = product.desc || 'Подробное описание будет добавлено в ближайшее время.';
    productSpecs.innerHTML = `
        <li><span>Категория</span><span>${escapeHtml(product.category)}</span></li>
        <li><span>Артикул</span><span>${escapeHtml(product.id)}</span></li>
        <li><span>Наличие</span><span>${out ? 'Нет в наличии' : typeof product.stock === 'number' ? `${product.stock} шт.` : 'Уточняйте'}</span></li>
        ${product.rating ? `<li><span>Рейтинг</span><span>${Number(product.rating).toFixed(1)} / 5</span></li>` : ''}
    `;

    renderReviewsSection(product, approvedReviews);
    renderRelatedProducts(product);

    qtyMinus?.addEventListener('click', () => {
        qtyInput.value = Math.max(1, (Number(qtyInput.value) || 1) - 1);
    });
    qtyPlus?.addEventListener('click', () => {
        const max = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 99;
        qtyInput.value = Math.min(max, (Number(qtyInput.value) || 1) + 1);
    });

    addToCartBtn?.addEventListener('click', () => {
        if (out) {
            showToast('Нет в наличии');
            return;
        }
        const qty = Math.max(1, Number(qtyInput.value) || 1);
        for (let i = 0; i < qty; i++) cartService.addItem(product.id);
        showToast();
    });

    buyOneClickBtn?.addEventListener('click', () => {
        if (out) return;
        document.getElementById('oneClickProductId').value = product.id;
        document.getElementById('oneClickName').value = '';
        document.getElementById('oneClickPhone').value = '';
        window.toggleModal('oneClickModal', true);
    });

    document.getElementById('oneClickForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('oneClickName').value.trim();
        const phone = document.getElementById('oneClickPhone').value.trim();
        const productId = document.getElementById('oneClickProductId').value;
        const qty = Math.max(1, Number(qtyInput.value) || 1);

        const orders = JSON.parse(localStorage.getItem(QUICK_ORDERS_KEY) || '[]');
        orders.push({
            type: 'one_click',
            productId,
            productName: product.name,
            qty,
            name,
            phone,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(QUICK_ORDERS_KEY, JSON.stringify(orders));

        window.toggleModal('oneClickModal', false);
        showToast('Заявка отправлена! Менеджер скоро свяжется с вами.');
        console.info('[1-click order]', orders[orders.length - 1]);
    });

    writeReviewBtn?.addEventListener('click', () => {
        document.getElementById('reviewAuthor').value = '';
        document.getElementById('reviewText').value = '';
        setRatingSelector(5);
        window.toggleModal('reviewModal', true);
    });

    document.querySelectorAll('#ratingSelector [data-rating]').forEach((star) => {
        const pick = () => setRatingSelector(Number(star.getAttribute('data-rating')));
        star.addEventListener('click', pick);
        star.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick();
            }
        });
    });

    const reviewFormError = document.getElementById('reviewFormError');

    const setReviewFormError = (message) => {
        if (!reviewFormError) return;
        if (message) {
            reviewFormError.textContent = message;
            reviewFormError.hidden = false;
        } else {
            reviewFormError.textContent = '';
            reviewFormError.hidden = true;
        }
    };

    document.getElementById('leaveReviewForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const author = document.getElementById('reviewAuthor').value.trim();
        const text = document.getElementById('reviewText').value.trim();
        const rating = Number(document.getElementById('selectedRating').value) || 5;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!author || !text) {
            setReviewFormError('Заполните имя и текст отзыва');
            return;
        }

        setReviewFormError('');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
        }

        try {
            const result = await submitReviewToApi(product.id, { author, text, rating });
            document.getElementById('leaveReviewForm')?.reset();
            setRatingSelector(5);
            setReviewFormError('');
            window.toggleModal('reviewModal', false);
            showToast(result.message || 'Отзыв отправлен на модерацию');
        } catch (err) {
            setReviewFormError(err.message || 'Не удалось отправить отзыв');
            showToast(err.message || 'Не удалось отправить отзыв');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить отзыв';
            }
        }
    });

});
