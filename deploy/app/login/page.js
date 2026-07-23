'use strict';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, ShieldAlert, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { username, password } : { name, username, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      if (isLogin) {
        setSuccess('Başarıyla giriş yapıldı. Yönlendiriliyorsunuz...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        setIsLogin(true);
        setName('');
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 relative min-h-screen bg-background text-foreground font-sans">
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center animate-in fade-in duration-200">
          <div className="inline-flex items-center justify-center p-3 bg-soft-stone rounded-lg mb-4">
            <BookOpen className="h-6 w-6 text-carbon-ink" />
          </div>
          <h2 className="text-heading font-anthropic-serif text-carbon-ink flex justify-center items-center gap-2">
            Akademisyen Girişi <span className="text-clay text-sm">✦</span>
          </h2>
          <p className="mt-2 text-xs text-ashen uppercase font-medium tracking-wider">
            Ders beklenti ve memnuniyet istatistik analiz yazılımı
          </p>
        </div>

        <div className="gleap-card p-8 bg-paper-white relative overflow-hidden rounded-[16px] border border-soft-stone shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-soft-stone mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-xs font-medium uppercase border-b-2 text-center transition-colors duration-200 cursor-pointer ${
                isLogin
                  ? 'border-carbon-ink text-carbon-ink'
                  : 'border-transparent text-ashen hover:text-carbon-ink'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-xs font-medium uppercase border-b-2 text-center transition-colors duration-200 cursor-pointer ${
                !isLogin
                  ? 'border-carbon-ink text-carbon-ink'
                  : 'border-transparent text-ashen hover:text-carbon-ink'
              }`}
            >
              Hesap Oluştur
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-2">
                  Adınız ve Ünvanınız
                </label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Dr. Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-paper-white border border-mist rounded-lg text-sm text-carbon-ink placeholder-pebble outline-none focus:border-graphite transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                required
                placeholder="fc07"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-paper-white border border-mist rounded-lg text-sm text-carbon-ink placeholder-pebble outline-none focus:border-graphite transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-2">
                Şifre
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-paper-white border border-mist rounded-lg text-sm text-carbon-ink placeholder-pebble outline-none focus:border-graphite transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 border border-clay text-clay bg-[#fdf3f0] rounded-lg text-xs font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0 text-clay" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 border border-carbon-ink text-carbon-ink rounded-lg text-xs uppercase font-medium bg-soft-stone">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-semibold text-sm transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 btn-primary"
            >
              {loading ? (
                'İşleniyor...'
              ) : isLogin ? (
                <>
                  <LogIn className="h-4 w-4" /> Giriş Yap
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Kaydol
                </>
              )}
            </button>
          </form>

          {/* Quick Help Card */}
          {isLogin && (
            <div className="mt-6 pt-6 border-t border-soft-stone text-[11px] text-ashen space-y-1.5 bg-soft-stone/30 -mx-8 -mb-8 p-6 uppercase tracking-wider">
              <span className="font-bold text-carbon-ink">Ön Tanımlı Hoca Hesapları:</span>
              <p className="text-ashen">Kullanıcı adları: <code className="text-carbon-ink font-mono bg-paper-white px-1.5 py-0.5 rounded border border-mist font-bold">fc07</code>, <code className="text-carbon-ink font-mono bg-paper-white px-1.5 py-0.5 rounded border border-mist font-bold">ahmet</code> veya <code className="text-carbon-ink font-mono bg-paper-white px-1.5 py-0.5 rounded border border-mist font-bold">mehmet</code></p>
              <p className="text-ashen">Şifre: <code className="text-carbon-ink font-mono bg-paper-white px-1.5 py-0.5 rounded border border-mist font-bold">123</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
