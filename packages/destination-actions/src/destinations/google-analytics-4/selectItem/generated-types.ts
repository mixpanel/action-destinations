// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * Uniquely identifies a user instance of a web client.
   */
  client_id: string
  /**
   * The name of the list in which the item was presented to the user.
   */
  item_list_name?: string
  /**
   * The ID of the list in which the item was presented to the user.
   */
  item_list_id?: string
  /**
   * The product identifier (i.e. a unique id or SKU).
   */
  item_id?: string
  /**
   * Name of the product being purchased.
   */
  item_name?: string
  /**
   * Product category.
   */
  category?: string
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
