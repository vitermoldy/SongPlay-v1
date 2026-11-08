// TODO(owner): replace with the studio's real inbox before launch.
export const REQUEST_EMAIL = 'hello@songlearn.example';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(field, message) {
  const error = document.getElementById(`${field.id || field.dataset.errorFor}-error`);
  if (message) {
    error.textContent = message;
    error.hidden = false;
  } else {
