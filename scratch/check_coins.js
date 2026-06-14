const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbsmqytnwtnlhgvwebaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRic21xeXRud3RubGhndndlYmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkxOTkwMiwiZXhwIjoyMDk2NDk1OTAyfQ.YYRKoWkrgOkTmWPJiqy9blEnOxEQpxZ4dMpSMnYioYQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: coins, error: coinErr } = await supabase
    .from('crypto_coins')
    .select('*');
    
  if (coinErr) {
    console.error('Error fetching coins:', coinErr);
  } else {
    console.log('Crypto Coins Config:', JSON.stringify(coins, null, 2));
  }

  const { data: sessions, error: sessErr } = await supabase
    .from('crypto_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (sessErr) {
    console.error('Error fetching sessions:', sessErr);
  } else {
    console.log('Recent Crypto Sessions:', JSON.stringify(sessions, null, 2));
  }
}

run();
