import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { 
  INITIAL_WEEKS, 
  INITIAL_GIFTS, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_ATTENDANCE, 
  INITIAL_ASSETS, 
  INITIAL_AUDIT_LOGS 
} from "./src/initialData";

// Initialize Supabase prioritizing Service Role Key to bypass RLS restrictions server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[SUPABASE] Integration established successfully with endpoint: ${supabaseUrl} (Using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key"})`);
  } catch (e: any) {
    console.warn("[SUPABASE] Client initialization warning:", e.message);
  }
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_store.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Enforce body limits to handle payloads comfortably
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded files statically under /uploads
app.use("/uploads", express.static(UPLOAD_DIR));

// Configure Multer for local physical file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Helper to get and initialize DB (local fallback only if Supabase not configured)
function getDBData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      weeks: INITIAL_WEEKS,
      gifts: INITIAL_GIFTS,
      announcements: INITIAL_ANNOUNCEMENTS,
      attendance: INITIAL_ATTENDANCE,
      customLogo: "",
      storedAssets: INITIAL_ASSETS,
      volunteers: [],
      photoLikes: {},
      auditLogs: INITIAL_AUDIT_LOGS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, resetting to init:", err);
    const initialData = {
      weeks: INITIAL_WEEKS,
      gifts: INITIAL_GIFTS,
      announcements: INITIAL_ANNOUNCEMENTS,
      attendance: INITIAL_ATTENDANCE,
      customLogo: "",
      storedAssets: INITIAL_ASSETS,
      volunteers: [],
      photoLikes: {},
      auditLogs: INITIAL_AUDIT_LOGS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

// Supabase Central Key-Value Database Helpers
async function getSetting(key: string, defaultValue: string): Promise<string> {
  if (!supabase) return defaultValue;
  try {
    const { data, error } = await supabase
      .from("portal_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    
    if (error) {
      console.warn(`[SUPABASE] Warning reading setting ${key}:`, error.message);
      return defaultValue;
    }
    if (data) {
      return data.value;
    } else {
      // Key doesn't exist yet, seed it into database!
      const { error: seedErr } = await supabase
        .from("portal_settings")
        .upsert({ key, value: defaultValue, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (seedErr) {
        console.warn(`[SUPABASE] Failed to seed default for ${key}:`, seedErr.message);
      }
      return defaultValue;
    }
  } catch (err: any) {
    console.warn(`[SUPABASE] Exception in getSetting for ${key}:`, err.message);
    return defaultValue;
  }
}

async function setSetting(key: string, value: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("portal_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      console.warn(`[SUPABASE] Error writing setting ${key}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[SUPABASE] Exception in setSetting for ${key}:`, err.message);
    return false;
  }
}

// Realtime Event Stream Clients (SSE)
let sseClients: any[] = [];

// Broadcast system update to all active online clients
function broadcastUpdate(eventType: string) {
  console.log(`[REALTIME-SSE] Broadcasting ${eventType} update event to ${sseClients.length} connected client(s).`);
  const dataPayload = JSON.stringify({ eventType, timestamp: Date.now() });
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${dataPayload}\n\n`);
    } catch (e: any) {
      console.warn("[REALTIME-SSE] Failed to write to client, cleaning up connection context.", e.message);
    }
  });
}

// SSE Connection endpoint for instant database propagation
app.get("/api/realtime-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Keep connection alive with initial ping
  res.write(`data: ${JSON.stringify({ eventType: "INIT", timestamp: Date.now() })}\n\n`);

  sseClients.push(res);

  // Heartbeat to prevent socket idle timeouts
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ eventType: "HEARTBEAT" })}\n\n`);
    } catch (err) {
      // client stale
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeatTimer);
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// API Routes
app.get("/api/get-all-data", async (req, res) => {
  // Ensure we bypass any dynamic or edge caching
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const data: any = {
    weeks: [],
    gifts: [],
    announcements: [],
    attendance: [],
    customLogo: "",
    storedAssets: [],
    volunteers: [],
    photoLikes: {},
    auditLogs: []
  };

  if (supabase) {
    try {
      console.log("[SUPABASE] Querying live portal data from central database...");
      
      // 1. Fetch weeks from table, fall back to serialized setting
      const { data: weeksData, error: wErr } = await supabase
        .from("portal_weeks")
        .select("*")
        .order("week_number", { ascending: true });
      
      if (!wErr && weeksData && weeksData.length > 0) {
        data.weeks = weeksData.map((row: any) => ({
          id: row.week_number,
          weekNumber: row.week_number,
          theme: row.title,
          date: row.start_date,
          time: `${row.start_time.substring(0, 5)} - ${row.end_time.substring(0, 5)}`,
          location: row.location,
          mapsLink: row.target_link || "https://maps.google.com",
          description: row.description || "",
          objectives: row.objectives || [],
          games: row.games || [],
          activities: row.activities || [],
          videoUrl: row.image_url,
          images: row.photo_urls || [],
          coverImage: row.image_url || ""
        }));
      } else {
        const weeksJSON = await getSetting("weeks_data_cms", JSON.stringify(INITIAL_WEEKS));
        data.weeks = JSON.parse(weeksJSON);
      }

      // 2. Fetch schema-free content from portal_settings key/value store
      const giftsJSON = await getSetting("gifts_data", JSON.stringify(INITIAL_GIFTS));
      data.gifts = JSON.parse(giftsJSON);

      const announcementsJSON = await getSetting("announcements_data", JSON.stringify(INITIAL_ANNOUNCEMENTS));
      data.announcements = JSON.parse(announcementsJSON);

      const assetsJSON = await getSetting("gallery_assets", JSON.stringify(INITIAL_ASSETS));
      data.storedAssets = JSON.parse(assetsJSON);

      const likesJSON = await getSetting("photo_likes_data", "{}");
      data.photoLikes = JSON.parse(likesJSON);

      data.customLogo = await getSetting("custom_logo", "");

      // 3. Fetch structured attendance records
      const { data: attData, error: aErr } = await supabase
        .from("portal_attendance")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (!aErr && attData) {
        data.attendance = attData.map((row: any) => ({
          id: row.id || row.student_name,
          fullName: row.student_name,
          quarter: row.quarter,
          weeksAttended: row.weeks_attended || [],
          timestamp: row.timestamp
        }));
      }

      // 4. Fetch structured volunteers records
      const { data: volData, error: vErr } = await supabase
        .from("portal_volunteers")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (!vErr && volData) {
        data.volunteers = volData.map((row: any) => ({
          id: row.id || row.full_name,
          fullName: row.full_name,
          quarter: row.quarter,
          role: row.volunteer_role,
          weeksAttended: row.weeks_attended || [],
          timestamp: row.timestamp
        }));
      }

      // 5. Fetch structured audit logs
      const { data: logData, error: lErr } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (!lErr && logData) {
        data.auditLogs = logData.map((row: any) => ({
          id: row.id,
          user: row.operator_email,
          role: row.operator_role,
          action: row.action_type,
          details: row.action_description,
          ipAddress: row.ip_address || "127.0.0.1",
          device: "Cloud Device",
          browser: row.user_agent || "Vercel Client",
          timestamp: row.created_at
        }));
      } else {
        const logsJSON = await getSetting("audit_logs_data", JSON.stringify(INITIAL_AUDIT_LOGS));
        data.auditLogs = JSON.parse(logsJSON);
      }
    } catch (err: any) {
      console.warn("[SUPABASE] SQL query exception, fallback to local store:", err.message);
      const fallback = getDBData();
      Object.assign(data, fallback);
    }
  } else {
    const fallback = getDBData();
    Object.assign(data, fallback);
  }
  res.json({ success: true, data });
});

app.post("/api/save-all-data", async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ success: false, error: "Dữ liệu không hợp lệ" });
    }
    
    // Save locally for redundancy (ignored if disk is read-only)
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (fErr) {}

    if (supabase) {
      // 1. Transactionally write changes into central portal_settings
      if (data.weeks) {
        await setSetting("weeks_data_cms", JSON.stringify(data.weeks));
      }
      if (data.gifts) {
        await setSetting("gifts_data", JSON.stringify(data.gifts));
      }
      if (data.announcements) {
        await setSetting("announcements_data", JSON.stringify(data.announcements));
      }
      if (data.storedAssets) {
        await setSetting("gallery_assets", JSON.stringify(data.storedAssets));
      }
      if (data.photoLikes) {
        await setSetting("photo_likes_data", JSON.stringify(data.photoLikes));
      }
      if (data.customLogo !== undefined) {
        await setSetting("custom_logo", data.customLogo);
      }
      if (data.auditLogs) {
        await setSetting("audit_logs_data", JSON.stringify(data.auditLogs));
      }

      // 2. Structured relational update to portal_weeks
      if (data.weeks) {
        try {
          const rows = data.weeks.map((w: any) => {
            const formattedDate = w.date && w.date.includes("/") 
              ? w.date.split("/").reverse().join("-") 
              : (w.date || new Date().toISOString().substring(0, 10));

            return {
              week_number: w.weekNumber,
              title: w.theme,
              description: w.description || "",
              start_date: formattedDate,
              end_date: formattedDate,
              location: w.location || "Cụm 2",
              start_time: w.time ? (w.time.split("-")[0]?.trim() || "08:00") : "08:00",
              end_time: w.time ? (w.time.split("-")[1]?.trim() || "11:00") : "11:00",
              image_url: w.coverImage || "",
              is_active: true
            };
          });
          
          await supabase
            .from("portal_weeks")
            .upsert(rows, { onConflict: "week_number" });
        } catch (e: any) {
          console.warn("[SUPABASE] Failed to upsert weeks data to relational schema:", e.message);
        }
      }
    }

    broadcastUpdate("ALL_DATA");
    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to save data.json:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Incremental Photo Liking 
app.post("/api/like-photo", async (req, res) => {
  try {
    const { photoId } = req.body;
    if (!photoId) {
      return res.status(400).json({ success: false, error: "Thiếu mã ảnh photoId" });
    }

    if (supabase) {
      const likesJSON = await getSetting("photo_likes_data", "{}");
      const likes = JSON.parse(likesJSON);
      const currentLikes = likes[photoId] || 0;
      likes[photoId] = currentLikes + 1;
      await setSetting("photo_likes_data", JSON.stringify(likes));

      try {
        const { data: newsItem } = await supabase
          .from("portal_news")
          .select("like_count")
          .eq("id", photoId)
          .single();
        
        const newLikesCount = ((newsItem?.like_count || 0) + 1);
        await supabase
          .from("portal_news")
          .update({ like_count: newLikesCount })
          .eq("id", photoId);
      } catch (e: any) {
        // quiet catch
      }

      broadcastUpdate("PHOTO_LIKED");
      return res.json({ success: true, photoLikes: likes });
    }

    const current = getDBData();
    if (!current.photoLikes) {
      current.photoLikes = {};
    }
    const currentLikes = current.photoLikes[photoId] || 0;
    current.photoLikes[photoId] = currentLikes + 1;
    
    fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf-8");

    broadcastUpdate("PHOTO_LIKED");
    res.json({ success: true, photoLikes: current.photoLikes });
  } catch (err: any) {
    console.error("Like photo error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Incremental Student Attendance registration to prevent state overwrite
app.post("/api/register-attendance", async (req, res) => {
  try {
    const { record } = req.body;
    if (!record || !record.id || !(record.fullName || record.studentName)) {
      return res.status(400).json({ success: false, error: "Bản ghi không hợp lệ" });
    }
    const name = record.fullName || record.studentName;

    if (supabase) {
      try {
        const dbRow = {
          student_name: name,
          quarter: record.quarter,
          weeks_attended: record.weeksAttended || [],
          timestamp: new Date().toISOString()
        };
        await supabase
          .from("portal_attendance")
          .upsert(dbRow, { onConflict: "student_name,quarter" });
      } catch (e: any) {
        console.warn("[SUPABASE] Realtime registration sync failed:", e.message);
      }
    }

    try {
      const current = getDBData();
      const attendance: any[] = current.attendance || [];
      
      const idx = attendance.findIndex((r: any) => 
        (r.fullName || r.studentName || "").trim().toLowerCase() === name.trim().toLowerCase() && 
        r.quarter === record.quarter
      );
      
      let targetWeeks = record.weeksAttended || [];
      if (idx > -1) {
        const mergedWeeks = Array.from(new Set([...(attendance[idx].weeksAttended || []), ...targetWeeks])).sort((a: any, b: any) => a - b);
        attendance[idx] = {
          ...attendance[idx],
          weeksAttended: mergedWeeks,
          timestamp: new Date().toISOString()
        };
      } else {
        attendance.unshift({ ...record, fullName: name });
      }
      
      current.attendance = attendance;
      fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (fErr) {}

    broadcastUpdate("ATTENDANCE");

    let attendanceList: any[] = [];
    if (supabase) {
      const { data: attData } = await supabase
        .from("portal_attendance")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (attData) {
        attendanceList = attData.map((row: any) => ({
          id: row.id || row.student_name,
          fullName: row.student_name,
          quarter: row.quarter,
          weeksAttended: row.weeks_attended || [],
          timestamp: row.timestamp
        }));
      }
    } else {
      attendanceList = getDBData().attendance || [];
    }

    res.json({ success: true, attendance: attendanceList });
  } catch (err: any) {
    console.error("Register attendance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Incremental Volunteer attendance registration to prevent state overwrite
app.post("/api/register-volunteer", async (req, res) => {
  try {
    const { record } = req.body;
    if (!record || !record.id || !record.fullName) {
      return res.status(400).json({ success: false, error: "Thông tin hỗ trợ không hợp lệ" });
    }

    if (supabase) {
      try {
        const dbRow = {
          full_name: record.fullName,
          quarter: record.quarter,
          volunteer_role: record.role,
          weeks_attended: record.weeksAttended || [],
          timestamp: new Date().toISOString()
        };
        await supabase
          .from("portal_volunteers")
          .upsert(dbRow, { onConflict: "full_name,quarter" });
      } catch (e: any) {
        console.warn("[SUPABASE] Realtime volunteer sync failed:", e.message);
      }
    }

    try {
      const current = getDBData();
      const volunteers: any[] = current.volunteers || [];
      
      const idx = volunteers.findIndex((r: any) => 
        r.fullName.trim().toLowerCase() === record.fullName.trim().toLowerCase() && 
        r.quarter === record.quarter
      );
      
      let targetWeeks = record.weeksAttended || [];
      if (idx > -1) {
        const mergedWeeks = Array.from(new Set([...(volunteers[idx].weeksAttended || []), ...targetWeeks])).sort((a: any, b: any) => a - b);
        volunteers[idx] = {
          ...volunteers[idx],
          role: record.role,
          weeksAttended: mergedWeeks,
          timestamp: new Date().toISOString()
        };
      } else {
        volunteers.unshift(record);
      }
      
      current.volunteers = volunteers;
      fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (fErr) {}

    broadcastUpdate("VOLUNTEER");

    let volunteersList: any[] = [];
    if (supabase) {
      const { data: volData } = await supabase
        .from("portal_volunteers")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (volData) {
        volunteersList = volData.map((row: any) => ({
          id: row.id || row.full_name,
          fullName: row.full_name,
          quarter: row.quarter,
          role: row.volunteer_role,
          weeksAttended: row.weeks_attended || [],
          timestamp: row.timestamp
        }));
      }
    } else {
      volunteersList = getDBData().volunteers || [];
    }

    res.json({ success: true, volunteers: volunteersList });
  } catch (err: any) {
    console.error("Register volunteer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Incremental System Audit Logs addition
app.post("/api/add-audit-log", async (req, res) => {
  try {
    const { log } = req.body;
    if (!log || !log.id || !log.action) {
      return res.status(400).json({ success: false, error: "Bản ghi nhật ký không hợp lệ" });
    }

    if (supabase) {
      try {
        const dbRow = {
          operator_email: log.user,
          operator_role: log.role || "Viewer",
          action_type: log.action,
          action_description: log.details,
          ip_address: log.ipAddress || "127.0.0.1",
          user_agent: log.browser || "System"
        };
        await supabase
          .from("audit_logs")
          .insert(dbRow);
      } catch (e: any) {
        console.warn("[SUPABASE] Audit log reporting warning:", e.message);
      }
    }

    try {
      const current = getDBData();
      const auditLogs: any[] = current.auditLogs || [];
      auditLogs.unshift(log);
      
      current.auditLogs = auditLogs.slice(0, 200);
      fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (fErr) {}

    broadcastUpdate("AUDIT_LOGS");

    let logsList: any[] = [];
    if (supabase) {
      const { data: logData } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (logData) {
        logsList = logData.map((row: any) => ({
          id: row.id,
          user: row.operator_email,
          role: row.operator_role,
          action: row.action_type,
          details: row.action_description,
          ipAddress: row.ip_address || "127.0.0.1",
          device: "Cloud Device",
          browser: row.user_agent || "Vercel Client",
          timestamp: row.created_at
        }));
      }
    } else {
      logsList = getDBData().auditLogs || [];
    }

    res.json({ success: true, auditLogs: logsList });
  } catch (err: any) {
    console.error("Add audit log error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single-file Upload Endpoint replacing base64
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file was uploaded." });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: relativeUrl
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

async function main() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for smooth development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production build delivery
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Full-stack application running on http://0.0.0.0:${PORT}`);
  });
}

main().catch(err => {
  console.error("Failed to start server:", err);
});
