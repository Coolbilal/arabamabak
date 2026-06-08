import { useState } from 'react';
import {
  CreditCard, Lock, ShieldCheck, AlertCircle, Loader2, X,
  CheckCircle2, Eye, EyeOff, Hash, User, Calendar,
} from 'lucide-react';

interface ThreeDSecureModalProps {
  amount: number;
  description: string;
  onCancel: () => void;
  onSuccess: (last4: string) => void;
  onFailure: (reason: string) => void;
}

type Stage = 'form' | 'verifying' | 'otp' | 'result';

const VALID_OTP = '123456';

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function luhnValid(num: string) {
  const s = num.replace(/\D/g, '');
  if (s.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = Number(s[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export default function ThreeDSecureModal({
  amount, description, onCancel, onSuccess, onFailure,
}: ThreeDSecureModalProps) {
  const [stage, setStage] = useState<Stage>('form');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const last4 = cardNumber.replace(/\D/g, '').slice(-4);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = cardNumber.replace(/\D/g, '');
    if (num.length < 13 || !luhnValid(num)) {
      setError('Geçersiz kart numarası');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Geçersiz son kullanma tarihi (AA/YY)');
      return;
    }
    const [mm] = expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) { setError('Geçersiz ay'); return; }
    if (cvv.length < 3 || cvv.length > 4) { setError('Geçersiz CVV'); return; }
    if (cardName.trim().length < 3) { setError('Kart sahibi adı gerekli'); return; }

    setStage('verifying');
    setTimeout(() => setStage('otp'), 1500);
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === VALID_OTP) {
      setStage('result');
      setTimeout(() => onSuccess(last4), 1200);
    } else {
      setStage('result');
      setTimeout(() => onFailure('3D Secure doğrulaması başarısız. OTP hatalı.'), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Güvenli Ödeme</span>
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="text-2xl font-bold">{amount.toLocaleString('tr-TR')} ₺</div>
          <div className="text-xs text-white/70 mt-0.5 truncate">{description}</div>
        </div>

        {/* Stage: form */}
        {stage === 'form' && (
          <form onSubmit={submitForm} className="p-5 space-y-3">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-2.5 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                <User className="h-3 w-3" /> Kart Üzerindeki Ad Soyad
              </label>
              <input
                className="input w-full"
                placeholder="AHMET YILMAZ"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                autoComplete="cc-name"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                <CreditCard className="h-3 w-3" /> Kart Numarası
              </label>
              <input
                className="input w-full font-mono tracking-wider"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-number"
              />
              {last4.length === 4 && (
                <div className="text-xs text-slate-500 mt-1">•••• {last4}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> Son Kul.
                </label>
                <input
                  className="input w-full font-mono"
                  placeholder="AA/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3" /> CVV
                </label>
                <div className="relative">
                  <input
                    className="input w-full pr-9 font-mono"
                    placeholder="000"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    type={showCvv ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-100 text-xs text-blue-800">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>3D Secure ile korunuyorsunuz. Test için OTP: <strong>123456</strong></span>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1">İptal</button>
              <button type="submit" className="btn-primary flex-1">
                <Lock className="h-4 w-4" /> Güvenli Öde
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 text-slate-400">
              <CreditCard className="h-6 w-6" />
              <span className="text-xs">Visa • MasterCard • Troy • Amex</span>
            </div>
          </form>
        )}

        {/* Stage: verifying */}
        {stage === 'verifying' && (
          <div className="p-10 text-center space-y-3">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <div className="text-sm font-medium text-slate-700">3D Secure doğrulanıyor...</div>
            <div className="text-xs text-slate-500">Bankanıza yönlendirildiniz</div>
          </div>
        )}

        {/* Stage: OTP */}
        {stage === 'otp' && (
          <form onSubmit={submitOtp} className="p-5 space-y-4">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">3D Secure Doğrulama</h3>
              <p className="text-sm text-slate-500 mt-1">
                Bankanızın gönderdiği 6 haneli kodu girin.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                <strong>Demo:</strong> 123456 kabul edilir
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-2.5 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <input
              autoFocus
              className="input w-full text-center text-2xl font-mono tracking-[0.5em]"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />

            <button type="submit" className="btn-primary w-full" disabled={otp.length !== 6}>
              <ShieldCheck className="h-4 w-4" /> Doğrula
            </button>
          </form>
        )}

        {/* Stage: result */}
        {stage === 'result' && (
          <div className="p-10 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div className="text-sm font-medium text-slate-700">Ödeme onaylanıyor...</div>
          </div>
        )}
      </div>
    </div>
  );
}
