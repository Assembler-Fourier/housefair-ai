import "server-only";

import { addDaysIso, defaultGroceries, defaultTaskRoutines } from "@/lib/saas/defaults";
import { insertRow } from "@/lib/server/db";

export async function seedNewHousehold(args: {
  householdId: string;
  ownerMemberId: string;
  profileId: string;
}) {
  for (const task of defaultTaskRoutines) {
    await insertRow("household_tasks", {
      household_id: args.householdId,
      title: task.title,
      description: task.description,
      area: task.area,
      difficulty: task.difficulty,
      difficulty_reason: task.difficulty_reason,
      estimated_minutes: task.estimated_minutes,
      points: task.points,
      points_reason: task.points_reason,
      frequency: task.frequency,
      due_date: addDaysIso(task.dueOffset),
      checklist: JSON.stringify(task.checklist),
      proof_required: task.proof_required,
      assigned_member_id: args.ownerMemberId,
      created_by_profile_id: args.profileId,
    });
  }

  for (const [index, [name, category]] of defaultGroceries.entries()) {
    await insertRow("household_groceries", {
      household_id: args.householdId,
      name,
      category,
      status: index < 3 ? "needed" : "available",
      added_by_member_id: args.ownerMemberId,
    });
  }

  await insertRow("household_activity", {
    household_id: args.householdId,
    actor_member_id: args.ownerMemberId,
    event_type: "household_created",
    title: "Household created",
    detail: "Starter routines and grocery essentials are ready to customise.",
  });
}
