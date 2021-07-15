import { DestinationDefinition, InvalidAuthenticationError } from '@segment/actions-core'
import type { Settings } from './generated-types'
import postConversion from './postConversion'

interface RefreshTokenResponse {
  access_token: string
  scope: string
  expires_in: number
  token_type: string
}
/*
interface UserInfoResponse {
  name?: string
  email: string
}
*/

const destination: DestinationDefinition<Settings> = {
  name: 'Actions Google Enhanced Conversions',
  authentication: {
    scheme: 'oauth2',
    fields: {
      conversionTrackingId: {
        label: 'Conversion Tracking ID',
        description: 'Tracking id that uniquely identifies your advertiser account.',
        type: 'string',
        required: true
      }
    },
    testAuthentication: async (_request) => {
      /* NOTE: Commenting this out until we surface the OAuth login flow in the Actions configuration wizard
      const res = await request<UserInfoResponse>('https://www.googleapis.com/oauth2/v3/userinfo', {
        method: 'GET'
      })

      return { name: res.data.name || res.data.email }
      */
      return true
    },
    refreshAccessToken: async (request, { settings }, oauthConfig) => {
      if (!settings.refreshToken) {
        throw new InvalidAuthenticationError('Refresh token is not available')
      }

      const res = await request<RefreshTokenResponse>('https://www.googleapis.com/oauth2/v4/token', {
        method: 'POST',
        body: new URLSearchParams({
          refresh_token: settings.refreshToken,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          grant_type: 'refresh_token'
        })
      })

      return { accessToken: res.data.access_token }
    }
  },
  extendRequest({ settings }) {
    return {
      headers: {
        authorization: `Bearer ${settings.accessToken}`
      },
      searchParams: {
        conversion_tracking_id: settings.conversionTrackingId
      }
    }
  },
  actions: {
    postConversion
  }
}

export default destination
