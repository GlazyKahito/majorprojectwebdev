const { Router } = require("express");
const controller = require("../controllers/taskController");
const { protect } = require("../middleware/auth");
const { validate, validateId } = require("../middleware/validate");
const schemas = require("../validators/schemas");

const router = Router();

router.use(protect);

router.get("/", controller.listTasks);
router.post("/", validate(schemas.createTask), controller.createTask);
router.get("/:id", validateId(), controller.getTask);
router.put("/:id", validateId(), validate(schemas.updateTask), controller.updateTask);
router.delete("/:id", validateId(), controller.deleteTask);

module.exports = router;
