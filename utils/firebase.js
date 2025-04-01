const admin = require('firebase-admin');

async function sendPushNotification(notificationData) {
    const message = {
        notification: {
            title: notificationData.title,
            body: notificationData.body,
        },
        token: notificationData.token, // Replace with user's device token
    };

    try {
        await admin.messaging().send(message); // Use admin.messaging() directly
        console.log("Push Notification sent:", notificationData);
    } catch (error) {
        console.error("Error sending Push Notification:", error);
    }
}

module.exports = sendPushNotification;
