// Vercel Serverless Function: POST /api/chat
// Der API-Schlüssel kommt aus der Umgebungsvariable ANTHROPIC_API_KEY und steht nie im Code.

const PROFILE={
  profil:"Liv Wohralik, Wien. Liv begeistert, wie KI die Arbeit von Menschen verändert. Liv verbindet Erfahrung aus Beratung und Projektmanagement mit Praxis in Microsoft 365, der Power Platform und Dynamics 365. Seit fünf Jahren verbindet sie Vollzeitarbeit mit einem berufsbegleitenden Studium.",
  falstaff:"Seit 08/2025 Data Quality Managerin beim Falstaff Verlag in Wien (Medienhaus). Begonnen als Data Quality Managerin und aus Eigeninitiative in neue Bereiche eingearbeitet: Microsoft-365-Plattform, KI und Konzeption von Lösungen, mit denen sie im Team mit IT und Fachabteilungen Arbeitsabläufe automatisiert und verbessert. Aufgaben: Power Platform (Power Apps Model-driven Apps, Power Automate inkl. Low-Code-Ausdrücken, Dataverse, Power BI, erste Erfahrungen mit Power Pages); Dynamics 365 CE (Sales, Customer Insights – Journeys): Datenmodellierung, Sicherheitsrollen, Business Units; Workflow-Automatisierung; Integration und Fehleranalyse von Systemanbindungen (Shop, Redaktion, Newsletter); Anforderungen mit Fachabteilungen erheben, Lösungskonzepte entwickeln, in der Entwicklungsumgebung umsetzen und testen; Datenqualität (Dubletten, Bereinigung, Importe, SQL, FetchXML); Administration von Entra ID, Exchange, SharePoint; Einrichtung von SaaS-Anwendungen; interne Einschulungen für Kolleginnen und Kollegen aus mehreren Ländern, auf Deutsch und Englisch; erste Anlaufstelle im Anwendersupport.",
  aws:"03/2022 bis 07/2025 Projektmanagement und Förderberatung bei der Austria Wirtschaftsservice GmbH in Wien (Garantien für Industrie und Internationalisierung). Beratung von Unternehmen zur Kreditwahl, Begleitung ihrer Projekte von Anfang bis Ende, häufige Dienstreisen zu den Unternehmen, Bilanzanalyse, Präsentation der Projekte vor dem internen Gremium mit der Begründung, warum ein Unternehmen ein geeigneter Förderkandidat ist. Reporting und Datenanalyse für EIF-Rückhaftungen, Aufbereitung von Ergebnissen für interne Stellen und den European Investment Fund.",
  raiffeisen:"09/2021 bis 02/2022 Produktion Reporting bei der Raiffeisen Bank International in Wien.",
  ki:"KI-Grundlagen aus Freifächern im Studium: Machine Learning, Deep Learning, Large Language Models, Algorithmen, Daten, Rechenleistung, Prompting. Hat sich eigenständig in Microsoft Copilot Studio eingearbeitet und erste KI-Agenten mit Blick auf Berechtigungen und Datenschutz aufgebaut. Arbeitet aktuell eng mit AI Consultants zusammen. Nutzt im Alltag Copilot und Claude, testet Prompts, vergleicht und hinterfragt Ergebnisse. Diese Seite ist selbst ein Beispiel: ein KI-Agent, der über Tools gezielt Profilabschnitte liest.",
  microsoft:"Microsoft-Technologien: Microsoft 365 (Entra ID, Exchange, SharePoint, Teams), Power Platform (Power Apps, Power Automate, Dataverse, Power BI, Copilot Studio, Power Pages Grundkenntnisse), Dynamics 365 CE (Sales, Customer Insights – Journeys), Azure DevOps. Außerdem SQL, FetchXML, Google Analytics 4, HTML, CSS, XML, JavaScript-Grundkenntnisse, WordPress.",
  ausbildung:"Bachelor Medieninformatik, berufsbegleitend, IU Internationale Hochschule, Abschluss voraussichtlich 2027, inklusive Freifächern zu KI. Danach ist ein Master in Data Science geplant. Davor Bachelor Wirtschaftsrecht an der WU Wien (ohne Abschluss). Reife- und Diplomprüfung an der Bundeshandelsakademie Hollabrunn, Spezialzweig Internationale Wirtschaft (2020).",
  motivation:"Liv will KI nicht nur anwenden, sondern verstehen und Menschen dabei begleiten, sie sinnvoll zu nutzen. Sie lernt schnell, stellt Fragen, probiert neue Tools aus und lässt sich nicht entmutigen, wenn etwas nicht sofort funktioniert. Sie arbeitet gerne im Team und mit Kundinnen und Kunden und möchte sich als AI Consultant im Microsoft-Umfeld weiterentwickeln, besonders im Bereich Apps und Agents.",
  sprachen:"Deutsch Muttersprache, Englisch fließend, Spanisch Grundkenntnisse.",
  kontakt:"E-Mail: livwohralik@gmail.com. Für Gespräche, Fragen zu Gehalt oder Verfügbarkeit bitte direkt an Liv wenden."
};

const LABEL={profil:"Profil",falstaff:"Erfahrung bei Falstaff",aws:"Erfahrung bei der Austria Wirtschaftsservice",raiffeisen:"Erfahrung bei Raiffeisen",ki:"KI-Kenntnisse",microsoft:"Microsoft-Skills",ausbildung:"Ausbildung",motivation:"Motivation",sprachen:"Sprachen",kontakt:"Kontakt"};

const RULES=`Du bist der KI-Agent auf der Bewerbungsseite von Liv Wohralik. Besucher sind vor allem Recruiter und Hiring Manager.
Regeln:
- Sprich über Liv in der dritten Person, freundlich, sachlich und konkret.
- Antworte in der Sprache der Frage (Deutsch oder Englisch), höchstens 120 Wörter, gern mit kurzen Aufzählungen.
- Lies vor jeder Antwort mit dem Tool get_section die passenden Abschnitte. Nutze ausschließlich diese Informationen und erfinde nichts.
- Steht etwas nicht im Profil, sag das offen und verweise auf livwohralik@gmail.com.
- Keine Angaben zu Gehalt, Privatleben oder vertraulichen Interna von Arbeitgebern.`;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TURNS = 12;        // maximal 12 Nachrichten pro Gespräch
const MAX_CHARS = 500;       // maximal 500 Zeichen pro Nachricht
const MAX_ROUNDS = 4;        // maximal 4 Tool-Runden pro Antwort
const hits = new Map();      // einfache Begrenzung pro IP (pro Server-Instanz)

const TOOLS = [{
  name: "get_section",
  description: "Liest einen Abschnitt aus Livs Profil. Abschnitte: " + Object.keys(PROFILE).join(", "),
  input_schema: {
    type: "object",
    properties: { section: { type: "string", enum: Object.keys(PROFILE) } },
    required: ["section"]
  }
}];

function tooMany(ip) {
  const now = Date.now(), win = 60 * 60 * 1000, limit = 30;   // 30 Fragen pro Stunde und IP
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > limit;
}

function valid(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) return false;
  return messages.every((m, i) =>
    m && typeof m.content === "string" && m.content.length > 0 && m.content.length <= (m.role === "user" ? MAX_CHARS : 4000) &&
    m.role === (i % 2 === 0 ? "user" : "assistant")) && messages.at(-1).role === "user";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Der Server ist nicht eingerichtet." });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
  if (tooMany(ip)) return res.status(429).json({ error: "Zu viele Fragen. Bitte später noch einmal versuchen." });
  const { messages } = req.body || {};
  if (!valid(messages)) return res.status(400).json({ error: "Ungültige Anfrage." });

  const convo = messages.map(m => ({ role: m.role, content: m.content }));
  const read = [];
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system: RULES, tools: TOOLS, messages: convo })
      });
      if (!r.ok) { console.error(await r.text()); return res.status(502).json({ error: "Die KI ist gerade nicht erreichbar." }); }
      const data = await r.json();
      if (data.stop_reason !== "tool_use") {
        const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
        return res.status(200).json({ answer: text, read });
      }
      convo.push({ role: "assistant", content: data.content });
      const results = data.content.filter(b => b.type === "tool_use").map(b => {
        const s = b.input && b.input.section;
        if (LABEL[s]) read.push(LABEL[s]);
        return { type: "tool_result", tool_use_id: b.id, content: PROFILE[s] || "Abschnitt nicht gefunden." };
      });
      convo.push({ role: "user", content: results });
    }
    return res.status(200).json({ answer: "Dazu habe ich gerade keine Antwort. Schreib Liv gern an livwohralik@gmail.com.", read });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Etwas ist schiefgelaufen." });
  }
}
