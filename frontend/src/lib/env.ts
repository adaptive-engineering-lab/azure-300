interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function read(name: string): string {
  const v = import.meta.env[name] as string | undefined;
  if (!v || v.length === 0) {
    throw new Error(
      `Missing required Vite env var ${name}. Copy frontend/.env.example to .env.local and fill it in.`,
    );
  }
  return v;
}

let cached: PublicEnv | null = null;

export function getEnv(): PublicEnv {
  if (cached) return cached;
  cached = {
    supabaseUrl: read('VITE_SUPABASE_URL'),
    supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  };
  return cached;
}
