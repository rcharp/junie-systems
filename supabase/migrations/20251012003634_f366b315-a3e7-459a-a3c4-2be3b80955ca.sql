-- Fix typo in business_types table: restuaruant -> restaurant
UPDATE business_types 
SET value = 'restaurant' 
WHERE value = 'restuaruant';