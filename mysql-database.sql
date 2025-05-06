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
  `admin_password` varchar(45) NOT NULL,
  `admin_mobile` varchar(45) NOT NULL,
  PRIMARY KEY (`admin_id`)
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
  `item_price` int NOT NULL,
  `item_rating` varchar(45) NOT NULL,
  `item_img` varchar(255) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (1,'Classic Margherita','Vegetarian','pizzas','3',240,16,'4.7','classic-margherita.jpg'),(2,'Pepperoni Supreme','House Special','pizzas','3',330,18,'4.9','pepperoni-supreme.jpg'),(3,'BBQ Chicken','Non-Vegan','pizzas','3',290,17,'4.6','bbq-chicken.jpg'),(4,'Mediterranean Veggie','Vegetarian','pizzas','3',260,16,'4.5','mediterranean-veggie.jpg'),(5,'Meat Lovers','Non-Vegan','pizzas','3',380,19,'4.8','meat-lovers.jpg'),(6,'Hawaiian','Non-Vegan','pizzas','3',285,16,'4.3','hawaiian.jpg'),(7,'Buffalo Chicken','Spicy','pizzas','3',295,17,'4.6','buffalo-chicken.jpg'),(8,'Mushroom Truffle','Signature','pizzas','3',270,20,'4.8','mushroom-truffle.jpg'),(9,'Quattro Formaggi','Vegetarian','pizzas','3',310,17,'4.7','quattro-formaggi.jpg'),(10,'Spicy Diavola','Spicy','pizzas','3',325,18,'4.5','spicy-diavola.jpg'),(11,'Pesto Chicken','Non-Vegan','pizzas','3',280,17,'4.4','pesto-chicken.jpg'),(12,'Prosciutto & Arugula','Signature','pizzas','3',265,20,'4.7','prosciutto-arugula.jpg'),(13,'Supreme','Non-Vegan','pizzas','4',350,18,'4.6','supreme.jpg'),(14,'White Pizza','Vegetarian','pizzas','3',290,16,'4.4','white-pizza.jpg'),(15,'Spinach & Feta','Vegetarian','pizzas','3',250,16,'4.3','spinach-feta.jpg'),(16,'Garlic Knots','Vegetarian','appetizers','1',120,6,'4.8','garlic-knots.jpg'),(17,'Mozzarella Sticks','Vegetarian','appetizers','1',160,8,'4.7','mozzarella-sticks.jpg'),(18,'Buffalo Wings','Spicy','appetizers','1',190,11,'4.6','buffalo-wings.jpg'),(19,'Loaded Potato Skins','Non-Vegan','appetizers','1',140,9,'4.5','loaded-potato-skins.jpg'),(20,'Caprese Salad','Gluten-Free','appetizers','3',320,8,'4.4','caprese-salad.jpg'),(21,'Chocolate Chip Cookie Pizza','Signature','desserts','3',420,9,'4.9','chocolate-chip-cookie-pizza.jpg'),(22,'Cannoli','House Special','desserts','2',280,5,'4.8','cannoli.jpg'),(23,'Tiramisu','Signature','desserts','2',350,7,'4.7','tiramisu.jpg'),(24,'Cinnamon Knots','Vegetarian','desserts','2',190,6,'4.6','cinnamon-knots.jpg'),(25,'Nutella Calzone','Contains Nuts','desserts','3',490,8,'4.9','nutella-calzone.jpg'),(26,'Classic Cola','Gluten-Free','beverages','1',150,2,'4.5','classic-cola.jpg'),(27,'Lemon-Lime Soda','Gluten-Free','beverages','1',140,2,'4.4','lemon-lime-soda.jpg'),(28,'Root Beer','Gluten-Free','beverages','1',160,2,'4.6','root-beer.jpg'),(29,'Iced Tea','Organic','beverages','1',90,3,'4.3','iced-tea.jpg'),(30,'Italian Soda','Locally Sourced','beverages','1',120,3,'4.7','italian-soda.jpg');
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
-- Represents an overall customer order.
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `order_datetime` DATETIME NOT NULL,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(50) NULL,
  `payment_id` VARCHAR(255) NULL,
  `delivery_address` VARCHAR(500) NOT NULL,
  `order_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`order_id`),
  KEY `fk_orders_user_id` (`user_id`),
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
  `price_per_item` DECIMAL(10, 2) NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
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
  `dispatch_datetime` DATETIME NOT NULL,
  `dispatched_by_admin_id` INT NULL,
  PRIMARY KEY (`dispatch_id`),
  UNIQUE KEY `uq_order_dispatch_order_id` (`order_id`),
  KEY `fk_dispatch_order_id` (`order_id`),
  KEY `fk_dispatch_admin_id` (`dispatched_by_admin_id`),
  CONSTRAINT `fk_dispatch_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispatch_admin_id` FOREIGN KEY (`dispatched_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  PRIMARY KEY (`user_id`)
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
