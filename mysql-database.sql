-- MySQL dump 10.13  Distrib 8.0.38, for macos14 (arm64)
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
-- Table structure for table `order_dispatch`
--

DROP TABLE IF EXISTS `order_dispatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_dispatch` (
  `order_id` varchar(500) NOT NULL,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` int NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_dispatch`
--

LOCK TABLES `order_dispatch` WRITE;
/*!40000 ALTER TABLE `order_dispatch` DISABLE KEYS */;
INSERT INTO `order_dispatch` VALUES ('00e47649-95c6-491b-95d0-94f5e15769f7',3,2,1,18,'2025-03-25 09:05:04'),('1daa904c-ccb5-4169-9ebd-236eece66e37',3,26,1,2,'2025-03-25 09:05:52'),('1e6e1a94-a7b2-455b-bcec-4628af2b1002',3,26,4,8,'2025-03-25 09:05:46'),('2992376c-c941-4709-bd55-5e01ddf82994',3,26,2,4,'2025-03-25 09:05:46'),('6069de71-cbb2-4f8e-a3f9-21f15bd269ed',3,25,1,8,'2025-03-25 09:05:52'),('6664cd86-5418-47fd-b462-257a90adc14c',3,5,1,19,'2025-03-25 09:05:41'),('75651ac1-5e2e-4a7e-bd04-59c3b59cd4eb',3,26,3,6,'2025-03-25 09:05:41'),('7f221201-1cb9-4778-862d-1530cb6acdb6',3,26,1,2,'2025-03-25 09:05:52'),('bf1733d5-27fa-4e92-82f2-ec7e9afc796a',3,3,2,34,'2025-03-25 09:05:41'),('cbca41d3-317f-4a4f-8531-e298db32a876',3,5,5,95,'2025-03-25 09:05:41'),('db39d844-812d-48c5-afe4-e541c4b81e99',3,6,3,48,'2025-03-25 09:05:52'),('f74052c7-d9e3-47fa-a7ea-d454e3fa531f',3,1,1,15,'2025-03-25 09:04:46');
/*!40000 ALTER TABLE `order_dispatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` varchar(500) NOT NULL,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` int NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('0961d8bc-7310-4e54-baa7-454a7655d3bb',3,3,1,17,'2025-03-28 12:35:09');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
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
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Tom Holland','USA','iamspiderman@gmail.com','123456789','9632012542'),(2,'Tony Stark','USA','iamironman@gmail.com','123456789','7854120365'),(3,'Thanh','Hanoi, Vietnam','thanh@gmail.com','123456','0984536121');
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

-- Dump completed on 2025-05-01 10:09:06
