const SELECTOR_TOKEN_ELEMENT = '.cardToken'
const SELECTOR_MOLLIE_COMPONENT = '.mollie-component'
const SELECTOR_FORM = 'form.checkout'
const MOLLIE_COMPONENTS_CONTAINER = '.wc_payment_methods'

let mollie = null

function formFrom (element)
{
  return element.closest(SELECTOR_FORM)
}

function componentsContainer ()
{
  return document.querySelector(MOLLIE_COMPONENTS_CONTAINER)
}

function notice (content, type)
{
  const container = componentsContainer()
  const formWrapper = formFrom(container).parentNode || null
  const mollieNotice = document.querySelector('#mollie-notice')
  const template = `
      <div id="mollie-notice" class="woocommerce-${type}">
        Credit Card: ${content}
      </div>
    `

  mollieNotice && mollieNotice.remove()

  if (!formWrapper) {
    alert(content)
    return
  }

  formWrapper.insertAdjacentHTML('beforebegin', template)

  scrollToNotice()
}

function scrollToNotice ()
{
  var scrollElement = document.querySelector('#mollie-notice')

  if (!scrollElement) {
    scrollElement = document.querySelector(MOLLIE_COMPONENTS_CONTAINER)
  }
  jQuery.scroll_to_notices(jQuery(scrollElement))
}

function mountComponents (mollie, components, settings)
{
  for (const componentName in components) {
    const component = mollie.createComponent(componentName, settings)
    const container = document.querySelector('.mollie-components')

    container.insertAdjacentHTML('beforeend', `<div id="${componentName}"></div>`)
    component.mount(`#${componentName}`)

    const currentComponent = document.querySelector(`.mollie-component--${componentName}`)

    if (!currentComponent) {
      continue
    }

    currentComponent.insertAdjacentHTML(
      'beforebegin',
      `<b class="mollie-component-label">${components[componentName].label}</b>`
    )
    currentComponent.insertAdjacentHTML(
      'afterend',
      `<div role="alert" id="${componentName}-errors"></div>`
    )
  }
}

function insertTokenField (componentsContainer)
{
  componentsContainer
    .querySelector('.mollie-components')
    .insertAdjacentHTML(
      'beforeend',
      '<input type="hidden" name="cardToken" class="cardToken" value="" />'
  )
}

function returnFalse ()
{
  return false
}

async function retrievePaymentToken (mollie)
{
  // TODO There's a problem with invalid request errors. see https://molliehq.slack.com/archives/CD7BV7JBX/p1574787556115400

  const { token, error } = await mollie.createToken(SELECTOR_TOKEN_ELEMENT)

  if (error) {
    throw new Error(error.message || '')
  }

  return token
}

function assignTokenValue (token, componentsContainer)
{
  const tokenFieldElement = componentsContainer.querySelector(SELECTOR_TOKEN_ELEMENT)

  if (!tokenFieldElement) {
    return
  }

  tokenFieldElement.value = token
  tokenFieldElement.setAttribute('value', token)
}

function componentsAlreadyExistsUnder (mollieComponents)
{
  return mollieComponents.querySelector(SELECTOR_MOLLIE_COMPONENT)
}

function turnMollieComponentsSubmissionOff (form)
{
  form.off('checkout_place_order', returnFalse)
  form.off('submit', submitForm)
}

async function submitForm (evt, mollie, gateway, componentsContainer)
{
  const form = jQuery(formFrom(componentsContainer))

  if (!document.querySelector(`#payment_method_mollie_wc_gateway_${gateway}`).checked) {
    turnMollieComponentsSubmissionOff(form)
    return
  }

  evt.preventDefault()
  evt.stopImmediatePropagation()

  let token = ''

  try {
    token = await retrievePaymentToken(mollie)
  } catch (error) {
    // TODO Add default error message
    error.message && notice(error.message, 'error')
    return
  }

  assignTokenValue(token, componentsContainer)
  turnMollieComponentsSubmissionOff(form)

  form.submit()
}

function initializeComponentsWithSettings (mollieComponentsSettings)
{
  const merchantProfileId = mollieComponentsSettings.merchantProfileId || null
  const componentsSelectors = mollieComponentsSettings.components || []
  const componentSettings = mollieComponentsSettings.componentSettings || []
  const enabledGateways = mollieComponentsSettings.enabledGateways || []

  enabledGateways.forEach(gateway =>
  {
    const componentsContainer = document.querySelector(`.payment_method_mollie_wc_gateway_${gateway}`)

    if (!componentsContainer) {
      return
    }

    const form = formFrom(componentsContainer)
    const $form = jQuery(form)

    if (!form) {
      console.warn('Cannot mount Mollie Components, no form found.')
    }

    if (componentsAlreadyExistsUnder(componentsContainer)) {
      return
    }

    const mollie = mollieInstance(merchantProfileId, componentSettings)
    mountComponents(mollie, componentsSelectors, componentSettings[gateway])

    insertTokenField(componentsContainer)

    // TODO What if this is not the latest callback executed? If the next will return true this
    //      will not block the checkout.
    $form.on('checkout_place_order', returnFalse)
    // TODO Not trigger when in checkout pay page
    $form.on('submit', evt =>
    {
      submitForm(evt, mollie, gateway, componentsContainer)
    })
  })
}

function mollieInstance (merchantProfileId, settings)
{
  if (null === mollie && merchantProfileId) {
    mollie = new Mollie(merchantProfileId, settings)
  }

  return mollie
}

(function (window, mollieComponentsSettings, Mollie, jQuery)
  {
    jQuery(document).on(
      'updated_checkout',
      () => initializeComponentsWithSettings(mollieComponentsSettings)
    )
  }
)(
  window,
  window.mollieComponentsSettings,
  window.Mollie,
  jQuery
)
