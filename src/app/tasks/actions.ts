"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

function revalidateTasks() {
  revalidatePath("/tasks", "layout");
}

export interface TaskFormData {
  title: string;
  description: string;
  category: "customer" | "project" | "other";
  customer_id: string;
  context_label: string;
  assignee: string;
  due_date: string;
}

function normalizeTaskInput(data: TaskFormData) {
  const category = data.category;
  return {
    title: data.title.trim(),
    description: data.description.trim() || null,
    category,
    customer_id: category === "other" ? null : data.customer_id || null,
    context_label:
      category === "other" ? data.context_label.trim() || null : null,
    assignee: data.assignee || null,
    due_date: data.due_date || null,
  };
}

export async function createTask(data: TaskFormData) {
  if (!data.title.trim()) {
    return { error: "יש להזין כותרת למשימה" };
  }

  try {
    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("tasks")
      .insert(normalizeTaskInput(data))
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const, id: created.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה ביצירת המשימה",
    };
  }
}

export async function updateTask(id: string, data: TaskFormData) {
  if (!data.title.trim()) {
    return { error: "יש להזין כותרת למשימה" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tasks")
      .update(normalizeTaskInput(data))
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון המשימה",
    };
  }
}

export async function setTaskStatus(id: string, status: "open" | "done") {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון סטטוס המשימה",
    };
  }
}

export async function deleteTask(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת המשימה",
    };
  }
}

export async function createSubtask(taskId: string, title: string, assignee: string) {
  if (!title.trim()) {
    return { error: "יש להזין כותרת לתת-המשימה" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("task_subtasks").insert({
      task_id: taskId,
      title: title.trim(),
      assignee: assignee || null,
    });

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בהוספת תת-המשימה",
    };
  }
}

export async function updateSubtask(
  id: string,
  data: { title: string; assignee: string },
) {
  if (!data.title.trim()) {
    return { error: "יש להזין כותרת לתת-המשימה" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("task_subtasks")
      .update({ title: data.title.trim(), assignee: data.assignee || null })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון תת-המשימה",
    };
  }
}

export async function setSubtaskStatus(id: string, status: "open" | "done") {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("task_subtasks")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון סטטוס תת-המשימה",
    };
  }
}

export async function deleteSubtask(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("task_subtasks").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidateTasks();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת תת-המשימה",
    };
  }
}
