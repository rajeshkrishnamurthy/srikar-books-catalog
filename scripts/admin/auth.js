// Intent: keep authentication and UI gating isolated from inventory logic.
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '../lib/firebase.js';
import { settings } from '../config.js';

export function initAuth({ authEl, adminEl, loginForm, emailInput, passwordInput, authError, signOutBtn, onAuthed }){
  const adminEmails = new Set((settings.adminEmails || []).map(e => String(e).toLowerCase()));

  onAuthStateChanged(auth, (user) => {
    const ok = !!user && adminEmails.has((user.email || '').toLowerCase());
    authEl.style.display = ok ? 'none' : 'block';
    adminEl.style.display = ok ? 'block' : 'none';
    if (ok && typeof onAuthed === 'function') onAuthed(user);
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.hidden = true;
    try {
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    } catch (err) {
      authError.hidden = false;
      authError.textContent = err.message;
    }
  });

  signOutBtn.addEventListener('click', () => signOut(auth));
}
