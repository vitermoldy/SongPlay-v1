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
    const nameValue = name.value.trim();
    const emailValue = email.value.trim();
    const formats = [...form.querySelectorAll('input[name="format"]:checked')];

    if (!nameValue) problems.push([name, 'Add your name so we know who to reply to.']);
    else showError(name, '');

    if (!emailValue) problems.push([email, 'Add your email so we can reply.']);
    else if (!EMAIL_PATTERN.test(emailValue))
      problems.push([email, 'That email looks incomplete. Check the @ and the part after it.']);
    else showError(email, '');

    if (!formats.length) problems.push([formatSet, 'Pick at least one format.']);
    else showError(formatSet, '');

    for (const [field, message] of problems) showError(field, message);
    return problems;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    const problems = validate();
    if (problems.length) {
      const [first] = problems[0];
      (first.matches('fieldset') ? first.querySelector('input') : first).focus();
      return;
    }

    const data = new FormData(form);
    const nameValue = String(data.get('name')).trim();
    const body = [
      `Name: ${nameValue}`,
      `Email: ${String(data.get('email')).trim()}`,
      `Formats: ${data.getAll('format').join(', ')}`,
      `How many: ${data.get('count')}`,
      '',
      String(data.get('notes') || '').trim(),
    ].join('\n');
    const href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(`Tapes from ${nameValue}`)}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    status.textContent = `Your email app should open with this request filled in. If nothing opened, write to ${REQUEST_EMAIL}.`;
  });

  // Clear a field's error as soon as it is fixed, not on every keystroke before submit.
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target === name && name.value.trim()) showError(name, '');
    if (target === email && EMAIL_PATTERN.test(email.value.trim())) showError(email, '');
    if (target.name === 'format' && form.querySelector('input[name="format"]:checked')) showError(formatSet, '');
  });
}
