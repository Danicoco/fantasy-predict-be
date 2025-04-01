
exports.poolDoc = (req) => {
    return {
        ...req.body,
        invitationCode: `${new Date().getDate()}-${Math.random()}`,
        creator: req.user.id,
    }
}

exports.sendNotification = async (fcmTokens = [], {title, body}) => {
    const notificationData = {
        title,
        body
    };
    // Send notification to each FCM token in the array
    for (const token of fcmTokens) {
        await sendPushNotification({ ...notificationData, token });
    }
}