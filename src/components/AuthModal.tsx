import { useState } from 'react';
import { X, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n'; // 你根据你的路径调整

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'login' | 'register';
  lang?: 'ru' | 'kk';
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  mode: initialMode = 'login',
  lang = 'ru',
}: AuthModalProps) {
  const { t } = useTranslation(lang);

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+7\d{10}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (value: string) => {
    if (value.length === 0) {
      setPhone('+7');
    } else if (value.startsWith('+7') && value.length <= 12) {
      setPhone(value);
    } else if (value.startsWith('7') && value.length <= 11) {
      setPhone('+' + value);
    } else if (!value.startsWith('+7') && !value.startsWith('7')) {
      setPhone('+7' + value.replace(/\D/g, '').slice(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePhone(phone)) {
      setError(lang === 'ru' ? 'Неверный формат номера телефона. Используйте формат: +77XXXXXXXXX' : 'Телефон нөмірінің форматы қате. Форматты қолданыңыз: +77XXXXXXXXX');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(phone, password);
        if (error) {
          setError(t('authInvalidCredentials'));
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        if (!name.trim()) {
          setError(lang === 'ru' ? 'Пожалуйста, введите имя' : 'Атыңызды енгізіңіз');
          setLoading(false);
          return;
        }
        const { error } = await signUp(phone, password, name, phone);
        if (error) {
          if (error.message.includes('already registered')) {
            setError(lang === 'ru' ? 'Этот номер телефона уже зарегистрирован' : 'Бұл телефон нөмірі тіркелген');
          } else {
            setError(error.message);
          }
        } else {
          setMode('login');
          setError('');
          alert(t('authRegisterSuccess'));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setName('');
    setPhone('+7');
    setError('');
  };

  const switchMode = () => {
    resetForm();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* 标题 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'login' ? t('authLoginTitle') : t('authRegisterTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 注册时显示姓名 */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('authNameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('authNamePlaceholder')}
                />
              </div>
            </div>
          )}

          {/* 手机号 - 主要登录方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('authPhoneLabel')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+77718977719"
                maxLength={12}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {lang === 'ru' ? 'Формат: +7 и 10 цифр' : 'Формат: +7 және 10 сан'}
            </p>
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('authPasswordLabel')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  mode === 'register'
                    ? t('authPasswordPlaceholderRegister')
                    : t('authPasswordPlaceholderLogin')
                }
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? t('authProcessing')
              : mode === 'login'
              ? t('authLoginButton')
              : t('authRegisterButton')}
          </button>

          {/* 切换登录/注册 */}
          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {mode === 'login'
                ? t('authSwitchToRegister')
                : t('authSwitchToLogin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
