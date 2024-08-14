const express = require("express");
const router = express.Router()

const controllers = require("../../controllers/SdgTypeController");

router.get(
  "/",
  controllers.onGetAll
);
router.get(
  "/:id",
  controllers.onGetById
);

module.exports = router;