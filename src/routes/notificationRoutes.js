const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getUnreadNotificationCount,
  listNotifications,
  markHireNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

router.use(protect);
router.get("/unread-count", getUnreadNotificationCount);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/hire/:requestId/read", markHireNotificationRead);

module.exports = router;
