export function createNotification(id: string, title: string, message: string): void {
  chrome.notifications.create(
    id,
    {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('/icons/icon128.png'),
      title: title,
      message: message,
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification Error:', chrome.runtime.lastError.message);
      } else {
        console.log('Notification created:', notificationId);
      }
    },
  );
}
