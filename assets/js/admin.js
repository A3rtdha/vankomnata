import { productService } from './modules/productService.js';

window.productService = productService;

const AUTH_URL = '/api/auth.php';
const ADMIN_REVIEWS_URL = '/api/admin_reviews.php';

const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const isOutOfStock = (product) => {
    const stock = product.stock;
    return stock === 0 || stock === false || stock === 'false' || stock === '0';
};

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('productsTableBody');
    const noProductsState = document.getElementById('noProductsState');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const catList = document.getElementById('catList');

    const adminAuthOverlay = document.getElementById('adminAuthOverlay');
    const adminAuthForm = document.getElementById('adminAuthForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminPassword = document.getElementById('adminPassword');
    const adminAuthError = document.getElementById('adminAuthError');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const adminUserDisplayName = document.getElementById('adminUserDisplayName');

    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const openBulkModalBtn = document.getElementById('openBulkModalBtn');
    const productModal = document.getElementById('productModal');
    const bulkModal = document.getElementById('bulkModal');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const closeBulkModalBtn = document.getElementById('closeBulkModalBtn');
    const cancelProductFormBtn = document.getElementById('cancelProductFormBtn');
    const cancelBulkBtn = document.getElementById('cancelBulkBtn');
    const productForm = document.getElementById('productForm');
    const modalTitleText = document.getElementById('modalTitleText');
    const productIdHidden = document.getElementById('productIdHidden');
    const productIdDisplayWrap = document.getElementById('productIdDisplayWrap');
    const productIdDisplay = document.getElementById('productIdDisplay');
    const productImageFile = document.getElementById('productImageFile');
    const productImageUrl = document.getElementById('productImageUrl');
    const productImagePreview = document.getElementById('productImagePreview');
    const productImagePreviewPlaceholder = document.getElementById('productImagePreviewPlaceholder');
    const removePreviewImgBtn = document.getElementById('removePreviewImgBtn');
    const bulkJsonData = document.getElementById('bulkJsonData');
    const copyJsonBtn = document.getElementById('copyJsonBtn');
    const saveBulkBtn = document.getElementById('saveBulkBtn');

    const reviewsTableBody = document.getElementById('reviewsTableBody');
    const noReviewsState = document.getElementById('noReviewsState');
    const statPendingReviews = document.getElementById('statPendingReviews');
    const refreshReviewsBtn = document.getElementById('refreshReviewsBtn');
    const reviewsModerationSection = document.getElementById('reviewsModerationSection');

    let allProducts = [];
    let isAuthenticated = false;

    let currentPage = 1;
    const itemsPerPage = 15;

    const findProductById = (id) =>
        allProducts.find((p) => p.id == id) ?? productService.getById(id);

    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className =
            'pointer-events-auto flex items-center gap-3 py-3 px-5 rounded-xl shadow-lg border text-sm transition-all duration-300 transform translate-y-5 opacity-0';

        if (type === 'success') {
            toast.className += ' bg-emerald-50 border-emerald-100 text-emerald-800';
            toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i><span class="font-medium">${escapeHtml(message)}</span>`;
        } else {
            toast.className += ' bg-rose-50 border-rose-100 text-rose-800';
            toast.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-500 text-lg"></i><span class="font-medium">${escapeHtml(message)}</span>`;
        }

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-5', 'opacity-0'));

        setTimeout(() => {
            toast.classList.add('translate-y-5', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    const setAuthError = (message) => {
        if (!adminAuthError) return;
        if (message) {
            adminAuthError.textContent = message;
            adminAuthError.classList.remove('hidden');
        } else {
            adminAuthError.textContent = '';
            adminAuthError.classList.add('hidden');
        }
    };

    const updateStats = (products) => {
        const statTotal = document.getElementById('statTotalProducts');
        const statCats = document.getElementById('statTotalCategories');
        const statOut = document.getElementById('statOutOfStock');
        if (statTotal) statTotal.textContent = products.length;
        if (statCats) statCats.textContent = new Set(products.map((p) => p.category).filter(Boolean)).size;
        if (statOut) statOut.textContent = products.filter(isOutOfStock).length;
    };

    const applyTableFilters = (products) => {
        const query = (searchInput?.value || '').trim().toLowerCase();
        const category = categoryFilter?.value || 'all';
        return products.filter((p) => {
            const matchQuery =
                !query ||
                p.name.toLowerCase().includes(query) ||
                String(p.id).includes(query);
            const matchCat = category === 'all' || p.category === category;
            return matchQuery && matchCat;
        });
    };

    const renderStockBadge = (product) => {
        if (isOutOfStock(product)) {
            return `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Нет в наличии
                </span>`;
        }
        const qty = product.stock != null && product.stock !== '' ? ` (${product.stock} шт.)` : '';
        return `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                В наличии${escapeHtml(qty)}
            </span>`;
    };

    const renderTableRow = (product) => {
        const productId = escapeHtml(String(product.id ?? ''));
        const img = escapeHtml(product.img || '');
        const name = escapeHtml(product.name);
        const category = escapeHtml(product.category);
        const price = Number(product.price || 0).toLocaleString('ru-RU');
        const oldPrice = product.oldPrice
            ? `<div class="text-xs text-slate-400 line-through">${Number(product.oldPrice).toLocaleString('ru-RU')} ₽</div>`
            : '';
        const badge = product.badge
            ? `<span class="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase">${escapeHtml(product.badge)}</span>`
            : '';

        return `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="py-4 px-6">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center">
                        <img src="${img}" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'">
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-semibold text-slate-900">${name}${badge}</div>
                    <div class="text-xs text-slate-400">ID: ${escapeHtml(product.id)}</div>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-medium rounded-full">${category}</span>
                </td>
                <td class="py-4 px-6">
                    <div class="text-sm font-bold text-slate-900">${price} ₽</div>
                    ${oldPrice}
                </td>
                <td class="py-4 px-6">${renderStockBadge(product)}</td>
                <td class="py-4 px-6 text-right space-x-1 whitespace-nowrap">
                    <button type="button" data-action="edit" data-product-id="${productId}" class="js-table-action p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="Редактировать">
                        <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                    </button>
                    <button type="button" data-action="delete" data-product-id="${productId}" class="js-table-action p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Удалить">
                        <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                    </button>
                </td>
            </tr>`;
    };

    tableBody?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || !tableBody.contains(btn)) return;

        const id = btn.getAttribute('data-product-id');
        const action = btn.getAttribute('data-action');
        if (id == null || id === '') return;

        if (action === 'edit') {
            window.editProduct(id);
        } else if (action === 'delete') {
            window.deleteProduct(id);
        }
    });

    function renderPagination(totalItems, totalPages) {
        let container = document.getElementById('paginationContainer');
        if (!container) {
            const tableSection = document.getElementById('productsTableSection');
            if (!tableSection) return;
            container = document.createElement('div');
            container.id = 'paginationContainer';
            container.className =
                'flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-500';
            tableSection.appendChild(container);
        }

        if (totalPages <= 1) {
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');

        const from = (currentPage - 1) * itemsPerPage + 1;
        const to = Math.min(currentPage * itemsPerPage, totalItems);

        let html = `
            <div>
                Показано <span class="font-semibold text-slate-900">${from}–${to}</span> из
                <span class="font-semibold text-slate-900">${totalItems}</span> товаров
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-xs">
                    Назад
                </button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 6 && Math.abs(currentPage - i) > 2 && i !== 1 && i !== totalPages) {
                if (i === 2 || i === totalPages - 1) {
                    html += '<span class="px-2 text-slate-400">…</span>';
                }
                continue;
            }
            html += `
                <button type="button" class="page-num-btn px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    currentPage === i
                        ? 'bg-sky-600 border-sky-600 text-white font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }" data-page="${i}">${i}</button>`;
        }

        html += `
                <button type="button" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-xs">
                    Вперёд
                </button>
            </div>`;

        container.innerHTML = html;

        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        container.querySelectorAll('.page-num-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                currentPage = Number(e.currentTarget.getAttribute('data-page'));
                renderTable();
            });
        });
    }

    async function renderTable() {
        if (!isAuthenticated) return;

        productService.loaded = false;
        await productService.load();
        allProducts = productService.getAll();
        const filteredProducts = applyTableFilters(allProducts);

        updateStats(allProducts);

        const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))].sort();
        if (catList) {
            catList.innerHTML = categories
                .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
                .join('');
        }
        if (categoryFilter) {
            const current = categoryFilter.value;
            categoryFilter.innerHTML = [
                '<option value="all">Все категории</option>',
                ...categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
            ].join('');
            if ([...categoryFilter.options].some((o) => o.value === current)) {
                categoryFilter.value = current;
            }
        }

        const totalItems = filteredProducts.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

        if (tableBody) {
            tableBody.innerHTML = paginatedProducts.map(renderTableRow).join('');
        }
        if (noProductsState) {
            noProductsState.classList.toggle('hidden', totalItems > 0);
        }

        renderPagination(totalItems, totalPages);
    }

    const normalizeJsonInput = (raw) => {
        const trimmed = raw.trim().replace(/^\uFEFF/, '');
        if (!trimmed) return '';
        if (trimmed.startsWith('export')) {
            const start = trimmed.indexOf('[');
            const end = trimmed.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                return trimmed.slice(start, end + 1);
            }
        }
        return trimmed;
    };

    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    const uploadImage = async (file) => {
        if (file.size > MAX_IMAGE_BYTES) {
            throw new Error('Файл слишком большой. Максимум 10 МБ.');
        }

        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload.php', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        const text = await res.text();
        if (!text.trim()) throw new Error('Пустой ответ от сервера');
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error('Некорректный ответ сервера');
        }
        if (!res.ok || !data.url) {
            throw new Error(data.error || 'Ошибка загрузки');
        }
        return data.url;
    };

    const updateImagePreview = (url) => {
        const hasUrl = Boolean(url && url.trim());
        if (productImagePreview) {
            productImagePreview.src = hasUrl ? url : '';
            productImagePreview.classList.toggle('hidden', !hasUrl);
        }
        if (productImagePreviewPlaceholder) {
            productImagePreviewPlaceholder.classList.toggle('hidden', hasUrl);
        }
        if (removePreviewImgBtn) {
            removePreviewImgBtn.classList.toggle('hidden', !hasUrl);
        }
    };

    const getStockRadio = () => document.querySelector('input[name="productStock"]:checked')?.value || 'in';

    const buildProductData = () => {
        const inStock = getStockRadio() === 'in';
        let stockQty = document.getElementById('productStockQty').value;
        stockQty = stockQty !== '' ? Number(stockQty) : undefined;

        let stock;
        if (!inStock) {
            stock = 0;
        } else if (stockQty !== undefined && !Number.isNaN(stockQty)) {
            stock = Math.max(1, stockQty);
        } else if (stockQty === 0) {
            stock = 0;
        } else {
            stock = stockQty ?? 1;
        }

        const productData = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value.trim(),
            price: Number(document.getElementById('productPrice').value),
            oldPrice: document.getElementById('productOldPrice').value
                ? Number(document.getElementById('productOldPrice').value)
                : undefined,
            badge: document.getElementById('productBadge').value.trim() || undefined,
            desc: document.getElementById('productDesc').value.trim() || undefined,
            rating: document.getElementById('productRating').value
                ? Number(document.getElementById('productRating').value)
                : undefined,
            reviews: document.getElementById('productReviews').value
                ? Number(document.getElementById('productReviews').value)
                : undefined,
            stock,
            img: productImageUrl.value.trim()
        };

        Object.keys(productData).forEach((key) => {
            if (productData[key] === undefined) delete productData[key];
        });
        return productData;
    };

    const resetProductForm = () => {
        productForm.reset();
        productIdHidden.value = '';
        if (productIdDisplayWrap) productIdDisplayWrap.classList.add('hidden');
        if (modalTitleText) modalTitleText.textContent = 'Добавление товара';
        document.querySelector('input[name="productStock"][value="in"]')?.click();
        if (productImageFile) productImageFile.value = '';
        updateImagePreview('');
    };

    const openProductModal = () => {
        productModal?.classList.remove('hidden');
        productModal?.classList.add('flex');
    };

    const closeProductModal = () => {
        productModal?.classList.add('hidden');
        productModal?.classList.remove('flex');
        resetProductForm();
    };

    const openBulkModal = async () => {
        productService.loaded = false;
        await productService.load();
        bulkJsonData.value = productService.exportToJSON();
        bulkModal?.classList.remove('hidden');
        bulkModal?.classList.add('flex');
    };

    const closeBulkModal = () => {
        bulkModal?.classList.add('hidden');
        bulkModal?.classList.remove('flex');
    };

    window.editProduct = (id) => {
        const p = findProductById(id);
        if (!p) {
            console.error('Товар не найден для редактирования, id:', id);
            showToast('Товар не найден. Обновите страницу.', 'error');
            return;
        }

        resetProductForm();
        productIdHidden.value = p.id;
        if (productIdDisplayWrap) productIdDisplayWrap.classList.remove('hidden');
        if (productIdDisplay) productIdDisplay.value = p.id;
        if (modalTitleText) modalTitleText.textContent = 'Редактирование товара';

        document.getElementById('productName').value = p.name || '';
        document.getElementById('productCategory').value = p.category || '';
        document.getElementById('productPrice').value = p.price ?? '';
        document.getElementById('productOldPrice').value = p.oldPrice ?? '';
        document.getElementById('productBadge').value = p.badge ?? '';
        document.getElementById('productDesc').value = p.desc ?? '';
        document.getElementById('productRating').value = p.rating ?? '';
        document.getElementById('productReviews').value = p.reviews ?? '';
        document.getElementById('productStockQty').value =
            p.stock != null && !isOutOfStock(p) ? p.stock : '';

        const stockRadio = isOutOfStock(p) ? 'out' : 'in';
        document.querySelector(`input[name="productStock"][value="${stockRadio}"]`)?.click();

        productImageUrl.value = p.img || '';
        updateImagePreview(p.img);
        openProductModal();
    };

    window.deleteProduct = async (id) => {
        const p = findProductById(id);
        if (!p) {
            console.error('Товар не найден для удаления, id:', id);
            showToast('Товар не найден. Обновите страницу.', 'error');
            return;
        }
        if (!confirm(`Удалить товар «${p.name}» из каталога?`)) return;
        try {
            await productService.delete(p.id);
            showToast('Товар удалён', 'success');
            await renderTable();
        } catch (err) {
            showToast(err.message || 'Ошибка удаления', 'error');
        }
    };

    productForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const id = productIdHidden.value;
            const productData = buildProductData();

            if (!productData.name || !productData.category || !productData.price) {
                showToast('Заполните обязательные поля', 'error');
                return;
            }

            const file = productImageFile?.files?.[0];
            if (file) {
                productData.img = await uploadImage(file);
                productImageUrl.value = productData.img;
                updateImagePreview(productData.img);
            }

            if (!productData.img) {
                showToast('Укажите URL изображения или загрузите файл', 'error');
                return;
            }

            if (id) {
                const existing = findProductById(id);
                if (
                    getStockRadio() === 'in' &&
                    document.getElementById('productStockQty').value === '' &&
                    existing?.stock > 0
                ) {
                    productData.stock = existing.stock;
                }
                await productService.update(id, productData);
                showToast('Товар обновлён', 'success');
            } else {
                await productService.add(productData);
                showToast('Товар добавлен', 'success');
            }

            await renderTable();
            closeProductModal();
        } catch (err) {
            showToast(err.message || 'Ошибка сохранения', 'error');
        }
    });

    saveBulkBtn?.addEventListener('click', async () => {
        try {
            const raw = normalizeJsonInput(bulkJsonData.value || '');
            if (!raw) {
                showToast('Вставьте JSON-массив товаров', 'error');
                return;
            }
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            const errors = [];
            const normalized = items.map((item, idx) => {
                const copy = { ...item };
                delete copy.id;
                if (!copy.name || !copy.category || copy.price == null || !copy.img) {
                    errors.push(`Позиция ${idx + 1}: нужны name, category, price, img`);
                }
                return copy;
            });
            if (errors.length) {
                showToast(errors[0], 'error');
                return;
            }
            await productService.importBulk(normalized);
            showToast(`Импортировано: ${normalized.length} поз.`, 'success');
            closeBulkModal();
            await renderTable();
        } catch (err) {
            showToast(err.message || 'Ошибка импорта', 'error');
        }
    });

    copyJsonBtn?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(bulkJsonData.value);
            showToast('JSON скопирован в буфер', 'success');
        } catch {
            bulkJsonData.select();
            document.execCommand('copy');
            showToast('JSON скопирован', 'success');
        }
    });

    productImageFile?.addEventListener('change', () => {
        const file = productImageFile.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        updateImagePreview(objectUrl);
    });

    productImageUrl?.addEventListener('input', () => {
        updateImagePreview(productImageUrl.value.trim());
    });

    removePreviewImgBtn?.addEventListener('click', () => {
        productImageUrl.value = '';
        if (productImageFile) productImageFile.value = '';
        updateImagePreview('');
    });

    openAddModalBtn?.addEventListener('click', () => {
        resetProductForm();
        openProductModal();
    });

    openBulkModalBtn?.addEventListener('click', openBulkModal);
    closeProductModalBtn?.addEventListener('click', closeProductModal);
    cancelProductFormBtn?.addEventListener('click', closeProductModal);
    closeBulkModalBtn?.addEventListener('click', closeBulkModal);
    cancelBulkBtn?.addEventListener('click', closeBulkModal);

    productModal?.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
    });
    bulkModal?.addEventListener('click', (e) => {
        if (e.target === bulkModal) closeBulkModal();
    });

    searchInput?.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });
    categoryFilter?.addEventListener('change', () => {
        currentPage = 1;
        renderTable();
    });

    const renderReviewStars = (rating) => {
        const n = Math.max(0, Math.min(5, Number(rating) || 0));
        return Array.from({ length: 5 }, (_, i) =>
            i < n
                ? '<i class="fas fa-star text-amber-400"></i>'
                : '<i class="far fa-star text-slate-300"></i>'
        ).join('');
    };

    const renderReviewsTable = (reviews) => {
        const pending = reviews.filter((r) => !r.is_approved).length;
        if (statPendingReviews) statPendingReviews.textContent = pending;

        if (!reviewsTableBody) return;

        if (reviews.length === 0) {
            reviewsTableBody.innerHTML = '';
            noReviewsState?.classList.remove('hidden');
            return;
        }

        noReviewsState?.classList.add('hidden');

        reviewsTableBody.innerHTML = reviews
            .map((r) => {
                const status = r.is_approved
                    ? '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Опубликован</span>'
                    : '<span class="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">На модерации</span>';
                const textPreview =
                    r.text.length > 100 ? `${escapeHtml(r.text.slice(0, 100))}…` : escapeHtml(r.text);
                const approveBtn = !r.is_approved
                    ? `<button type="button" data-review-action="approve" data-review-id="${r.id}" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Одобрить"><i class="fa-solid fa-check"></i></button>`
                    : '';

                return `
                    <tr class="hover:bg-slate-50/50 ${r.is_approved ? '' : 'bg-amber-50/30'}">
                        <td class="py-3 px-6">
                            <div class="font-semibold text-slate-900 text-sm">${escapeHtml(r.product_name)}</div>
                            <div class="text-xs text-slate-400">ID товара: ${r.product_id}</div>
                        </td>
                        <td class="py-3 px-6 text-sm text-slate-700">${escapeHtml(r.author)}</td>
                        <td class="py-3 px-6 text-sm">${renderReviewStars(r.rating)}</td>
                        <td class="py-3 px-6 text-sm text-slate-600 max-w-xs">${textPreview}</td>
                        <td class="py-3 px-6">${status}</td>
                        <td class="py-3 px-6 text-right whitespace-nowrap space-x-1">
                            ${approveBtn}
                            <button type="button" data-review-action="delete" data-review-id="${r.id}" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Удалить">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            })
            .join('');
    };

    const loadAdminReviews = async () => {
        if (!isAuthenticated) return;

        try {
            const res = await fetch(ADMIN_REVIEWS_URL, { credentials: 'same-origin' });
            if (res.status === 401) return;
            if (!res.ok) throw new Error('Не удалось загрузить отзывы');
            const reviews = await res.json();
            renderReviewsTable(Array.isArray(reviews) ? reviews : []);
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Ошибка загрузки отзывов', 'error');
        }
    };

    reviewsTableBody?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-review-action]');
        if (!btn) return;

        const reviewId = btn.getAttribute('data-review-id');
        const action = btn.getAttribute('data-review-action');
        if (!reviewId) return;

        if (action === 'delete' && !confirm('Удалить этот отзыв?')) return;

        try {
            let res;
            if (action === 'approve') {
                res = await fetch(`${ADMIN_REVIEWS_URL}?action=approve&id=${encodeURIComponent(reviewId)}`, {
                    method: 'POST',
                    credentials: 'same-origin'
                });
            } else {
                res = await fetch(`${ADMIN_REVIEWS_URL}?id=${encodeURIComponent(reviewId)}`, {
                    method: 'DELETE',
                    credentials: 'same-origin'
                });
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Ошибка операции');

            showToast(data.message || 'Готово', 'success');
            await loadAdminReviews();
            productService.loaded = false;
        } catch (err) {
            showToast(err.message || 'Ошибка', 'error');
        }
    });

    refreshReviewsBtn?.addEventListener('click', () => loadAdminReviews());

    const setAdminUiAuthed = (isAuthed, userName) => {
        isAuthenticated = isAuthed;
        adminAuthOverlay.style.display = isAuthed ? 'none' : 'flex';
        if (adminLogoutBtn) adminLogoutBtn.style.visibility = isAuthed ? 'visible' : 'hidden';
        if (openAddModalBtn) openAddModalBtn.disabled = !isAuthed;
        if (openBulkModalBtn) openBulkModalBtn.disabled = !isAuthed;
        if (reviewsModerationSection) {
            if (isAuthed) reviewsModerationSection.removeAttribute('hidden');
            else reviewsModerationSection.setAttribute('hidden', '');
        }
        if (adminUserDisplayName && userName) {
            adminUserDisplayName.textContent = userName;
        }
        if (!isAuthed && statPendingReviews) statPendingReviews.textContent = '0';
    };

    const checkAuth = async () => {
        try {
            const res = await fetch(AUTH_URL, { credentials: 'same-origin' });
            const data = await res.json();

            if (data.authenticated) {
                setAdminUiAuthed(true, data.user || 'admin');
                await renderTable();
                await loadAdminReviews();
            } else {
                setAdminUiAuthed(false);
            }
        } catch (err) {
            console.error('Ошибка проверки авторизации:', err);
            setAdminUiAuthed(false);
        }
    };

    adminAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setAuthError('');

        try {
            const res = await fetch(AUTH_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: adminLogin.value.trim(),
                    password: adminPassword.value
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                adminLogin.value = '';
                adminPassword.value = '';
                setAdminUiAuthed(true, data.user || 'admin');
                showToast('Добро пожаловать в панель', 'success');
                await renderTable();
                await loadAdminReviews();
            } else {
                setAuthError(data.error || 'Ошибка входа');
            }
        } catch (err) {
            console.error('Ошибка запроса авторизации:', err);
            setAuthError('Не удалось связаться с сервером');
        }
    });

    adminLogoutBtn?.addEventListener('click', async () => {
        try {
            const res = await fetch(`${AUTH_URL}?action=logout`, {
                method: 'POST',
                credentials: 'same-origin'
            });
            if (res.ok) window.location.reload();
        } catch (err) {
            console.error('Ошибка при выходе:', err);
        }
    });

    await checkAuth();
});
