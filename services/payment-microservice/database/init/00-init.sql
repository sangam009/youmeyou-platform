-- Initialize Payment Service Database
-- This script creates the database and user if they don't exist

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS payment_service;

-- Create user if not exists (MySQL 8.0+ syntax)
CREATE USER IF NOT EXISTS 'paymentuser'@'%' IDENTIFIED BY 'paymentpassword';

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON payment_service.* TO 'paymentuser'@'%';

-- Make sure privileges are applied
FLUSH PRIVILEGES; 