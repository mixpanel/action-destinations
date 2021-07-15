// Generated file. DO NOT MODIFY IT BY HAND.

export interface Settings {
  /**
   * Token issued by the partner API after verifying the identity of the user account
   */
  accessToken: string
  /**
   * Token provided by the partner API that can be used to request a fresh access token from the authorization server
   */
  refreshToken?: string
  /**
   * Tracking id that uniquely identifies your advertiser account.
   */
  conversionTrackingId: string
}
