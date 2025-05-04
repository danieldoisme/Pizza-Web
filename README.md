# PizzazzPizza

A traditional Italian-inspired pizza restaurant brought to the web.

## Features

- Secure user authentication and account management
- Interactive and responsive menu browsing experience
- Customizable pizza and food ordering options
- Streamlined and secure checkout process
- Real-time order and delivery tracking functionality
- Comprehensive order history and saved preferences
- Mobile-friendly responsive design for ordering on any device

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express.js
- Template Engine: EJS (Embedded JavaScript)
- Database: MySQL
- Additional: Swiper.js, Fancy Box, Custom CSS animations

## TODO:

Before this, the web app is currently in simulation environment, where there has not been any Payment Gateways, now let's implement the Payment Option for the customer after they confirm their cart.
The Payment Options will be implemented are:

- Cash On Delivery (COD)
- PayPal (using PayPal sandbox developer environment)
- Credit/Debit Card (PayPal checkout button also have this)
  After the user click on "Buy Now" button on /cart page, instead of direct to /confirmation page, user will be guided to /checkout page.
  On this page, the COD layout will be on the left, make up for 2/3 portions of the page. And the online payment options will be on the right with the remaining portions.
  The COD option provides user with existing address, OR user can fill in a different address with a form below the existing address. With a button at the end to confirm COD payment option.
  The online payment options will be implemented with the help of PayPal developer tools, specifically PayPal Checkout. With the helper tools, there should be a PayPal button, and Credit/Debit Card button. This PayPal tools should be served as a hosted service, which means our website only provides the interfaces, any logic behind the buttons will be handled by PayPal.
