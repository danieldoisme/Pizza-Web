CREATE DATABASE  IF NOT EXISTS `pizzazzpizza` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `pizzazzpizza`;
-- MySQL dump 10.13  Distrib 8.0.38
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
  `admin_password` varchar(255) NOT NULL,
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
INSERT INTO `admin` VALUES (1,'SA','sa@example.com','$2b$10$CQZxid9ooPeD5Vcp7WZPW.c/avSdvdwQnTec.Wkjfqa2YlTsBtBGq','0987654321');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_subscriptions`
--

DROP TABLE IF EXISTS `email_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `user_id` int DEFAULT NULL,
  `is_subscribed` tinyint(1) DEFAULT '1',
  `subscribed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `unsubscribed_at` datetime DEFAULT NULL,
  `unsubscribe_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `fk_subscriptions_user_id_idx` (`user_id`),
  KEY `idx_unsubscribe_token` (`unsubscribe_token`),
  CONSTRAINT `fk_subscriptions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_subscriptions`
--

LOCK TABLES `email_subscriptions` WRITE;
/*!40000 ALTER TABLE `email_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_ratings`
--

DROP TABLE IF EXISTS `item_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_ratings` (
  `rating_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating_value` int NOT NULL,
  `review_text` text,
  `rating_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_user_item_rating` (`user_id`,`item_id`),
  KEY `fk_itemratings_item_id` (`item_id`),
  CONSTRAINT `fk_itemratings_item_id` FOREIGN KEY (`item_id`) REFERENCES `menu` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_itemratings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `item_ratings_chk_1` CHECK (((`rating_value` >= 1) and (`rating_value` <= 5)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_ratings`
--

LOCK TABLES `item_ratings` WRITE;
/*!40000 ALTER TABLE `item_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_ratings` ENABLE KEYS */;
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
  `item_rating` decimal(3,2) DEFAULT '0.00',
  `total_ratings` int DEFAULT '0',
  `item_description_long` text,
  `item_img_blob` mediumblob,
  `item_img_mimetype` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (1,'Classic Margherita','Vegetarian','Pizzas','3',240,16.00,0.00,0,NULL,NULL,NULL),(2,'Pepperoni Supreme','House Special','Pizzas','3',330,18.00,0.00,0,NULL,NULL,NULL),(3,'BBQ Chicken','Non-Vegan','Pizzas','3',290,17.00,0.00,0,NULL,NULL,NULL),(4,'Mediterranean Veggie','Vegetarian','Pizzas','3',260,16.00,0.00,0,NULL,NULL,NULL),(5,'Meat Lovers','Non-Vegan','Pizzas','3',380,19.00,0.00,0,NULL,NULL,NULL),(6,'Hawaiian','Non-Vegan','Pizzas','3',285,16.00,0.00,0,NULL,NULL,NULL),(7,'Buffalo Chicken','Spicy','Pizzas','3',295,17.00,0.00,0,NULL,NULL,NULL),(8,'Mushroom Truffle','Signature','Pizzas','3',270,20.00,0.00,0,NULL,NULL,NULL),(9,'Quattro Formaggi','Vegetarian','Pizzas','3',310,17.00,0.00,0,NULL,NULL,NULL),(10,'Spicy Diavola','Spicy','Pizzas','3',325,18.00,0.00,0,NULL,NULL,NULL),(11,'Pesto Chicken','Non-Vegan','Pizzas','3',280,17.00,0.00,0,NULL,NULL,NULL),(12,'Prosciutto & Arugula','Signature','Pizzas','3',265,20.00,0.00,0,NULL,NULL,NULL),(13,'Supreme','Non-Vegan','Pizzas','4',350,18.00,0.00,0,NULL,NULL,NULL),(14,'White Pizza','Vegetarian','Pizzas','3',290,16.00,0.00,0,NULL,NULL,NULL),(15,'Spinach & Feta','Vegetarian','Pizzas','3',250,16.00,0.00,0,NULL,NULL,NULL),(16,'Garlic Knots','Vegetarian','Appetizers','1',120,6.00,0.00,0,NULL,NULL,NULL),(17,'Mozzarella Sticks','Vegetarian','Appetizers','1',160,8.00,0.00,0,NULL,NULL,NULL),(18,'Buffalo Wings','Spicy','Appetizers','1',190,11.00,0.00,0,NULL,NULL,NULL),(19,'Loaded Potato Skins','Non-Vegan','Appetizers','1',140,9.00,0.00,0,NULL,NULL,NULL),(20,'Caprese Salad','Gluten-Free','Appetizers','3',320,8.00,0.00,0,NULL,NULL,NULL),(21,'Chocolate Chip Cookie Pizza','Signature','Desserts','3',420,9.00,0.00,0,NULL,NULL,NULL),(22,'Cannoli','House Special','Desserts','2',280,5.00,0.00,0,NULL,NULL,NULL),(23,'Tiramisu','Signature','Desserts','2',350,7.00,0.00,0,NULL,NULL,NULL),(24,'Cinnamon Knots','Vegetarian','Desserts','2',190,6.00,0.00,0,NULL,NULL,NULL),(25,'Nutella Calzone','Contains Nuts','Desserts','3',490,8.00,0.00,0,NULL,NULL,NULL),(26,'Classic Cola','Gluten-Free','Beverages','1',150,2.00,0.00,0,NULL,NULL,NULL),(27,'Lemon-Lime Soda','Gluten-Free','Beverages','1',140,2.00,0.00,0,NULL,NULL,NULL),(28,'Root Beer','Gluten-Free','Beverages','1',160,2.00,0.00,0,NULL,NULL,NULL),(29,'Iced Tea','Organic','Beverages','1',90,3.00,0.00,0,NULL,NULL,NULL),(30,'Italian Soda','Locally Sourced','Beverages','1',120,3.00,0.00,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_dispatch`
--

DROP TABLE IF EXISTS `order_dispatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_dispatch` (
  `dispatch_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `dispatch_datetime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dispatched_by_admin_id` int DEFAULT NULL,
  `dispatch_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`dispatch_id`),
  UNIQUE KEY `uq_order_dispatch_order_id` (`order_id`),
  KEY `fk_dispatch_order_id` (`order_id`),
  KEY `fk_dispatch_admin_id` (`dispatched_by_admin_id`),
  CONSTRAINT `fk_dispatch_admin_id` FOREIGN KEY (`dispatched_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dispatch_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_dispatch`
--

LOCK TABLES `order_dispatch` WRITE;
/*!40000 ALTER TABLE `order_dispatch` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_dispatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price_per_item` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `fk_orderitems_order_id` (`order_id`),
  KEY `fk_orderitems_item_id` (`item_id`),
  CONSTRAINT `fk_orderitems_item_id` FOREIGN KEY (`item_id`) REFERENCES `menu` (`item_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orderitems_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `order_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `order_status` varchar(255) DEFAULT 'Pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_status` varchar(255) DEFAULT 'Unpaid',
  `shipping_address` text,
  `notes` text,
  `delivery_date` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `fk_orders_user_id` (`user_id`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_UNIQUE` (`token`),
  KEY `fk_password_reset_user_id_idx` (`user_id`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion_banners`
--

DROP TABLE IF EXISTS `promotion_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_banners` (
  `banner_id` int NOT NULL AUTO_INCREMENT,
  `image_blob` longblob,
  `image_mimetype` varchar(50) DEFAULT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_banners`
--

LOCK TABLES `promotion_banners` WRITE;
/*!40000 ALTER TABLE `promotion_banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_cart_items`
--

DROP TABLE IF EXISTS `user_cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_cart_items` (
  `user_cart_item_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `added_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_cart_item_id`),
  KEY `fk_user_cart_user_id_idx` (`user_id`),
  KEY `fk_user_cart_item_id_idx` (`item_id`),
  CONSTRAINT `fk_user_cart_item_id` FOREIGN KEY (`item_id`) REFERENCES `menu` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_cart_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_cart_items`
--

LOCK TABLES `user_cart_items` WRITE;
/*!40000 ALTER TABLE `user_cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_cart_items` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Do Duc Thanh','48 Giai Phong Lane, Hai Ba Trung District, Hanoi, 100000, Vietnam','thanhdd@stu.ptit.edu.vn','$2b$10$jXtOSPTM4EdtSnjX8.1s6Oj2z8Nhwk5ej5JV3UZCLZv6g0G5qcAxG','0973586115');
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
