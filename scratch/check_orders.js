const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbsmqytnwtnlhgvwebaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRic21xeXRud3RubGhndndlYmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkxOTkwMiwiZXhwIjoyMDk2NDk1OTAyfQ.YYRKoWkrgOkTmWPJiqy9blEnOxEQpxZ4dMpSMnYioYQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, order_type, amount_eur, customer_email, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching orders:', error);
  } else {
    console.log('Recent Orders:', JSON.stringify(data, null, 2));
  }
}

run();
