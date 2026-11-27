const mongoose = require("mongoose");
const HireRequest = require("../models/HireRequest");

function queryForUser(user) {
  const id = String(user.id);
  return user.role === "provider"
    ? { providerId: id }
    : { customerId: id, status: { $in: ["accepted", "declined"] } };
}

function unreadQueryForUser(user) {
  return {
    ...queryForUser(user),
    [user.role === "provider" ? "providerNotificationReadAt" : "customerResponseReadAt"]: null,
  };
}

function toNotification(item, role) {
  const isProvider = role === "provider";
  return {
    id: String(item._id),
    type: "hire",
    title: isProvider
      ? "New hire request from " + item.customerName
      : "Your request was " + item.status,
    message: isProvider
      ? item.customerName + " requested " + item.serviceNeeded + "."
      : item.providerName + " " + item.status + " your request for " + item.serviceNeeded + ".",
    status: item.status,
    read: Boolean(isProvider ? item.providerNotificationReadAt : item.customerResponseReadAt),
    createdAt: isProvider ? item.createdAt : item.updatedAt,
  };
}

async function getUnreadNotificationCount(req, res) {
  try {
    const unreadCount = await HireRequest.countDocuments(unreadQueryForUser(req.user));
    res.json({ unreadCount });
  } catch {
    res.status(500).json({ message: "Could not load notification count." });
  }
}

async function listNotifications(req, res) {
  try {
    const isProvider = req.user.role === "provider";
    const [requests, unreadCount] = await Promise.all([
      HireRequest.find(queryForUser(req.user))
        .select("providerName customerName serviceNeeded status createdAt updatedAt providerNotificationReadAt customerResponseReadAt")
        .sort(isProvider ? { createdAt: -1 } : { updatedAt: -1 })
        .limit(40)
        .lean(),
      HireRequest.countDocuments(unreadQueryForUser(req.user)),
    ]);
    res.json({ notifications: requests.map((item) => toNotification(item, req.user.role)), unreadCount });
  } catch {
    res.status(500).json({ message: "Could not load notifications." });
  }
}

async function markHireNotificationRead(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.requestId)) {
      return res.status(404).json({ message: "Notification not found." });
    }
    const isProvider = req.user.role === "provider";
    const record = await HireRequest.findOneAndUpdate(
      { _id: req.params.requestId, ...queryForUser(req.user) },
      { $set: { [isProvider ? "providerNotificationReadAt" : "customerResponseReadAt"]: new Date() } },
      { new: true },
    ).select("_id");
    if (!record) return res.status(404).json({ message: "Notification not found." });
    res.json({ message: "Notification marked as read." });
  } catch {
    res.status(500).json({ message: "Could not mark notification as read." });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const field = req.user.role === "provider" ? "providerNotificationReadAt" : "customerResponseReadAt";
    await HireRequest.updateMany(unreadQueryForUser(req.user), { $set: { [field]: new Date() } });
    res.json({ message: "Notifications marked as read.", unreadCount: 0 });
  } catch {
    res.status(500).json({ message: "Could not mark notifications as read." });
  }
}

module.exports = { getUnreadNotificationCount, listNotifications, markHireNotificationRead, markAllNotificationsRead };
