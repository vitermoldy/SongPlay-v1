// TODO(owner): replace with the studio's real inbox before launch.
export const REQUEST_EMAIL = 'hello@songlearn.example';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(field, message) {
  const error = document.getElementById(`${field.id || field.dataset.errorFor}-error`);
  if (message) {
    error.textContent = message;
    error.hidden = false;
  } else {
    error.textContent = '';
    error.hidden = true;
  }
  if (field.matches('input, select, textarea')) field.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function initRequestForm(form) {
  const name = form.querySelector('#f-name');
  const email = form.querySelector('#f-email');
  const formatSet = form.querySelector('fieldset');
  formatSet.dataset.errorFor = 'f-format';
  const status = form.querySelector('[data-request-status]');

  function validate() {
    const problems = [];
