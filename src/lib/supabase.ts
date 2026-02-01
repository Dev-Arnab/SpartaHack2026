// Minimal no-op stub for `supabase` used by some UI components.
// This avoids importing the real Supabase client and lets the app run
// locally without connecting to a database. Each method returns a
// promise with a `{ data, error }` shape.

function chainable() {
  const obj: any = {
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    single: async () => ({ data: null, error: null }),
  };

  obj.select = async () => ({ data: [], error: null });
  obj.insert = async () => ({ data: null, error: null });
  obj.update = async () => ({ data: null, error: null });
  obj.from = () => obj;
  return obj;
}

export const supabase = {
  from: () => chainable(),
  // keep API shape for places that may expect createClient-style methods
  rpc: async () => ({ data: null, error: null }),
};
