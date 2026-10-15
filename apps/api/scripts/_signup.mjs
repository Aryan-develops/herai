// Dev-script helper: registers through the real API, then confirms the email with the service-role client
// (the emailed link can't be clicked from a script) and logs in. Returns the user id and session.
export async function registerAndVerify(API, admin, body) {
  const res = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (res.status !== 201 || !j.needsVerification) throw new Error(`register failed: ${res.status} ${JSON.stringify(j)}`);

  const target = body.email.toLowerCase();
  let id = null;
  for (let page = 1; page <= 20 && !id; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    id = data?.users.find((u) => u.email?.toLowerCase() === target)?.id ?? null;
    if (!data || data.users.length < 200) break;
  }
  if (!id) throw new Error(`registered user not found: ${body.email}`);
  const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
  if (error) throw error;

  const login = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const l = await login.json();
  if (!login.ok) throw new Error(`login after verify failed: ${login.status} ${JSON.stringify(l)}`);
  return { id, session: l.session };
}
