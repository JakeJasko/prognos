import { Router } from "express";
import crypto from "node:crypto";
import os from "node:os";
import { getDb, getSetting, setSetting, seedDemoData, isUserAdmin, isUserIdAdmin, getAdminEmails } from "./db.js";
import { computeBrierScore, computeCalibrationBuckets, computeLeaderboard, getBrierGrade, ScoredForecast } from "./scoring.js";
import { generateIcsFeed } from "./calendar.js";

export const apiRouter = Router();

// ----------------------------------------------------
// Local Network IP Helper
// ----------------------------------------------------
function getLocalNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

apiRouter.get("/lan-info", (req, res) => {
  const ip = getLocalNetworkIp();
  const port = process.env.PORT || 3000;
  res.json({
    ip,
    port,
    localUrl: `http://localhost:${port}`,
    lanUrl: `http://${ip}:${port}`
  });
});

// ----------------------------------------------------
// Authentication & User Profiles
// ----------------------------------------------------
apiRouter.get("/users", (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, name, avatar, email, created_at FROM users ORDER BY created_at ASC").all() as any[];
  const enriched = users.map(u => ({
    ...u,
    isAdmin: isUserAdmin(u.email)
  }));
  res.json(enriched);
});

// Admin: Update user details (name, avatar)
apiRouter.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const adminId = (req.headers["x-user-id"] as string) || req.body?.adminId || (req.query?.adminId as string);
  if (!isUserIdAdmin(adminId) && adminId !== id) {
    return res.status(403).json({ error: "Forbidden: Administrator privileges required to modify users." });
  }

  const { name, avatar } = req.body;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  const newName = name && typeof name === "string" && name.trim() ? name.trim() : existing.name;
  const newAvatar = avatar && typeof avatar === "string" ? avatar.trim() : existing.avatar;

  db.prepare("UPDATE users SET name = ?, avatar = ? WHERE id = ?").run(newName, newAvatar, id);
  const updated = db.prepare("SELECT id, name, avatar, email, created_at FROM users WHERE id = ?").get(id) as any;
  res.json({ ...updated, isAdmin: isUserAdmin(updated.email) });
});

// Admin: Delete user and cascade
apiRouter.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  const adminId = (req.headers["x-user-id"] as string) || (req.query?.adminId as string);
  if (!isUserIdAdmin(adminId)) {
    return res.status(403).json({ error: "Forbidden: Only administrators can delete users." });
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  if (id === adminId) {
    return res.status(400).json({ error: "Cannot delete your own active administrator account." });
  }

  db.prepare("DELETE FROM forecasts WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM questions WHERE creator_id = ?").run(id);
  db.prepare("DELETE FROM household_members WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM households WHERE creator_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  res.json({ success: true, deletedUserId: id });
});

// Google OAuth Configuration
apiRouter.get("/auth/google/config", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || getSetting("GOOGLE_CLIENT_ID") || null;
  res.json({
    hasGoogleAuth: Boolean(clientId),
    clientId
  });
});

// Google OAuth Login & Token Verification (Verified with Google TokenInfo API)
apiRouter.post("/auth/google/verify", async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ error: "Missing Google credential" });
  }

  try {
    // Cryptographically verify Google ID token with Google's official tokeninfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`);
    if (!googleRes.ok) {
      const errData = (await googleRes.json().catch(() => ({}))) as { error_description?: string };
      return res.status(401).json({ error: errData.error_description || "Google token verification failed" });
    }

    const payload = (await googleRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
      aud?: string;
    };

    if (!payload.sub || !payload.email) {
      return res.status(401).json({ error: "Google token did not contain valid identity information" });
    }

    // Verify audience matches expected Client ID
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || getSetting("GOOGLE_CLIENT_ID");
    if (expectedClientId && payload.aud !== expectedClientId) {
      return res.status(401).json({ error: "Google token audience mismatch" });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const avatar = payload.picture || "🔭";

    const db = getDb();
    let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleId, email) as any;

    if (user) {
      db.prepare("UPDATE users SET google_id = ?, name = ?, avatar = ?, email = ? WHERE id = ?").run(
        googleId, name, avatar, email, user.id
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    } else {
      const id = "u_" + crypto.randomUUID().slice(0, 8);
      db.prepare("INSERT INTO users (id, google_id, email, name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, googleId, email, name, avatar, new Date().toISOString()
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }

    res.json({
      user: {
        ...user,
        isAdmin: isUserAdmin(user.email)
      }
    });
  } catch (err: any) {
    res.status(401).json({ error: "Google verification failed: " + err.message });
  }
});

// ----------------------------------------------------
// Households / Circles
// ----------------------------------------------------
apiRouter.get("/households", (req, res) => {
  const { userId } = req.query;
  const db = getDb();

  if (!userId) {
    return res.json([]);
  }

  const households = db.prepare(`
    SELECT 
      h.*,
      hm.role,
      (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count
    FROM households h
    JOIN household_members hm ON h.id = hm.household_id
    WHERE hm.user_id = ?
    ORDER BY h.created_at ASC
  `).all(userId as string);

  res.json(households);
});

apiRouter.post("/households", (req, res) => {
  const { name, creatorId } = req.body;
  if (!name || !name.trim() || !creatorId) {
    return res.status(400).json({ error: "Household name and creatorId are required" });
  }

  const db = getDb();
  const id = "h_" + crypto.randomUUID().slice(0, 8);
  const inviteCode = (name.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase() + "-" + crypto.randomInt(100, 999));
  const now = new Date().toISOString();

  db.prepare("INSERT INTO households (id, name, creator_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id, name.trim(), creatorId, inviteCode, now
  );

  db.prepare("INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").run(
    id, creatorId, now
  );

  const created = db.prepare("SELECT * FROM households WHERE id = ?").get(id);
  res.status(201).json(created);
});

apiRouter.post("/households/join", (req, res) => {
  const { inviteCode, userId } = req.body;
  if (!inviteCode || !userId) {
    return res.status(400).json({ error: "Invite code and userId are required" });
  }

  const db = getDb();
  const household = db.prepare("SELECT * FROM households WHERE invite_code = ?").get(inviteCode.trim().toUpperCase()) as any;
  if (!household) {
    return res.status(404).json({ error: "Household with this invite code was not found" });
  }

  const existing = db.prepare("SELECT * FROM household_members WHERE household_id = ? AND user_id = ?").get(household.id, userId);
  if (!existing) {
    db.prepare("INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)").run(
      household.id, userId, new Date().toISOString()
    );
  }

  res.json({ success: true, household });
});

apiRouter.get("/households/:id/members", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const members = db.prepare(`
    SELECT u.id, u.name, u.avatar, hm.role, hm.joined_at
    FROM household_members hm
    JOIN users u ON hm.user_id = u.id
    WHERE hm.household_id = ?
    ORDER BY hm.joined_at ASC
  `).all(id);

  res.json(members);
});

// Admin: Get all households platform-wide
apiRouter.get("/admin/households", (req, res) => {
  const adminId = (req.headers["x-user-id"] as string) || (req.query?.userId as string);
  if (!isUserIdAdmin(adminId)) {
    return res.status(403).json({ error: "Forbidden: Administrator access required" });
  }

  const db = getDb();
  const households = db.prepare(`
    SELECT 
      h.*,
      u.name as creator_name,
      u.avatar as creator_avatar,
      (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count
    FROM households h
    LEFT JOIN users u ON h.creator_id = u.id
    ORDER BY h.created_at ASC
  `).all();

  res.json(households);
});

// Rename circle (owner or admin)
apiRouter.put("/households/:id", (req, res) => {
  const { id } = req.params;
  const { name, userId } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Circle name is required" });

  const db = getDb();
  const household = db.prepare("SELECT * FROM households WHERE id = ?").get(id) as any;
  if (!household) return res.status(404).json({ error: "Circle not found" });

  const isAdmin = isUserIdAdmin(userId);
  if (household.creator_id !== userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: Only circle owner or an administrator can rename this circle" });
  }

  db.prepare("UPDATE households SET name = ? WHERE id = ?").run(name.trim(), id);
  res.json({ success: true, household: { ...household, name: name.trim() } });
});

// Delete circle (owner or admin)
apiRouter.delete("/households/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.body?.userId || (req.headers["x-user-id"] as string) || (req.query?.userId as string);

  const db = getDb();
  const household = db.prepare("SELECT * FROM households WHERE id = ?").get(id) as any;
  if (!household) return res.status(404).json({ error: "Circle not found" });

  const isAdmin = isUserIdAdmin(userId);
  if (household.creator_id !== userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: Only circle owner or an administrator can delete this circle" });
  }

  db.prepare("DELETE FROM household_members WHERE household_id = ?").run(id);
  db.prepare("UPDATE questions SET household_id = NULL WHERE household_id = ?").run(id);
  db.prepare("DELETE FROM households WHERE id = ?").run(id);
  res.json({ success: true });
});

// ----------------------------------------------------
// Predictions (Questions, Community Consensus & Scoping)
// ----------------------------------------------------
apiRouter.get("/predictions", (req, res) => {
  const db = getDb();
  const { scope, householdId, filter, tag, search, userId } = req.query;

  let query = `
    SELECT 
      q.*,
      u.name as creator_name,
      u.avatar as creator_avatar,
      h.name as household_name
    FROM questions q
    JOIN users u ON q.creator_id = u.id
    LEFT JOIN households h ON q.household_id = h.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping: Public vs Household vs My
  if (scope === "public") {
    query += " AND q.visibility = 'PUBLIC'";
  } else if (scope === "household" && householdId) {
    query += " AND q.visibility = 'HOUSEHOLD' AND q.household_id = ?";
    params.push(householdId);
  } else if (scope === "my" && userId) {
    query += " AND (q.creator_id = ? OR q.id IN (SELECT question_id FROM forecasts WHERE user_id = ?))";
    params.push(userId, userId);
  } else {
    // Default view: all public questions PLUS household questions if user belongs to them
    if (userId) {
      query += ` AND (
        q.visibility = 'PUBLIC' 
        OR q.household_id IN (SELECT household_id FROM household_members WHERE user_id = ?)
      )`;
      params.push(userId);
    } else {
      query += " AND q.visibility = 'PUBLIC'";
    }
  }

  // Status filtering
  if (filter === "active") {
    query += " AND q.resolved = 0";
  } else if (filter === "resolved") {
    query += " AND q.resolved = 1";
  } else if (filter === "due") {
    query += " AND q.resolved = 0 AND datetime(q.resolve_by) <= datetime('now', '+7 days')";
  }

  if (tag && typeof tag === "string") {
    query += " AND q.tags LIKE ?";
    params.push(`%${tag}%`);
  }

  if (search && typeof search === "string" && search.trim()) {
    query += " AND (q.title LIKE ? OR q.notes LIKE ?)";
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  query += " ORDER BY q.resolved ASC, q.resolve_by ASC";

  const rows = db.prepare(query).all(...params) as any[];

  // Fetch all forecasts for questions
  const allForecasts = db.prepare(`
    SELECT 
      f.*,
      u.name as user_name,
      u.avatar as user_avatar
    FROM forecasts f
    JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at ASC
  `).all() as any[];

  const forecastsByQuestion: Record<string, any[]> = {};
  for (const f of allForecasts) {
    if (!forecastsByQuestion[f.question_id]) {
      forecastsByQuestion[f.question_id] = [];
    }
    forecastsByQuestion[f.question_id].push(f);
  }

  const results = rows.map(q => {
    const qForecasts = forecastsByQuestion[q.id] || [];

    // Distinct users' latest forecasts for community consensus
    const latestByUser: Record<string, number> = {};
    for (const f of qForecasts) {
      latestByUser[f.user_id] = f.probability;
    }
    const distinctProbs = Object.values(latestByUser);

    // Compute Community Consensus (Median probability)
    let communityProbability = 0.5;
    if (distinctProbs.length > 0) {
      const sorted = [...distinctProbs].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      communityProbability = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    const userForecast = userId ? qForecasts.filter((f: any) => f.user_id === userId).pop() : null;
    const latestForecast = qForecasts.length > 0 ? qForecasts[qForecasts.length - 1] : null;

    return {
      ...q,
      resolved: Boolean(q.resolved),
      tags: q.tags ? q.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      forecasts: qForecasts,
      communityProbability: Number(communityProbability.toFixed(2)),
      communityCount: distinctProbs.length,
      latestProbability: latestForecast ? latestForecast.probability : 0.5,
      userProbability: userForecast ? userForecast.probability : null
    };
  });

  res.json(results);
});

apiRouter.post("/predictions", (req, res) => {
  const { title, probability, resolveBy, notes, tags, userId, visibility, householdId } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (typeof probability !== "number" || probability < 0.01 || probability > 0.99) {
    return res.status(400).json({ error: "Probability must be between 1% and 99%" });
  }
  if (!resolveBy) {
    return res.status(400).json({ error: "Resolve-by date is required" });
  }
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const db = getDb();
  const qId = "q_" + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const tagString = Array.isArray(tags) ? tags.join(", ") : (tags || "");
  const questionVisibility = visibility === "HOUSEHOLD" ? "HOUSEHOLD" : "PUBLIC";
  const questionHouseholdId = questionVisibility === "HOUSEHOLD" ? householdId : null;

  db.prepare(`
    INSERT INTO questions (id, creator_id, household_id, visibility, title, notes, resolve_by, resolved, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    qId,
    userId,
    questionHouseholdId,
    questionVisibility,
    title.trim(),
    notes ? notes.trim() : null,
    new Date(resolveBy).toISOString(),
    tagString,
    now
  );

  // Initial Forecast
  const fId = "f_" + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO forecasts (id, question_id, user_id, probability, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    fId,
    qId,
    userId,
    probability,
    "Initial prediction",
    now
  );

  const created = db.prepare("SELECT * FROM questions WHERE id = ?").get(qId) as any;
  res.status(201).json({
    ...created,
    resolved: false,
    tags: tagString ? tagString.split(",").map((t: string) => t.trim()) : [],
    latestProbability: probability,
    communityProbability: probability,
    communityCount: 1
  });
});

// Community and competing forecasting
apiRouter.post("/predictions/:id/forecast", (req, res) => {
  const { id } = req.params;
  const { userId, probability, comment } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (typeof probability !== "number" || probability < 0.01 || probability > 0.99) {
    return res.status(400).json({ error: "Probability must be between 1% and 99%" });
  }

  const db = getDb();
  const q = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as any;
  if (!q) {
    return res.status(404).json({ error: "Prediction not found" });
  }
  if (q.resolved) {
    return res.status(400).json({ error: "Cannot forecast on an already resolved question" });
  }

  // If private household question, verify membership
  if (q.visibility === "HOUSEHOLD" && q.household_id) {
    const isMember = db.prepare("SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?").get(q.household_id, userId);
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this household" });
    }
  }

  const fId = "f_" + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO forecasts (id, question_id, user_id, probability, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    fId,
    id,
    userId,
    probability,
    comment ? comment.trim() : null,
    now
  );

  res.status(201).json({ id: fId, question_id: id, user_id: userId, probability, comment, created_at: now });
});

apiRouter.patch("/predictions/:id/resolve", (req, res) => {
  const { id } = req.params;
  const { resolution, resolutionNotes } = req.body;

  if (!["YES", "NO", "AMBIGUOUS"].includes(resolution)) {
    return res.status(400).json({ error: "Resolution must be YES, NO, or AMBIGUOUS" });
  }

  const db = getDb();
  const q = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  if (!q) {
    return res.status(404).json({ error: "Prediction not found" });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE questions 
    SET resolved = 1, resolution = ?, resolution_notes = ?, resolved_at = ?
    WHERE id = ?
  `).run(
    resolution,
    resolutionNotes ? resolutionNotes.trim() : null,
    now,
    id
  );

  const updated = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  res.json(updated);
});

apiRouter.delete("/predictions/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.body?.userId || (req.headers["x-user-id"] as string) || (req.query?.userId as string);

  if (!userId) {
    return res.status(401).json({ error: "Authentication required to delete a forecast." });
  }

  const db = getDb();
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as any;
  if (!question) {
    return res.status(404).json({ error: "Prediction not found" });
  }

  // Enforce creator-only OR administrator authorization
  const isAdmin = isUserIdAdmin(userId);
  if (question.creator_id !== userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You can only delete forecasts that you created, unless you are an Administrator." });
  }

  db.prepare("DELETE FROM forecasts WHERE question_id = ?").run(id);
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  res.json({ success: true, deletedByAdmin: isAdmin && question.creator_id !== userId });
});

// Edit prediction details (creator or admin)
apiRouter.patch("/predictions/:id", (req, res) => {
  const { id } = req.params;
  const { userId, title, notes, resolveBy, tags } = req.body;

  const db = getDb();
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as any;
  if (!question) return res.status(404).json({ error: "Prediction not found" });

  const isAdmin = isUserIdAdmin(userId);
  if (question.creator_id !== userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You can only edit predictions you created, unless you are an Administrator." });
  }

  const newTitle = title !== undefined ? String(title).trim() : question.title;
  const newNotes = notes !== undefined ? (notes ? String(notes).trim() : null) : question.notes;
  const newResolveBy = resolveBy ? new Date(resolveBy).toISOString() : question.resolve_by;
  const newTags = Array.isArray(tags) ? tags.join(", ") : (tags !== undefined ? String(tags) : question.tags);

  db.prepare(`
    UPDATE questions 
    SET title = ?, notes = ?, resolve_by = ?, tags = ?
    WHERE id = ?
  `).run(newTitle, newNotes, newResolveBy, newTags, id);

  const updated = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  res.json(updated);
});

// Delete specific forecast (forecast author or admin)
apiRouter.delete("/predictions/:id/forecasts/:forecastId", (req, res) => {
  const { id, forecastId } = req.params;
  const userId = req.body?.userId || (req.headers["x-user-id"] as string) || (req.query?.userId as string);

  const db = getDb();
  const forecast = db.prepare("SELECT * FROM forecasts WHERE id = ? AND question_id = ?").get(forecastId, id) as any;
  if (!forecast) return res.status(404).json({ error: "Forecast not found" });

  const isAdmin = isUserIdAdmin(userId);
  if (forecast.user_id !== userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You can only delete your own forecasts, unless you are an Administrator." });
  }

  db.prepare("DELETE FROM forecasts WHERE id = ?").run(forecastId);
  res.json({ success: true });
});

// Admin System Overview
apiRouter.get("/admin/overview", (req, res) => {
  const userId = (req.headers["x-user-id"] as string) || (req.query?.userId as string);
  if (!isUserIdAdmin(userId)) {
    return res.status(403).json({ error: "Forbidden: Administrator access required" });
  }

  const db = getDb();
  const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  const totalHouseholds = (db.prepare("SELECT COUNT(*) as c FROM households").get() as any).c;
  const totalQuestions = (db.prepare("SELECT COUNT(*) as c FROM questions").get() as any).c;
  const activeQuestions = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolved = 0").get() as any).c;
  const resolvedQuestions = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolved = 1").get() as any).c;
  const totalForecasts = (db.prepare("SELECT COUNT(*) as c FROM forecasts").get() as any).c;
  const adminEmails = getAdminEmails();

  res.json({
    totalUsers,
    totalHouseholds,
    totalQuestions,
    activeQuestions,
    resolvedQuestions,
    totalForecasts,
    adminEmails,
    serverTime: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// ----------------------------------------------------
// Public & Monthly Leaderboard
// ----------------------------------------------------
apiRouter.get("/leaderboard", (req, res) => {
  const period = (req.query.period === "all" ? "all" : req.query.period === "month" ? "month" : "year") as "year" | "month" | "all";
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const leaderboard = computeLeaderboard(period, year);
  res.json({
    period,
    year: period === "year" ? year : undefined,
    updatedAt: new Date().toISOString(),
    entries: leaderboard
  });
});

// ----------------------------------------------------
// Personal Stats & Reliability Curve
// ----------------------------------------------------
apiRouter.get("/stats", (req, res) => {
  const db = getDb();
  const { userId } = req.query;

  let targetUser = null;
  if (userId) {
    targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId as string) as any;
  }
  if (!targetUser) {
    targetUser = db.prepare("SELECT * FROM users ORDER BY created_at ASC LIMIT 1").get() as any;
  }
  if (!targetUser) {
    return res.json({ error: "No users found" });
  }

  const resolvedQuestions = db.prepare(`
    SELECT q.id, q.title, q.resolution, q.visibility, q.resolved_at
    FROM questions q
    WHERE q.resolved = 1 AND q.resolution IN ('YES', 'NO')
  `).all() as any[];

  const scoredForecasts: ScoredForecast[] = [];
  let totalBrier = 0;
  let correctDirectionCount = 0;

  for (const rq of resolvedQuestions) {
    const userForecast = db.prepare(`
      SELECT probability FROM forecasts
      WHERE question_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(rq.id, targetUser.id) as { probability: number } | undefined;

    if (userForecast) {
      const outcome = rq.resolution === "YES" ? 1 : 0;
      const brier = computeBrierScore(userForecast.probability, rq.resolution)!;
      totalBrier += brier;

      if ((userForecast.probability >= 0.5 && outcome === 1) || (userForecast.probability < 0.5 && outcome === 0)) {
        correctDirectionCount++;
      }

      scoredForecasts.push({
        forecast: userForecast.probability,
        outcome,
        questionId: rq.id,
        title: rq.title,
        visibility: rq.visibility
      });
    }
  }

  const userBrierScore = scoredForecasts.length > 0
    ? Number((totalBrier / scoredForecasts.length).toFixed(4))
    : null;

  const accuracyRate = scoredForecasts.length > 0
    ? Number(((correctDirectionCount / scoredForecasts.length) * 100).toFixed(1))
    : null;

  const calibrationBuckets = computeCalibrationBuckets(scoredForecasts);

  const totalQuestions = (db.prepare("SELECT COUNT(*) as c FROM questions").get() as any).c;
  const activeCount = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolved = 0").get() as any).c;
  const resolvedCount = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolved = 1").get() as any).c;
  const yesCount = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolution = 'YES'").get() as any).c;
  const noCount = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolution = 'NO'").get() as any).c;
  const ambiguousCount = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE resolution = 'AMBIGUOUS'").get() as any).c;

  const userForecastCount = (db.prepare("SELECT COUNT(*) as c FROM forecasts WHERE user_id = ?").get(targetUser.id) as any).c;

  res.json({
    userId: targetUser.id,
    userName: targetUser.name,
    userAvatar: targetUser.avatar,
    totalPredictions: totalQuestions,
    userForecastCount,
    activeCount,
    resolvedCount,
    scoredCount: scoredForecasts.length,
    yesCount,
    noCount,
    ambiguousCount,
    brierScore: userBrierScore,
    brierGrade: getBrierGrade(userBrierScore),
    accuracyRate,
    calibrationBuckets
  });
});

// ----------------------------------------------------
// Data Backup (Export & Import) & Demo Seeding (Admin Only)
// ----------------------------------------------------
apiRouter.get("/export", (req, res) => {
  const userId = (req.headers["x-user-id"] as string) || (req.query?.userId as string);
  if (!isUserIdAdmin(userId)) {
    return res.status(403).json({ error: "Forbidden: Only administrators can export archival backups." });
  }

  const db = getDb();
  const users = db.prepare("SELECT * FROM users").all();
  const households = db.prepare("SELECT * FROM households").all();
  const householdMembers = db.prepare("SELECT * FROM household_members").all();
  const questions = db.prepare("SELECT * FROM questions").all();
  const forecasts = db.prepare("SELECT * FROM forecasts").all();

  res.setHeader("Content-Disposition", `attachment; filename=prognos-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.setHeader("Content-Type", "application/json");
  res.json({
    version: 2,
    exportedAt: new Date().toISOString(),
    users,
    households,
    householdMembers,
    questions,
    forecasts
  });
});

apiRouter.post("/import", (req, res) => {
  const userId = (req.headers["x-user-id"] as string) || req.body?.userId || (req.query?.userId as string);
  if (!isUserIdAdmin(userId)) {
    return res.status(403).json({ error: "Forbidden: Only administrators can import archival backups." });
  }

  const data = req.body?.data || req.body;
  if (!data || !Array.isArray(data.questions) || !Array.isArray(data.users)) {
    return res.status(400).json({ error: "Invalid backup JSON file structure" });
  }

  const db = getDb();
  db.exec("DELETE FROM forecasts; DELETE FROM questions; DELETE FROM household_members; DELETE FROM households; DELETE FROM users;");

  for (const u of data.users) {
    db.prepare("INSERT OR REPLACE INTO users (id, google_id, email, name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      u.id, u.google_id || null, u.email || null, u.name, u.avatar || "🔭", u.created_at || new Date().toISOString()
    );
  }

  if (Array.isArray(data.households)) {
    for (const h of data.households) {
      db.prepare("INSERT OR REPLACE INTO households (id, name, creator_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)").run(
        h.id, h.name, h.creator_id, h.invite_code, h.created_at
      );
    }
  }

  if (Array.isArray(data.householdMembers)) {
    for (const hm of data.householdMembers) {
      db.prepare("INSERT OR REPLACE INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)").run(
        hm.household_id, hm.user_id, hm.role || "member", hm.joined_at
      );
    }
  }

  for (const q of data.questions) {
    db.prepare(`
      INSERT OR REPLACE INTO questions (id, creator_id, household_id, visibility, title, notes, resolve_by, resolved, resolution, resolved_at, resolution_notes, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      q.id, q.creator_id, q.household_id || null, q.visibility || "PUBLIC", q.title, q.notes, q.resolve_by, q.resolved ? 1 : 0, q.resolution, q.resolved_at, q.resolution_notes, q.tags, q.created_at
    );
  }

  if (Array.isArray(data.forecasts)) {
    for (const f of data.forecasts) {
      db.prepare(`
        INSERT OR REPLACE INTO forecasts (id, question_id, user_id, probability, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        f.id, f.question_id, f.user_id, f.probability, f.comment, f.created_at
      );
    }
  }

  res.json({ success: true, importedUsers: data.users.length, importedQuestions: data.questions.length });
});

apiRouter.post("/seed", (req, res) => {
  const userId = (req.headers["x-user-id"] as string) || req.body?.userId || (req.query?.userId as string);
  if (!isUserIdAdmin(userId)) {
    return res.status(403).json({ error: "Forbidden: Only administrators can seed demo data." });
  }

  const db = getDb();
  seedDemoData(db);
  res.json({ success: true, message: "Demo predictions and track record loaded successfully!" });
});

// ----------------------------------------------------
// Google Calendar Sync (.ics Feed Endpoints)
// ----------------------------------------------------
function getCalendarBaseUrl(req: any): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

// 1. Circle / Household iCal Feed (.ics)
apiRouter.get("/calendar/household/:id/feed.ics", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const household = db.prepare("SELECT * FROM households WHERE id = ?").get(id) as any;
  if (!household) {
    return res.status(404).send("Circle not found");
  }

  const questions = db.prepare(`
    SELECT q.*, h.name as household_name, u.name as creator_name
    FROM questions q
    JOIN households h ON q.household_id = h.id
    LEFT JOIN users u ON q.creator_id = u.id
    WHERE q.household_id = ?
    ORDER BY q.resolve_by ASC
  `).all(id) as any[];

  const baseUrl = getCalendarBaseUrl(req);
  const ics = generateIcsFeed({
    title: `Prognos: ${household.name}`,
    description: `Forecast resolution deadlines for ${household.name} on Prognos Observatory`,
    questions,
    baseUrl,
  });

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${household.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-predictions.ics"`
  );
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(ics);
});

// 2. User Personal iCal Feed (.ics)
apiRouter.get("/calendar/user/:userId/feed.ics", (req, res) => {
  const { userId } = req.params;
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  if (!user) {
    return res.status(404).send("User not found");
  }

  const questions = db.prepare(`
    SELECT DISTINCT q.*, h.name as household_name, u.name as creator_name
    FROM questions q
    LEFT JOIN households h ON q.household_id = h.id
    LEFT JOIN users u ON q.creator_id = u.id
    WHERE q.creator_id = ? OR q.id IN (SELECT question_id FROM forecasts WHERE user_id = ?)
    ORDER BY q.resolve_by ASC
  `).all(userId, userId) as any[];

  const baseUrl = getCalendarBaseUrl(req);
  const ics = generateIcsFeed({
    title: `Prognos: ${user.name}'s Predictions`,
    description: `Personal prediction resolution deadlines for ${user.name} on Prognos Observatory`,
    questions,
    baseUrl,
  });

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="my-prognos-predictions.ics"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(ics);
});

// 3. Single Prediction .ics Download
apiRouter.get("/calendar/prediction/:id.ics", (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const question = db.prepare(`
    SELECT q.*, h.name as household_name, u.name as creator_name
    FROM questions q
    LEFT JOIN households h ON q.household_id = h.id
    LEFT JOIN users u ON q.creator_id = u.id
    WHERE q.id = ?
  `).get(id) as any;

  if (!question) {
    return res.status(404).send("Prediction not found");
  }

  const baseUrl = getCalendarBaseUrl(req);
  const ics = generateIcsFeed({
    title: `Prognos: ${question.title}`,
    description: `Prediction resolution deadline for "${question.title}" on Prognos Observatory`,
    questions: [question],
    baseUrl,
  });

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="prediction-${question.id}.ics"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(ics);
});
