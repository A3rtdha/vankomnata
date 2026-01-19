import { productService } from './modules/productService.js';

// Делаем сервис доступным глобально для кнопок onclick в HTML
window.productService = productService;

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('adminTableBody');
    const form = document.getElementById('productForm');
    const catList = document.getElementById('catList');
    const jsonOutput = document.getElementById('jsonOutput');
    const jsonImport = document.getElementById('jsonImport');
    const importBtn = document.getElementById('importBtn');

    // --- Рендеринг таблицы ---
    async function renderTable() {
        await productService.load();
        const products = productService.getAll();

        tableBody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.img}" class="img-preview" alt=""></td>
                <td>${p.name}</td>
                <td><span style="background:#eee; padding:2px 8px; border-radius:10px; font-size:0.8rem">${p.category}</span></td>
                <td>${p.price} ₽</td>
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

        // Обновляем список категорий для подсказок
        const categories = [...new Set(products.map(p => p.category))];
        catList.innerHTML = categories.map(c => `<option value="${c}">`).join('');

        // Обновляем поле экспорта
        jsonOutput.value = productService.exportToJSON();
    }

    // --- Обработка формы ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('prodId').value;
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

        if (id) {
            // Редактирование
            await productService.update(id, productData);
        } else {
            // Создание
            await productService.add(productData);
        }

        resetForm();
        await renderTable();
    });

    // --- Хелперы ---
    window.editProduct = (id) => {
        const p = productService.getById(id);
        if (!p) return;

        document.getElementById('prodId').value = p.id;
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

        document.getElementById('formTitle').innerText = 'Редактирование товара';
        document.getElementById('submitBtn').innerText = 'Сохранить';
        document.getElementById('submitBtn').style.background = '#3498db';
        document.getElementById('cancelBtn').style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteProduct = async (id) => {
        if(confirm('Точно удалить этот товар?')) {
            await productService.delete(id);
            await renderTable();
        }
    };

    function resetForm() {
        form.reset();
        document.getElementById('prodId').value = '';
        document.getElementById('formTitle').innerText = 'Новый товар';
        document.getElementById('submitBtn').innerText = 'Добавить товар';
        document.getElementById('submitBtn').style.background = '';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    importBtn.addEventListener('click', async () => {
        try {
            const parsed = JSON.parse(jsonImport.value || '[]');
            if (!Array.isArray(parsed)) {
                alert('Ожидается массив JSON');
                return;
            }
            await productService.importBulk(parsed);
            jsonImport.value = '';
            await renderTable();
        } catch (err) {
            alert('Неверный JSON');
        }
    });

    // Первичный рендер
    await renderTable();
});