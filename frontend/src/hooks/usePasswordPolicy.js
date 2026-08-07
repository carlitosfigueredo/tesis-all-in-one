// hooks/usePasswordPolicy.js
// Carga la politica de contrasenas vigente desde el backend (BD).
// Cachea el resultado en memoria durante la sesion para no hacer
// una request en cada render.

import { useState, useEffect } from 'react';
import api from '../services/api';

// Politica por defecto mientras carga o si falla la request
const DEFAULT_POLICY = {
  minLength:        8,
  maxLength:        128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber:    true,
  requireSpecial:   true,
};

// Cache de modulo: se mantiene entre renders y componentes
let cachedPolicy = null;
let cachePromise = null;

async function fetchPolicy() {
  if (cachedPolicy) return cachedPolicy;
  if (cachePromise) return cachePromise;

  cachePromise = api.get('/auth/password-policy')
    .then((res) => {
      cachedPolicy = { ...DEFAULT_POLICY, ...res.data.data };
      cachePromise = null;
      return cachedPolicy;
    })
    .catch(() => {
      cachePromise = null;
      return DEFAULT_POLICY;
    });

  return cachePromise;
}

/** Invalida el cache (llamar despues de que el admin cambie la politica) */
export function invalidatePasswordPolicyCache() {
  cachedPolicy = null;
  cachePromise = null;
}

/**
 * Hook que devuelve la politica de contrasenas y las reglas para el indicador.
 * @returns {{ policy: object, rules: Array, loading: boolean }}
 */
export function usePasswordPolicy() {
  const [policy, setPolicy] = useState(cachedPolicy ?? DEFAULT_POLICY);
  const [loading, setLoading] = useState(!cachedPolicy);

  useEffect(() => {
    if (cachedPolicy) return; // ya esta en cache, no recargar
    let cancelled = false;
    setLoading(true);
    fetchPolicy().then((p) => {
      if (!cancelled) {
        setPolicy(p);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Construir reglas dinámicas según la política
  const rules = [
    {
      label: `Al menos ${policy.minLength} caracteres`,
      test:  (p) => p.length >= policy.minLength,
    },
    policy.requireUppercase && {
      label: 'Una letra mayúscula',
      test:  (p) => /[A-Z]/.test(p),
    },
    policy.requireLowercase && {
      label: 'Una letra minúscula',
      test:  (p) => /[a-z]/.test(p),
    },
    policy.requireNumber && {
      label: 'Un número',
      test:  (p) => /[0-9]/.test(p),
    },
    policy.requireSpecial && {
      label: 'Un carácter especial (!@#$%^&*)',
      test:  (p) => /[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/\\`~]/.test(p),
    },
  ].filter(Boolean);

  return { policy, rules, loading };
}
