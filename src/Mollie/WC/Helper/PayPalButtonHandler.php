<?php

class Mollie_WC_Helper_PayPalButtonHandler
{
    /**
     * @var Mollie_WC_PayPalButton_AjaxRequests
     */
    private $ajaxRequests;

    /**
     * Mollie_WC_Helper_PayPalHandler constructor.
     *
     * @param Mollie_WC_PayPalButton_AjaxRequests     $ajaxRequests
     */
    public function __construct(Mollie_WC_PayPalButton_AjaxRequests $ajaxRequests)
    {
        $this->ajaxRequests = $ajaxRequests;
    }

    /**
     * Initial method that puts the button in place
     * and adds all the necessary actions
     */
    public function bootstrap($enabledInProduct, $enabledInCart)
    {
        if($enabledInProduct){
            add_action(
                    'woocommerce_after_add_to_cart_form',
                    function () {
                        $this->renderPayPalButton();
                    }
            );
        }
        if($enabledInCart){
            add_action(
                    'woocommerce_cart_totals_after_order_total',
                    function () {
                        $this->renderPayPalButton();
                    }
            );
        }

        admin_url('admin-ajax.php');
        $this->ajaxRequests->bootstrapAjaxRequest();
    }

    /**
     * PayPal button markup
     */
    protected function renderPayPalButton()
    {
        $whichPayPalButton = $this->whichPayPalButton();
        $assetsImagesUrl
                = Mollie_WC_Plugin::getPluginUrl($whichPayPalButton);

        ?>
        <div id="mollie-PayPal-button">
            <?php wp_nonce_field('mollie_PayPal_button'); ?>
            <input type="image" src="<?php echo $assetsImagesUrl?>" alt="PayPal Button">
        </div>
        <?php
    }

    /**
     * Build the name of the button from the settings to return the chosen one
     *
     * @retun string the path of the chosen button image
     */
    protected function whichPayPalButton()
    {
        $paypalSettings = get_option('mollie_wc_gateway_paypal_settings');
        if(!$paypalSettings){
            return "";
        }
        $colorSetting = $paypalSettings['color'];
        $languageSetting = $paypalSettings['language'];
        $fixPath = 'public/images/PayPal_Buttons/';
        $buildButtonName = "{$colorSetting}-{$languageSetting}.png";
        return "{$fixPath}{$buildButtonName}";
    }
}

