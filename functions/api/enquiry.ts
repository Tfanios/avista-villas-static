type Env = {
  PAYLOAD_URL?: string;
};

export const onRequestPost = async ({
  request,
  env
}: {
  request: Request;
  env: Env;
}) => {
  const form = await request.formData();
  if (form.get("company")) return new Response(null, { status: 204 });

  if (!env.PAYLOAD_URL) {
    return Response.json(
      { ok: false, error: "PAYLOAD_URL is not configured" },
      { status: 500 }
    );
  }

  const body = {
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone") || undefined,
    preferredProperty: form.get("property") || "either",
    arrival: form.get("arrival") || undefined,
    departure: form.get("departure") || undefined,
    guests: Number(form.get("guests")) || undefined,
    message: form.get("message")
  };

  const res = await fetch(`${env.PAYLOAD_URL}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return Response.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
};
