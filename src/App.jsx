import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  Box,
  Check,
  ChevronRight,
  CirclePlus,
  LoaderCircle,
  LogOut,
  PackageSearch,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';
const API_BASE = `${/^https?:\/\//i.test(configuredApiBase) ? '' : 'https://'}${configuredApiBase}`.replace(/\/$/, '');
const TOKEN_KEY = 'lab6_tokens';
const USER_KEY = 'lab6_user';

function storedTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Could not connect to the API at ${API_BASE}.`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || result.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.fields = result.fields;
    throw error;
  }
  return result;
}

function saveSession(user, tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identity, setIdentity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await request(isRegistering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(isRegistering
          ? { username: identity, email, password }
          : { username: identity, password }),
      });
      onLogin(result.user, result.tokens);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark"><Box size={22} strokeWidth={2.2} /></div>
        <p className="eyebrow">LAB 06 / OPERATIONS</p>
        <h1>Stockroom</h1>
        <p className="login-copy">{isRegistering ? 'Create your account to manage product inventory.' : 'Sign in to manage your product inventory.'}</p>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="identity">{isRegistering ? 'Username' : 'Username or email'}</label>
          <input id="identity" minLength={isRegistering ? 3 : undefined} maxLength={100} autoComplete="username" value={identity} onChange={(event) => setIdentity(event.target.value)} required />
          {isRegistering && <>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </>}
          <label htmlFor="password">Password</label>
          <input id="password" type="password" minLength={isRegistering ? 8 : undefined} maxLength={isRegistering ? 72 : undefined} autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {isRegistering && <>
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type="password" minLength={8} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </>}
          {error && <div className="notice notice-error"><AlertCircle size={17} />{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <ChevronRight size={18} />}
            {loading ? (isRegistering ? 'Creating account' : 'Signing in') : (isRegistering ? 'Create account' : 'Sign in')}
          </button>
        </form>
        <p className="auth-switch">
          {isRegistering ? 'Already have an account?' : 'New to Stockroom?'}
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}>
            {isRegistering ? 'Sign in' : 'Create account'}
          </button>
        </p>
        <div className="login-foot"><span>Protected inventory workspace</span><span>API AUTH</span></div>
      </section>
      <aside className="login-aside">
        <div className="aside-rule" />
        <span>PRODUCTS / INVENTORY</span>
        <strong>Everything in its place.</strong>
        <p>A clear view of what you have, what it costs, and what needs attention.</p>
        <div className="aside-stamp"><Box size={27} /><span>STOCKROOM<br />MANAGEMENT</span></div>
      </aside>
    </main>
  );
}

function ProductForm({ product, onClose, onSave }) {
  const [values, setValues] = useState({
    product_name: product?.product_name || '',
    description: product?.description || '',
    price: product?.price || '',
    quantity: product?.quantity ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await onSave(values, product?.id);
    } catch (error) {
      setErrors(error.fields || { form: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
        <header className="dialog-head">
          <div><p className="eyebrow">INVENTORY RECORD</p><h2 id="product-form-title">{product ? 'Edit product' : 'Add product'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        <form className="product-form" onSubmit={submit}>
          <label htmlFor="product_name">Product name</label>
          <input id="product_name" maxLength={100} value={values.product_name} onChange={(event) => update('product_name', event.target.value)} required autoFocus />
          {errors.product_name && <span className="field-error">{errors.product_name}</span>}
          <label htmlFor="description">Description <span>Optional</span></label>
          <textarea id="description" rows={3} value={values.description} onChange={(event) => update('description', event.target.value)} />
          <div className="form-pair">
            <div><label htmlFor="price">Price</label><div className="input-prefix"><span>$</span><input id="price" type="number" min="0" step="0.01" value={values.price} onChange={(event) => update('price', event.target.value)} required /></div>{errors.price && <span className="field-error">{errors.price}</span>}</div>
            <div><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" min="0" step="1" value={values.quantity} onChange={(event) => update('quantity', event.target.value)} required />{errors.quantity && <span className="field-error">{errors.quantity}</span>}</div>
          </div>
          {errors.form && <div className="notice notice-error"><AlertCircle size={17} />{errors.form}</div>}
          <footer className="dialog-actions">
            <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
              {saving ? 'Saving' : 'Save product'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  });
  const [tokens, setTokens] = useState(storedTokens);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');

  function authenticate(nextUser, nextTokens) {
    saveSession(nextUser, nextTokens);
    setUser(nextUser);
    setTokens(nextTokens);
  }

  function unauthenticate() {
    clearSession();
    setUser(null);
    setTokens(null);
    setProducts([]);
  }

  async function authenticatedRequest(path, options = {}) {
    const current = tokens || storedTokens();
    if (!current?.access_token) throw new Error('Please sign in again.');
    try {
      return await request(path, { ...options, token: current.access_token });
    } catch (firstError) {
      if (firstError.status !== 401 || !current.refresh_token) throw firstError;
      const refreshed = await request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      const nextTokens = refreshed.tokens;
      if (!nextTokens?.access_token) throw firstError;
      saveSession(user, nextTokens);
      setTokens(nextTokens);
      return request(path, { ...options, token: nextTokens.access_token });
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const result = await authenticatedRequest('/api/products');
      setProducts(result.data || []);
    } catch (loadError) {
      if (loadError.status === 401 || loadError.status === 403) unauthenticate();
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && tokens) loadProducts();
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function saveProduct(values, id) {
    await authenticatedRequest(id ? `/api/products/${id}` : '/api/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...values,
        price: Number(values.price),
        quantity: Number(values.quantity),
      }),
    });
    setEditing(undefined);
    setToast(id ? 'Product updated' : 'Product added');
    await loadProducts();
  }

  async function deleteProduct() {
    try {
      await authenticatedRequest(`/api/products/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      setToast('Product deleted');
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleting(null);
    }
  }

  async function logout() {
    const current = tokens || storedTokens();
    try {
      if (current?.access_token) {
        await request('/api/auth/logout', {
          method: 'POST',
          token: current.access_token,
          body: JSON.stringify({ refresh_token: current.refresh_token }),
        });
      }
    } catch {
      // Clear local credentials even when the server is unreachable.
    }
    unauthenticate();
  }

  if (!user || !tokens) return <Login onLogin={authenticate} />;

  const isAdmin = user.role === 'admin';
  const visibleProducts = products
    .filter((product) => `${product.product_name} ${product.description || ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.product_name.localeCompare(b.product_name) : sort === 'price' ? Number(a.price) - Number(b.price) : Number(b.id) - Number(a.id));
  const stockValue = products.reduce((total, product) => total + Number(product.price) * Number(product.quantity), 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top"><span className="brand-mark small"><Box size={17} /></span>STOCKROOM</a>
        <div className="topbar-right"><span className="status-dot" />LOCAL INVENTORY <span className="top-divider" /> <span className="user-name">{user.username}</span><span className={`role-label ${isAdmin ? 'role-admin' : ''}`}>{isAdmin ? 'ADMIN' : 'VIEW ONLY'}</span><button className="logout-button" type="button" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button></div>
      </header>
      <main className="workspace" id="top">
        <div className="page-heading">
          <div><p className="eyebrow">INVENTORY / OVERVIEW</p><h1>Products</h1><p className="page-description">{isAdmin ? 'Manage your current product stock.' : 'Browse the current product inventory.'}</p></div>
          {isAdmin && <button className="button button-primary" onClick={() => setEditing(null)}><CirclePlus size={17} />Add product</button>}
        </div>

        <section className="metrics" aria-label="Inventory summary">
          <div className="metric"><span className="metric-label">PRODUCTS</span><strong>{products.length.toLocaleString()}</strong><span className="metric-note">In your inventory</span></div>
          <div className="metric"><span className="metric-label">UNITS IN STOCK</span><strong>{products.reduce((sum, product) => sum + Number(product.quantity), 0).toLocaleString()}</strong><span className="metric-note">Across all products</span></div>
          <div className="metric"><span className="metric-label">STOCK VALUE</span><strong>${stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><span className="metric-note">Based on current quantity</span></div>
          <div className="metric metric-accent"><span className="metric-label">LOW STOCK</span><strong>{products.filter((product) => Number(product.quantity) < 5).length.toLocaleString()}</strong><span className="metric-note">Fewer than 5 units</span></div>
        </section>

        <section className="inventory-section">
          <div className="inventory-head"><div><h2>All products</h2><span>{visibleProducts.length} {visibleProducts.length === 1 ? 'record' : 'records'}</span></div><div className="table-tools">
            <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a product" aria-label="Find a product" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label>
            <label className="sort-control"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="newest">Newest</option><option value="name">Name</option><option value="price">Price</option></select></label>
          </div></div>

          {error && <div className="notice notice-error page-notice"><AlertCircle size={17} />{error}<button className="notice-close" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22} /><span>Loading inventory</span></div> : visibleProducts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><PackageSearch size={23} /></div><strong>{query ? 'No matching products' : 'Your inventory is empty'}</strong><span>{query ? 'Try another search term.' : isAdmin ? 'Add a product to start your list.' : 'There are no products to display yet.'}</span>{isAdmin && !query && <button className="button button-quiet" onClick={() => setEditing(null)}><CirclePlus size={16} />Add first product</button>}</div>
          ) : (
            <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>DESCRIPTION</th><th>PRICE</th><th>QUANTITY</th><th>STATUS</th>{isAdmin && <th><span className="sr-only">Actions</span></th>}</tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}>
              <td><div className="product-cell"><span className="product-glyph"><Box size={17} /></span><span><strong>{product.product_name}</strong><small>SKU-{String(product.id).padStart(4, '0')}</small></span></div></td>
              <td className="description-cell">{product.description || <span className="muted">No description</span>}</td>
              <td className="price-cell">${Number(product.price).toFixed(2)}</td>
              <td><span className="quantity-value">{Number(product.quantity)}</span></td>
              <td><span className={`stock-status ${Number(product.quantity) === 0 ? 'out' : Number(product.quantity) < 5 ? 'low' : 'in'}`}><i />{Number(product.quantity) === 0 ? 'Out of stock' : Number(product.quantity) < 5 ? 'Low stock' : 'In stock'}</span></td>
              {isAdmin && <td><div className="row-actions"><button className="icon-button" onClick={() => setEditing(product)} aria-label={`Edit ${product.product_name}`} title="Edit"><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => setDeleting(product)} aria-label={`Delete ${product.product_name}`} title="Delete"><Trash2 size={16} /></button></div></td>}
            </tr>)}</tbody></table></div>
          )}
          <footer className="table-footer"><span>Showing {visibleProducts.length} of {products.length} products</span><span>Synced to API <i className="sync-dot" /></span></footer>
        </section>
        <footer className="workspace-foot"><span>STOCKROOM / LAB 06</span><span>PRODUCT MANAGEMENT</span></footer>
      </main>

      {editing !== undefined && <ProductForm product={editing || undefined} onClose={() => setEditing(undefined)} onSave={saveProduct} />}
      {deleting && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDeleting(null)}><section className="dialog confirm-dialog" role="alertdialog" aria-modal="true"><div className="confirm-icon"><Trash2 size={20} /></div><p className="eyebrow">REMOVE FROM INVENTORY</p><h2>Delete this product?</h2><p><strong>{deleting.product_name}</strong> will be permanently removed from your inventory.</p><footer className="dialog-actions"><button className="button button-quiet" onClick={() => setDeleting(null)}>Keep product</button><button className="button button-danger" onClick={deleteProduct}><Trash2 size={16} />Delete product</button></footer></section></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;