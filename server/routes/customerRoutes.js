const { Router } = require("express");
const controller = require("../controllers/customerController");
const { protect, authorize } = require("../middleware/auth");
const { validate, validateId } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const { ROLES } = require("../utils/roles");

const router = Router();

router.use(protect);

router.get("/meta", controller.customerMeta);
router.get("/", controller.listCustomers);
router.post("/", validate(schemas.createCustomer), controller.createCustomer);
router.get("/:id", validateId(), controller.getCustomer);
router.put("/:id", validateId(), validate(schemas.updateCustomer), controller.updateCustomer);
router.delete("/:id", validateId(), authorize(ROLES.ADMIN, ROLES.MANAGER), controller.deleteCustomer);
router.get("/:id/activities", validateId(), controller.listActivities);
router.post("/:id/activities", validateId(), validate(schemas.interaction), controller.addInteraction);
router.delete("/:id/activities/:activityId", validateId(), validateId("activityId"), controller.deleteActivity);

module.exports = router;
