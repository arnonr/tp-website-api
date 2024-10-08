const express = require("express");
const router = express.Router();

const controllers = require("../../controllers/IntellectualController");
const auth = require("../auth");

router.get("/", controllers.onGetAll);
router.get("/:id", controllers.onGetById);

router.post(
  "/",
  // auth.required,
  controllers.onCreate
);

router.put("/:id", controllers.onUpdate);

router.delete(
  "/:id",
  //   auth.required,
  controllers.onDelete
);

module.exports = router;
