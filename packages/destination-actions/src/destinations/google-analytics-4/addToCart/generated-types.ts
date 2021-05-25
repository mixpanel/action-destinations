// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * Uniquely identifies a user instance of a web client.
   */
  clientId: string
  /**
   * Currency of the purchase or items associated with the event, in 3-letter ISO 4217 format.
   */
  currency?: string
  /**
   * Store or affiliation from which this transaction occurred (e.g. Google Store).
   */
  affiliation?: string
  /**
   * The product identifier (i.e. a unique id or SKU).
   */
  item_id?: string
  /**
   * Product category.
   */
  category?: string
  /**
   * Name of the product being purchased.
   */
  name?: string
  /**
   * Brand associated with the product.
   */
  brand?: string
  /**
   * Variant of the product (e.g. Black).
   */
  variant?: string
  /**
   * Price ($) of the product being purchased, in units of the specified currency parameter.
   */
  price?: number
  /**
   * Item quantity.
   */
  quantity?: number
  /**
   * Coupon code used for a purchase.
   */
  coupon?: string
  /**
   * Position in the product list (ex. 3).
   */
  position?: number
}
