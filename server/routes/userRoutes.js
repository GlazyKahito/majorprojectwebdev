const { Router } = require("express");
const controller = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
const { validate, validateId } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const { ROLES } = require("../utils/roles");

const router = Router();

router.use(protect);
router.get("/team", controller.listTeam);

router.use(authorize(ROLES.ADMIN));
router.get("/", controller.listUsers);
router.post("/", validate(schemas.createUser), controller.createUser);
router.get("/:id", validateId(), controller.getUser);
router.put("/:id", validateId(), validate(schemas.updateUser), controller.updateUser);
router.delete("/:id", validateId(), validate(schemas.deleteUser), controller.deleteUser);

module.exports = router;
