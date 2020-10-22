// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * The Project ID of the project your chart belongs to.
 */
export type AppID = number
/**
 * The ID of the chart (found in Amplitude chart's URL) you wish to annotate.
 */
export type ChartID = string
/**
 * The title of your annotation.
 */
export type Title = string
/**
 * Date of the annotation.
 */
export type Date = string
/**
 * Additional details you would like to add to the annotation.
 */
export type AdditionalDetails = string

/**
 * Annotate important dates (feature releases, marketing campaigns, etc.) on Amplitude charts.
 */
export interface AnnotateChart {
  app_id: AppID
  chart_id: ChartID
  label: Title
  date: Date
  details?: AdditionalDetails
}
