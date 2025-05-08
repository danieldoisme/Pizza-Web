# PizzazzPizza

A traditional Italian-inspired pizza restaurant brought to the web.

## Installation

To run this project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/danieldoisme/Pizza-Web.git
   cd Pizza-Web
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up the database:**

   - Ensure you have MySQL installed and running.
   - The `mysql-database.sql` script will create the database `pizzazzpizza` if it doesn't already exist and then set it up. Run the following command to execute the script:
     ```bash
     mysql -u your_mysql_user -p < mysql-database.sql
     ```
   - Configure your database credentials in the application (e.g., in a `.env` file or directly in `app.js` if not using environment variables).

4. **Run the application:**
   ```bash
   npm start
   ```
   The application should now be running on `http://localhost:3000` (or the port specified in `bin/www`).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
