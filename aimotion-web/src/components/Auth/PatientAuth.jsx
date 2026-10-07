import React, { useState } from 'react';
import { UserPlus, LogIn, X } from 'lucide-react';
import { registerPatient, loginPatient } from '../../lib/api';
import { savePatientSession } from '../../lib/patientSession';

export default function PatientAuth({ onSuccess, onDismiss }) {
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'register' ? await registerPatient(name, email, password) : await loginPatient(email, password);
      savePatientSession(result);
      onSuccess(result.user);
    } catch (err) {
      setError(err.message || 'Algo salió mal, intenta de nuevo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 relative animate-fade-in-up">
      {onDismiss && (
        <button onClick={onDismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {mode === 'register' ? 'Crea una cuenta gratis' : 'Inicia sesión'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {mode === 'register'
          ? 'Para que tu historial se guarde y el profesional pueda darte seguimiento semana a semana.'
          : 'Para ver tu historial y tu plan de seguimiento.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            required
            className="w-full border-2 border-purple-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          required
          className="w-full border-2 border-purple-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 8 caracteres)"
          required
          minLength={8}
          className="w-full border-2 border-purple-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2.5 rounded-full font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {loading ? 'Un momento...' : mode === 'register' ? 'Crear cuenta' : 'Ingresar'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        className="text-xs text-purple-600 hover:underline mt-3 block mx-auto"
      >
        {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  );
}
