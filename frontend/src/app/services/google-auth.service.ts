import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  async obtenerTokenId(): Promise<string> {
    const auth = await this.obtenerAuth();
    const [{ GoogleAuthProvider, signInWithPopup }] = await Promise.all([
      import('firebase/auth')
    ]);
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    return credential.user.getIdToken();
  }

  async cerrarSesion(): Promise<void> {
    const auth = await this.obtenerAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  }

  private async obtenerAuth() {
    const config = environment.firebase;
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error('El acceso con Google todavía no está configurado.');
    }

    const [{ getApp, getApps, initializeApp }, { getAuth }] =
      await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().length ? getApp() : initializeApp(config);
    return getAuth(app);
  }
}
