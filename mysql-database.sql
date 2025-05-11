--
-- Host: localhost    Database: pizzazzpizza
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE IF NOT EXISTS `pizzazzpizza` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;
USE `pizzazzpizza`;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `admin_name` varchar(45) NOT NULL,
  `admin_email` varchar(45) NOT NULL,
  `admin_password` varchar(255) NOT NULL, -- Increased length for hashed passwords
  `admin_mobile` varchar(45) NOT NULL,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `admin_email_UNIQUE` (`admin_email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
INSERT INTO `admin` VALUES (1,'Nick Fury','nickfury@gmail.com','123456789','7563259210');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(45) NOT NULL,
  `item_type` varchar(45) NOT NULL,
  `item_category` varchar(45) NOT NULL,
  `item_serving` varchar(45) NOT NULL,
  `item_calories` int NOT NULL,
  `item_price` decimal(10,2) NOT NULL,
  `item_rating` decimal(3,2) DEFAULT 0.00, -- Changed for average rating
  `total_ratings` int DEFAULT 0,          -- New column for total ratings count
  `item_description_long` TEXT DEFAULT NULL, -- New column for detailed description
  `item_img` varchar(255) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` (`item_id`, `item_name`, `item_type`, `item_category`, `item_serving`, `item_calories`, `item_price`, `item_rating`, `total_ratings`, `item_img`, `item_description_long`) VALUES
(1,'Classic Margherita','Vegetarian','pizzas','3',240,16.00,0.00,0,'classic-margherita.jpg', NULL),
(2,'Pepperoni Supreme','House Special','pizzas','3',330,18.00,0.00,0,'pepperoni-supreme.jpg', NULL),
(3,'BBQ Chicken','Non-Vegan','pizzas','3',290,17.00,0.00,0,'bbq-chicken.jpg', NULL),
(4,'Mediterranean Veggie','Vegetarian','pizzas','3',260,16.00,0.00,0,'mediterranean-veggie.jpg', NULL),
(5,'Meat Lovers','Non-Vegan','pizzas','3',380,19.00,0.00,0,'meat-lovers.jpg', NULL),
(6,'Hawaiian','Non-Vegan','pizzas','3',285,16.00,0.00,0,'hawaiian.jpg', NULL),
(7,'Buffalo Chicken','Spicy','pizzas','3',295,17.00,0.00,0,'buffalo-chicken.jpg', NULL),
(8,'Mushroom Truffle','Signature','pizzas','3',270,20.00,0.00,0,'mushroom-truffle.jpg', NULL),
(9,'Quattro Formaggi','Vegetarian','pizzas','3',310,17.00,0.00,0,'quattro-formaggi.jpg', NULL),
(10,'Spicy Diavola','Spicy','pizzas','3',325,18.00,0.00,0,'spicy-diavola.jpg', NULL),
(11,'Pesto Chicken','Non-Vegan','pizzas','3',280,17.00,0.00,0,'pesto-chicken.jpg', NULL),
(12,'Prosciutto & Arugula','Signature','pizzas','3',265,20.00,0.00,0,'prosciutto-arugula.jpg', NULL),
(13,'Supreme','Non-Vegan','pizzas','4',350,18.00,0.00,0,'supreme.jpg', NULL),
(14,'White Pizza','Vegetarian','pizzas','3',290,16.00,0.00,0,'white-pizza.jpg', NULL),
(15,'Spinach & Feta','Vegetarian','pizzas','3',250,16.00,0.00,0,'spinach-feta.jpg', NULL),
(16,'Garlic Knots','Vegetarian','appetizers','1',120,6.00,0.00,0,'garlic-knots.jpg', NULL),
(17,'Mozzarella Sticks','Vegetarian','appetizers','1',160,8.00,0.00,0,'mozzarella-sticks.jpg', NULL),
(18,'Buffalo Wings','Spicy','appetizers','1',190,11.00,0.00,0,'buffalo-wings.jpg', NULL),
(19,'Loaded Potato Skins','Non-Vegan','appetizers','1',140,9.00,0.00,0,'loaded-potato-skins.jpg', NULL),
(20,'Caprese Salad','Gluten-Free','appetizers','3',320,8.00,0.00,0,'caprese-salad.jpg', NULL),
(21,'Chocolate Chip Cookie Pizza','Signature','desserts','3',420,9.00,0.00,0,'chocolate-chip-cookie-pizza.jpg', NULL),
(22,'Cannoli','House Special','desserts','2',280,5.00,0.00,0,'cannoli.jpg', NULL),
(23,'Tiramisu','Signature','desserts','2',350,7.00,0.00,0,'tiramisu.jpg', NULL),
(24,'Cinnamon Knots','Vegetarian','desserts','2',190,6.00,0.00,0,'cinnamon-knots.jpg', NULL),
(25,'Nutella Calzone','Contains Nuts','desserts','3',490,8.00,0.00,0,'nutella-calzone.jpg', NULL),
(26,'Classic Cola','Gluten-Free','beverages','1',150,2.00,0.00,0,'classic-cola.jpg', NULL),
(27,'Lemon-Lime Soda','Gluten-Free','beverages','1',140,2.00,0.00,0,'lemon-lime-soda.jpg', NULL),
(28,'Root Beer','Gluten-Free','beverages','1',160,2.00,0.00,0,'root-beer.jpg', NULL),
(29,'Iced Tea','Organic','beverages','1',90,3.00,0.00,0,'iced-tea.jpg', NULL),
(30,'Italian Soda','Locally Sourced','beverages','1',120,3.00,0.00,0,'italian-soda.jpg', NULL);
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_name` varchar(30) NOT NULL,
  `user_address` varchar(255) NOT NULL,
  `user_email` varchar(45) NOT NULL,
  `user_password` varchar(1000) NOT NULL,
  `user_mobileno` varchar(45) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_email_UNIQUE` (`user_email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Tom Holland','3 Country Club Ave. Tracy, CA 95376, US','iamspiderman@gmail.com','123456789','9632012542'),(2,'Tony Stark','73 Prospect Lane Oceanside, CA 92056, US','iamironman@gmail.com','123456789','7854120365');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
-- Represents an overall customer order.
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `order_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `order_status` VARCHAR(255) DEFAULT 'Pending', -- e.g., Pending, Processing, Shipped, Delivered, Cancelled
  `payment_method` VARCHAR(50), -- e.g., COD, PayPal, Credit Card
  `payment_status` VARCHAR(255) DEFAULT 'Unpaid', -- e.g., Unpaid, Paid, Failed, Refunded
  `shipping_address` TEXT,
  `notes` TEXT DEFAULT NULL, -- Optional notes from the customer
  `delivery_date` DATETIME DEFAULT NULL, -- When the order was actually delivered
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items`
-- Represents individual items within a specific order.
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `price_per_item` DECIMAL(10, 2) NOT NULL, -- Price of the item at the time of order
  `subtotal` DECIMAL(10, 2) NOT NULL, -- quantity * price_per_item
  PRIMARY KEY (`order_item_id`),
  KEY `fk_orderitems_order_id` (`order_id`),
  KEY `fk_orderitems_item_id` (`item_id`),
  CONSTRAINT `fk_orderitems_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orderitems_item_id` FOREIGN KEY (`item_id`) REFERENCES `menu` (`item_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_dispatch`
-- Tracks when an entire order has been dispatched.
--

DROP TABLE IF EXISTS `order_dispatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_dispatch` (
  `dispatch_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `dispatch_datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dispatched_by_admin_id` INT NULL, -- Which admin dispatched it, can be NULL
  PRIMARY KEY (`dispatch_id`),
  UNIQUE KEY `uq_order_dispatch_order_id` (`order_id`), -- An order should only be dispatched once
  KEY `fk_dispatch_order_id` (`order_id`),
  KEY `fk_dispatch_admin_id` (`dispatched_by_admin_id`),
  CONSTRAINT `fk_dispatch_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispatch_admin_id` FOREIGN KEY (`dispatched_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_ratings`
-- Stores individual user ratings and reviews for menu items.
--

DROP TABLE IF EXISTS `item_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_ratings` (
  `rating_id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `rating_value` INT NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5), -- Rating from 1 to 5
  `review_text` TEXT,
  `rating_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_itemratings_item_id` FOREIGN KEY (`item_id`) REFERENCES `menu` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_itemratings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_item_rating` (`user_id`, `item_id`) -- Ensures a user can rate an item only once
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
