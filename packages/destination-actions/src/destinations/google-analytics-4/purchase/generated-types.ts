// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * Uniquely identifies a user instance of a web client.
   */
  clientId: string
  /**
   * Coupon code used for a purchase.
   */
  coupon?: string
  /**
   * Currency of the purchase or items associated with the event, in 3-letter ISO 4217 format.
   */
  currency: string
  /**
   * The unique identifier of a transaction.
   */
  orderId: string
  /**
   * Store or affiliation from which this transaction occurred (e.g. Google Store).
   */
  affiliation?: string
  /**
   * The list of products purchased.
   */
  products?: {
    /**
     * Identifier for the product being purchased.
     */
    product_id?: string
    /**
     * Sku of the product being purchased.
     */
    sku?: string
    /**
     * Name of the product being purchased.
     */
    name?: string
    /**
     * Item quantity.
     */
    quantity?: number
    /**
     * Coupon code used for a purchase.
     */
    coupon?: string
    /**
     * Brand associated with the product.
     */
    brand?: string
    /**
     * Product category.
     */
    category?: string
    /**
     * Variant of the product (e.g. Black).
     */
    variant?: string
    /**
     * Price ($) of the product being purchased, in units of the specified currency parameter.
     */
    price?: number
  }[]
  /**
   * Shipping cost associated with the transaction.
   */
  shipping?: number
  /**
   * Total tax associated with the transaction.
   */
  tax?: number
  /**
   * The monetary value of the event, in units of the specified currency parameter.
   */
  total?: number
}
