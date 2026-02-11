import React, { useState, useEffect } from 'react';
import pb from '../lib/pocketbase';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AuthScreen({ onAuth }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (pb.authStore.isValid) {
        // Проверяем токен
        await pb.collection('users').getOne(pb.authStore.model.id);
        onAuth(pb.authStore.model);
      }
    } catch (err) {
      // Токен невалидный, выходим
      pb.authStore.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('AuthScreen: PB URL:', pb.baseUrl);
      console.log('AuthScreen: Попытка входа с логином:', login);
      const authData = await pb.collection('users').authWithPassword(login, password);
      console.log('AuthScreen: Успешный вход:', authData.record);
      console.log('AuthScreen: Роль пользователя:', authData.record.role);
      onAuth(authData.record);
    } catch (err) {
      console.error('AuthScreen: Ошибка входа:', err);
      console.error('AuthScreen: Детали:', err?.data || err?.message || err);
      console.error('AuthScreen: PB URL:', pb.baseUrl);
      
      // Определяем тип ошибки для пользователя
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || err?.message?.includes('ERR_')) {
        setError('Ошибка соединения с сервером. Проверьте подключение.');
      } else {
        setError('Неверный логин или пароль');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Наш Склад</h1>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Логин
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите логин"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="Введите пароль"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Вход...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Войти</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
