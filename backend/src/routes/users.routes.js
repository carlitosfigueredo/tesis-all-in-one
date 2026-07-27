const { Router } = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const { getUsers, createUser, toggleUserActive, updateUser } = require('../controllers/users.controller');

const router = Router();

// Todas las rutas requieren autenticacion
router.use(protect);

// GET /api/users — listar usuarios de la empresa (o todos para SUPER_ADMIN)
router.get('/', getUsers);

// POST /api/users — crear usuario (solo COMPANY_ADMIN o SUPER_ADMIN)
router.post('/', requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), createUser);

// PUT /api/users/:id — actualizar usuario (solo COMPANY_ADMIN o SUPER_ADMIN)
router.put('/:id', requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), updateUser);

// PATCH /api/users/:id/toggle-active — activar/desactivar (solo COMPANY_ADMIN o SUPER_ADMIN)
router.patch('/:id/toggle-active', requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), toggleUserActive);

module.exports = router;
