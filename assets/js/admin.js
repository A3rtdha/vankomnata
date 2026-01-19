import { productService } from './modules/productService.js';

// Делаем сервис доступным глобально для кнопок onclick в HTML
window.productService = productService;

document.addEventListener('DOMContentLoaded', async () => {
    const ADMIN_LOGIN = 'admin';
    const ADMIN_PASSWORD = 'admin123';
    const tableBody = document.getElementById('adminTableBody');
    const catList = document.getElementById('catList');
    const productsCount = document.getElementById('productsCount');
    const importStatus = document.getElementById('importStatus');
    const importErrors = document.getElementById('importErrors');
    const adminSearch = document.getElementById('adminSearch');
    const adminCategoryFilter = document.getElementById('adminCategoryFilter');

    const adminAuthOverlay = document.getElementById('adminAuthOverlay');
    const adminAuthForm = document.getElementById('adminAuthForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminPassword = document.getElementById('adminPassword');
    const adminAuthError = document.getElementById('adminAuthError');

    const openAddModalBtn = document.getElementById('openAddModal');
    const addModal = document.getElementById('addModal');
    const closeAddModal = document.getElementById('closeAddModal');
    const singleForm = document.getElementById('singleForm');
    const singleModeManual = document.getElementById('singleModeManual');
    const singleModeJson = document.getElementById('singleModeJson');
    const singleManualBlock = document.getElementById('singleManualBlock');
    const singleJsonBlock = document.getElementById('singleJsonBlock');
    const singleJsonInput = document.getElementById('singleJsonInput');
    const singleJsonImgFile = document.getElementById('singleJsonImgFile');
    const prodImgFile = document.getElementById('prodImgFile');
    const prodId = document.getElementById('prodId');
    const submitBtn = document.getElementById('submitBtn');
    const bulkJsonInput = document.getElementById('bulkJsonInput');
    const bulkImages = document.getElementById('bulkImages');
    const bulkImportBtn = document.getElementById('bulkImportBtn');
    const tabButtons = addModal.querySelectorAll('.tab-btn');
    const tabContents = addModal.querySelectorAll('.tab-content');

    let allProducts = [];
    let singleMode = 'manual';

    const applyTableFilters = (products) => {
        const query = (adminSearch.value || '').trim().toLowerCase();
        const category = adminCategoryFilter.value;
        return products.filter(p => {
            const matchName = !query || p.name.toLowerCase().includes(query);
            const matchCat = category === 'all' || p.category === category;
            return matchName && matchCat;
        });
    };

    async function renderTable() {
        await productService.load();
        allProducts = productService.getAll();
        const products = applyTableFilters(allProducts);

        productsCount.textContent = products.length;
        tableBody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.img}" class="img-preview" alt=""></td>
                <td>${p.name}</td>
                <td><span class="pill">${p.category}</span></td>
                <td class="price-cell">${p.price} ₽</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editProduct(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteProduct(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        const categories = [...new Set(allProducts.map(p => p.category))];
        catList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
        adminCategoryFilter.innerHTML = ['<option value="all">Все категории</option>', ...categories.map(c => `<option value="${c}">${c}</option>`)].join('');
    }

    const setStatus = (message, type) => {
        importStatus.textContent = message;
        importStatus.className = `status-line ${type || ''}`.trim();
    };

    const clearStatus = () => {
        importStatus.textContent = '';
        importErrors.textContent = '';
    };

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

    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload.php', {
            method: 'POST',
            body: formData
        });
        const text = await res.text();
        if (!text.trim()) throw new Error('Пустой ответ от сервера');
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            throw new Error('Некорректный ответ сервера');
        }
        if (!res.ok || !data.url) {
            throw new Error(data.error || 'Ошибка загрузки');
        }
        return data.url;
    };

    const uploadImages = async (files) => {
        const map = new Map();
        const list = Array.from(files || []);
        for (const file of list) {
            const url = await uploadImage(file);
            map.set(file.name, url);
        }
        return map;
    };

    const setSingleMode = (mode) => {
        singleMode = mode;
        singleManualBlock.style.display = mode === 'manual' ? 'block' : 'none';
        singleJsonBlock.style.display = mode === 'json' ? 'block' : 'none';
    };

    const setTab = (tab) => {
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        tabContents.forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    };

    const resetSingleForm = () => {
        singleForm.reset();
        prodId.value = '';
        submitBtn.textContent = 'Добавить товар';
        singleJsonInput.value = '';
        if (singleJsonImgFile) singleJsonImgFile.value = '';
    };

    const buildManualProductData = () => {
        const productData = {
            name: document.getElementById('prodName').value,
            category: document.getElementById('prodCategory').value,
            price: Number(document.getElementById('prodPrice').value),
            oldPrice: document.getElementById('prodOldPrice').value ? Number(document.getElementById('prodOldPrice').value) : undefined,
            badge: document.getElementById('prodBadge').value || undefined,
            desc: document.getElementById('prodDesc').value || undefined,
            rating: document.getElementById('prodRating').value ? Number(document.getElementById('prodRating').value) : undefined,
            reviews: document.getElementById('prodReviews').value ? Number(document.getElementById('prodReviews').value) : undefined,
            stock: document.getElementById('prodStock').value ? Number(document.getElementById('prodStock').value) : undefined,
            img: document.getElementById('prodImg').value
        };
        Object.keys(productData).forEach((key) => {
            if (productData[key] === undefined) delete productData[key];
        });
        return productData;
    };

    window.editProduct = (id) => {
        const p = productService.getById(id);
        if (!p) return;
        openModal();
        setTab('single');
        setSingleMode('manual');
        prodId.value = p.id;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodCategory').value = p.category;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodOldPrice').value = p.oldPrice ?? '';
        document.getElementById('prodBadge').value = p.badge ?? '';
        document.getElementById('prodDesc').value = p.desc ?? '';
        document.getElementById('prodRating').value = p.rating ?? '';
        document.getElementById('prodReviews').value = p.reviews ?? '';
        document.getElementById('prodStock').value = p.stock ?? '';
        document.getElementById('prodImg').value = p.img;
        submitBtn.textContent = 'Сохранить';
    };

    window.deleteProduct = async (id) => {
        if (confirm('Точно удалить этот товар?')) {
            await productService.delete(id);
            await renderTable();
        }
    };

    singleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            clearStatus();
            const id = prodId.value;
            let productData;
            if (singleMode === 'json') {
                const raw = normalizeJsonInput(singleJsonInput.value || '');
                if (!raw) {
                    setStatus('Пустой JSON', 'error');
                    return;
                }
                productData = JSON.parse(raw);
                const file = singleJsonImgFile.files?.[0];
                if (file) {
                    setStatus('Загрузка изображения...', '');
                    productData.img = await uploadImage(file);
                }
            } else {
                productData = buildManualProductData();
                const file = prodImgFile.files?.[0];
                if (file) {
                    setStatus('Загрузка изображения...', '');
                    productData.img = await uploadImage(file);
                }
            }

            if (id) {
                await productService.update(id, productData);
                setStatus('Товар обновлен', 'success');
            } else {
                await productService.add(productData);
                setStatus('Товар добавлен', 'success');
            }
            await renderTable();
            closeModal();
        } catch (err) {
            setStatus(`Ошибка: ${err.message}`, 'error');
        }
    });

    bulkImportBtn.addEventListener('click', async () => {
        try {
            clearStatus();
            const raw = normalizeJsonInput(bulkJsonInput.value || '');
            if (!raw) {
                setStatus('Пустой JSON', 'error');
                return;
            }
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            if (!items.length) {
                setStatus('Пустой JSON', 'error');
                return;
            }
            const fileMap = await uploadImages(bulkImages.files);
            const errors = [];
            const normalized = items.map((item, idx) => {
                const imageKey = item.imageFile || item.img;
                if (imageKey && fileMap.has(imageKey)) {
                    item.img = fileMap.get(imageKey);
                }
                if (!item.name || !item.category || !item.price) {
                    errors.push(`Строка ${idx + 1}: нет обязательных полей (name, category, price)`);
                }
                return item;
            });
            if (errors.length) {
                importErrors.textContent = errors.slice(0, 5).join(' | ');
                setStatus('Исправь ошибки в JSON', 'error');
                return;
            }
            await productService.importBulk(normalized);
            setStatus('Bulk импорт успешен', 'success');
            bulkJsonInput.value = '';
            bulkImages.value = '';
            await renderTable();
            closeModal();
        } catch (err) {
            setStatus(`Ошибка: ${err.message}`, 'error');
        }
    });

    const openModal = () => {
        addModal.style.display = 'flex';
        clearStatus();
    };

    const closeModal = () => {
        addModal.style.display = 'none';
        resetSingleForm();
        clearStatus();
    };

    singleModeManual.addEventListener('click', () => setSingleMode('manual'));
    singleModeJson.addEventListener('click', () => setSingleMode('json'));
    tabButtons.forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
    openAddModalBtn.addEventListener('click', openModal);
    closeAddModal.addEventListener('click', closeModal);

    adminSearch.addEventListener('input', async () => {
        await renderTable();
    });
    adminCategoryFilter.addEventListener('change', async () => {
        await renderTable();
    });

    const checkAuth = () => {
        const isAuthed = sessionStorage.getItem('admin_authed') === 'true';
        adminAuthOverlay.style.display = isAuthed ? 'none' : 'flex';
    };

    adminAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminLogin.value === ADMIN_LOGIN && adminPassword.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_authed', 'true');
            adminAuthError.textContent = '';
            adminAuthOverlay.style.display = 'none';
            adminLogin.value = '';
            adminPassword.value = '';
        } else {
            adminAuthError.textContent = 'Неверный пароль';
        }
    });

    checkAuth();
    setSingleMode('manual');
    setTab('single');
    await renderTable();
});