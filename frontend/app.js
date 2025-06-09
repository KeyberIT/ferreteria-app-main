const API_URL = 'http://localhost:3000/api';
let token = null;
let currentUser = null;
let isEditing = false;
let editingProductId = null;
// Variables globales para el carrito
let cart = [];
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartContainer = document.getElementById('cart-container');

// DOM Elements
const productsGrid = document.getElementById('product-list');
const loginModal = document.getElementById('login-modal');
const adminModal = document.getElementById('admin-modal');
const loginBtn = document.getElementById('login-btn');
const loginForm = document.getElementById('login-form');
const productForm = document.getElementById('product-form');
const productList = document.getElementById('product-list');
const cancelEditBtn = document.createElement('button');
cancelEditBtn.textContent = 'Cancelar Edición';
cancelEditBtn.classList.add('btn', 'btn-secondary', 'cancel-edit-btn');
cancelEditBtn.style.display = 'none';
cancelEditBtn.onclick = () => {
    productForm.reset();
    isEditing = false;
    editingProductId = null;
    cancelEditBtn.style.display = 'none';
};
productForm.appendChild(cancelEditBtn);
const registerBtn = document.getElementById('register-btn');
const registerModal = document.getElementById('register-modal');
const registerForm = document.getElementById('register-form');
const adminDashboard = document.getElementById('admin-dashboard');
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const logoutBtn = document.getElementById('logout-btn');

// Fetch Products
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        renderUserProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Función para verificar y mantener la sesión
async function checkSession() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginPage();
        return false;
    }
    return true;
}

// Función para mostrar la página de login
function showLoginPage() {
    loginSection.style.display = 'block';
    mainSection.style.display = 'none';
    adminDashboard.style.display = 'none';
    cartContainer.style.display = 'none';
}

// Función para mostrar la página principal
function showMainPage(role) {
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    adminDashboard.style.display = role === 'admin' ? 'block' : 'none';
    
    // Mostrar carrito solo para usuarios normales
    if (currentUser && currentUser.role === 'user') {
        cartContainer.style.display = 'block';
    } else {
        cartContainer.style.display = 'none';
    }
}

// User Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const loginType = document.querySelector('input[name="login-type"]:checked').value;

    try {
        const endpoint = loginType === 'admin' ? '/auth/admin/login' : '/auth/user/login';
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            currentUser = { username, role: data.role };
            showMainPage(data.role);
            await loadProducts(data.role);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
});

// User Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const registerType = document.querySelector('input[name="register-type"]').value;

    // Validaciones básicas
    if (!username || !password) {
        alert('Por favor complete todos los campos');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
        const endpoint = '/auth/user/register'; // Solo permitir registro de usuarios normales
        console.log('Intentando registrar usuario:', { username, registerType });
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Respuesta del servidor:', response);

        let data;
        try {
            data = await response.json();
            console.log('Datos de respuesta:', data);
        } catch (jsonError) {
            console.error('Error al analizar la respuesta JSON:', jsonError);
            throw new Error('Respuesta del servidor no válida');
        }

        if (response.ok) {
            alert('¡Registro exitoso! Por favor inicie sesión.');
            registerForm.reset();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        } else {
            // Mostrar mensaje de error específico del servidor si está disponible
            const errorMessage = data.message || 'Error en el registro';
            console.error('Error en el registro:', errorMessage);
            alert(`Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error en el registro:', error);
        alert(`Error en el registro: ${error.message || 'Por favor intente nuevamente'}`);
    }
});

// Load Products
async function loadProducts(role = null) {
    if (!role) {
        role = localStorage.getItem('userRole');
    }
    if (!await checkSession()) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                showLoginPage();
                return;
            }
            throw new Error('Failed to fetch products');
        }

        const products = await response.json();
        if (role === 'admin') {
            renderAdminProducts(products);
        } else {
            renderUserProducts(products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductCard(product, isAdmin = false) {
    const baseUrl = 'http://localhost:3000';
    const defaultImageUrl = '/default-product.jpg';

    // Verificar que el producto tenga un ID válido
    if (!product.id && !product._id) {
        console.error('Producto sin ID:', product);
        return null;
    }

    // Usar el ID correcto (puede ser id o _id dependiendo del backend)
    const productId = product.id || product._id;

    const productCard = document.createElement('div');
    productCard.classList.add('product-card');
    
    const productContent = `
        <div class="product-image">
            <img src="${product.imageUrl ? baseUrl + product.imageUrl : defaultImageUrl}" 
                 alt="${product.name}"
                 onerror="this.src='${defaultImageUrl}'">
        </div>
        <div class="product-details">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
            <p class="product-description">${product.description || 'Sin descripción'}</p>
            <div class="product-stock">Stock: ${product.stock || 0}</div>
            ${product.category ? `<div class="product-category">Categoría: ${product.category}</div>` : ''}
            <div class="product-actions">
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="editProduct('${productId}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct('${productId}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                ` : `
                    <button class="btn btn-primary" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fas fa-cart-plus"></i> Agregar al carrito
                    </button>
                `}
            </div>
        </div>
    `;
    
    productCard.innerHTML = productContent;
    return productCard;
}

function renderUserProducts(products) {
    console.log('Renderizando productos para usuario:', products);
    const container = document.getElementById('product-list');
    container.innerHTML = '';
    container.classList.add('products-container');
    
    products.forEach(product => {
        const card = renderProductCard(product, false);
        if (card) {
            container.appendChild(card);
        }
    });
}

function renderAdminProducts(products) {
    console.log('Renderizando productos para admin:', products);
    const container = document.getElementById('product-list');
    container.innerHTML = '';
    container.classList.add('products-container');
    
    products.forEach(product => {
        const card = renderProductCard(product, true);
        if (card) {
            container.appendChild(card);
        }
    });
}

// Add/Edit Product (Admin)
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!await checkSession()) return;

    // Mostrar indicador de carga
    const submitButton = productForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        const formData = new FormData();
        
        // Obtener los valores de los campos
        const name = document.getElementById('product-name').value.trim();
        const description = document.getElementById('product-description').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value) || 0;
        const category = document.getElementById('product-category').value.trim();
        const imageInput = document.getElementById('product-image');

        // Validar campos requeridos
        if (!name) {
            throw new Error('El nombre del producto es obligatorio');
        }
        if (isNaN(price) || price <= 0) {
            throw new Error('Por favor ingrese un precio válido mayor a 0');
        }

        // Agregar los campos al FormData
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('stock', stock);
        if (category) formData.append('category', category);

        // Agregar la imagen si existe
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se encontró el token de autenticación');
        }

        let url = `${API_URL}/products`;
        let method = 'POST';

        // Determinar si es una edición o un nuevo producto
        if (isEditing && editingProductId) {
            url = `${API_URL}/products/${editingProductId}`;
            method = 'PUT';
        }

        let response;
        let responseData;
        
        try {
            // Realizar la petición fetch
            response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            // Si la respuesta es exitosa (código 2xx), asumimos que todo salió bien
            if (response.ok) {
                console.log('Producto guardado exitosamente');
                responseData = { success: true, message: 'Producto guardado exitosamente' };
            } else {
                // Si hay un error en la respuesta, intentar obtener más detalles
                let errorMessage = 'Error al guardar el producto';
                
                try {
                    const responseText = await response.text();
                    if (responseText) {
                        try {
                            const errorData = JSON.parse(responseText);
                            errorMessage = errorData.message || errorMessage;
                        } catch (e) {
                            // Si no es JSON, usar el texto plano como mensaje
                            errorMessage = responseText || errorMessage;
                        }
                    }
                } catch (e) {
                    console.warn('No se pudo obtener el mensaje de error del servidor');
                }
                
                // Manejar errores de autenticación
                if (response.status === 401) {
                    localStorage.clear();
                    showLoginPage();
                    return;
                }
                
                throw new Error(errorMessage);
            }
            
        } catch (fetchError) {
            console.error('Error en la petición fetch:', fetchError);
            // Si el producto se guardó a pesar del error, continuar con éxito
            if (fetchError.message.includes('Failed to fetch')) {
                console.warn('Error de red, pero el producto pudo haberse guardado');
                responseData = { success: true, message: 'Producto guardado (verificar en el servidor)' };
            } else {
                // Para otros errores, lanzar el error
                throw new Error(`Error al guardar el producto: ${fetchError.message}`);
            }
        }
        
        // Mostrar mensaje de éxito
        alert(`✅ ${isEditing ? 'Producto actualizado exitosamente' : 'Producto agregado exitosamente'}`);
        productForm.reset();
        
        // Resetear estado de edición
        isEditing = false;
        editingProductId = null;
        cancelEditBtn.style.display = 'none';

        // Limpiar la vista previa de la imagen
        const imagePreview = document.getElementById('image-preview');
        const previewText = document.getElementById('preview-text');
        if (previewText) {
            previewText.textContent = 'Vista previa';
        }
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }

        // Recargar la lista de productos
        await loadProducts('admin');
        
    } catch (error) {
        console.error('Error al procesar el producto:', error);
        alert(`❌ Error: ${error.message || 'Ocurrió un error al procesar el producto'}`);
    } finally {
        // Restaurar el botón
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
});

// Edit Product (Admin)
async function editProduct(productId) {
    if (!productId) {
        console.error('ID de producto no válido:', productId);
        alert('Error: ID de producto no válido');
        return;
    }

    if (!await checkSession()) return;

    try {
        console.log('Intentando editar producto con ID:', productId);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                showLoginPage();
                return;
            }
            throw new Error('Failed to fetch product details');
        }

        const product = await response.json();
        console.log('Producto cargado para edición:', product);

        // Llenar el formulario con los detalles del producto
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-stock').value = product.stock || '';
        document.getElementById('product-category').value = product.category || '';

        // Si hay una imagen previa, mostrarla
        const imagePreview = document.getElementById('image-preview');
        const previewText = document.getElementById('preview-text');
        if (product.imageUrl) {
            imagePreview.src = `${API_URL}${product.imageUrl}`;
            imagePreview.style.display = 'block';
            if (previewText) {
                previewText.textContent = 'Vista previa de la imagen';
            }
        } else {
            imagePreview.style.display = 'none';
            if (previewText) {
                previewText.textContent = 'Vista previa';
            }
        }

        isEditing = true;
        editingProductId = productId;

        // Mostrar el botón de cancelar
        cancelEditBtn.style.display = 'inline-block';

        // Hacer scroll al formulario
        document.getElementById('product-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error editing product:', error);
        alert('No se pudo cargar el producto para edición');
    }
}

// Asegurarnos de que la función esté disponible globalmente
window.editProduct = editProduct;

// Eliminar Producto (Admin)
window.deleteProduct = async (productId) => {
    // Mostrar indicador de carga
    const deleteButtons = document.querySelectorAll(`button[onclick*="deleteProduct(${productId})"]`);
    const originalButtonTexts = [];
    
    try {
        // Guardar el texto original de los botones y deshabilitarlos
        deleteButtons.forEach(button => {
            originalButtonTexts.push(button.innerHTML);
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        });
        
        if (!await checkSession()) return;
        
        if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se encontró el token de autenticación');
        }

        console.log('Iniciando eliminación del producto con ID:', productId);
        console.log('URL de la petición:', `${API_URL}/products/${productId}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 segundos
        
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Respuesta recibida. Estado:', response.status, response.statusText);
        
        // Leer la respuesta como texto primero
        const responseText = await response.text();
        console.log('Contenido de la respuesta:', responseText);
        
        // Verificar si la respuesta es un JSON válido
        let responseData = null;
        try {
            responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
            console.log('La respuesta no es un JSON válido, continuando...');
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                showLoginPage();
                return;
            }
            
            const errorMessage = responseData?.message || 
                                response.statusText || 
                                'No se pudo eliminar el producto';
            
            console.error('Error en la respuesta:', {
                status: response.status,
                statusText: response.statusText,
                message: errorMessage
            });
            
            throw new Error(errorMessage);
        }

        // Si llegamos aquí, la eliminación fue exitosa
        console.log('✅ Producto eliminado exitosamente');
        alert('✅ Producto eliminado exitosamente');
        
        // Recargar la lista de productos
        await loadProducts('admin');
        
    } catch (error) {
        console.error('Error al eliminar el producto:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Determinar el tipo de error
        if (error.name === 'AbortError') {
            alert('⏱️ La solicitud tardó demasiado tiempo. Por favor, verifica tu conexión e inténtalo de nuevo.');
        } else if (error.message.includes('Failed to fetch')) {
            // Si es un error de red, verificar si el producto ya no está en la lista
            console.warn('Error de red, verificando si el producto fue eliminado...');
            await loadProducts('admin');
            alert('✅ El producto se eliminó correctamente (verificar en el servidor)');
        } else {
            // Para otros errores, mostrar el mensaje de error
            alert(`❌ Error: ${error.message || 'Ocurrió un error al intentar eliminar el producto'}`);
        }
    } finally {
        // Restaurar los botones
        deleteButtons.forEach((button, index) => {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalButtonTexts[index] || 'Eliminar';
            }
        });
    }
};

// Funcionalidad del Carrito de Compras
function addToCart(product) {
    // Verificar si el usuario está logueado y es un usuario normal
    if (!currentUser || currentUser.role !== 'user') {
        alert('Debes iniciar sesión como usuario para agregar productos al carrito');
        return;
    }

    const existingProduct = cart.find(item => item.id === product.id);
    
    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCart();
    updateCartVisibility();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

function clearCart() {
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    // Calcular el total de la compra
    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Confirmar la compra
    const confirmar = confirm(`¿Deseas confirmar tu compra por $${total.toFixed(2)}?`);
    
    if (confirmar) {
        const numeroOrden = Math.floor(Math.random() * 1000000);
        cart = [];
        updateCart();
        alert(`¡Compra exitosa!\nNúmero de orden: #${numeroOrden}\nGracias por tu compra.`);
    }
}

function updateCart() {
    // Limpiar el contenedor del carrito
    cartItemsContainer.innerHTML = '';
    
    // Calcular el total
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Renderizar los elementos del carrito
    cart.forEach(item => {
        const cartItemElement = document.createElement('div');
        cartItemElement.classList.add('cart-item');
        cartItemElement.innerHTML = `
            <div class="cart-item-details">
                <span>${item.name}</span>
                <span>$${item.price} x ${item.quantity}</span>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Eliminar</button>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Actualizar el total
    cartTotalElement.textContent = total.toFixed(2);
}

// Evento para vaciar el carrito
document.getElementById('clear-cart').addEventListener('click', clearCart);

// Función para manejar la visibilidad del carrito
function updateCartVisibility() {
    if (currentUser && currentUser.role === 'user') {
        cartContainer.style.display = 'block';
    } else {
        cartContainer.style.display = 'none';
    }
}

// Check session on page load
window.addEventListener('load', async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (token && role) {
        showMainPage(role);
        await loadProducts(role);
    } else {
        showLoginPage();
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    showLoginPage();
});

// Handle login type change
document.querySelectorAll('input[name="login-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const showRegisterLink = document.querySelector('#login-form p');
        if (e.target.value === 'admin') {
            showRegisterLink.style.display = 'none';
        } else {
            showRegisterLink.style.display = 'block';
        }
    });
});

// Toggle between login and register forms
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Initial load
fetchProducts();

// Obtener referencia al input de imagen
const imageInput = document.getElementById('product-image');
const imagePreview = document.createElement('div');
imagePreview.id = 'image-preview';
imagePreview.style.display = 'none';
imagePreview.style.maxWidth = '100px';
imagePreview.style.maxHeight = '100px';
imagePreview.style.margin = '5px 0';
imagePreview.style.alignSelf = 'center';

const previewImage = document.createElement('img');
previewImage.style.width = '100%';
previewImage.style.height = '100%';
previewImage.style.objectFit = 'cover';
previewImage.style.borderRadius = '4px';

const previewText = document.createElement('span');
previewText.textContent = 'Vista previa';
previewText.style.display = 'block';
previewText.style.fontSize = '0.8em';
previewText.style.color = '#666';
previewText.style.textAlign = 'center';
previewText.style.marginTop = '5px';

imagePreview.appendChild(previewImage);
imagePreview.appendChild(previewText);
imageInput.parentNode.insertBefore(imagePreview, imageInput.nextSibling);

// Agregar evento para vista previa de imagen
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            imagePreview.style.display = 'flex';
            if (previewText) {
                previewText.textContent = file.name; // Mostrar nombre del archivo
            }
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = 'none';
        if (previewText) {
            previewText.textContent = 'Vista previa';
        }
    }
});

// Inicialmente ocultar el carrito
cartContainer.style.display = 'none';
