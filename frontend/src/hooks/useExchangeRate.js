// hooks/useExchangeRate.js
// Carga la tasa de conversion PYG -> USD vigente desde el backend (BD).
// La fuente de verdad es SystemConfig 'exchange_rates'.PYG_TO_USD, expuesta
// en el endpoint publico GET /api/exchange-rate.
//
// Cachea el resultado en memoria durante la sesion para no hacer una request
// en cada render/componente.

import { useState, useEffect } from 'react';
import api from '../services/api';

// Valor por defecto SOLO como ultimo recurso mientras carga o si falla la
// request. La tasa real siempre viene de la BD.
const DEFAULT_RATE = 7500;

// Cache de modulo: se mantiene entre renders y componentes.
let cachedRate = null;
let cachePromise = null;

async function fetchRate() {
  if (cachedRate != null) return cachedRate;
  if (cachePromise) return cachePromise;

  cachePromise = api.get('/exchange-rate')
    .then((res) => {
      const rate = Number(res.data?.data?.PYG_TO_USD);
      cachedRate = rate > 0 ? rate : DEFAULT_RATE;
      cachePromise = null;
      return cachedRate;
    })
    .catch(() => {
      cachePromise = null;
      return DEFAULT_RATE;
    });

  return cachePromise;
}

/** Invalida el cache (llamar despues de que el admin cambie la tasa). */
export function invalidateExchangeRateCache() {
  cachedRate = null;
  cachePromise = null;
}

/**
 * Hook que devuelve la tasa PYG -> USD vigente.
 * @returns {{ rate: number, loading: boolean }}
 */
export function useExchangeRate() {
  const [rate, setRate] = useState(cachedRate ?? DEFAULT_RATE);
  const [loading, setLoading] = useState(cachedRate == null);

  useEffect(() => {
    if (cachedRate != null) return; // ya esta en cache
    let cancelled = false;
    setLoading(true);
    fetchRate().then((r) => {
      if (!cancelled) {
        setRate(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { rate, loading };
}
