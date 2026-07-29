const { Router } = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { getUsers, createUser, toggleUserActive, updateUser, getAvailableRoles } = require('../controllers/users.controller');

const router = Router();

router.use(protect, requireActiveCompany);

// GET /api/users/roles-available — roles asignables
router.get('/roles-available', requirePermission('users.read'), getAvailableRoles);

// GET /api/users
router.get('/', requirePermission('users.read'), getUsers);

// POST /api/users
router.post('/', requirePermission('users.write'), createUser);

// PUT /api/users/:id
router.put('/:id', requirePermission('users.write'), updateUser);

// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', requirePermission('users.toggle'), toggleUserActive);

module.exports = router;
