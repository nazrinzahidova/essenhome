const policy = require('../../frontend/order-policy');
const ORIGIN = 'https://essenhome.az';
const POLICY_URL = `${ORIGIN}/delivery-returns.html`;
const RETURN_ID = `${ORIGIN}/#return-policy`;
const SHIPPING_ID = `${ORIGIN}/#shipping-policy`;
const destination = () => ({ '@type': 'DefinedRegion', addressCountry: 'AZ' });
const money = value => ({ '@type': 'MonetaryAmount', value, currency: 'AZN' });

function returnPolicy() {
  return { '@type': 'MerchantReturnPolicy', '@id': RETURN_ID, applicableCountry: 'AZ',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: policy.returnDays, merchantReturnLink: POLICY_URL + '#returns',
    description: policy.returnDescription };
}
function shippingService() {
  return { '@type': 'ShippingService', '@id': SHIPPING_ID, name: 'Essen Home çatdırılma',
    description: policy.deliveryDescription, url: POLICY_URL + '#delivery',
    fulfillmentType: 'https://schema.org/FulfillmentTypeDelivery',
    shippingConditions: [
      { '@type': 'ShippingConditions', shippingDestination: destination(),
        orderValue: { '@type': 'MonetaryAmount', minValue: 0, maxValue: 199.98, currency: 'AZN' },
        shippingRate: money(policy.shippingFee) },
      { '@type': 'ShippingConditions', shippingDestination: destination(),
        orderValue: { '@type': 'MonetaryAmount', minValue: policy.freeThreshold, currency: 'AZN' },
        shippingRate: money(0) }
    ] };
}
function organization() {
  return { '@type': 'Organization', '@id': `${ORIGIN}/#store`, name: 'Essen Home', url: ORIGIN,
    hasMerchantReturnPolicy: returnPolicy(), hasShippingService: shippingService() };
}
function offerPolicies(price) {
  return { hasMerchantReturnPolicy: { '@id': RETURN_ID },
    shippingDetails: { '@type': 'OfferShippingDetails', hasShippingService: { '@id': SHIPPING_ID },
      shippingDestination: destination(), shippingRate: money(policy.shippingCost(price)),
      // The owner specified selectable dates, not handling/transit durations. Do not invent those.
      deliveryTime: { '@type': 'ShippingDeliveryTime', cutoffTime: policy.cutoffTime,
        description: policy.deliveryDescription } } };
}
module.exports = { organization, offerPolicies, POLICY_URL };
