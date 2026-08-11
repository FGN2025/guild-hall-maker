Deno.serve(() => new Response(JSON.stringify(Object.keys(Deno.env.toObject()).sort()), {headers:{"Content-Type":"application/json"}}));
