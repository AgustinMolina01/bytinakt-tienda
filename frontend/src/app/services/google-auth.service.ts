import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  async obtenerTokenId(): Promise<string> {
    const config = environment.firebase;
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error('El acceso con Google todavía no está configurado.');
    }

    const [{ getApp, getApps, initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup }] =
      await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().length ? getApp() : initializeApp(config);
    const credential = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
    return credential.user.getIdToken();
  }
}
