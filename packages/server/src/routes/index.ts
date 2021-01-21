import express from 'express'
import destination from './destination'
import asyncHandler from '../lib/async-handler'

const SUPPORTED_CONTENT_TYPES = [
  // Temporarily support "Segment Integrations" content-type
  'application/octet-stream',
  // Cloud Event content-types
  'application/cloudevents+json',
  'application/cloudevents-batch+json'
]

const router = express.Router()

router.post(
  '/actions/:destinationId',
  express.json({
    type: SUPPORTED_CONTENT_TYPES
  }),
  asyncHandler(destination)
)

export default router
