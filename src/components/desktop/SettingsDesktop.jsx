import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, X, Check, Eye, EyeOff, RefreshCw, Shield, UserCircle, Truck, ChevronUp, ChevronDown } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, getSuppliers } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

const ROLES = [
  { value: 'admin', label: 'Администратор', icon: Shield, color: 'text-red-600 bg-red-50' },
  { value: 'operator', label: 'Оператор', icon: UserCircle, color: 'text-blue-600 bg-blue-50' },
  { value: 'worker', label: 'Курьер', icon: Truck, color: 'text-green-600 bg-green-50' },
];

export default function SettingsDesktop({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const [form, setForm] = useState({
    username: '',
    name: '',
    password: '',
    role: 'worker',
    supplier: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, suppliersData] = await Promise.all([
        getUsers(),
        getSuppliers()
      ]);
      setUsers(usersData || []);
      setSuppliers(suppliersData || []);
    } catch (err) {
      console.error('Error loading settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId) => {
    if (!supplierId) return '—';
    const s = suppliers.find(x => x.id === supplierId);
    return s?.name || '—';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'city':
          aVal = getSupplierName(a.supplier).toLowerCase();
          bVal = getSupplierName(b.supplier).toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.created || 0);
          bVal = new Date(b.created || 0);
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        default:
          aVal = '';
          bVal = '';
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
  }, [users, sortField, sortDir, suppliers]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ username: '', name: '', password: '', role: 'worker', supplier: '' });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username || '',
      name: user.name || '',
      password: '',
      role: user.role || 'worker',
      supplier: user.supplier || '',
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm({ username: '', name: '', password: '', role: 'worker', supplier: '' });
    setError('');
  };

  const handleSave = async () => {
    setError('');

    if (!form.username.trim()) {
      setError('Введите логин');
      return;
    }
    if (!editingUser && !form.password) {
      setError('Введите пароль');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('Пароль должен быть минимум 8 символов');
      return;
    }

    const isSelf = editingUser && editingUser.id === pb.authStore.model?.id;
    const dataChanged = editingUser && (
      form.password ||
      form.username !== editingUser.username ||
      form.name !== editingUser.name ||
      form.role !== editingUser.role
    );

    try {
      setSaving(true);
      if (editingUser) {
        await updateUser(editingUser.id, form);
      } else {
        await createUser(form);
      }
      closeModal();
      await loadData();

      if (isSelf && dataChanged) {
        alert('Данные вашего аккаунта изменены. Пожалуйста, выйдите и войдите заново для применения изменений.');
        if (form.password && onLogout) {
          onLogout();
        }
      }
    } catch (err) {
      console.error('Error saving user:', err);
      const msg = err?.data?.data;
      if (msg?.username?.message) {
        setError('Такой логин уже занят');
      } else if (msg?.password?.message) {
        setError(msg.password.message);
      } else {
        setError('Ошибка сохранения: ' + (err.message || 'Попробуйте ещё раз'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === pb.authStore.model?.id) {
      alert('Нельзя удалить самого себя');
      return;
    }
    if (!window.confirm(`Удалить пользователя "${user.name || user.username}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await deleteUser(user.id);
      await loadData();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Ошибка удаления: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const r = ROLES.find(x => x.value === role) || ROLES[2];
    const Icon = r.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${r.color}`}>
        <Icon size={14} />
        {r.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление персоналом</h2>
          <p className="text-sm text-gray-500">Создание, редактирование и удаление пользователей</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Обновить"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Создать пользователя
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Имя <SortIcon field="name" /></div>
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Логин</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('role')}>
                <div className="flex items-center gap-1">Роль <SortIcon field="role" /></div>
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('city')}>
                <div className="flex items-center gap-1">Город <SortIcon field="city" /></div>
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('created')}>
                <div className="flex items-center gap-1">Создан <SortIcon field="created" /></div>
              </th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Нет пользователей
                </td>
              </tr>
            ) : (
              sortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.name || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {user.username || user.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getSupplierName(user.supplier)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.created ? new Date(user.created).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.id !== pb.authStore.model?.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Логин */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите логин"
                />
              </div>

              {/* Имя (отображаемое имя / никнейм) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя (отображаемое)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Имя в интерфейсе и сайдбаре"
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder={editingUser ? 'Не менять' : 'Минимум 8 символов'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Роль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Город (supplier — relation) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                <select
                  value={form.supplier}
                  onChange={e => setForm({...form, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Не указан</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Пометка для текущего пользователя */}
              {editingUser && editingUser.id === pb.authStore.model?.id && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-xs">
                  ⚠️ Вы редактируете свой аккаунт. При смене пароля или логина потребуется перелогин.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {editingUser ? 'Сохранить' : 'Создать'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
