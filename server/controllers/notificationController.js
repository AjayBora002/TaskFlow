const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { $set: { read: true } }
      );
      return res.json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (String(notification.recipient) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
