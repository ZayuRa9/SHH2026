"use server";

import { supabase } from "../supabaseClient";
import { 
  WeekActivity, 
  AttendanceRecord, 
  VolunteerAttendance, 
  Gift, 
  Announcement, 
  StoredAsset, 
  AuditLog 
} from "../../types";

// ==========================================
// 1. WEEKLY ACTIVITIES SERVER ACTIONS
// ==========================================

export async function fetchWeeksAction(): Promise<{ success: boolean; data?: WeekActivity[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("portal_weeks")
      .select("*")
      .order("week_number", { ascending: true });

    if (error) throw error;

    // Map database snake_case structure to client camelCase structure
    const mappedWeeks: WeekActivity[] = (data || []).map((row: any) => ({
      id: row.id,
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

    return { success: true, data: mappedWeeks };
  } catch (err: any) {
    console.error("fetchWeeksAction SQL error:", err);
    return { success: false, error: err.message || "Failed to fetch activities" };
  }
}

export async function saveWeeksAction(weeks: WeekActivity[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Transactional save: upsert all records mapped to PostgreSQL schema
    const rows = weeks.map(w => ({
      week_number: w.weekNumber,
      title: w.theme,
      description: w.description,
      start_date: w.date,
      end_date: w.date, // assumed single-day activity for portal format
      location: w.location,
      start_time: w.time.split("-")[0]?.trim() || "08:00",
      end_time: w.time.split("-")[1]?.trim() || "11:00",
      image_url: w.coverImage,
      pdf_url: w.lessonUrl || null,
      is_active: true
    }));

    const { error } = await supabase
      .from("portal_weeks")
      .upsert(rows, { onConflict: "week_number" });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("saveWeeksAction SQL error:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 2. STUDENT ATTENDANCE SERVER ACTIONS
// ==========================================

export async function submitStudentRollCallAction(record: AttendanceRecord): Promise<{ success: boolean; data?: AttendanceRecord; error?: string }> {
  try {
    const row = {
      student_name: record.fullName,
      quarter: record.quarter,
      weeks_attended: record.weeksAttended,
      timestamp: new Date().toISOString()
    };

    // Upsert conflicts based on unique (student_name, quarter)
    const { data, error } = await supabase
      .from("portal_attendance")
      .upsert(row, { onConflict: "student_name,quarter" })
      .select()
      .single();

    if (error) throw error;

    const savedRecord: AttendanceRecord = {
      id: data.id,
      fullName: data.student_name,
      quarter: data.quarter,
      weeksAttended: data.weeks_attended,
      timestamp: data.timestamp
    };

    return { success: true, data: savedRecord };
  } catch (err: any) {
    console.error("submitStudentRollCallAction SQL error:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 3. STAFF VOLUNTEER SERVER ACTIONS
// ==========================================

export async function submitVolunteerSignupAction(record: VolunteerAttendance): Promise<{ success: boolean; data?: VolunteerAttendance; error?: string }> {
  try {
    const row = {
      full_name: record.fullName,
      quarter: record.quarter,
      volunteer_role: record.role,
      weeks_attended: record.weeksAttended,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("portal_volunteers")
      .upsert(row, { onConflict: "full_name,quarter" })
      .select()
      .single();

    if (error) throw error;

    const savedRecord: VolunteerAttendance = {
      id: data.id,
      fullName: data.full_name,
      quarter: data.quarter,
      role: data.volunteer_role,
      weeksAttended: data.weeks_attended,
      timestamp: data.timestamp
    };

    return { success: true, data: savedRecord };
  } catch (err: any) {
    console.error("submitVolunteerSignupAction SQL error:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 4. PHOTO GALLERY LIKES SERVER ACTIONS
// ==========================================

export async function likePhotoAction(photoId: string): Promise<{ success: boolean; likes?: number; error?: string }> {
  try {
    // Incremental SQL expression using RPC or standard select-update sequence
    const { data: asset, error: findError } = await supabase
      .from("portal_news")
      .select("like_count")
      .eq("id", photoId)
      .single();

    if (findError) throw findError;

    const newLikes = (asset?.like_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("portal_news")
      .update({ like_count: newLikes })
      .eq("id", photoId);

    if (updateError) throw updateError;

    return { success: true, likes: newLikes };
  } catch (err: any) {
    console.error("likePhotoAction SQL error:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 5. AUDIT LOG SERVER ACTIONS
// ==========================================

export async function insertAuditLogAction(log: AuditLog): Promise<{ success: boolean; error?: string }> {
  try {
    const row = {
      operator_email: log.user,
      operator_role: log.role,
      action_type: log.action,
      action_description: log.details,
      ip_address: log.ipAddress,
      user_agent: log.browser,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("audit_logs")
      .insert(row);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("insertAuditLogAction SQL error:", err);
    return { success: false, error: err.message };
  }
}
