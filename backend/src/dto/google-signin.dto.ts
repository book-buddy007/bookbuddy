import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSignInDto {
  /**
   * Google ID token (JWT) obtained on the client via Google Sign-In.
   * Verified server-side against GOOGLE_OAUTH_CLIENT_IDS before we trust
   * any of the profile claims (email, name, sub) inside it.
   */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
