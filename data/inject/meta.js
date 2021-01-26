{
  const top = window.top === window;
  (top ? {
    'time': performance.timing.domLoading,
    'audible': Boolean(document.pictureInPictureElement),
    'permission': Notification.permission === 'granted',
    'ready': document.readyState === 'complete' || document.readyState === 'loaded',
    'memory': performance && performance.memory ? performance.memory.totalJSHeapSize : false,
    'forms': window.isReceivingFormInput || false
  } : {
    'audible': Boolean(document.pictureInPictureElement),
    'forms': window.isReceivingFormInput || false
  })
}
