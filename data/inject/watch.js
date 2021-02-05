window.isReceivingFormInput = false;

window.addEventListener('keydown', ({keyCode, target}) => {
  if (keyCode >= 48 && keyCode <= 90 && target.tagName) {
    if (
      target.tagName.toUpperCase() === 'INPUT' ||
      target.tagName.toUpperCase() === 'TEXTAREA' ||
      target.tagName.toUpperCase() === 'FORM' ||
      target.isContentEditable === true ||
      target.type === 'application/pdf'
    ) {
      window.isReceivingFormInput = true;
    }
  }
}, true);
