import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { login } from '../../lib/api';
import { saveSession } from '../../lib/authSession';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, professional } = await login(email, password);
      saveSession({ token, professional });
      onSuccess(professional);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-10">
      <div className="text-center mb-6">
        <Lock className="w-10 h-10 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Panel Profesional</h2>
        <p className="text-gray-500 text-sm mt-1">Acceso restringido a profesionales autorizados</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          required
          className="w-full border-2 border-purple-200 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="w-full border-2 border-purple-200 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-full font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-6">
        ¿No tienes cuenta? Las cuentas profesionales las crea el administrador del sistema desde el
        servidor (ver README del backend).
      </p>
    </div>
  );
}
