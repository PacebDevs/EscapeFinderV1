# Configuración OAuth - Google y Apple Sign-In

## 🔵 Google Sign-In

### 1. Crear proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Sign-In API** (OAuth 2.0)

### 2. Crear credenciales OAuth 2.0

#### Para Web (Backend)
1. Ve a **APIs & Services** → **Credentials**
2. Click en **Create Credentials** → **OAuth client ID**
3. Tipo: **Web application**
4. Nombre: `EscapeFinder Backend`
5. Authorized redirect URIs: (déjalo vacío por ahora)
6. Copia el **Client ID** que termina en `.apps.googleusercontent.com`

#### Para Android
1. Click en **Create Credentials** → **OAuth client ID**
2. Tipo: **Android**
3. Nombre: `EscapeFinder Android`
4. Package name: `io.ionic.starter`
5. SHA-1 certificate fingerprint:
   ```bash
   # Para debug (desarrollo)
   cd android
   ./gradlew signingReport
   # Busca el SHA-1 de "Variant: debug"
   ```
6. Click **Create**

### 3. Configurar el proyecto

#### Backend (.env)
Agrega el Client ID de **Web application**:
```env
GOOGLE_CLIENT_ID=123456789-xxxxxx.apps.googleusercontent.com
```

#### Frontend (capacitor.config.ts)
Ya está configurado con placeholder. Reemplaza con tu Client ID de **Web application**:
```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: '123456789-xxxxxx.apps.googleusercontent.com',
  forceCodeForRefreshToken: true
}
```

#### Android (strings.xml)
Ya está configurado. Reemplaza con el mismo Client ID de **Web application**:
```xml
<string name="server_client_id">123456789-xxxxxx.apps.googleusercontent.com</string>
```

### 4. Sincronizar y compilar
```bash
npx cap sync
cd android
./gradlew clean
./gradlew assembleDebug
```

---

## 🍎 Apple Sign-In

### 1. Configurar en Apple Developer

1. Ve a [Apple Developer Console](https://developer.apple.com/account)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Selecciona tu App ID (`io.ionic.starter`)
4. Habilita **Sign In with Apple**
5. Click **Edit** → **Configure**
6. Agrega tu dominio: `escapefinder.com`
7. Return URLs: `https://escapefinder.com/auth/apple`
8. Click **Save**

### 2. Crear Service ID (opcional para Web)
1. Click **+** → **Services IDs**
2. Description: `EscapeFinder Web`
3. Identifier: `io.ionic.starter.service`
4. Habilita **Sign In with Apple**
5. Configure domains y return URLs igual que arriba

### 3. Configurar proyecto Android

#### AndroidManifest.xml
El plugin ya debería haber agregado automáticamente:
```xml
<activity android:name="com.capacitor.plugin.appleauth.AppleSignInActivity" />
```

### 4. Configurar Backend
Para Apple, no necesitas Client ID, pero SÍ debes verificar el JWT con las claves públicas de Apple.

En producción, reemplaza en `authService.js`:
```javascript
// En lugar de jwt.decode(), usar verificación real:
const applePublicKeys = await fetch('https://appleid.apple.com/auth/keys').then(r => r.json());
const verified = await verifyAppleToken(identityToken, applePublicKeys);
```

---

## ✅ Testing

### Google Sign-In
1. Compila la app: `npx cap run android`
2. Click en "Google" en la pantalla de login
3. Selecciona tu cuenta de Google
4. Deberías ser redirigido a `/tabs/tab1`
5. Verifica en backend que el usuario se creó/vinculó correctamente

### Apple Sign-In
1. **Solo funciona en dispositivos iOS reales** (no emulador)
2. Compila para iOS: `npx cap run ios`
3. Click en "Apple"
4. Usa Face ID / Touch ID para autenticar
5. Acepta compartir email
6. Deberías ser redirigido a `/tabs/tab1`

---

## 🐛 Troubleshooting

### Google: "Error 10: Developer error"
- Verifica que el SHA-1 del certificado de debug coincida con el configurado en Google Cloud
- Regenera: `cd android && ./gradlew signingReport`

### Google: "idpiframe_initialization_failed"
- En desarrollo web (`ionic serve`), Google Auth no funciona
- Usa dispositivo Android real o emulador

### Apple: "Invalid client"
- Verifica que el Bundle ID coincida con el App ID configurado
- Asegúrate de que Sign In with Apple esté habilitado en el App ID

### Backend: "Token inválido"
- Verifica que `GOOGLE_CLIENT_ID` en `.env` coincida con el de `capacitor.config.ts`
- Para Apple, implementa verificación real del JWT en producción

---

## 📝 Notas importantes

1. **Mismo Client ID**: Usa el mismo Google Client ID en backend, frontend y Android
2. **SHA-1**: El SHA-1 debe coincidir con el certificado que usas para firmar la APK
3. **Producción**: Para release, genera nuevo SHA-1 del keystore de producción
4. **Apple**: Solo funciona en dispositivos iOS reales con iOS 13+
5. **Email único**: Si un usuario se registra con email/password y luego intenta OAuth, se vinculará automáticamente
6. **Password null**: Usuarios OAuth tienen `password_hash = NULL` en la base de datos
