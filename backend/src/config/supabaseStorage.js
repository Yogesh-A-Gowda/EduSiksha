// src/config/supabaseStorage.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Ensure you add these to your .env file

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service_role for backend uploads

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;