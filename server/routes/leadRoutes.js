const { Router } = require("express");
const controller = require("../controllers/leadController");
const { protect, authorize } = require("../middleware/auth");
const { validate, validateId } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const { ROLES } = require("../utils/roles");

const router = Router();

router.use(protect);

router.get("/", controller.listLeads);
router.post("/", validate(schemas.createLead), controller.createLead);
router.get("/:id", validateId(), controller.getLead);
router.put("/:id", validateId(), validate(schemas.updateLead), controller.updateLead);
router.patch("/:id/status", validateId(), validate(schemas.leadStatus), controller.updateLeadStatus);
router.delete("/:id", validateId(), authorize(ROLES.ADMIN, ROLES.MANAGER), controller.deleteLead);
router.post("/:id/convert", validateId(), validate(schemas.convertLead), controller.convertLead);
router.post("/:id/notes", validateId(), validate(schemas.leadNote), controller.addNote);
router.delete("/:id/notes/:noteId", validateId(), validateId("noteId"), controller.deleteNote);
router.get("/:id/activities", validateId(), controller.listActivities);
router.post("/:id/activities", validateId(), validate(schemas.interaction), controller.addInteraction);

module.exports = router;
