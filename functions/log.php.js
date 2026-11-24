export async function onRequest(context) {
  try {
    if (context.request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const data = await context.request.json();
    const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
    const time = new Date().toISOString();
    const userAgent = context.request.headers.get("user-agent") || "unknown";
    const referrer = context.request.headers.get("referer") || "unknown";
    const language = context.request.headers.get("accept-language") || "unknown";
    let continent = "unknown";
    let city = "unknown";
    try {
      const response = await fetch(
        `https://ip.hackclub.com/${encodeURIComponent(ip)}`
      );
      if (response.ok) {
        const geolocation = await response.json();
        continent = geolocation.continent_name || "unknown";
        city = geolocation.city_name || "unknown";
      }
    } catch (error) {
      console.error("Geolocation failed:", error);
    }
    // parse basic device info from userAgent
    let deviceType = "unknown";
    if (/mobile/i.test(userAgent)) deviceType = "mobile";
    else if (/tablet/i.test(userAgent)) deviceType = "tablet";
    else deviceType = "desktop";

    await context.env.DB.prepare(
      `INSERT INTO logs 
      (ip, continent, city, page, consent, time, userAgent, referrer, language, deviceType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      ip,
      data.page,
      data.consent,
      time,
      userAgent,
      referrer,
      language,
      deviceType,
      continent,
      city
    )
    .run();

    return new Response(JSON.stringify({ status: "saved" }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
