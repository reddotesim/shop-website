const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbsmqytnwtnlhgvwebaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRic21xeXRud3RubGhndndlYmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkxOTkwMiwiZXhwIjoyMDk2NDk1OTAyfQ.YYRKoWkrgOkTmWPJiqy9blEnOxEQpxZ4dMpSMnYioYQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*');
    
  if (error) {
    console.error('Error fetching settings:', error);
  } else {
    console.log('System Settings:', JSON.stringify(data, null, 2));
  }
}

run();
