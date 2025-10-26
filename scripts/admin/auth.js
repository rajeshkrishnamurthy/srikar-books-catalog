// scripts/admin/auth.js
// Intent: keep authentication and UI gating isolated from inventory logic.
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  db,
  doc,
  getDoc,
} from '../lib/firebase.js';

export function initAuth({
  authEl,
  adminEl,
  loginForm,
  emailInput,
  passwordInput,
  authError,
  signOutBtn,
  onAuthed,
}) {
  onAuthStateChanged(auth, async (user) => {
    // Not signed in → show login
    if (!user) {
      authEl.style.display = 'block';
      adminEl.style.display = 'none';
      return;
    }

    try {
      // Check membership in /admins/{uid}
      const snap = await getDoc(doc(db, 'admins', user.uid));
      const ok = snap.exists();

      authEl.style.display = ok ? 'none' : 'block';
      adminEl.style.display = ok ? 'block' : 'none';

      if (ok && typeof onAuthed === 'function') onAuthed(user);
      if (!ok) {
        // Friendly message for authenticated but unauthorized users
        if (authError) {
          authError.hidden = false;
          authError.textContent =
            'Your account is not authorized for admin access.';
        }
      }
    } catch (e) {
      console.error(e);
      if (authError) {
        authError.hidden = false;
        authError.textContent = 'Could not verify admin access.';
      }
      authEl.style.display = 'block';
      adminEl.style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError && (authError.hidden = true);
    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );
    } catch (err) {
      if (authError) {
        authError.hidden = false;
        authError.textContent = err.message;
      }
    }
  });

  signOutBtn.addEventListener('click', () => signOut(auth));
}
