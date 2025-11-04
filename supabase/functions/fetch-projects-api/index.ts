import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Project {
  id: string;
  name: string;
  client: string;
  project_code?: string;
  project_title?: string;
  project_type: string;
  region: string;
  bwof: boolean;
  start_date_target: string;
  status: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search');
    const clientFilter = url.searchParams.get('client');
    const statusFilter = url.searchParams.get('status');
    const regionFilter = url.searchParams.get('region');

    let query = supabase
      .from('projects')
      .select('id, name, client, project_code, project_title, project_type, region, bwof, start_date_target, status, created_at')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,client.ilike.%${searchQuery}%,project_title.ilike.%${searchQuery}%`);
    }

    if (clientFilter) {
      query = query.eq('client', clientFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (regionFilter) {
      query = query.eq('region', regionFilter);
    }

    const { data: projects, error } = await query;

    if (error) {
      throw error;
    }

    const uniqueClients = [...new Set(projects?.map((p: Project) => p.client) || [])];

    return new Response(
      JSON.stringify({
        projects: projects || [],
        clients: uniqueClients.sort(),
        count: projects?.length || 0,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in fetch-projects-api:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});