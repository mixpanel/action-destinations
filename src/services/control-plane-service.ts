import ControlPlaneService from '@segment/control-plane-service-client'
import { sharedOptions } from '@/services/shared-options'

export const controlPlaneService = new ControlPlaneService({
  name: 'control-plane-service',
  url: 'http://control-plane-service.segment.local',
  ...sharedOptions
})
